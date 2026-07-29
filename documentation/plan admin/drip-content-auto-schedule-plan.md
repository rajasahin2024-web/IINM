# Plan: Auto-Generate Drip Content Dates (Create Batch Modal)

> **Feature:** In `admin/batch` → Create/Edit Batch window → "Curriculum — Scheduled Unlock (Drip Content)" section, the admin will only input **Classes per Week**, and unlock dates for all chapters will be **auto-generated** starting from the batch start date. Manual per-chapter override stays possible.

---

## 1. Current State Analysis (In-Depth)

### 1.1 Frontend — `frontend/src/app/admin/batch/page.tsx`

| Item | Detail |
|---|---|
| Drip state | `dripDates: Record<number, string>` — key = `chapter_id`, value = `YYYY-MM-DD` |
| Chapter source | `courseChapters: { subjectName: string; chapters: any[] }[]` — fetched when `formData.course_id` changes (course → subjects → chapters, sequential fetch) |
| UI today | Each chapter row has a single `<input type="date">`; admin manually picks every date one-by-one |
| Save flow | `saveBatch()` → after batch POST/PUT, sends `PUT /api/batches/{id}/content-drip` with `{ drips: [{ chapter_id, unlock_date }] }`; blank dates are filtered out |
| Edit mode | `openEdit()` pre-fills `dripDates` from `batch.content_drip` |
| Batch start date | Already in the same form: `formData.start_date` (string, may be empty) |

### 1.2 Backend — no changes required

- `PUT /api/batches/{batch_id}/content-drip` (`backend/routers/batches.py`) already does a **delete-all + re-insert** of `BatchContentDrip` rows. It accepts any list of `{ chapter_id, unlock_date }`.
- `BatchContentDrip` model (`backend/models.py`): `batch_id`, `chapter_id`, `unlock_date` — sufficient. **No migration needed.**
- The auto-generation is purely a client-side date calculation; the existing API contract fits perfectly.

### 1.3 Related surface (out of scope, note only)

- Batch detail page (`admin/batch/[id]/page.tsx`) also edits drip dates per-chapter (`updateDripDate`). Auto-generate can be added there later as Phase 2 — not part of this plan's implementation scope.
- Known pre-existing bug: `create_batch` in `batches.py` references `drip.material_id` which doesn't exist on the schema/model. It is not triggered by the current frontend (drips are saved via the separate PUT endpoint), so it's untouched here — logged for a future cleanup.

---

## 2. Feature Design

### 2.1 Inputs (Auto-Schedule Bar)

A new compact control bar rendered at the **top of the Drip Content section**, visible only when `courseChapters.length > 0`:

| Field | Type | Default | Rule |
|---|---|---|---|
| **Classes / Week** | number input | `3` | min `1`, max `7` |
| **Schedule Start Date** | date input | auto-prefilled from `formData.start_date` | required to generate; editable independently |
| **Generate Dates** | button | — | runs the algorithm, fills `dripDates` |
| **Clear All** | button | — | empties `dripDates` (all chapters back to "unlock immediately") |

Local component state: `autoClassesPerWeek: number`, `autoStartDate: string`.
`autoStartDate` syncs from `formData.start_date` whenever it changes (via `useEffect`), but the admin can override it.

### 2.2 Date Generation Algorithm

Assumption: **1 chapter = 1 class session**, unlocked in curriculum order.

1. Flatten chapters preserving order: `courseChapters.flatMap(g => g.chapters)` (subject order → chapter order, same as displayed).
2. For chapter index `i` (0-based) with `N = classesPerWeek`:
   - `week = Math.floor(i / N)`
   - `slotInWeek = i % N`
   - `dayOffset = week * 7 + Math.round(slotInWeek * (7 / N))`
   - `unlock_date = startDate + dayOffset days`
3. Build a fresh `{ chapter_id: isoDate }` map and `setDripDates(newMap)`.

Examples (start = Mon 01-Jun):

| N (classes/week) | Generated pattern |
|---|---|
| 1 | 01, 08, 15, 22 … (every 7 days) |
| 2 | 01, 05 (day+4), 08, 12 … |
| 3 | 01, 03, 06, 08, 10, 13 … |
| 7 | daily |

Date math uses local-safe construction (`new Date(y, m-1, d)` from the ISO string + `setDate`) to avoid timezone off-by-one, formatted back to `YYYY-MM-DD` manually — **not** `toISOString()` (UTC shift risk).

### 2.3 Overwrite Behavior

- If `dripDates` already has ≥1 entry (typical in **Edit Batch**), clicking **Generate Dates** shows an inline confirm (small warning text + "Overwrite" confirm state on the button, no extra modal): *"This will replace N existing dates."* Second click applies.
- After generation, each chapter's individual date input remains fully editable — manual fine-tuning is preserved through the existing save path.

### 2.4 Validation & Feedback

| Case | Behavior |
|---|---|
| No start date (`autoStartDate` empty) | toast error: "Set a start date first" |
| `N < 1` or `N > 7` | clamp to range, no crash |
| `formData.end_date` set AND last generated date > end_date | dates still generated, but a non-blocking amber warning line: "Schedule ends after the batch end date (last unlock: {date})" |
| 0 chapters | bar hidden (section already hidden today) |
| Success | toast: "X chapter dates generated" + existing per-row lock highlight (teal) gives instant visual confirmation |

### 2.5 UI Sketch (fits existing style system)

```
┌─ CURRICULUM — SCHEDULED UNLOCK (DRIP CONTENT) ──────────────────────┐
│ Set a date when each chapter … Leave blank to unlock immediately.   │
│ ┌─ ⚡ Auto-Schedule ────────────────────────────────────────────┐   │
│ │ Classes/Week [ 3 ]  Start [ 2026-08-01 ]  [Generate] [Clear] │   │
│ │ ⓘ 24 chapters → last unlock 27 Sep 2026                      │   │
│ └──────────────────────────────────────────────────────────────┘   │
│  ── SUBJECT A ──                                                    │
│  🔒 Chapter 1   Unlocks: 01 Aug 2026            [2026-08-01 ▾]     │
│  🔒 Chapter 2   Unlocks: 03 Aug 2026            [2026-08-03 ▾]     │
│  …                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

Styling reuses the section's existing tokens: `#f0fdfa` / `#ccfbf1` teal family for the bar, `bi-sel`-style inputs, Inter font, 10px radii — consistent with the rest of the modal.

---

## 3. Implementation Steps

All changes in **one file**: `frontend/src/app/admin/batch/page.tsx`

1. **State:** add `autoClassesPerWeek` (default 3), `autoStartDate` (string), `confirmOverwrite` (boolean) inside `BatchManagerInner`.
2. **Sync effect:** `useEffect` → when `formData.start_date` changes and admin hasn't manually diverged, set `autoStartDate = formData.start_date`.
3. **Helper `generateDripDates()`:** pure function implementing §2.2 (flatten → compute offsets → return map); wire to button with overwrite guard (§2.3) and validation (§2.4).
4. **Helper `clearDripDates()`:** `setDripDates({})`.
5. **UI:** insert the Auto-Schedule bar between the section subtitle and the chapter list (inside the existing `courseChapters.length > 0` block), including the summary line ("X chapters → last unlock {date}") and end-date warning.
6. **Reset:** `openNew()` / `openEdit()` reset `confirmOverwrite` and re-derive `autoStartDate`.
7. No changes to `saveBatch()` — generated dates flow through the existing `dripDates` → content-drip PUT path untouched.

## 4. Test Plan (manual)

1. Create Batch → select course with multiple subjects/chapters → set batch start date → set Classes/Week = 3 → Generate → verify sequential dates across subject boundaries, spacing 2-3 days, week rollover correct.
2. N = 1 → weekly; N = 7 → daily.
3. No start date → Generate → error toast, nothing changes.
4. Manually edit one chapter's date after generation → save → reopen Edit → date persisted.
5. Edit Batch with existing drips → Generate → overwrite confirm appears → confirm → replaced.
6. Clear All → all rows unlock-immediately → save → `content_drip` empty in DB.
7. End date earlier than schedule tail → amber warning appears, save still allowed.
8. Timezone check: generated date shown in row label equals input date (no ±1 day shift).

## 5. Out of Scope / Future

- Weekday-aware scheduling (use Class Routine slots instead of even spacing) — natural Phase 2 once routine semantics (weekly vs date) are fixed.
- Same auto-generate bar in `admin/batch/[id]` detail page.
- "Classes per chapter ≠ 1" weighting.
- Backend `material_id` bug cleanup in `create_batch`.
