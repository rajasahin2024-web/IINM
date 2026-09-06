"""
Seed script: Replace navbar_item table with the menu structure from the
approved plan (image-based navbar restructure).

Usage:
    cd backend
    python _seed_navbar.py

This script:
  1. Deletes ALL existing navbar_item rows (replace mode)
  2. Inserts the new structure:
       About (dropdown)        -> 7 direct content links
       Courses (dropdown)      -> 6 direct content links
       Admission (dropdown)    -> 2 direct content links
       Verification (dropdown) -> 2 direct content links
       Jobs (main link)        -> /career
       Contact Us (main link)  -> /contact-us
  3. Prints a summary of inserted rows

NOTE: Backend uses an in-memory navbar cache. After running this script,
restart the backend so the cache is cleared and the new structure is served.
"""
import sys
import os

# Ensure we can import backend modules when run from the backend directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import NavbarItem


def main():
    db = SessionLocal()
    try:
        # 1. Wipe existing navbar data (replace mode)
        deleted = db.query(NavbarItem).delete(synchronize_session=False)
        db.commit()
        print(f"[seed] Deleted {deleted} existing navbar_item row(s).")

        # 2. Top-level items
        about = NavbarItem(title="About", item_type="dropdown", order_position=0)
        courses = NavbarItem(title="Courses", item_type="dropdown", order_position=1)
        admission = NavbarItem(title="Admission", item_type="dropdown", order_position=2)
        verification = NavbarItem(title="Verification", item_type="dropdown", order_position=3)
        jobs = NavbarItem(title="Jobs", link="/career", item_type="main", order_position=4)
        contact = NavbarItem(title="Contact Us", link="/contact-us", item_type="main", order_position=5)
        db.add_all([about, courses, admission, verification, jobs, contact])
        db.flush()

        # 3. Direct content links inside each dropdown (simple 2-level dropdown)
        def add_links(parent, links, start_order=0):
            for i, (title, link) in enumerate(links):
                db.add(NavbarItem(
                    parent_id=parent.id,
                    title=title,
                    link=link,
                    item_type="content_item",
                    order_position=start_order + i,
                ))

        add_links(about, [
            ("About us", "/about-us"),
            ("Mission & Vision", "/about-us"),
            ("Our certifications", "/courses"),
            ("Team", "/about-us"),
            ("Tours", "/about-iinm"),
            ("Brochure", "/about-us"),
            ("Sample certificates", "/courses"),
        ])

        add_links(courses, [
            ("Coding", "/courses"),
            ("Business", "/courses"),
            ("Ads", "/courses"),
            ("Marketing", "/courses"),
            ("Finance", "/courses"),
            ("Content Creator", "/courses"),
        ])

        add_links(admission, [
            ("Admission slot", "/admission"),
            ("Notice", "/admission"),
        ])

        add_links(verification, [
            ("Admission verification", "/verification"),
            ("Verify certificate", "/verification"),
        ])

        db.commit()

        # 4. Summary
        total = db.query(NavbarItem).count()
        print(f"[seed] Inserted {total} navbar_item row(s).")
        print("[seed] Done. Restart the backend to clear the in-memory navbar cache.")
    except Exception as e:
        db.rollback()
        print(f"[seed] ERROR: {e}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
