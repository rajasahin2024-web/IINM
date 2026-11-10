"""Smoke test for IIN-177 micro course backend paths against a local uvicorn on :2099."""
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

# ── 1. create micro course via admin API ──
r = requests.post(f"{BASE}/api/courses", headers=DEVICE, json={
    "title": f"SmokeMicro {SUFFIX}", "description": "smoke", "price": 299,
    "course_type": "micro", "status": "PUBLISHED", "has_certificate": True,
})
check("create micro course", r.status_code in (200, 201), r.text[:300])
course = r.json(); course_id = course["id"]
check("course_type echoed", course.get("course_type") == "micro")

# ── 2. public courses course_type filter ──
r = requests.get(f"{BASE}/api/public/courses", params={"course_type": "micro"})
check("public list 200", r.status_code == 200, r.text[:200])
items = r.json()
check("micro filter contains course", any(i["id"] == course_id for i in items))
check("micro filter only micro", all((i.get("course_type") or "live_batch") == "micro" for i in items))

r = requests.get(f"{BASE}/api/public/courses", params={"course_type": "ebook"})
check("ebook filter excludes micro", all(i["id"] != course_id for i in r.json()))

r = requests.get(f"{BASE}/api/public/courses")
check("unfiltered list includes micro", any(i["id"] == course_id for i in r.json()))

r = requests.get(f"{BASE}/api/public/courses", params={"course_type": "bogus"})
check("bogus type returns empty", r.status_code == 200 and len(r.json()) == 0)

# ── 3. chapter + pdf material (micro consumes regular content) ──
sub = models.Subject(name=f"MicroSub {SUFFIX}")
db.add(sub); db.flush()
ch = models.Chapter(title=f"MicroCh {SUFFIX}", subject_id=sub.id)
db.add(ch); db.commit()

r = requests.put(f"{BASE}/api/courses/{course_id}", headers=DEVICE,
                 json={"chapter_ids": [ch.id]})
check("attach chapter to course", r.status_code == 200, r.text[:200])

pdf_bytes = b"%PDF-1.4 smoke test micro material " + os.urandom(2048)
r = requests.post(f"{BASE}/api/materials", headers=DEVICE,
                  files={"file": ("micro.pdf", pdf_bytes, "application/pdf")},
                  data={"title": f"MicroPDF {SUFFIX}"})
check("upload pdf material", r.status_code in (200, 201), r.text[:300])
mat = r.json(); mat_id = mat["id"]

r = requests.post(f"{BASE}/api/chapters/{ch.id}/materials/{mat_id}", headers=DEVICE)
check("attach material to chapter", r.status_code in (200, 201, 409), r.text[:200])

# ── 4. create-order: instant full price, partial amounts rejected ──
r = requests.post(f"{BASE}/api/public/slot-booking/create-order", json={
    "course_id": course_id, "student_name": "Smoke Micro",
    "student_email": f"micro_{SUFFIX}@test.local", "amount": 100.0,
})
check("partial amount rejected", r.status_code == 400, r.text[:200])

r = requests.post(f"{BASE}/api/public/slot-booking/create-order", json={
    "course_id": course_id, "student_name": "Smoke Micro",
    "student_email": f"micro_{SUFFIX}@test.local", "amount": 299.0,
})
check("full-price order reaches razorpay", r.status_code in (200, 502),
      f"got {r.status_code} {r.text[:120]}")

# ── 5. micro purchase: verify_and_register with fabricated signature ──
order_id = f"order_micro{SUFFIX}"
pay_id = f"pay_micro{SUFFIX}"
email = f"micro_{SUFFIX}@test.local"
r = requests.post(f"{BASE}/api/public/slot-booking/verify-and-register", json={
    "razorpay_order_id": order_id, "razorpay_payment_id": pay_id,
    "razorpay_signature": sig(order_id, pay_id),
    "course_id": course_id, "email": email, "first_name": "Smoke",
    "last_name": "Micro", "phone": f"93{int(SUFFIX, 16) % 100000000:08d}",
    "amount_paid": 299.0, "agree_terms": True,
})
check("micro verify_and_register", r.status_code == 200, r.text[:400])
body = r.json()
student_cookie = r.cookies.get("iinm_student_token")
check("auto-login cookie set", bool(student_cookie))
check("auto_login flag", body.get("auto_login") is True, str(body.get("auto_login")))
check("micro purchase message", body.get("message") == "Micro course purchased successfully!",
      str(body.get("message")))

student = db.query(models.Student).filter(models.Student.email == email).first()
enroll = db.query(models.BatchEnrollment).filter(
    models.BatchEnrollment.student_id == student.id,
    models.BatchEnrollment.status == "active").first()
check("auto enrollment exists", enroll is not None)
mbatch = db.query(models.Batch).get(enroll.batch_id)
check("enrolled in micro batch", mbatch.batch_type == "micro", mbatch.batch_type)
check("micro batch named", mbatch.name.startswith("Micro Batch"), mbatch.name)

# micro batch hidden from public batch list
r = requests.get(f"{BASE}/api/public/slot-booking/courses/{course_id}/batches")
check("micro batch hidden publicly", r.status_code == 200 and
      all(b["id"] != mbatch.id for b in r.json()), r.text[:200])

# duplicate purchase blocked
r = requests.post(f"{BASE}/api/public/slot-booking/verify-and-register", json={
    "razorpay_order_id": order_id + "2", "razorpay_payment_id": pay_id + "2",
    "razorpay_signature": sig(order_id + "2", pay_id + "2"),
    "course_id": course_id, "email": email, "first_name": "Smoke",
    "phone": f"93{int(SUFFIX, 16) % 100000000:08d}",
    "amount_paid": 299.0, "agree_terms": True,
})
check("duplicate purchase rejected", r.status_code == 400, r.text[:200])

# wrong-amount rejected
o3, p3 = f"order_micro3{SUFFIX}", f"pay_micro3{SUFFIX}"
r = requests.post(f"{BASE}/api/public/slot-booking/verify-and-register", json={
    "razorpay_order_id": o3, "razorpay_payment_id": p3,
    "razorpay_signature": sig(o3, p3),
    "course_id": course_id, "email": f"micro3_{SUFFIX}@test.local",
    "first_name": "Smoke", "phone": f"94{int(SUFFIX, 16) % 100000000:08d}",
    "amount_paid": 50.0, "agree_terms": True,
})
check("micro partial payment rejected", r.status_code == 400, r.text[:200])

# ── 6. batch_id guards ──
# a client-sent standard batch on a micro purchase is ignored — the buyer
# still lands in the auto micro batch.
std_batch = models.Batch(course_id=course_id, name=f"StdBatch {SUFFIX}",
                         batch_type="standard", status="Upcoming",
                         max_capacity=50, mode="Online")
db.add(std_batch); db.commit()
o4, p4 = f"order_micro4{SUFFIX}", f"pay_micro4{SUFFIX}"
r = requests.post(f"{BASE}/api/public/slot-booking/verify-and-register", json={
    "razorpay_order_id": o4, "razorpay_payment_id": p4,
    "razorpay_signature": sig(o4, p4),
    "course_id": course_id, "batch_id": std_batch.id,
    "email": f"micro4_{SUFFIX}@test.local", "first_name": "Smoke",
    "phone": f"95{int(SUFFIX, 16) % 100000000:08d}",
    "amount_paid": 299.0, "agree_terms": True,
})
check("micro purchase w/ batch_id ok", r.status_code == 200, r.text[:300])
st4 = db.query(models.Student).filter(models.Student.email == f"micro4_{SUFFIX}@test.local").first()
en4 = db.query(models.BatchEnrollment).filter(models.BatchEnrollment.student_id == st4.id).first()
check("still lands in micro batch", en4.batch_id == mbatch.id,
      f"enrolled in {en4.batch_id}, expected {mbatch.id}")

# a live_batch purchase passing a hidden auto batch_id is rejected — even
# when the batch hangs off the same course.
live = models.Course(title=f"MicroSmokeLive {SUFFIX}", price=999,
                     course_type="live_batch", status="PUBLISHED",
                     slug=f"microsmokelive-{SUFFIX}")
db.add(live); db.flush()
hidden = models.Batch(course_id=live.id, name=f"Hidden {SUFFIX}",
                      batch_type="micro", status="Upcoming",
                      max_capacity=50, mode="Online")
db.add(hidden); db.commit()
o5, p5 = f"order_live{SUFFIX}", f"pay_live{SUFFIX}"
r = requests.post(f"{BASE}/api/public/slot-booking/verify-and-register", json={
    "razorpay_order_id": o5, "razorpay_payment_id": p5,
    "razorpay_signature": sig(o5, p5),
    "course_id": live.id, "batch_id": hidden.id,
    "email": f"liveg_{SUFFIX}@test.local", "first_name": "Live",
    "phone": f"96{int(SUFFIX, 16) % 100000000:08d}",
    "amount_paid": 999.0, "agree_terms": True,
})
check("live purchase rejects micro batch_id", r.status_code == 400, r.text[:200])

# ── 7. student dashboard access + progress tracking ──
CK = {"iinm_student_token": student_cookie}
r = requests.get(f"{BASE}/api/student/courses/{course_id}", cookies=CK)
check("dashboard loads", r.status_code == 200, r.text[:300])
dash = r.json()
check("dashboard batch is micro", (dash.get("batch") or {}).get("id") == mbatch.id)
materials = [m for c in dash.get("chapters", []) for m in c.get("materials", [])]
check("material visible + unlocked",
      any(m["id"] == mat_id and not m.get("locked") for m in materials),
      json.dumps(materials)[:200])

# non-buyer is denied dashboard access
other = models.Student(first_name="No", last_name="Buy",
                       email=f"nomicro_{SUFFIX}@test.local", is_active=True)
db.add(other); db.commit()
from security import make_student_token
other_ck = {"iinm_student_token": make_student_token(other.id)}
r = requests.get(f"{BASE}/api/student/courses/{course_id}", cookies=other_ck)
check("non-buyer denied dashboard", r.status_code == 403, r.text[:200])

# batch-scoped progress machinery works on the micro batch
db.add(models.BatchStudentMaterialProgress(
    batch_id=mbatch.id, student_id=student.id, material_id=mat_id,
    is_completed=True))
db.commit()
r = requests.get(f"{BASE}/api/student/courses/{course_id}", cookies=CK)
prog = r.json().get("progress", {})
check("progress tracked on micro batch", prog.get("completed_materials") == 1,
      json.dumps(prog)[:200])

# certificate via material completion — D3: mock-test gate does NOT apply to micro.
exam = models.Exam(code=f"exam_micro_{SUFFIX}", title=f"MicroMock {SUFFIX}",
                   status="Published", pass_percentage=50.0)
db.add(exam); db.flush()
course_obj = db.query(models.Course).get(course_id)
course_obj.mock_test_exam_id = exam.id
course_obj.mock_test_price = 99.0
db.commit()
r = requests.get(f"{BASE}/api/student/courses/{course_id}/certificate", cookies=CK)
cert = r.json()
check("certificate eligible on completion (no mock gate)",
      r.status_code == 200 and cert.get("state") in ("eligible", "issued"),
      f"{cert.get('state')}: {cert.get('reason')}")

# ── 8. capacity cycling: full micro batch rolls into a new one ──
mbatch.max_capacity = 1
db.commit()
o6, p6 = f"order_micro6{SUFFIX}", f"pay_micro6{SUFFIX}"
r = requests.post(f"{BASE}/api/public/slot-booking/verify-and-register", json={
    "razorpay_order_id": o6, "razorpay_payment_id": p6,
    "razorpay_signature": sig(o6, p6),
    "course_id": course_id,
    "email": f"micro6_{SUFFIX}@test.local", "first_name": "Smoke",
    "phone": f"97{int(SUFFIX, 16) % 100000000:08d}",
    "amount_paid": 299.0, "agree_terms": True,
})
check("second purchase ok", r.status_code == 200, r.text[:300])
st6 = db.query(models.Student).filter(models.Student.email == f"micro6_{SUFFIX}@test.local").first()
en6 = db.query(models.BatchEnrollment).filter(models.BatchEnrollment.student_id == st6.id).first()
b6 = db.query(models.Batch).get(en6.batch_id)
check("new micro batch created when full",
      b6.batch_type == "micro" and b6.id != mbatch.id,
      f"batch {b6.id} type {b6.batch_type}")

print()
if FAIL:
    print("==== RESULT: FAILURES:", FAIL)
    sys.exit(1)
print("==== RESULT: ALL PASS")
