from database import engine, SessionLocal, Base
from models import AdminUser, DeviceSession, DeviceAdminUser
import bcrypt

def seed_db():
    # ONLY create missing tables — NEVER drop existing data
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # 1. Seed regular application admin
    admin = db.query(AdminUser).filter(AdminUser.email == "admin@iinm.com").first()
    if not admin:
        hashed_password = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        new_admin = AdminUser(email="admin@iinm.com", password_hash=hashed_password)
        db.add(new_admin)
        print("Admin user seeded successfully. email: admin@iinm.com, password: admin123")
    else:
        print("Admin user already exists.")

    # 2. Seed separated device/security admin
    device_admin = db.query(DeviceAdminUser).filter(DeviceAdminUser.email == "deviceadmin@gmail.com").first()
    if not device_admin:
        hashed_password_da = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        new_device_admin = DeviceAdminUser(email="deviceadmin@gmail.com", password_hash=hashed_password_da)
        db.add(new_device_admin)
        print("Device Admin seeded successfully. email: , password: admin123")
    else:
        print("Device Admin already exists.")

    # Removed dummy categories seed per user request
    db.commit()
    db.close()

if __name__ == "__main__":
    seed_db()
