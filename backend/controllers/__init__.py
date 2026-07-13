"""
Controllers Package
───────────────────
Business logic lives here, separated from HTTP routing.

Structure:
  controllers/
    admin/                    ← Admin-facing controllers
      student_controller.py
      [future controllers...]

Pattern:
  routers/student.py  →  calls StudentController.create(data, db)
  controllers/admin/student_controller.py  →  DB queries + validation
"""
from controllers.admin.student_controller import StudentController

__all__ = [
    "StudentController",
]
