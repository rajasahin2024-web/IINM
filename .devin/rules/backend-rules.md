---
trigger: model_decision
description: Whend Developing Backend Coding 
---

# Backend Development Rules

## 1. Query Optimization

- **Always use optimized queries.** `joinedload()`, `selectinload()` use korbe relationship fetch er jonno. N+1 query avoid korun.
- List endpoints e pagination implement korun (`limit`, `offset` query params). Kobhu sob record ekbar e return korben na.
- `select()` statement use korbe instead of `query()` where possible (SQLAlchemy 2.0 style).
- Heavy reports/statistics er jonno raw SQL / `text()` use korte parben jodi ORM inefficient hoy.
- Kobhu `SELECT *` type query korben na — shudhu dorkar column select korun.

## 2. Minimal Table Creation

- Multiple table create korben na unnecessarily. Eki type er data er jonno existing table reuse korun.
- New table create korar agey debe existing schema te kono way nai kina check korun.
- Association/junction table shudhumatro many-to-many relationship er jonnoi use korun.
- Table er naam singular rakun (e.g., `student` na `students`).

## 3. Performance & Security

- DB operations and API endpoints jeno fast and secure hoy.
- **Sob inputs validate korun** Pydantic schemas diye.
- SQL injection impossible korun — shudhu ORM use korun, raw string concatenation korben na.
- Sensitive data (password, API keys, tokens) env variable e rakun. Kobhu code e hardcode korben na.
- File upload e MIME type, extension, size validate korun.
- Rate limiting add korun sensitive endpoints e (login, device request).
- API response e internal error details expose korben na — generic message return korun.

## 4. Migration Safety

- Jodi migration korte hoy, **Alembic autogenerate** use korun:
  ```bash
  alembic revision --autogenerate -m "description"
  ```
- **Existing kono table delete korben na** migration e. Data loss hote pare.
- Migration apply korar agey generated SQL review korun:
  ```bash
  alembic upgrade head --sql
  ```
- Fresh DB te `Base.metadata.create_all()` chalay `alembic stamp head` korte hobe first time.
- Downgrade script o write korun jodi rollback dorkar hoy.

## 5. API Design Standards

- RESTful conventions follow korun: `GET /api/items`, `POST /api/items`, `GET /api/items/{id}`
- HTTP status code properly use korun: `200`, `201`, `400`, `401`, `403`, `404`, `500`
- Error response consistent format e return korun:
  ```json
  { "detail": "Error message here" }
  ```
- Large response e pagination, filtering, sorting support korun.

## 6. Code Quality

- Type hints use korun (Python 3.12+ features leverage korun).
- Function names descriptive hote hobe (e.g., `get_student_by_id`, not `get_data`).
- Docstring add korun complex functions e.
- `print()` er bodole `logging` module use korun.
- Circular import avoid korun — shared schemas separate file e rakun.

## 7. Environment & Deployment

- `.env` file e sensitive keys rakun, git e push korben na.
- Production e `--reload` flag use korben na (`uvicorn main:app --host 0.0.0.0 --port 2007`).
- Log files regularly clean korun, sensitive data log e expose korben na.
- Database backup regularly nite hobe production environment e.

## 8. Caching Policy (MANDATORY for all new public GET endpoints)

- **Near-static public GET endpoints must be cached** using `backend/cache.py` (`cache_get` / `cache_set`).
  - Examples: site settings, navbar, footer-menu, hero, partners, home sections, contact settings, about public data, SEO public pages/redirects, maintenance status.
- **Cache korben na:**
  - Admin-only data
  - Per-user / per-session data
  - Sensitive settings (tokens, credentials)
  - Data jekhane freshness critical (real-time data)
  - SQLAlchemy ORM objects with lazy relationships — always serialize to dict/Pydantic model before caching.
- **Default TTL: 300 seconds (5 min).** Maintenance status er jonno shorter TTL (30-60s) use korun.
- **Cache key convention:** endpoint path + query params (e.g., `"settings:site"`, `"seo:redirects"`).
- **Cache invalidation MANDATORY** in every mutation endpoint (PUT/POST/DELETE/upload) je public response change kore.
  - Related cache keys invalidate korun `cache_invalidate()` diye.
  - Example: navbar update korle `"settings:navbar"` + `"settings:site"` invalidate korun.
- **Admin cache-management routes** already exist: `DELETE /api/settings/cache/clear`, `GET /api/settings/cache/stats` (protected by `_require_admin_device`).
- **Multi-worker note:** Cache is process-local. Multiple Uvicorn workers = separate caches. Production multi-process er jonno Redis upgrade plan rakun.
- **Cache stats check:** Development e `GET /api/settings/cache/stats` diye hit/miss ratio verify korun.

## 9. Database Connection Pool Management

- Current config (`database.py`): `pool_size=10`, `max_overflow=20`, `pool_timeout=60`, `pool_recycle=1800`, `pool_pre_ping=True`.
- **Total connections per process = pool_size + max_overflow = 30.**
- **Multi-worker total = 30 × worker_count.** PostgreSQL `max_connections` er sathe compare korun before increasing workers/pool.
- Pool size barano optimization er solution noy — caching + dedup first, then pool tune korun.
- `pool_recycle` < PostgreSQL `idle_in_transaction_session_timeout` rakun.
- Slow query / connection leak suspect korle SQLAlchemy pool event listeners add kore checkout/checkin log korun.

## 10. Middleware (ASGI, NOT BaseHTTPMiddleware)

- **`BaseHTTPMiddleware` use korben na** — known performance/compatibility limitations (request body consumption, streaming issues).
- Pure ASGI middleware likhun (`__call__` with `scope, receive, send`).
- Security headers middleware already implemented as pure ASGI in `main.py` — preserve all headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- Middleware e response body consume/buffer korben na — headers only.

## 11. Async/Sync SQLAlchemy Awareness

- `async def` endpoint er bhitor synchronous `Session` (`db.query(...)`) use korle event loop block hoy.
- New endpoint likhar somoy:
  - Synchronous DB work korle `def` (not `async def`) use korun — FastAPI threadpool e chalabe.
  - Ba SQLAlchemy async engine/session use korun (`AsyncSession`, `select()` awaitable).
- Existing 117+ async-with-sync endpoints refactor ekta alada boro effort — new code e ei vul korben na.
