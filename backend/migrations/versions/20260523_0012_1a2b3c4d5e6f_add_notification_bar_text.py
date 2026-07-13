"""add_notification_bar_text

Revision ID: 1a2b3c4d5e6f
Revises: 8fbbb2dea4a9
Create Date: 2026-05-23 00:12:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '1a2b3c4d5e6f'
down_revision: Union[str, Sequence[str], None] = '8fbbb2dea4a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('site_settings', sa.Column('notification_bar_text', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('site_settings', 'notification_bar_text')
