"""add_maintenance_fields_to_site_settings

Revision ID: f8e9d0c1a2b3
Revises: ec033e024923
Create Date: 2026-06-04 04:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8e9d0c1a2b3'
down_revision: Union[str, Sequence[str], None] = 'ec033e024923'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('site_settings', sa.Column('maintenance_mode', sa.Boolean(), nullable=True, server_default=sa.false()))
    op.add_column('site_settings', sa.Column('maintenance_title', sa.String(255), nullable=True))
    op.add_column('site_settings', sa.Column('maintenance_message', sa.Text(), nullable=True))
    op.add_column('site_settings', sa.Column('maintenance_video_url', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('site_settings', 'maintenance_mode')
    op.drop_column('site_settings', 'maintenance_title')
    op.drop_column('site_settings', 'maintenance_message')
    op.drop_column('site_settings', 'maintenance_video_url')
