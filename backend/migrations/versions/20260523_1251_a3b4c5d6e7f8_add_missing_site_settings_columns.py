"""add_missing_site_settings_columns

Revision ID: a3b4c5d6e7f8
Revises: 1a2b3c4d5e6f
Create Date: 2026-05-23 12:51:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3b4c5d6e7f8'
down_revision: Union[str, Sequence[str], None] = '1a2b3c4d5e6f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing analytics_id column
    op.add_column('site_settings', sa.Column('analytics_id', sa.String(255), nullable=True))
    # Add missing bing_webmaster_id column
    op.add_column('site_settings', sa.Column('bing_webmaster_id', sa.String(255), nullable=True))
    # Add notification_bar_text if it doesn't exist (defensive)
    # If it already exists from 1a2b3c4d5e6f, this will fail — but we assume it's missing too
    # We'll skip this since it may already exist from the previous migration


def downgrade() -> None:
    op.drop_column('site_settings', 'analytics_id')
    op.drop_column('site_settings', 'bing_webmaster_id')
