"""add test/live razorpay keys to payment settings

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-08-10 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd5e6f7a8b9c0'
down_revision: str = 'c4d5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('payment_settings', sa.Column('razorpay_test_key_id', sa.String(length=255), nullable=True))
    op.add_column('payment_settings', sa.Column('razorpay_test_key_secret', sa.String(length=255), nullable=True))
    op.add_column('payment_settings', sa.Column('razorpay_live_key_id', sa.String(length=255), nullable=True))
    op.add_column('payment_settings', sa.Column('razorpay_live_key_secret', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('payment_settings', 'razorpay_live_key_secret')
    op.drop_column('payment_settings', 'razorpay_live_key_id')
    op.drop_column('payment_settings', 'razorpay_test_key_secret')
    op.drop_column('payment_settings', 'razorpay_test_key_id')
