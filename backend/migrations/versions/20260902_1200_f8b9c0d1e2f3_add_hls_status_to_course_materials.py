"""add hls_status and hls_error to course_materials

Revision ID: f8b9c0d1e2f3
Revises: e7a8b9c0d1e2
Create Date: 2026-09-02 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8b9c0d1e2f3'
down_revision: Union[str, Sequence[str], None] = 'e7a8b9c0d1e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('course_materials', sa.Column('hls_status', sa.String(length=20), nullable=True))
    op.add_column('course_materials', sa.Column('hls_error', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('course_materials', 'hls_error')
    op.drop_column('course_materials', 'hls_status')
