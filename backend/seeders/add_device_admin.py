from database import SessionLocal
from models import DeviceAdminUser
import bcrypt

def seed_device_admin():
    db = SessionLocal()
    try:
        device_admin = db.query(DeviceAdminUser).filter(DeviceAdminUser.email == "deviceadmin@gmail.com").first()
        if not device_admin:
            hashed_password = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            new_device_admin = DeviceAdminUser(email="deviceadmin@gmail.com", password_hash=hashed_password)
            db.add(new_device_admin)
            db.commit()
            print("Device Admin created successfully.")
        else:
            print("Device Admin already exists.")
        print("Email: deviceadmin@gmail.com")
        print("Password: admin123")
    finally:
        db.close()

if __name__ == "__main__":
    seed_device_admin()
