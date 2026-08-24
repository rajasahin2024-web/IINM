"""add enable_google_login to google_api_settings

Revision ID: e0f1a2b3c4d5
Revises: d9e0f1a2b3c4
Create Date: 2026-08-09 10:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e0f1a2b3c4d5'
down_revision: Union[str, Sequence[str], None] = 'd9e0f1a2b3c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'google_api_settings',
        sa.Column('enable_google_login', sa.Boolean(), nullable=True, server_default=sa.text('false')),
    )


def downgrade() -> None:
    op.drop_column('google_api_settings', 'enable_google_login')
