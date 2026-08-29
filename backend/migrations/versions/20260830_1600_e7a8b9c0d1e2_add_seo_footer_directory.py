"""add seo_footer_directories table

Revision ID: e7a8b9c0d1e2
Revises: cf48f602dafe
Create Date: 2026-08-30 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7a8b9c0d1e2'
down_revision: Union[str, Sequence[str], None] = 'cf48f602dafe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'seo_footer_directories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tagline', sa.String(length=255), nullable=True, server_default='#Create Impact'),
        sa.Column('show_tagline', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('data_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_seo_footer_directories_id'), 'seo_footer_directories', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_seo_footer_directories_id'), table_name='seo_footer_directories')
    op.drop_table('seo_footer_directories')
