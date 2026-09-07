"""add application_type and external_apply_url to career_job_posts

Revision ID: f9a8b7c6d5e4
Revises: e8d9c0b1a2f3
Create Date: 2026-09-07 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'f9a8b7c6d5e4'
down_revision: Union[str, Sequence[str], None] = 'e8d9c0b1a2f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    existing_cols = [c['name'] for c in insp.get_columns('career_job_posts')]
    with op.batch_alter_table('career_job_posts') as batch_op:
        if 'application_type' not in existing_cols:
            batch_op.add_column(sa.Column('application_type', sa.String(length=20), server_default='internal', nullable=False))
        if 'external_apply_url' not in existing_cols:
            batch_op.add_column(sa.Column('external_apply_url', sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('career_job_posts') as batch_op:
        batch_op.drop_column('external_apply_url')
        batch_op.drop_column('application_type')
