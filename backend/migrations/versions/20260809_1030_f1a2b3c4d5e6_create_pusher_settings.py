"""create pusher_settings table

Revision ID: f1a2b3c4d5e6
Revises: e0f1a2b3c4d5
Create Date: 2026-08-09 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'e0f1a2b3c4d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'pusher_settings',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('app_id', sa.String(length=255), nullable=True),
        sa.Column('key', sa.String(length=255), nullable=True),
        sa.Column('secret', sa.String(length=255), nullable=True),
        sa.Column('cluster', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('pusher_settings')
