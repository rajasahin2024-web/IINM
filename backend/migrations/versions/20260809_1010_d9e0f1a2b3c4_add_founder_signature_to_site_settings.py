"""add founder signature fields to site_settings

Revision ID: d9e0f1a2b3c4
Revises: c8d9e0f1a2b3
Create Date: 2026-08-09 10:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd9e0f1a2b3c4'
down_revision: Union[str, Sequence[str], None] = 'c8d9e0f1a2b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('site_settings', sa.Column('founder_name', sa.String(length=255), nullable=True))
    op.add_column('site_settings', sa.Column('founder_designation', sa.String(length=255), nullable=True))
    op.add_column('site_settings', sa.Column('founder_signature_url', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('site_settings', 'founder_signature_url')
    op.drop_column('site_settings', 'founder_designation')
    op.drop_column('site_settings', 'founder_name')
