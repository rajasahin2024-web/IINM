"""add career module

Revision ID: 23075c17c86f
Revises: d8e9f0a1b2c3
Create Date: 2026-08-24 17:20:19.597803

Note: The four career tables (career_settings, career_positions,
career_job_posts, career_applications) are created by
`Base.metadata.create_all` in main.py on server start, following the
same pattern used for brochure_lead. This migration is a no-op that
only records the revision for tracking. On a fresh database, start the
server once (create_all runs), then `alembic stamp head`.

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '23075c17c86f'
down_revision: Union[str, Sequence[str], None] = 'd8e9f0a1b2c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op: career tables are created via Base.metadata.create_all."""
    pass


def downgrade() -> None:
    """No-op: dropping career tables is handled by create_all/DB reset."""
    pass
