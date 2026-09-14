"""create student_exam_attempts + student_exam_answers, add notices.batch_id

Revision ID: i2j3k4l5m6n7
Revises: h2i3j4k5l6m7
Create Date: 2026-09-14 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'i2j3k4l5m6n7'
down_revision: Union[str, Sequence[str], None] = 'h2i3j4k5l6m7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # main.py runs Base.metadata.create_all() on server start, so these objects
    # may already exist (with their indexes/FKs) before this migration runs.
    # Guard every step so `alembic upgrade head` stays safe in that case.
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_tables = set(insp.get_table_names())

    if 'student_exam_attempts' not in existing_tables:
        op.create_table(
            'student_exam_attempts',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('assignment_id', sa.Integer(), nullable=False),
            sa.Column('student_id', sa.Integer(), nullable=False),
            sa.Column('attempt_no', sa.Integer(), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=False),
            sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('score', sa.Float(), nullable=True),
            sa.Column('total_marks', sa.Float(), nullable=True),
            sa.Column('passed', sa.Boolean(), nullable=True),
            sa.Column('question_order', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['assignment_id'], ['batch_exam_assignments.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_student_exam_attempts_id'), 'student_exam_attempts', ['id'], unique=False)
        op.create_index(op.f('ix_student_exam_attempts_assignment_id'), 'student_exam_attempts', ['assignment_id'], unique=False)
        op.create_index(op.f('ix_student_exam_attempts_student_id'), 'student_exam_attempts', ['student_id'], unique=False)
        # One active (in_progress) attempt per student per assignment.
        op.create_index(
            'uq_student_exam_attempts_active', 'student_exam_attempts',
            ['assignment_id', 'student_id'], unique=True,
            postgresql_where=sa.text("status = 'in_progress'"),
        )

    if 'student_exam_answers' not in existing_tables:
        op.create_table(
            'student_exam_answers',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('attempt_id', sa.Integer(), nullable=False),
            sa.Column('question_id', sa.Integer(), nullable=False),
            sa.Column('selected_option_ids', sa.JSON(), nullable=True),
            sa.Column('answer_text', sa.Text(), nullable=True),
            sa.Column('is_correct', sa.Boolean(), nullable=True),
            sa.Column('marks_awarded', sa.Float(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['attempt_id'], ['student_exam_attempts.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_student_exam_answers_id'), 'student_exam_answers', ['id'], unique=False)
        op.create_index(op.f('ix_student_exam_answers_attempt_id'), 'student_exam_answers', ['attempt_id'], unique=False)

    if 'notices' in existing_tables:
        notices_cols = {c['name'] for c in insp.get_columns('notices')}
        notices_idx = {i['name'] for i in insp.get_indexes('notices')}
        notices_fks = {fk['name'] for fk in insp.get_foreign_keys('notices')}
        if 'batch_id' not in notices_cols:
            op.add_column('notices', sa.Column('batch_id', sa.Integer(), nullable=True))
        if 'ix_notices_batch_id' not in notices_idx:
            op.create_index(op.f('ix_notices_batch_id'), 'notices', ['batch_id'], unique=False)
        if 'fk_notices_batch_id' not in notices_fks:
            op.create_foreign_key('fk_notices_batch_id', 'notices', 'batches',
                                  ['batch_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    # Only removes objects created by this migration — no pre-existing data touched.
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_tables = set(insp.get_table_names())

    if 'notices' in existing_tables:
        notices_cols = {c['name'] for c in insp.get_columns('notices')}
        notices_idx = {i['name'] for i in insp.get_indexes('notices')}
        notices_fks = {fk['name'] for fk in insp.get_foreign_keys('notices')}
        if 'fk_notices_batch_id' in notices_fks:
            op.drop_constraint('fk_notices_batch_id', 'notices', type_='foreignkey')
        if 'ix_notices_batch_id' in notices_idx:
            op.drop_index(op.f('ix_notices_batch_id'), table_name='notices')
        if 'batch_id' in notices_cols:
            op.drop_column('notices', 'batch_id')

    if 'student_exam_answers' in existing_tables:
        for idx in ('ix_student_exam_answers_attempt_id', 'ix_student_exam_answers_id'):
            if idx in {i['name'] for i in insp.get_indexes('student_exam_answers')}:
                op.drop_index(idx, table_name='student_exam_answers')
        op.drop_table('student_exam_answers')

    if 'student_exam_attempts' in existing_tables:
        attempts_idx = {i['name'] for i in insp.get_indexes('student_exam_attempts')}
        for idx in ('uq_student_exam_attempts_active', 'ix_student_exam_attempts_student_id',
                    'ix_student_exam_attempts_assignment_id', 'ix_student_exam_attempts_id'):
            if idx in attempts_idx:
                op.drop_index(idx, table_name='student_exam_attempts')
        op.drop_table('student_exam_attempts')
