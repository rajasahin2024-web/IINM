"""course types, ebook assets/progress tables, mock test entitlements (IIN-152 phase 1)

Revision ID: l1m2n3o4p5q6
Revises: k8l9m0n1o2p3
Create Date: 2026-10-04 17:30:00.000000

Additive only — existing courses get course_type='live_batch' via server_default
and keep identical behavior. No table drops.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'l1m2n3o4p5q6'
down_revision: Union[str, Sequence[str], None] = 'k8l9m0n1o2p3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ── New tables ──────────────────────────────────────────────────────
    op.create_table('student_ebook_progress',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('material_id', sa.Integer(), nullable=False),
        sa.Column('last_page', sa.Integer(), nullable=True),
        sa.Column('last_chapter_index', sa.Integer(), nullable=True),
        sa.Column('last_accessed', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['material_id'], ['course_materials.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_student_ebook_progress_id'), 'student_ebook_progress', ['id'], unique=False)
    op.create_index('uq_student_ebook_progress', 'student_ebook_progress', ['student_id', 'material_id'], unique=True)

    op.create_table('student_ebook_chapter_progress',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('material_id', sa.Integer(), nullable=False),
        sa.Column('chapter_index', sa.Integer(), nullable=False),
        sa.Column('is_completed', sa.Boolean(), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['material_id'], ['course_materials.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_student_ebook_chapter_progress_id'), 'student_ebook_chapter_progress', ['id'], unique=False)
    op.create_index('uq_student_ebook_chapter_progress', 'student_ebook_chapter_progress', ['student_id', 'material_id', 'chapter_index'], unique=True)

    op.create_table('mock_test_entitlements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('exam_id', sa.Integer(), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=True),
        sa.Column('razorpay_order_id', sa.String(length=64), nullable=True),
        sa.Column('razorpay_payment_id', sa.String(length=64), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['exam_id'], ['exams.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_mock_test_entitlements_id'), 'mock_test_entitlements', ['id'], unique=False)
    op.create_index('uq_mock_test_entitlement', 'mock_test_entitlements', ['student_id', 'course_id'], unique=True)
    op.create_index('uq_mock_test_entitlement_payment', 'mock_test_entitlements', ['razorpay_payment_id'], unique=True)

    # ── New columns (additive; server_default backfills existing rows) ──
    op.add_column('courses', sa.Column('course_type', sa.String(length=20), server_default='live_batch', nullable=False))
    op.add_column('courses', sa.Column('mock_test_exam_id', sa.Integer(), nullable=True))
    op.add_column('courses', sa.Column('mock_test_price', sa.Float(), nullable=True))
    op.add_column('courses', sa.Column('ebook_batch_capacity', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_courses_mock_test_exam', 'courses', 'exams', ['mock_test_exam_id'], ['id'], ondelete='SET NULL')

    op.add_column('batches', sa.Column('batch_type', sa.String(length=20), server_default='standard', nullable=False))

    op.add_column('course_materials', sa.Column('ebook_file_key', sa.String(length=500), nullable=True))
    op.add_column('course_materials', sa.Column('ebook_cover_url', sa.Text(), nullable=True))
    op.add_column('course_materials', sa.Column('ebook_toc', sa.JSON(), nullable=True))
    op.add_column('course_materials', sa.Column('ebook_page_count', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('course_materials', 'ebook_page_count')
    op.drop_column('course_materials', 'ebook_toc')
    op.drop_column('course_materials', 'ebook_cover_url')
    op.drop_column('course_materials', 'ebook_file_key')
    op.drop_column('batches', 'batch_type')
    op.drop_constraint('fk_courses_mock_test_exam', 'courses', type_='foreignkey')
    op.drop_column('courses', 'ebook_batch_capacity')
    op.drop_column('courses', 'mock_test_price')
    op.drop_column('courses', 'mock_test_exam_id')
    op.drop_column('courses', 'course_type')
    op.drop_index('uq_mock_test_entitlement_payment', table_name='mock_test_entitlements')
    op.drop_index('uq_mock_test_entitlement', table_name='mock_test_entitlements')
    op.drop_index(op.f('ix_mock_test_entitlements_id'), table_name='mock_test_entitlements')
    op.drop_table('mock_test_entitlements')
    op.drop_index('uq_student_ebook_chapter_progress', table_name='student_ebook_chapter_progress')
    op.drop_index(op.f('ix_student_ebook_chapter_progress_id'), table_name='student_ebook_chapter_progress')
    op.drop_table('student_ebook_chapter_progress')
    op.drop_index('uq_student_ebook_progress', table_name='student_ebook_progress')
    op.drop_index(op.f('ix_student_ebook_progress_id'), table_name='student_ebook_progress')
    op.drop_table('student_ebook_progress')
