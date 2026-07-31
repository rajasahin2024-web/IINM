"""add map_lat and map_lng to contact_settings

Revision ID: e4f5a6b7c8d9
Revises: c2d3e4f5a6b7
Create Date: 2026-07-31 02:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4f5a6b7c8d9'
down_revision: Union[str, Sequence[str], None] = 'c2d3e4f5a6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('contact_settings', sa.Column('map_lat', sa.String(length=30), nullable=True))
    op.add_column('contact_settings', sa.Column('map_lng', sa.String(length=30), nullable=True))


def downgrade() -> None:
    op.drop_column('contact_settings', 'map_lng')
    op.drop_column('contact_settings', 'map_lat')
