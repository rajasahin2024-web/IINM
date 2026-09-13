"""create student_password_resets table

Revision ID: g1h2i3j4k5l6
Revises: 0a1b2c3d4e5f
Create Date: 2026-09-13 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g1h2i3j4k5l6'
down_revision: Union[str, Sequence[str], None] = '0a1b2c3d4e5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'student_password_resets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('requested_ip', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_student_password_resets_id'), 'student_password_resets', ['id'], unique=False)
    op.create_index(op.f('ix_student_password_resets_student_id'), 'student_password_resets', ['student_id'], unique=False)
    op.create_index(op.f('ix_student_password_resets_token_hash'), 'student_password_resets', ['token_hash'], unique=False)


def downgrade() -> None:
    # Only removes the table created by this migration — no pre-existing data touched.
    op.drop_index(op.f('ix_student_password_resets_token_hash'), table_name='student_password_resets')
    op.drop_index(op.f('ix_student_password_resets_student_id'), table_name='student_password_resets')
    op.drop_index(op.f('ix_student_password_resets_id'), table_name='student_password_resets')
    op.drop_table('student_password_resets')
