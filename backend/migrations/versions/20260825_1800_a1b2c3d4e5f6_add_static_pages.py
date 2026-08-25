"""add static_pages table

Revision ID: a1b2c3d4e5f6
Revises: 23075c17c86f
Create Date: 2026-08-25 18:00:00.000000

Note: The static_pages table is created by `Base.metadata.create_all`
in main.py on server start, following the same pattern used for the
career module and brochure_lead. This migration is a no-op that only
records the revision for tracking. On a fresh database, start the
server once (create_all runs), then `alembic stamp head`.

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '23075c17c86f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op: static_pages table is created via Base.metadata.create_all."""
    pass


def downgrade() -> None:
    """No-op: dropping static_pages is handled by create_all/DB reset."""
    pass
