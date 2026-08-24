"""add full payment discount to courses

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-08-10 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: str = 'b3c4d5e6f7a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('courses', sa.Column('full_payment_discount_type', sa.String(length=20), nullable=True))
    op.add_column('courses', sa.Column('full_payment_discount_value', sa.Float(), nullable=True))
    op.add_column('courses', sa.Column('full_payment_discount_valid_till', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('courses', 'full_payment_discount_valid_till')
    op.drop_column('courses', 'full_payment_discount_value')
    op.drop_column('courses', 'full_payment_discount_type')
