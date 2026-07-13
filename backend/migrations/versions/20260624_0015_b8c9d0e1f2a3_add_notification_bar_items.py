"""add_notification_bar_items

Revision ID: b8c9d0e1f2a3
Revises: 06793614fded
Create Date: 2026-06-24 00:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8c9d0e1f2a3'
down_revision: Union[str, Sequence[str], None] = '06793614fded'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('site_settings', sa.Column('notification_bar_items', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('site_settings', 'notification_bar_items')
