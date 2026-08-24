"""add_upi_qr_fields_to_payment_settings

Revision ID: 777693106a3f
Revises: e6f7a8b9c0d1
Create Date: 2026-08-24 02:37:27.660454

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '777693106a3f'
down_revision: Union[str, Sequence[str], None] = 'e6f7a8b9c0d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('payment_settings', sa.Column('upi_enabled', sa.Boolean(), nullable=True, server_default=sa.text('false')))
    op.add_column('payment_settings', sa.Column('upi_qr_url', sa.String(length=500), nullable=True))
    op.add_column('payment_settings', sa.Column('upi_id', sa.String(length=255), nullable=True))
    op.add_column('payment_settings', sa.Column('upi_payee_name', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('payment_settings', 'upi_payee_name')
    op.drop_column('payment_settings', 'upi_id')
    op.drop_column('payment_settings', 'upi_qr_url')
    op.drop_column('payment_settings', 'upi_enabled')
