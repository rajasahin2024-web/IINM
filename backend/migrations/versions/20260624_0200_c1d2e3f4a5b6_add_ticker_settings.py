"""add_ticker_settings

Revision ID: c1d2e3f4a5b6
Revises: b8c9d0e1f2a3
Create Date: 2026-06-24 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = 'b8c9d0e1f2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('site_settings', sa.Column('ticker_speed', sa.Integer(), nullable=True))
    op.add_column('site_settings', sa.Column('ticker_animation_type', sa.String(50), nullable=True))
    op.add_column('site_settings', sa.Column('ticker_bg_color', sa.String(20), nullable=True))
    op.add_column('site_settings', sa.Column('ticker_text_color', sa.String(20), nullable=True))
    op.add_column('site_settings', sa.Column('ticker_label_bg_color', sa.String(20), nullable=True))
    op.add_column('site_settings', sa.Column('ticker_label_text_color', sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column('site_settings', 'ticker_label_text_color')
    op.drop_column('site_settings', 'ticker_label_bg_color')
    op.drop_column('site_settings', 'ticker_text_color')
    op.drop_column('site_settings', 'ticker_bg_color')
    op.drop_column('site_settings', 'ticker_animation_type')
    op.drop_column('site_settings', 'ticker_speed')
