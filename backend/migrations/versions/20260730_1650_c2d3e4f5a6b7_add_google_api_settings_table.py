"""add google_api_settings table

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-07-30 16:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2d3e4f5a6b7'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'google_api_settings',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('google_map_api_key', sa.String(length=500), nullable=True),
        sa.Column('google_client_id', sa.String(length=500), nullable=True),
        sa.Column('google_client_secret', sa.String(length=500), nullable=True),
        sa.Column('google_redirect_uri', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('google_api_settings')
