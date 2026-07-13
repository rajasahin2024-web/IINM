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
