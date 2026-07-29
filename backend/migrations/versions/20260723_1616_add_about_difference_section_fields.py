"""add_about_difference_section_fields

Revision ID: 7f8e9a0b1c2d
Revises: 53ae74b534dd
Create Date: 2026-07-23 16:16:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7f8e9a0b1c2d"
down_revision: Union[str, Sequence[str], None] = "53ae74b534dd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("about_settings", sa.Column("difference_eyebrow", sa.String(length=255), nullable=True))
    op.add_column("about_settings", sa.Column("difference_title", sa.String(length=500), nullable=True))
    op.add_column("about_settings", sa.Column("difference_video_url", sa.Text(), nullable=True))
    op.add_column("about_settings", sa.Column("difference_at_iinm_heading", sa.String(length=255), nullable=True))
    op.add_column("about_settings", sa.Column("difference_traditional_heading", sa.String(length=255), nullable=True))
    op.add_column("about_settings", sa.Column("difference_rows_json", sa.Text(), nullable=True))


def downgrade() -> None:
    # Columns are intentionally retained for production migration safety.
    pass
