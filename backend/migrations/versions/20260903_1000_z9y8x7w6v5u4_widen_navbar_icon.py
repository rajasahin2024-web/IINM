"""widen navbar_item.icon to varchar(512)

Revision ID: z9y8x7w6v5u4
Revises: f8b9c0d1e2f3
Create Date: 2026-09-03 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'z9y8x7w6v5u4'
down_revision: Union[str, Sequence[str], None] = 'f8b9c0d1e2f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'navbar_item',
        'icon',
        existing_type=sa.String(length=50),
        type_=sa.String(length=512),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        'navbar_item',
        'icon',
        existing_type=sa.String(length=512),
        type_=sa.String(length=50),
        existing_nullable=True,
    )
