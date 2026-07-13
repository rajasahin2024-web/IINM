"""
Admin Controllers Sub-Package
──────────────────────────────
All admin-facing business logic controllers live here.

Structure:
  controllers/admin/student_controller.py  →  StudentController
  controllers/admin/[more]_controller.py   →  [More controllers]
"""
from controllers.admin.student_controller import StudentController

__all__ = [
    "StudentController",
]
