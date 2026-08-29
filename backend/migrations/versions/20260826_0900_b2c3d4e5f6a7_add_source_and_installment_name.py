"""add source to course_purchases and name to installment_schedules

Revision ID: b2c3d4e5f6a7
Revises: 9b1a37d0e67c
Create Date: 2026-08-26 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = '9b1a37d0e67c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add `source` column to course_purchases (nullable, no default required)
    op.add_column(
        'course_purchases',
        sa.Column('source', sa.String(length=30), nullable=True),
    )

    # 2. Add `name` column to installment_schedules (nullable)
    op.add_column(
        'installment_schedules',
        sa.Column('name', sa.String(length=100), nullable=True),
    )

    # 3. Backfill `source` for existing purchases:
    #    - Records whose notes mention "Slot Booking" -> 'slot_booking'
    #    - All other records -> 'admin_created'
    op.execute(
        "UPDATE course_purchases SET source = 'slot_booking' "
        "WHERE notes IS NOT NULL AND notes LIKE '%Slot Booking%'"
    )
    op.execute(
        "UPDATE course_purchases SET source = 'admin_created' "
        "WHERE source IS NULL"
    )

    # 4. Backfill `name` for existing installments with a default label.
    #    SQLite/PostgreSQL both support string concatenation with ||.
    op.execute(
        "UPDATE installment_schedules SET name = 'Installment #' || installment_no "
        "WHERE name IS NULL"
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Per migration safety rules, downgrade that drops columns requires explicit
    # user approval. We implement it for completeness but it should NOT be run on
    # production without a backup.
    op.drop_column('installment_schedules', 'name')
    op.drop_column('course_purchases', 'source')
