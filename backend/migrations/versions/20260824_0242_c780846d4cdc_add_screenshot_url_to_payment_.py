"""add_screenshot_url_to_payment_transactions

Revision ID: c780846d4cdc
Revises: 777693106a3f
Create Date: 2026-08-24 02:42:42.695994

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c780846d4cdc'
down_revision: Union[str, Sequence[str], None] = '777693106a3f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('payment_transactions', sa.Column('screenshot_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('payment_transactions', 'screenshot_url')
