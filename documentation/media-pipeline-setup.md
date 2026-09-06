# Media Pipeline Setup Guide (Video Upload → HLS → Playback)

এই গাইডে ভিডিও আপলোড পাইপলাইনের সম্পূর্ণ আর্কিটেকচার এবং প্রোডাকশন সেটআপের ধাপগুলো ব্যাখ্যা করা হলো।

---

## ১. আর্কিটেকচার ওভারভিউ

```
┌──────────────┐
│   Browser    │
│(UploadModal) │
└──────┬───────┘
       │ ① POST /api/materials/presign  (filename, content_type, size)
       ▼
┌────────────────────────────────────────────────┐
│  FastAPI                                       │
│  ② ভ্যালিডেশন (extension, size ≤ 500MB)          │
│  ③ Presigned PUT URL ইস্যু (৩০ মিনিটের জন্য)      │
└────────────────────────────────────────────────┘
       │
       │ ④ Browser সরাসরি R2-তে PUT করে (সার্ভার বাইপাস!)
       ▼
┌────────────────────────────────────────────────┐
│  Cloudflare R2 (bucket: iinm)                  │
│  course-materials/{uuid}.mp4                   │
└────────────────────────────────────────────────┘
       │
       │ ⑤ POST /api/materials (file_url + file_key) — confirm
       ▼
┌────────────────────────────────────────────────┐
│  FastAPI                                       │
│  ⑥ head_object দিয়ে ফাইল ভেরিফাই                 │
│  ⑦ DB INSERT (hls_status = pending)            │
│  ⑧ Background task ট্রিগার → 200 OK             │
└────────────────────────────────────────────────┘
       │ (ব্যাকগ্রাউন্ডে)
       ▼
┌────────────────────────────────────────────────┐
│  BG Task: HLS Transcode                        │
│  ⑨ R2 → temp ফাইলে স্ট্রিম ডাউনলোড (RAM-এ নয়)     │
│  ⑩ অটো থাম্বনেইল জেনারেট (FFmpeg, যদি না দেওয়া)   │
│  ⑪ FFmpeg → HLS (1080p, 720p...)               │
│  ⑫ HLS সেগমেন্ট → R2: course-materials/hls/{uuid}/ │
│  ⑬ সোর্স mp4 R2 থেকে ডিলিট (স্টোরেজ বাঁচায়)        │
│  ⑭ DB: hls_status = ready, hls_url সেট          │
└────────────────────────────────────────────────┘
```

**প্লেব্যাক:** `hls_url` থাকলে HLS.js দিয়ে adaptive streaming; না থাকলে native `<video>` fallback।

**স্ট্যাটাস লাইফসাইকেল:** `pending → processing → ready | failed`
- কার্ডে ব্যাজ: QUEUED / PROCESSING / HLS / HLS FAILED (+ Retry HLS বাটন)
- ফেইল হলে মেনু থেকে **Retry HLS** চালানো যায়

---

## ২. প্রোডাকশন সেটআপ (Step by Step)

### Step 1 — R2 Bucket CORS (একবার, আবশ্যক)

ব্রাউজার থেকে সরাসরি R2-তে আপলোড করতে হলে বাকেটে CORS কনফিগ থাকতে হবে।

```bash
cd backend
python scripts/setup_r2_cors.py
```

**এটা কী করে:** R2 বাকেটে CORS rule বসায় — `PUT`/`GET` মেথড, `iinmedu.com` + `localhost:2021` অরিজিন অনুমোদন।

**না চালালে কী হবে:** ব্রাউজারের direct PUT ব্লক হবে এবং আপলোড পুরোনো multipart fallback-এ যাবে (কাজ করবে, কিন্তু nginx/Cloudflare সাইজ লিমিটের শিকার হবে)।

**ম্যানুয়ালি করতে চাইলে:** Cloudflare Dashboard → R2 → bucket `iinm` → Settings → CORS Policy:
```json
[{
  "AllowedMethods": ["PUT", "GET"],
  "AllowedOrigins": ["https://iinmedu.com", "https://www.iinmedu.com", "http://localhost:2021", "http://127.0.0.1:2021"],
  "AllowedHeaders": ["Content-Type", "ETag", "x-amz-content-sha256"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3600
}]
```

---

### Step 2 — nginx: আপলোড বডি লিমিট বাড়ানো

fallback আপলোড ও থাম্বনেইল সার্ভার দিয়ে যায়। nginx-এর ডিফল্ট লিমিট ১MB — এজন্যই আপলোড ২%-এ এসে আটকে যাচ্ছিল।

nginx কনফিগে (api.iinmedu.com এর `server` ব্লকে):

```nginx
client_max_body_size 500M;
```

তারপর:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

### Step 3 — Cloudflare: `/api/*` Cache Bypass

API রেসপন্স ক্যাশ হয়ে গেলে CORS হেডার ছাড়া সার্ভ হয় — এজন্যই র‍্যান্ডম CORS এরর আসত (`/api/contact/settings` এ)।

**Cloudflare Dashboard → Caching → Cache Rules → Create rule:**
- Rule name: `API bypass`
- If: URI Path **starts with** `/api/`
- Then: **Bypass cache**

---

### Step 3b — Cloudflare: HLS সেগমেন্ট ক্যাশিং (ভিডিও buffering কমানো, আবশ্যক)

Cloudflare-এর **default cache extension list-এ `.ts` এবং `.m3u8` নেই**। ফলে প্রতিটি HLS
segment প্রতিবার R2 origin থেকে আসে — এটাই ভিডিও প্লেব্যাকে buffering-এর সবচেয়ে বড় কারণ।

HLS আউটপুট immutable (transcode-এর পর কখনো বদলায় না, নতুন ভিডিও = নতুন UUID ফোল্ডার),
তাই আক্রমণাত্মকভাবে ক্যাশ করা সম্পূর্ণ নিরাপদ।

**Cloudflare Dashboard → Caching → Cache Rules → Create rule:**

Rule 1 — HLS segments:
- Rule name: `HLS segments cache`
- If: URI Path **starts with** `/course-materials/hls/` **AND** File extension **equals** `ts`
- Then: **Eligible for cache**
- Edge TTL: **Ignore cache-control header and use this TTL** → `1 month`

Rule 2 — HLS playlists:
- Rule name: `HLS playlists cache`
- If: URI Path **starts with** `/course-materials/hls/` **AND** File extension **equals** `m3u8`
- Then: **Eligible for cache**
- Edge TTL: **Ignore cache-control header and use this TTL** → `1 hour`

**প্রভাব:** প্রথম দর্শকের পরেই সব segment Cloudflare edge থেকে সার্ভ হবে —
seek/startup buffering উল্লেখযোগ্যভাবে কমবে, R2 egress খরচও কমবে।

---

### Step 4 — Backend Deploy + DB Migration

```bash
# সার্ভারে
cd /path/to/backend
git pull
pip install -r requirements.txt   # যদি নতুন dependency থাকে
alembic upgrade head              # hls_status, hls_error কলাম যোগ হয়
# uvicorn রিস্টার্ট
sudo systemctl restart iinm-api   # অথবা তোমার সার্ভিসের নাম
```

**মাইগ্রেশন:** `f8b9c0d1e2f3_add_hls_status_to_course_materials.py`

---

### Step 5 — ব্রাউজার ভেরিফিকেশন

1. **হার্ড রিফ্রেশ:** `Ctrl + Shift + R` (নতুন CSP লোড হতে — `media-src`-তে `cdn.iinmedu.com` যোগ হয়েছে)
2. `/admin/masters/curriculum/media` → **Add to Library** → ভিডিও আপলোড
3. কার্ডে ব্যাজ দেখো: `QUEUED → PROCESSING → HLS`
4. ভিডিও প্রিভিউ প্লে করে দেখো (HLS.js adaptive streaming)
5. HLS ফেইল হলে কার্ড মেনু → **Retry HLS**

---

## ৩. নতুন ফিচারসমূহ

### অটো থাম্বনেইল
- আপলোডের সময় থাম্বনেইল না দিলে BG task FFmpeg দিয়ে ভিডিওর ১ সেকেন্ডের ফ্রেম থেকে থাম্বনেইল বানায় (1280px wide JPEG)
- R2-তে সেভ হয়: `course-materials/thumbnails/{uuid}.jpg`
- ইউজার থাম্বনেইল দিলে সেটাই থাকে (অটো জেনারেট হয় না)

### Orphaned Files ট্যাব
`/admin/masters/curriculum/media` → **🗑️ Orphaned Files** ট্যাব

তিন ধরনের ফাইল দেখায়:
| ধরন | বর্ণনা |
|------|--------|
| **Redundant source** | HLS ready হওয়ার পরেও থেকে যাওয়া সোর্স ভিডিও (পলিসি: ডিলিট করা উচিত) |
| **Orphan HLS folder** | এমন HLS ফোল্ডার যেটা কোনো ম্যাটেরিয়াল ব্যবহার করছে না |
| **Unreferenced file** | কোনো ম্যাটেরিয়াল যে ফাইল রেফারেন্সই করছে না |

প্রতিটার সাথে: path, size, last modified, কোন ম্যাটেরিয়ালের। চেকবক্স সিলেক্ট করে **Delete Selected** চাপলে R2 থেকে মুছে যায়। রেফারেন্সড কী ভুলে ডিলিট হতে পারে না (সার্ভার আবার ভেরিফাই করে)।

### API Endpoints (নতুন)
| Method | Path | কাজ |
|--------|------|-----|
| POST | `/api/materials/presign` | Presigned PUT URL ইস্যু |
| POST | `/api/materials/{id}/retranscode` | ফেইলড transcode রিট্রাই |
| GET | `/api/materials/orphaned` | অরফান ফাইল লিস্ট |
| POST | `/api/materials/orphaned/delete` | সিলেক্টেড অরফান ডিলিট |

---

## ৪. ট্রাবলশুটিং

| লক্ষণ | কারণ | সমাধান |
|-------|------|--------|
| আপলোড ২%-এ আটকে | nginx body limit | Step 2 |
| ভিডিও লোডিং-এ আটকে, কনসোলে CSP এরর | পুরোনো CSP ক্যাশড | Step 5 (হার্ড রিফ্রেশ) |
| Direct upload করলে CORS এরর কনসোলে | R2 bucket CORS নেই | Step 1 |
| র‍্যান্ডম API CORS এরর | Cloudflare ক্যাশ | Step 3 |
| HLS ব্যাজ FAILED | FFmpeg নেই / transcode ফেইল | HLS ট্যাবে FFmpeg স্ট্যাটাস দেখো → Retry HLS |
| `hls_status` কলাম এরর | Migration বাকি | Step 4 |

---

## ৫. সিকিউরিটি নোটস

- Presigned URL: শুধু PUT, শুধু সার্ভার-জেনারেটেড key (`course-materials/{uuid}{ext}`), ৩০ মিনিট expiry, approved device token ছাড়া ইস্যু হয় না
- Confirm-এ `head_object` দিয়ে ফাইল আবার ভেরিফাই হয় (সাইজ ≤ 500MB, extension ব্লকলিস্ট)
- ডিলিট রাউটে R2 HLS ফোল্ডার batch-delete হয় — অরফান স্টোরেজ লিক বন্ধ
- সব আপলোড/ডিলিট endpoint approved device token চায়
