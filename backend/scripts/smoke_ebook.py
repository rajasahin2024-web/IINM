"""Smoke test for IIN-156 ebook backend paths against a local uvicorn on :2099."""
import sys, os, hmac, hashlib, uuid, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from database import SessionLocal
import models

BASE = os.environ.get("SMOKE_BASE_URL", "http://127.0.0.1:2099")
DEVICE_TOKEN = os.environ.get("SMOKE_DEVICE_TOKEN", "")
if not DEVICE_TOKEN:
    print("SMOKE_DEVICE_TOKEN env var (approved device token) is required")
    sys.exit(1)
DEVICE = {"X-Device-Token": DEVICE_TOKEN}
SECRET = "smoketestsecret123"
SUFFIX = uuid.uuid4().hex[:6]

db = SessionLocal()
FAIL = []

def check(name, cond, extra=""):
    status = "PASS" if cond else "FAIL"
    print(f"[{status}] {name} {extra}")
    if not cond:
        FAIL.append(name)

# ── seed payment settings ──
ps = db.query(models.PaymentSettings).first()
if not ps:
    ps = models.PaymentSettings(is_test_mode=True, razorpay_test_key_id="rzp_test_smoke",
                                razorpay_test_key_secret=SECRET)
    db.add(ps); db.commit()
else:
    ps.is_test_mode = True
    ps.razorpay_test_key_secret = SECRET
    db.commit()

def sig(order_id, payment_id):
    return hmac.new(SECRET.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()

# ── 1. create ebook course via admin API ──
r = requests.post(f"{BASE}/api/courses", headers=DEVICE, json={
    "title": f"Smoke eBook {SUFFIX}", "description": "smoke", "price": 499,
    "course_type": "ebook", "status": "PUBLISHED", "has_certificate": True,
})
check("create ebook course", r.status_code in (200, 201), r.text[:300])
course = r.json(); course_id = course["id"]
check("course_type echoed", course.get("course_type") == "ebook")

# invalid course type rejected
r = requests.post(f"{BASE}/api/courses", headers=DEVICE, json={
    "title": f"Bad type {SUFFIX}", "price": 1, "course_type": "bogus",
})
check("invalid course_type rejected", r.status_code == 400, r.text[:150])

# ── 2. subject + chapter + ebook material ──
sub = models.Subject(name=f"SmokeSub {SUFFIX}")
db.add(sub); db.flush()
ch = models.Chapter(title=f"SmokeCh {SUFFIX}", subject_id=sub.id)
db.add(ch); db.commit()

r = requests.put(f"{BASE}/api/courses/{course_id}", headers=DEVICE,
                 json={"chapter_ids": [ch.id]})
check("attach chapter to course", r.status_code == 200, r.text[:200])

pdf_bytes = b"%PDF-1.4 smoke test ebook content " + os.urandom(4096)
r = requests.post(f"{BASE}/api/materials", headers=DEVICE,
                  files={"file": ("smoke.pdf", pdf_bytes, "application/pdf")},
                  data={"title": f"SmokeBook {SUFFIX}", "is_ebook": "true",
                        "ebook_page_count": "12",
                        "ebook_toc": json.dumps([{"title": "Intro", "page": 1},
                                                 {"title": "Ch2", "page": 5},
                                                 {"title": "Ch3", "page": 9}])})
check("upload private ebook material", r.status_code in (200, 201), r.text[:300])
mat = r.json(); mat_id = mat["id"]
check("ebook file_type", mat.get("file_type") == "ebook")
check("ebook key private", mat.get("has_ebook_file") is True and
      "ebook_file_key" not in mat, mat.get("has_ebook_file"))
_dbmat = db.query(models.CourseMaterial).get(mat_id)
check("key stored server-side", (_dbmat.ebook_file_key or "").startswith(("ebooks/", "local/ebooks/")),
      _dbmat.ebook_file_key)
check("no public file_url", not mat.get("file_url"))
check("toc stored", isinstance(mat.get("ebook_toc"), list) and len(mat["ebook_toc"]) == 3)

# attach material to chapter via admin endpoint
r = requests.post(f"{BASE}/api/chapters/{ch.id}/materials/{mat_id}", headers=DEVICE)
check("attach material to chapter", r.status_code in (200, 201, 409), r.text[:200])

# ── 3. ebook purchase: verify_and_register with fabricated signature ──
order_id = f"order_smoke{SUFFIX}"
pay_id = f"pay_smoke{SUFFIX}"
email = f"smoke_{SUFFIX}@test.local"
r = requests.post(f"{BASE}/api/public/slot-booking/verify-and-register", json={
    "razorpay_order_id": order_id, "razorpay_payment_id": pay_id,
    "razorpay_signature": sig(order_id, pay_id),
    "course_id": course_id, "email": email, "first_name": "Smoke",
    "last_name": "Test", "phone": f"90{int(SUFFIX, 16) % 100000000:08d}",
    "amount_paid": 499.0, "agree_terms": True,
})
check("ebook verify_and_register", r.status_code == 200, r.text[:400])
body = r.json()
student_cookie = r.cookies.get("iinm_student_token")
check("auto-login cookie set", bool(student_cookie))
check("auto_login flag", body.get("auto_login") is True, str(body.get("auto_login")))

student = db.query(models.Student).filter(models.Student.email == email).first()
enroll = db.query(models.BatchEnrollment).filter(
    models.BatchEnrollment.student_id == student.id).first()
check("auto enrollment exists", enroll is not None)
ebatch = db.query(models.Batch).get(enroll.batch_id)
check("enrolled in ebook batch", ebatch.batch_type == "ebook")

# duplicate purchase blocked
r = requests.post(f"{BASE}/api/public/slot-booking/verify-and-register", json={
    "razorpay_order_id": order_id + "2", "razorpay_payment_id": pay_id + "2",
    "razorpay_signature": sig(order_id + "2", pay_id + "2"),
    "course_id": course_id, "email": email, "first_name": "Smoke",
    "phone": f"90{int(SUFFIX, 16) % 100000000:08d}",
    "amount_paid": 499.0, "agree_terms": True,
})
check("duplicate purchase rejected", r.status_code == 400, r.text[:200])

# ── 4. reader endpoints ──
CK = {"iinm_student_token": student_cookie}
r = requests.get(f"{BASE}/api/student/ebooks/{mat_id}", cookies=CK)
check("ebook meta", r.status_code == 200, r.text[:200])
meta = r.json()
check("meta has toc", len(meta.get("toc", [])) == 3)
check("meta no file url", "file_url" not in meta and not meta.get("file_key"))

# unauthorized access
r = requests.get(f"{BASE}/api/student/ebooks/{mat_id}")
check("meta requires auth", r.status_code == 401)
r = requests.get(f"{BASE}/api/student/ebooks/{mat_id}/file")
check("file requires auth", r.status_code == 401)

# a different non-purchasing student gets 403
other_email = f"other_{SUFFIX}@test.local"
other = models.Student(first_name="No", last_name="Buy", email=other_email, is_active=True)
db.add(other); db.commit()
from security import make_student_token
other_ck = {"iinm_student_token": make_student_token(other.id)}
r = requests.get(f"{BASE}/api/student/ebooks/{mat_id}/file", cookies=other_ck)
check("non-buyer denied", r.status_code == 403)

# range request
r = requests.get(f"{BASE}/api/student/ebooks/{mat_id}/file", cookies=CK,
                 headers={"Range": "bytes=0-99"})
check("range 206", r.status_code == 206, f"got {r.status_code}")
check("range content-range", r.headers.get("Content-Range", "").startswith("bytes 0-99/"))
check("range bytes", len(r.content) == 100)
r = requests.get(f"{BASE}/api/student/ebooks/{mat_id}/file", cookies=CK)
check("full file 200", r.status_code == 200 and len(r.content) == len(pdf_bytes))
check("no-store cache", "no-store" in r.headers.get("Cache-Control", ""))

# ── 5. reading progress + chapter completion ──
r = requests.put(f"{BASE}/api/student/ebooks/{mat_id}/progress", cookies=CK,
                 json={"last_page": 5, "last_chapter_index": 1})
check("progress upsert", r.status_code == 200 and r.json()["progress"]["last_page"] == 5)

for i in range(3):
    r = requests.put(f"{BASE}/api/student/ebooks/{mat_id}/chapters/{i}", cookies=CK,
                     json={"is_completed": True})
check("all chapters complete", r.status_code == 200 and r.json().get("material_completed") is True,
      r.text[:200])
db.expire_all()
bmp = db.query(models.BatchStudentMaterialProgress).filter(
    models.BatchStudentMaterialProgress.student_id == student.id,
    models.BatchStudentMaterialProgress.material_id == mat_id).first()
check("material progress mirrored", bmp is not None and bmp.is_completed is True)

# invalid chapter index
r = requests.put(f"{BASE}/api/student/ebooks/{mat_id}/chapters/9", cookies=CK,
                 json={"is_completed": True})
check("bad chapter idx rejected", r.status_code == 400)

# ── 6. mock test paywall + entitlement ──
exam = models.Exam(code=f"exam_mt_{SUFFIX}", title=f"SmokeMock {SUFFIX}",
                   status="Published", pass_percentage=50.0)
db.add(exam); db.flush()
course_obj = db.query(models.Course).get(course_id)
course_obj.mock_test_exam_id = exam.id
course_obj.mock_test_price = 199.0
db.commit()
assign = models.BatchExamAssignment(batch_id=ebatch.id, exam_id=exam.id, status="active")
db.add(assign); db.commit()

# mock-test config endpoint
r = requests.get(f"{BASE}/api/student/courses/{course_id}/mock-test", cookies=CK)
check("mock-test config", r.status_code == 200, r.text[:200])
cfg = r.json()
check("is_paid", cfg.get("is_paid") is True and cfg.get("price") == 199.0)
check("not entitled yet", cfg.get("entitled") is False)
check("assignment resolved", cfg.get("assignment_id") == assign.id)

# exam list shows paywall
r = requests.get(f"{BASE}/api/student/courses/{course_id}/exams", cookies=CK)
check("exams list", r.status_code == 200, r.text[:200])
exams = r.json().get("exams", [])
mock_e = next((e for e in exams if e.get("is_mock_test")), None)
check("exam flagged mock", mock_e is not None)
check("paywall state", mock_e and mock_e["state"] == "payment_required")

# start blocked
r = requests.post(f"{BASE}/api/student/exam-assignments/{assign.id}/start", cookies=CK)
check("paid mock test blocked", r.status_code == 403 and
      (r.json().get("detail", {}) or {}).get("error") == "mock_test_payment_required",
      r.text[:200])

# create-order requires razorpay client — expect 503 without key_id connectivity but
# at least verify it's not a 404/500-schema error. Actually key_id is set ("rzp_test_smoke")
# — razorpay SDK call will fail w/o network; acceptable either way, but must not be 403.
r = requests.post(f"{BASE}/api/student/courses/{course_id}/mock-test/create-order", cookies=CK)
check("create-order reachable", r.status_code in (200, 502), f"got {r.status_code} {r.text[:120]}")

# verify mock-test payment with fabricated sig → entitlement
mt_order, mt_pay = f"mt_order{SUFFIX}", f"mt_pay{SUFFIX}"
r = requests.post(f"{BASE}/api/student/courses/{course_id}/mock-test/verify", cookies=CK, json={
    "razorpay_order_id": mt_order, "razorpay_payment_id": mt_pay,
    "razorpay_signature": sig(mt_order, mt_pay),
})
check("mock-test verify", r.status_code == 200 and r.json().get("status") == "success", r.text[:200])
ent = db.query(models.MockTestEntitlement).filter(
    models.MockTestEntitlement.student_id == student.id,
    models.MockTestEntitlement.course_id == course_id).first()
check("entitlement row", ent is not None and ent.status == "paid")

# idempotent re-verify
r = requests.post(f"{BASE}/api/student/courses/{course_id}/mock-test/verify", cookies=CK, json={
    "razorpay_order_id": mt_order, "razorpay_payment_id": mt_pay,
    "razorpay_signature": sig(mt_order, mt_pay),
})
check("verify idempotent", r.status_code == 200 and r.json().get("already_unlocked") is True)

# bad signature rejected
r = requests.post(f"{BASE}/api/student/courses/{course_id}/mock-test/verify", cookies=CK, json={
    "razorpay_order_id": mt_order, "razorpay_payment_id": mt_pay + "x",
    "razorpay_signature": "deadbeef",
})
check("bad sig rejected", r.status_code == 400)

# start now allowed
r = requests.post(f"{BASE}/api/student/exam-assignments/{assign.id}/start", cookies=CK)
check("start after entitlement", r.status_code == 201, r.text[:200])

# certificate: still pending until attempt is submitted & passed
r = requests.get(f"{BASE}/api/student/courses/{course_id}/certificate", cookies=CK)
check("cert pending before pass", r.status_code == 200 and r.json().get("state") == "pending",
      r.text[:200])

# simulate a passed submitted attempt
att = db.query(models.StudentExamAttempt).filter(
    models.StudentExamAttempt.student_id == student.id,
    models.StudentExamAttempt.assignment_id == assign.id).first()
att.status = "submitted"; att.passed = True; att.score = 80.0
db.commit()
r = requests.get(f"{BASE}/api/student/courses/{course_id}/certificate", cookies=CK)
check("cert eligible after pass", r.status_code == 200 and r.json().get("state") in ("eligible", "issued"),
      r.text[:200])

# ── 7. free mock test: price null → no paywall ──
exam2 = models.Exam(code=f"exam_free_{SUFFIX}", title=f"FreeMock {SUFFIX}",
                    status="Published", pass_percentage=40.0)
db.add(exam2); db.flush()
assign2 = models.BatchExamAssignment(batch_id=ebatch.id, exam_id=exam2.id, status="active")
db.add(assign2)
course_obj.mock_test_exam_id = exam2.id
course_obj.mock_test_price = None
db.commit()
r = requests.post(f"{BASE}/api/student/exam-assignments/{assign2.id}/start", cookies=CK)
check("free mock test starts", r.status_code == 201, r.text[:200])

# ── 8. live-batch regression ──
r = requests.post(f"{BASE}/api/courses", headers=DEVICE, json={
    "title": f"SmokeLive {SUFFIX}", "price": 999, "course_type": "live_batch",
    "status": "PUBLISHED",
})
live_course = r.json(); live_cid = live_course["id"]
check("live course type", live_course.get("course_type") == "live_batch")
lb = models.Batch(course_id=live_cid, name=f"LiveBatch {SUFFIX}", batch_type="standard",
                  status="Upcoming", max_capacity=50, mode="Online")
db.add(lb); db.commit()
lo, lp = f"live_order{SUFFIX}", f"live_pay{SUFFIX}"
r = requests.post(f"{BASE}/api/public/slot-booking/verify-and-register", json={
    "razorpay_order_id": lo, "razorpay_payment_id": lp,
    "razorpay_signature": sig(lo, lp),
    "course_id": live_cid, "batch_id": lb.id,
    "email": f"live_{SUFFIX}@test.local", "first_name": "Live",
    "phone": f"91{int(SUFFIX, 16) % 100000000:08d}",
    "amount_paid": 999.0, "agree_terms": True,
})
check("live purchase works", r.status_code == 200, r.text[:300])
check("live purchase no auto-login", "iinm_student_token" not in r.cookies)
live_student = db.query(models.Student).filter(
    models.Student.email == f"live_{SUFFIX}@test.local").first()
live_enroll = db.query(models.BatchEnrollment).filter(
    models.BatchEnrollment.student_id == live_student.id,
    models.BatchEnrollment.batch_id == lb.id).first()
check("live enrollment in chosen batch", live_enroll is not None)

# batch-status gate preserved (non-Upcoming rejected)
lb.status = "Ongoing"; db.commit()
lo2, lp2 = f"live_order2{SUFFIX}", f"live_pay2{SUFFIX}"
r = requests.post(f"{BASE}/api/public/slot-booking/verify-and-register", json={
    "razorpay_order_id": lo2, "razorpay_payment_id": lp2,
    "razorpay_signature": sig(lo2, lp2),
    "course_id": live_cid, "batch_id": lb.id,
    "email": f"live2_{SUFFIX}@test.local", "first_name": "Live2",
    "phone": f"92{int(SUFFIX, 16) % 100000000:08d}",
    "amount_paid": 999.0, "agree_terms": True,
})
check("live ongoing batch rejected", r.status_code == 400)

# existing courses still live_batch
old = db.query(models.Course).filter(models.Course.id < course_id).order_by(models.Course.id).first()
check("existing course is live_batch", (old.course_type or "live_batch") == "live_batch",
      f"course {old.id} = {old.course_type}")

# ── 9. ebook_video sequential lock ──
r = requests.post(f"{BASE}/api/courses", headers=DEVICE, json={
    "title": f"SmokeEV {SUFFIX}", "price": 299, "course_type": "ebook_video",
    "status": "PUBLISHED",
})
ev_course = r.json(); ev_id = ev_course["id"]
sub2 = models.Subject(name=f"EVSub {SUFFIX}"); db.add(sub2); db.flush()
ch2 = models.Chapter(title=f"EVCh {SUFFIX}", subject_id=sub2.id); db.add(ch2); db.commit()
requests.put(f"{BASE}/api/courses/{ev_id}", headers=DEVICE, json={"chapter_ids": [ch2.id]})

r = requests.post(f"{BASE}/api/materials", headers=DEVICE,
                  files={"file": ("ev.pdf", pdf_bytes, "application/pdf")},
                  data={"title": f"EVBook {SUFFIX}", "is_ebook": "true",
                        "ebook_toc": json.dumps([{"title": "Only", "page": 1}])})
ev_mat = r.json(); ev_mat_id = ev_mat["id"]
requests.post(f"{BASE}/api/chapters/{ch2.id}/materials/{ev_mat_id}", headers=DEVICE)

vid = models.CourseMaterial(title=f"EVVid {SUFFIX}", file_type="video",
                            file_url="https://example.com/video.mp4", youtube_url=None)
db.add(vid); db.commit()
requests.post(f"{BASE}/api/chapters/{ch2.id}/materials/{vid.id}", headers=DEVICE)

# buy it
eo, ep = f"ev_order{SUFFIX}", f"ev_pay{SUFFIX}"
r = requests.post(f"{BASE}/api/public/slot-booking/verify-and-register", json={
    "razorpay_order_id": eo, "razorpay_payment_id": ep,
    "razorpay_signature": sig(eo, ep),
    "course_id": ev_id, "email": f"ev_{SUFFIX}@test.local", "first_name": "EV",
    "phone": f"93{int(SUFFIX, 16) % 100000000:08d}",
    "amount_paid": 299.0, "agree_terms": True,
})
check("ev purchase", r.status_code == 200, r.text[:200])
ev_ck = {"iinm_student_token": r.cookies.get("iinm_student_token")}

r = requests.get(f"{BASE}/api/student/courses/{ev_id}", cookies=ev_ck)
check("dashboard loads", r.status_code == 200, r.text[:200])
if r.status_code == 200:
    mats = []
    for c in r.json().get("chapters", []):
        mats += c.get("materials", [])
    ev_vid = next((m for m in mats if m["id"] == vid.id), None)
    check("video locked pre-read", ev_vid is not None and ev_vid.get("locked") is True
          and ev_vid.get("file_url") is None)
    # complete ebook → video unlocks
    requests.put(f"{BASE}/api/student/ebooks/{ev_mat_id}/chapters/0", cookies=ev_ck,
                 json={"is_completed": True})
    r2 = requests.get(f"{BASE}/api/student/courses/{ev_id}", cookies=ev_ck)
    mats2 = []
    for c in r2.json().get("chapters", []):
        mats2 += c.get("materials", [])
    ev_vid2 = next((m for m in mats2 if m["id"] == vid.id), None)
    check("video unlocked post-read", ev_vid2 is not None and
          ev_vid2.get("locked") is False and ev_vid2.get("file_url"))

print("\n==== RESULT:", "ALL PASS" if not FAIL else f"{len(FAIL)} FAILURES: {FAIL}")
db.close()
sys.exit(1 if FAIL else 0)
