"""add hls_enabled, hls_qualities to r2_settings and hls_url to course_materials

Revision ID: cf48f602dafe
Revises: 290f4ecddae7
Create Date: 2026-08-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cf48f602dafe'
down_revision: Union[str, Sequence[str], None] = '290f4ecddae7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # r2_settings: HLS config
    op.add_column('r2_settings', sa.Column('hls_enabled', sa.Boolean(), server_default='false', nullable=True))
    op.add_column('r2_settings', sa.Column('hls_qualities', sa.String(length=255), nullable=True))
    # course_materials: HLS master playlist URL
    op.add_column('course_materials', sa.Column('hls_url', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('course_materials', 'hls_url')
    op.drop_column('r2_settings', 'hls_qualities')
    op.drop_column('r2_settings', 'hls_enabled')
