# Project Setup Guide (IINM LMS)

## Project Overview

- **Frontend:** Next.js 16 + React 19 + TypeScript + TailwindCSS 4
- **Backend:** FastAPI + SQLAlchemy + PostgreSQL + Alembic

---

## Backend Setup & Run

### Prerequisites
- Python 3.12+
- PostgreSQL (running and accessible)

### 1. Create & Activate Virtual Environment
Create a virtual environment inside the `backend` folder:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 3. Environment Variables
Backend `.env` already exists at `backend/.env`. Key variables:
- `DATABASE_URL` — PostgreSQL connection string
- `BASE_URL` — backend base URL (default: `http://localhost:2007`)
- `ENABLE_DOCS` — set to `true` to enable FastAPI Swagger docs

No changes are required unless you want to connect to a local database.

### 4. Database Setup
On a **fresh database**, the tables are auto-created automatically when the server starts (`Base.metadata.create_all`).

**After the first successful server start**, stamp Alembic head so Alembic knows the current state:
```bash
cd backend
alembic stamp head
```

For future schema changes:
```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### 5. Run the Backend Server
Make sure you are inside the `backend` folder and the virtual environment is active.

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 2007
```

Backend will be available at: `http://localhost:2007`

API docs (if `ENABLE_DOCS=true`): `http://localhost:2007/docs`

---

## Frontend Setup & Run

### 1. Navigate to Frontend Folder
```bash
cd frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Frontend `.env.local` already exists at `frontend/.env.local`. Key variables:
- `NEXT_PUBLIC_API_URL` — backend API URL (`http://localhost:2007/api`)
- `NEXT_PUBLIC_BASE_URL` — backend base URL (`http://localhost:2007`)

### 4. Run the Frontend Dev Server
```bash
npm run dev
```

Frontend will be available at: `http://localhost:2021`

---

## Quick Start (Both Together)

Open **two terminal tabs**:

**Tab 1 — Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 2007
```

**Tab 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Then open `http://localhost:2021` in your browser.

---

## Production Build

### Frontend Build
```bash
cd frontend
npm run build
npm start
```

### Backend Run (Production)
```bash
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 2007
```

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Styling | TailwindCSS 4 |
| Language | TypeScript |
| Backend Framework | FastAPI |
| ORM | SQLAlchemy |
| Database | PostgreSQL |
| Migrations | Alembic |
| Server | Uvicorn |

---

## HLS Video Streaming (Adaptive Bitrate)

The LMS supports HLS (HTTP Live Streaming) for minimal-buffering video playback. HLS automatically adjusts video quality to the viewer's network speed.

### How It Works

1. Admin uploads a video via **Course Media Library** (`/admin/masters/curriculum/media`)
2. If HLS is enabled, the backend transcodes the video to HLS in the background (using FFmpeg)
3. HLS segments + master playlist are uploaded to **Cloudflare R2** (local temp files are deleted after upload)
4. The course page player uses `hls.js` for adaptive playback (Safari uses native HLS)

### FFmpeg Installation (Required for HLS)

FFmpeg must be installed on the server. The admin panel auto-detects it.

**Windows:**
```bash
winget install Gyan.FFmpeg
```
Or download from https://ffmpeg.org/download.html#build-windows and add the `bin` folder to your PATH.

**Debian/Ubuntu:**
```bash
sudo apt update
sudo apt install -y ffmpeg
```

### HLS Configuration

1. Go to **Admin → Settings → R2** (`/admin/settings/r2`)
2. Click the **"HLS Streaming"** tab
3. Verify FFmpeg is detected (green badge = installed, red = not found)
4. Toggle **"Enable HLS Transcoding"**
5. Select quality renditions (default: 720p, 480p, 360p)
6. Click **Save**

### Notes

- HLS transcoding runs in the **background** after upload — the upload response returns immediately
- The video is playable as raw MP4 immediately, and switches to HLS once transcoding completes (after page reload)
- Local temp files are **always deleted** after R2 upload — no permanent local storage
- Existing videos (uploaded before HLS was enabled) play as raw MP4 — re-upload to get HLS streams
- HLS is only supported through the **Course Media Library** upload path, not the playlist editor's direct upload
- If FFmpeg is not installed, HLS silently skips (no crash, raw MP4 fallback)



cd /www/wwwroot/iinm
source .venv/bin/activate
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 2007


cd d:\OneDrive\iinm\backend
.\venv\Scripts\activate
uvicorn main:app --host 127.0.0.1 --port 2007 --reload


Main admin login (/api/login) credentials:

Email: admin@iinm.com
Password: admin123

email: deviceadmin@gmail.com
password: admin123