# CANDOLER — Chicken Egg Candling (Day 1–21)

A Flask + YOLO backend with a **React (Vite)** frontend and **Supabase**
(Postgres + Storage + Auth). A trained YOLO classifier predicts the incubation
day (1–21) and development stage from a candled egg image.

## Repository layout

| Path | Purpose |
|------|---------|
| `app.py`, `predict.py`, `config.py`, `stage_mapping.py` | Deployed Flask API |
| `models/egg_candling_best.pt` | Trained YOLO classifier |
| `frontend/` | React app (login, dashboard, logs, archive) |
| `supabase/schema.sql` | Postgres schema, indexes, RLS, storage bucket |
| `training/` | Dataset prep + training scripts (**not deployed**) |
| `tests/` | A couple of API tests |

## 1. Supabase setup

1. Create a Supabase project.
2. In **SQL Editor**, run `supabase/schema.sql` (creates `egg_scans`, indexes,
   RLS policies, and the public `egg-images` storage bucket).
3. In **Authentication → Providers**, keep **Email/Password** enabled and create
   a test user.
4. From **Settings → API**, copy: Project URL, `anon` key, `service_role` key,
   and the **JWT Secret**.

## 2. Backend environment

Copy `.env.example` → `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | `service_role` key (server-side only) |
| `SUPABASE_JWT_SECRET` | JWT secret used to verify Bearer tokens |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins, e.g. `http://localhost:5173` |

## 3. Frontend environment

Copy `frontend/.env.example` → `frontend/.env`:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase `anon` key |
| `VITE_API_URL` | Flask base URL, e.g. `http://localhost:5000` |

## 4. Run locally

Backend:

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py                      # http://127.0.0.1:5000
# production-style:
gunicorn --bind 0.0.0.0:8000 app:app
```

Frontend:

```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

## 5. Deploy

**Backend — Docker (Hugging Face Spaces / Render).** A `Dockerfile`
(Python 3.11-slim, CPU torch, gunicorn) is included:

```bash
docker build -t candoler-api .
docker run -p 8000:8000 \
  -e SUPABASE_URL=... -e SUPABASE_SERVICE_KEY=... \
  -e SUPABASE_JWT_SECRET=... -e ALLOWED_ORIGINS=https://your-app.vercel.app \
  candoler-api
```

**Frontend — Vercel.** Import the repo, set **Root Directory = `frontend`**,
framework = Vite, and add the `VITE_*` variables. `frontend/vercel.json`
provides the SPA rewrite for client-side routes.

## 6. API endpoints

All `/api/*` routes require `Authorization: Bearer <Supabase access token>`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API index (no auth) |
| GET | `/api/status` | Model + Supabase status |
| POST | `/api/analyze` | Validate → predict → upload image → insert log (one request) |
| GET | `/api/logs` | Active logs (`day`, `date`, `page`, `per_page`) |
| GET | `/api/archives` | Archived logs (same filters) |
| GET | `/api/logs/<id>` | Single log detail |
| POST | `/api/logs/<id>/archive` | Archive a log |
| POST | `/api/logs/<id>/restore` | Restore an archived log |

`POST /api/analyze` request: `{ "image": "data:image/jpeg;base64,..." }` →
response includes `predicted_day`, `stage`, `confidence`, `top_predictions`,
`low_confidence`, `status`, `warnings`, `image_url`, `date`, `time`.

## 7. Database schema (`egg_scans`)

```sql
id              bigint generated always as identity primary key
user_id         uuid references auth.users(id)
image_url       text
predicted_day   text
stage           text
confidence      double precision
top_predictions jsonb
low_confidence  boolean not null default false
warning         text
is_archived     boolean not null default false
created_at      timestamptz not null default now()
-- indexes: (created_at), (predicted_day)
-- Row Level Security enabled (users only see their own rows)
```

Images are stored in the `egg-images` bucket as
`<Day_N | unassigned>/<timestamp>_<id>.jpg`.

## 8. Tests

```bash
python -m pytest tests/ -q
```
