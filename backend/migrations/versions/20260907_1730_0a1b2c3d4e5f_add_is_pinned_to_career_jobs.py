"""add is_pinned to career_job_posts

Revision ID: 0a1b2c3d4e5f
Revises: f9a8b7c6d5e4
Create Date: 2026-09-07 17:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '0a1b2c3d4e5f'
down_revision: Union[str, Sequence[str], None] = 'f9a8b7c6d5e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    existing_cols = [c['name'] for c in insp.get_columns('career_job_posts')]
    with op.batch_alter_table('career_job_posts') as batch_op:
        if 'is_pinned' not in existing_cols:
            batch_op.add_column(sa.Column('is_pinned', sa.Boolean(), server_default=sa.text('false'), nullable=False))


def downgrade() -> None:
    with op.batch_alter_table('career_job_posts') as batch_op:
        batch_op.drop_column('is_pinned')
