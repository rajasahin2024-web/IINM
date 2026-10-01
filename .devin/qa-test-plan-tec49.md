# QA Test Plan — TEC-49 Student Panel Auth + Course Dashboard

Scope: verify TEC-44 acceptance criteria end-to-end after TEC-47 (backend) and TEC-48 (frontend) land.

## Environment (baseline captured 2026-09-13)

- Repo: `/project/iinm` (branch `main`, 10 commits ahead of origin).
- Backend: FastAPI uvicorn on `http://127.0.0.1:2007` (nginx → `https://82.112.226.111/api`). Health `{"status":"healthy","database":"connected"}`.
- Frontend dev: Next.js on `http://127.0.0.1:2021` (and `:3000`). Public `https://82.112.226.111`.
- DB: `postgresql+psycopg2://...@100.127.39.1:5432/lmsdbdev` (from `backend/.env`).
- Frontend env: `NEXT_PUBLIC_API_URL=https://82.112.226.111/api`, `NEXT_PUBLIC_BASE_URL=https://82.112.226.111`.
- Existing login: `POST /api/student/login` (`backend/main.py:578`) — email-or-phone + bcrypt → httpOnly cookie `iinm_student_token` (HMAC, 48h TTL, IP rate-limit 5/min). `_verify_student_token` exists but is NOT wired to any endpoint today.

### Pre-implementation baseline (regression reference)

- `GET /api/public/slot-booking/config` → 200; `GET /api/public/slot-booking/courses` → 200.
- `POST /api/students` → 307 (redirect, exists). Admin registration route lives under `/api/academic/*` (purchase/coupon flows) + `/api/students` CRUD.
- Slot-booking SMTP send is in `routers/slot_booking.py::_send_booking_email` (line 145); settings test email SMTP in `routers/settings.py` (line 100). Both duplicated inline — TEC-47 must refactor to `helpers.send_email`.
- **Pre-existing finding to re-check after TEC-47:** current `student_login` returns **401** for `password_hash=NULL` and **403** for `is_active=false` — different status codes (minor enumeration vector). Plan requires identical generic failure. Verify the new flow normalizes this.

### NOT yet implemented (all 404 as of baseline)

- `POST /api/student/auth/forgot-password`, `POST /api/student/auth/reset-password`
- `GET /api/student/me`, `POST /api/student/logout`, `GET /api/student/my-courses`, `GET /api/student/courses/{id}`
- Frontend `/student`, `/student/courses/[id]`, `/forgot-password`, `/reset-password` (only `/signin` exists, returns 200).

---

## Test cases (execute after blockers resolve)

Seed data needed: (a) active student with known password; (b) active student with `password_hash=NULL`; (c) `is_active=false` student; (d) student with ≥1 course purchase + batch enrollment; (e) student with NO purchases. Capture ids/emails in findings.

### 1. Login (`/signin` → `/student`)
- 1.1 Happy: active student + correct password → 200, cookie `iinm_student_token` set, redirect to `/student`. **Pass criteria:** lands on course-card view.
- 1.2 Bad password → generic failure (identical message to 1.3/1.4). Record exact status + body.
- 1.3 Unknown email/phone → same generic failure (same status + body + ~timing).
- 1.4 `is_active=false` → same generic failure (same status + body). **Watch:** baseline returned 403 vs 401 — must be normalized.
- 1.5 `password_hash=NULL` student + any password → generic failure (reset flow is the setup path, not login).
- 1.6 Rate limit: 6 rapid bad logins from one IP → 429 (limit 5/min per baseline).
- 1.7 Phone identifier works (not just email).

### 2. Forgot / reset password
- 2.1 Known email → 200 generic; reset email received; link contains `https://<site>/reset-password?token=...`.
- 2.2 Unknown email → identical 200 generic (same body + ~timing). **No enumeration.**
- 2.3 `password_hash=NULL` student → reset works → sets bcrypt hash → login succeeds (first-time setup path).
- 2.4 Token single-use: reset once → reuse same token → reject (410/400).
- 2.5 Token expiry: create token, manipulate `expires_at` to past (or wait) → reset rejected.
- 2.6 Re-request forgot-password → old unused tokens invalidated; only newest works.
- 2.7 Reset → other outstanding tokens for that student invalidated.
- 2.8 Password validation: short/empty password rejected with clear error.
- 2.9 Rate limits: per-IP + per-email ~60s resend cooldown → second request within 60s → 429 / generic-but-no-email.

### 3. No enumeration + rate limits
- 3.1 Compare response bodies + status + timing for known vs unknown email (≥3 samples each).
- 3.2 Per-IP cooldown: burst forgot requests → throttle engages.
- 3.3 Per-email cooldown: same email repeated → throttle.

### 4. Course cards (`/student`)
- 4.1 One card per enrolled course; each shows: title, thumbnail, batch name, admission/enrollment status badge, paid/due amounts, invoice ref, progress %.
- 4.2 Selecting a card navigates to `/student/courses/[id]`.
- 4.3 Student with no purchases → empty state (no crash).

### 5. Course access control
- 5.1 `GET /api/student/courses/{enrolled_id}` → 200 with dashboard payload (chapters, materials, routine, progress).
- 5.2 `GET /api/student/courses/{not-enrolled_id}` → 403 (or 403-equivalent). **Critical.**
- 5.3 Frontend `/student/courses/{not-enrolled_id}` → redirects/403 page, no data leak.
- 5.4 Logged-out `GET /api/student/courses/{id}` → 401.

### 6. Auth guard
- 6.1 Logged-out `GET /student` → redirect `/signin`.
- 6.2 Logged-out `/student/courses/[id]` → redirect `/signin`.
- 6.3 Logged-out `GET /api/student/me`, `/my-courses`, `/courses/{id}` → 401.
- 6.4 `POST /api/student/logout` → clears `iinm_student_token`; subsequent `/student` redirects to signin.

### 7. Responsive
- 7.1 Mobile viewport (375x812): `/student` renders app-like layout.
- 7.2 Desktop (1440x900): desktop LMS layout.

### 8. No OTP
- 8.1 `grep -riE "otp|firebase|sms|twilio|verify.*code" backend/routers/student_auth.py frontend/app/student frontend/app/signin frontend/app/forgot-password frontend/app/reset-password` → no matches.
- 8.2 No OTP input in any new page; reset uses token-in-link only.

### 9. Regression spot-check
- 9.1 Admin registration (`/admin/academic/register` page + backing API) still works.
- 9.2 Slot-booking checkout (`/api/public/slot-booking/create-order` → `verify-and-register`) still works.
- 9.3 Slot-booking confirmation email still sends after mailer refactor (check `_send_booking_email` routes through `helpers.send_email`).
- 9.4 Settings test email (`POST /api/settings/email/test`) still sends through shared mailer.
- 9.5 Migration reversible: `alembic downgrade -1` on `student_password_resets` then re-upgrade.

---

## Reporting

- Each finding as a comment here: severity (blocker/major/minor), repro steps, expected vs actual, seed data refs.
- Verdict: ship / ship-with-known-issues (listed) / do-not-ship.
- Issue marked `done` regardless of verdict once all criteria have explicit pass/fail.
