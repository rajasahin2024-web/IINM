# IINM LMS — Architecture & Project Structure

> Generated for **TEC-9** (Paperclip Memory). A read-and-analyze pass over the IINM codebase at `/project/iinm`. This document captures the stack, the directory layout, the request/data flow, the security model, and the design decisions worth remembering.

---

## 1. What this system is

IINM is an **AI-powered Learning Management System (LMS)** — a marketing site + student portal + a large admin CMS, backed by a FastAPI service. It sells courses, manages batches/exams/materials, processes payments (Razorpay), streams video (HLS on Cloudflare R2), publishes blogs/CMS pages, and runs an SEO/AEO subsystem.

Two deployable apps live in one repo:

```
/project/iinm
├── backend/      # FastAPI + SQLAlchemy + PostgreSQL (port 2007)
├── frontend/     # Next.js 16 + React 19 + TS + Tailwind 4 (port 2021)
├── documentation/
├── scripts/      # deploy-*.sh
└── nginx-iinm.conf
```

Production domains: `iinmedu.com` / `www.iinmedu.com` (frontend), `api.iinmedu.com` (backend). Cloudflare terminates TLS; nginx reverse-proxies to the two local ports.

---

## 2. Technology stack

### Backend (`backend/requirements.txt`)
| Concern | Choice |
|---|---|
| Web framework | **FastAPI** (uvicorn, `--reload` in dev) |
| ORM | **SQLAlchemy** (declarative `Base`, sync sessions, QueuePool) |
| DB | **PostgreSQL** (`psycopg2-binary`), connection via `DATABASE_URL` |
| Migrations | **Alembic** (58 revisions, autogenerate + manual) |
| Validation | **Pydantic** (per-router schemas) |
| Auth | bcrypt (`passlib[bcrypt]`) + HMAC-signed student tokens + in-memory device-admin tokens |
| Payments | **Razorpay** (live/test keys in `PaymentSettings`) |
| Object storage | **Cloudflare R2** via `boto3` (S3-compatible) |
| Media | **FFmpeg** subprocess for HLS transcoding |
| AI | **OpenRouter** chat (`AISettings.openrouter_api_key`) |
| HTML sanitization | `nh3` |
| PDF | `PyPDF2` |
| Misc | `httpx`, `python-multipart`, `python-dateutil` |

> Note: `pgvector` is **not** currently used — grep hits for "vector" are only testimonial text and SQLAlchemy's bundled dialect types. There is no embedding column or vector search today. (TEC-3's "Backend Developer" hire spec mentions pgvector as a *desired* skill, not a present feature.)

### Frontend (`frontend/package.json`)
| Concern | Choice |
|---|---|
| Framework | **Next.js 16.2.2** (App Router, Turbopack dev, webpack build) |
| UI | **React 19.2.4**, **TypeScript 5**, **TailwindCSS 4** |
| Rich text | **TinyMCE 8** (self-hosted, copied via `scripts/copy-tinymce.mjs`) + `react-simple-wysiwyg` |
| Video | **hls.js**, **video.js** |
| 3D/animation | `@react-three/fiber` + `drei` + `three`, `gsap`, `simplex-noise` |
| DnD | `@dnd-kit/core` + `sortable` |
| PDF | `pdfjs-dist`, `html2pdf.js` |
| HTTP | built-in `fetch` via `lib/apiFetch.ts` (no axios) |
| Notifications | `react-hot-toast` |
| Icons | `lucide-react` |
| Sanitization | `dompurify` |

---

## 3. Directory layout (annotated)

### Backend
```
backend/
├── main.py              # FastAPI app: CORS, security headers, health, auth deps, cache admin, login
├── run.py               # kills port 2007, launches uvicorn --reload
├── database.py          # engine, SessionLocal, Base, get_db (pool 10 + 20 overflow, recycle 1800s)
├── models.py            # 99 SQLAlchemy models (single file)
├── security.py          # bcrypt, file-upload validation, rate limiting, IP helper
├── helpers.py           # validate_upload, rewrite_url, BASE_URL
├── cache.py             # TTLCache — in-memory response cache (5 min default TTL)
├── routers/             # 33 API routers (one per domain)
├── controllers/admin/   # thin controller layer (only student_controller.py so far)
├── hls/                 # ffmpeg transcode + R2 upload pipeline
├── seeders/             # idempotent seeders (admin users, schema add-ons)
├── migrations/          # Alembic (env.py + 58 versions)
├── scripts/             # r2 asset migration, cors setup
├── uploads/             # local file uploads (gitignored) — also served via R2
├── alembic.ini
├── .env / .env.example
└── requirements.txt
```

### Frontend
```
frontend/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── admin/           # 72 admin pages (Masters, CMS, SEO, Fees, Settings, Teachers, Devices, Leads, Blogs, Academic…)
│   │   ├── (public pages)   # 26 public pages: courses, blog, career, about-us, contact, verification, invoice, receipt, login, signin, maintenance…
│   │   ├── layout.tsx       # root layout: fonts, Toaster, Analytics, MaintenanceGuard, Fomo, generateMetadata (SEO from DB)
│   │   ├── page.tsx         # home
│   │   ├── sitemap.ts / robots.ts / opengraph-image.tsx / llms.txt
│   ├── components/          # 31 shared components (Navbar, Footer, HeroSlider, RichEditor, JsonLd, Turnstile, MaintenanceGuard…)
│   ├── lib/                 # apiFetch, serverFetch, apiCache, config, siteSettingsCache, receipt, upload*, toast, indianLocations
│   ├── middleware.ts        # maintenance + SEO redirect gate (public routes only)
├── next.config.ts           # CSP, security headers, /uploads rewrite, optimizePackageImports
├── eslint.config.mjs / postcss.config.mjs
├── scripts/                 # copy-tinymce + many patch_*.py one-off fixers
└── package.json
```

---

## 4. Backend architecture

### 4.1 App bootstrap (`main.py`)
1. `Base.metadata.create_all(bind=engine)` — auto-creates tables on a fresh DB (safe no-op when tables exist). Alembic is the source of truth afterwards.
2. FastAPI app with docs disabled in prod (`ENABLE_DOCS=false`).
3. All 33 routers registered under `/api` (or `/api/seo`, etc.).
4. Static `/uploads` mounted.
5. **CORS** allowlist: `iinmedu.com`, `www.iinmedu.com`, localhost, dev IPs, a Cloudflare quick-tunnel domain.
6. **`SecurityHeadersMiddleware`** — pure ASGI (not `BaseHTTPMiddleware`, to avoid response buffering that delays `db.close()` and exhausts the pool). Adds `X-Content-Type-Options`, `X-Frame-Options: DENY`, HSTS, etc.
7. Global exception handlers convert `OperationalError`/`DBAPIError` → **503** `{"error":"db_down"}`. Frontend middleware turns 503 into a `/maintenance` redirect.
8. `/api/health` — pings DB with `SELECT 1`.

### 4.2 Auth model (two parallel mechanisms)
- **Admin / device auth** (`routers/auth.py` → `require_device`):
  - Admin logs in → a `DeviceSession` row is created with a `device_token`.
  - Must be `is_approved=True`. Token sent on every request as `X-Device-Token`.
  - The frontend stores it in `localStorage["iinm_device_token"]` and `apiFetch` injects the header automatically.
  - A separate `DeviceAdminUser` table + in-memory token store (48h TTL) powers the device-admin panel.
- **Student auth** (in `main.py`): HMAC-SHA256 signed base64 token `{student_id}:{expiry}:{sig}`, secret = `STUDENT_AUTH_SECRET` (falls back to `DEVICE_ADMIN_SECRET`). 48h TTL. Verified via `_verify_student_token`.
- **Rate limiting**: in-memory per-IP login limiter (5 attempts / 60s), plus `check_public_rate_limit` from `security.py` for public endpoints. localhost is exempt.

### 4.3 Routers (33) — domain map
Grouped by responsibility:

| Group | Routers |
|---|---|
| Catalog / curriculum | `courses`, `materials`, `topics`, `difficulty`, `question_types`, `questions`, `comprehensions`, `exams` |
| Academic / batches | `academic`, `batches`, `student`, `progress`, `slot_booking` |
| Commerce | `invoice` (Razorpay), `settings` (payment keys) |
| CMS / marketing | `blogs`, `pages`, `about`, `mission_vision`, `certification`, `our_team`, `sample_certificate`, `notices`, `leadership`, `testimonials`, `contact`, `faq`, `career` |
| SEO / AEO | `seo` (page meta, redirects, FAQs, sitemap, GSC stats, AI settings, footer directory) |
| Config | `settings` (site, email, payment, R2, AI, FOMO, maintenance…), `verification` |
| Dashboard | `dashboard` |

Pattern (consistent across routers):
- Public `GET` endpoints are open (often cached via `cache.py`).
- Writes (`POST/PUT/DELETE`) require `Depends(require_device)`.
- Pydantic schemas per resource (`*Create`, `*Update`, `*Response`).
- File uploads validated by extension + size (`security.py`), with a hard `BLOCKED_EXTENSIONS` list (no `.html/.js/.php/...`).

### 4.4 Data model (`models.py` — 99 models)
Single file holds all SQLAlchemy models. Highlights:
- **Auth**: `AdminUser`, `DeviceAdminUser`, `DeviceSession`.
- **LMS taxonomy**: `Category → SubCategory → Subject → Course → Chapter → Topic`, with junction tables (`course_subjects`, `course_chapters`, `course_instructors`, `topic_materials`).
- **Materials**: `CourseMaterial`, `ChapterLiveClass` (live class drips).
- **Assessment**: `Exam`, `ExamQuestion`, `BatchExamAssignment`, `Question`, `QuestionOption`, `ComprehensionPassage`, `DifficultyLevel`, `QuestionType`.
- **Batches / students**: `Batch`, `BatchInstructor`, `BatchRoutine`, `BatchContentDrip`, `Student`, `BatchEnrollment`, `BatchChapterProgress`, `BatchStudentMaterialProgress`.
- **Commerce**: `CoursePurchase`, `PaymentTransaction`, `InstallmentSchedule`, `Coupon`.
- **Content / CMS**: `BlogPost` (+ revisions, categories, authors, comments, ratings, reactions), `StaticPage`, `NavbarItem`, `FooterMenuGroup/Item`, home-page section models (`HomeHeroContent`, `HomePartnerSection`, `HomeJourneySection`, `HomeStudentReelsSection`, `HomeAIEcosystemSection`, …).
- **SEO**: `SeoPageMeta`, `Redirect`, `CourseFaq`, `GscProperty`, `GscQueryStat`, `SeoFooterDirectory`, `CourseExtendedContent`.
- **Settings** (single-row tables): `SiteSettings`, `EmailSettings`, `PaymentSettings`, `R2Settings`, `AISettings`, `ContactSettings`, `GoogleApiSettings`, `PusherSettings`, `AboutSettings`, `CareerSettings`, `MissionVisionSettings`, `CertificationPageSettings`, `OurTeamPageSettings`, `SampleCertificatePageSettings`.
- **Leads**: `BrochureLead`, `ContactInquiry`, `CareerApplication`.

Conventions (from `.devin/rules/backend-rules.md`): singular table names, `joinedload`/`selectinload` to avoid N+1, pagination on list endpoints, SQLAlchemy 2.0 `select()` style preferred, no `SELECT *`, secrets in env.

### 4.5 Caching (`cache.py`)
- `TTLCache`: thread-safe in-memory cache, default 5-min TTL, deep-copy on read.
- Public near-static GETs (site settings, navbar, footer, hero…) are cached to avoid DB pressure — this was the fix for QueuePool exhaustion under load.
- Write endpoints call `cache.invalidate(key)`. Admin can clear/invalidate via `/api/settings/cache/*` (device-auth required).
- **Single-process only** — multi-worker deployments would need Redis with the same interface (noted in the module docstring).

### 4.6 Media pipeline (video → HLS → R2)
Documented in `documentation/media-pipeline-setup.md`:
```
Browser ──POST /api/materials/presign──▶ FastAPI (validate ext/size ≤500MB)
   │  presigned PUT URL (30 min)
   ▼
Cloudflare R2 (bucket: iinm, key course-materials/{uuid}.mp4)
   │  POST /api/materials (file_url + file_key) — confirm
   ▼
FastAPI ──FFmpeg subprocess──▶ HLS (master.m3u8 + renditions 720p/480p/360p)
   │  upload_hls_to_r2 (boto3)
   ▼
R2 (course-materials/hls/{uuid}/master.m3u8) → frontend plays via hls.js
```
Local temp files are cleaned up after R2 upload. `hls/ffmpeg_check.py` detects ffmpeg availability; `hls/video_transcode.py` holds the quality presets.

### 4.7 Migrations
- Alembic, autogenerate workflow: `alembic revision --autogenerate -m "..."`.
- Fresh DB: start server (creates tables) → `alembic stamp head`.
- **Strict safety rules** (`.devin/rules/migration-rules.md`): never `drop_table`, never `drop_column` without approval, never `TRUNCATE`/`DELETE`, always backup first (`pg_dump`), test on staging, use `nullable=True` + `server_default` for new columns. Downgrades that drop are forbidden on production.

---

## 5. Frontend architecture

### 5.1 App Router layout
- `src/app/layout.tsx` — root layout: Inter + Playfair fonts, `react-hot-toast`, `AnalyticsScripts`, `MaintenanceGuard`, `FomoNotification`, and `generateMetadata()` which pulls SEO/title/favicon/OG from `/settings/site` via `serverFetch` (ISR, 300s).
- **Admin** (`src/app/admin/`): 72 pages organized into Masters (catalog, curriculum, leadership, notices), CMS (career, footer, navbar, pages), SEO (analytics, blogs, courses, directory, faqs, llms, pages, redirects, schema, site, sitemap), Fees (collections, due, payments), Leads (brochure), Settings (ai, cache, email, fomo, google, institute, maintenance, payment, pusher, r2, site), Teachers, Devices, Blogs (authors, categories, editor), Academic (batch-assign, course-progress, examination, purchase, register, student-feedback), Batch ([id] detail).
- **Public** (26 pages): home, courses/[slug], blog/[slug], career/[slug], about-us, about-iinm, contact-us, certification, mission-vision, our-team, notice, admission, verification, invoice/[uuid], receipt/[invoice_uuid], sample-certificate, login, signin, device-admin, device-request, maintenance, page/[slug], llms.txt, llms-full.txt.
- SEO infra: `sitemap.ts`, `robots.ts`, `opengraph-image.tsx`, `llms.txt`.

### 5.2 Data fetching
- **Server Components** use `lib/serverFetch.ts` (Next `fetch` with `next:{revalidate}`, returns `{__dbDown:true}` sentinel on 503/network error → triggers maintenance redirect). `serverFetchAll` fetches many endpoints in parallel.
- **Client Components** use `lib/apiFetch.ts` — a `fetch` wrapper that injects `X-Device-Token` from `localStorage`, prefixes `BASE_URL`, and avoids setting `Content-Type` for `FormData` uploads.
- `lib/apiCache.ts` / `lib/siteSettingsCache.ts` provide client-side caching.

### 5.3 Middleware (`src/middleware.ts`)
Runs on public routes only (matcher excludes `/admin`, `/maintenance`, `/_next`, `/api`). For each public request:
1. **SEO redirect check** — fetches `/seo/redirects` (60s in-memory cache) and 301/302-redirects matching `from_path`.
2. Skips if `iinm_admin=1` cookie present.
3. **Maintenance check** — fetches `/settings/maintenance` (10s cache). On non-ok / `maintenance_mode` / network error → redirect to `/maintenance`.

### 5.4 `next.config.ts`
- `allowedDevOrigins` for dev IPs + Cloudflare tunnel.
- Strong **CSP** (script-src allowlisted for Cloudflare Turnstile, YouTube, Razorpay; `unsafe-inline` for styles as a temporary bridge; `unsafe-eval` only in dev), plus `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS.
- `rewrites` proxies `/uploads/*` to the backend (so the frontend can serve backend-hosted assets under the same origin).
- `experimental.optimizePackageImports` for heavy libs (dnd, three, gsap, video.js).

### 5.5 Conventions (`.devin/rules/frontend.md`)
Latest stable libs, no duplicate libraries (use built-in `fetch`, CSS/Tailwind for animation over JS libs), Tailwind spacing scale (no arbitrary pixels unless necessary), skeleton loading, `prefers-reduced-motion` respected.

---

## 6. Request / data flow (end to end)

```
Browser
  │  (public page)
  ▼
Next.js middleware ── SEO redirect? ── maintenance? ──▶ /maintenance
  │
  ▼
Next Server Component ──serverFetch (ISR)──▶ FastAPI /api/... (cached?)
  │                                              │
  │  (admin action)                              ▼
  ▼                                          PostgreSQL (SQLAlchemy, QueuePool)
Client Component ──apiFetch (X-Device-Token)──▶ FastAPI write endpoint
                                                   │ require_device (DeviceSession approved)
                                                   │ Pydantic validate
                                                   │ cache.invalidate(key)
                                                   ▼
                                                PostgreSQL
```

- Static assets: Cloudflare → nginx → Next (`/uploads/*` rewritten to backend).
- Video: browser → R2 (presigned PUT) → FastAPI confirm → FFmpeg → R2 HLS → browser (hls.js).
- Payments: browser → Razorpay checkout → webhook/confirm → `PaymentTransaction`.
- DB down anywhere → 503 → frontend maintenance redirect.

---

## 7. Security posture

- **TLS**: Cloudflare terminates SSL; nginx proxies plain HTTP internally; HSTS preload set at both nginx and Next config layers.
- **Headers**: `nosniff`, `DENY` framing, `Permissions-Policy` (no geo/mic/cam for public; admin allows geolocation self), `Referrer-Policy`.
- **CSP**: strict, with explicit allowlists for Turnstile/YouTube/Razorpay.
- **Upload safety**: extension + size validation, hard `BLOCKED_EXTENSIONS` (no executable/web formats), MIME awareness.
- **Auth**: bcrypt password hashing, HMAC-signed student tokens, approved-device token gating for all writes, separate device-admin panel.
- **Rate limiting**: login (5/min/IP), public endpoint limiter, localhost exempt.
- **Secrets**: all in env (`DATABASE_URL`, `DEVICE_ADMIN_SECRET`, `STUDENT_AUTH_SECRET`, `GOOGLE_MAPS_API_KEY`, R2 keys, Razorpay keys in DB `PaymentSettings`, OpenRouter key in `AISettings`). Nothing hardcoded.
- **Docs**: Swagger/Redoc disabled in production (`ENABLE_DOCS=false`).
- **DB resilience**: `pool_pre_ping`, recycle 1800s, 503 on DB errors, in-memory cache to shed DB load.

---

## 8. Deployment topology

```
Internet ──HTTPS──▶ Cloudflare (DNS, SSL, WAF, cache)
                        │
                        ▼
                    nginx (rate-limit zones: api_limit 10r/s, login_limit 5r/m)
                        │
              ┌─────────┴──────────┐
              ▼                    ▼
      Next.js :2021           FastAPI :2007
      (frontend)             (backend, uvicorn --reload)
                                     │
                                     ▼
                              PostgreSQL (remote, e.g. 100.127.39.1)
                                     │
                              Cloudflare R2 (media/HLS)
                                     │
                              Razorpay / OpenRouter / Google APIs
```
- `scripts/deploy-backend.sh`, `deploy-frontend.sh`, `deploy.sh` orchestrate deploys. Backend runs from `/www/wwwroot/iinm/backend` with a dedicated venv (`run.py` uses `/www/wwwroot/iinm/.venv/bin/python`).
- Single-process uvicorn (the in-memory cache assumes one worker).

---

## 9. Notable design decisions & risks

1. **Single `models.py` with 99 models** — easy to navigate, but a candidate to split as the schema grows. Backend rules mandate reusing existing tables and singular names.
2. **In-memory TTL cache, single process** — solves the QueuePool exhaustion that previously occurred, but won't scale to multi-worker without Redis.
3. **Pure-ASGI security middleware** — deliberately avoids `BaseHTTPMiddleware` because it buffers responses and delays `db.close()`.
4. **Device-token auth instead of JWT sessions for admin** — every admin device must be explicitly approved (`DeviceSession.is_approved`). Simple and auditable, but token revocation is per-DB-row.
5. **HLS via FFmpeg subprocess + R2** — no transcoding service; the FastAPI process spawns ffmpeg. Long transcodes can tie up a worker (watch for the "killed by signal" error path in `video_transcode.py`).
6. **No pgvector yet** — despite the hire spec, vector search is not in the codebase. AI features today are OpenRouter chat completions (SEO content, settings).
7. **Migration safety is enforced by rule, not tooling** — the `migration-rules.md` is a hard contract (no drops, backup first). There is no automated guard, so discipline + review is the control.
8. **Many `patch_*.py` scripts in `frontend/scripts/`** — one-off fixers; they indicate iterative UI work and should not be part of the build path.

---

## 10. Where to look next

| If you want to… | Start at |
|---|---|
| Add an API endpoint | `backend/routers/<domain>.py` + Pydantic schema, follow `require_device` pattern |
| Add/change a table | `backend/models.py` → `alembic revision --autogenerate` → review → `alembic upgrade head` |
| Add an admin page | `frontend/src/app/admin/<area>/<page>/page.tsx`, add to `menuData.ts` |
| Add a public page | `frontend/src/app/<page>/page.tsx` (Server Component + `serverFetch`) |
| Tune caching | `backend/cache.py` + `/api/settings/cache/*` admin endpoints |
| Video upload | `backend/hls/` + `documentation/media-pipeline-setup.md` |
| SEO/AEO | `backend/routers/seo.py` + `frontend/src/app/admin/seo/` |
| Payments | `backend/routers/invoice.py` (Razorpay) + `PaymentSettings` |
| Conventions | `.devin/rules/{backend-rules,frontend,migration-rules}.md` |

---

*End of architecture overview. Generated by Devin Agent for TEC-9.*
