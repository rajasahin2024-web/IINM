"""add FK indexes for student dashboard queries

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2026-09-13 21:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'h2i3j4k5l6m7'
down_revision: Union[str, Sequence[str], None] = 'g1h2i3j4k5l6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_INDEXES = [
    ('ix_course_purchases_student_id', 'course_purchases', ['student_id']),
    ('ix_batch_enrollments_student_id', 'batch_enrollments', ['student_id']),
    ('ix_batch_enrollments_batch_id', 'batch_enrollments', ['batch_id']),
    ('ix_bsmp_batch_student', 'batch_student_material_progress', ['batch_id', 'student_id']),
    ('ix_bsmp_material_id', 'batch_student_material_progress', ['material_id']),
    ('ix_batch_chapter_progress_batch_id', 'batch_chapter_progress', ['batch_id']),
    ('ix_installment_schedules_purchase_id', 'installment_schedules', ['purchase_id']),
    ('ix_batches_course_id', 'batches', ['course_id']),
    ('ix_chapter_live_classes_chapter_id', 'chapter_live_classes', ['chapter_id']),
    ('ix_batch_routines_batch_id', 'batch_routines', ['batch_id']),
    ('ix_batch_content_drips_batch_id', 'batch_content_drips', ['batch_id']),
]


def upgrade() -> None:
    for name, table, cols in _INDEXES:
        op.create_index(name, table, cols, unique=False)


def downgrade() -> None:
    # Only removes indexes created by this migration.
    for name, table, _cols in reversed(_INDEXES):
        op.drop_index(name, table_name=table)
