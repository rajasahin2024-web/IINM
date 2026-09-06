"""create notices table

Revision ID: a1b2c3d4e5f7
Revises: z9y8x7w6v5u4
Create Date: 2026-09-04 17:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, Sequence[str], None] = 'z9y8x7w6v5u4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'notices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('notice_no', sa.String(length=100), nullable=True),
        sa.Column('notice_date', sa.Date(), server_default=sa.text('CURRENT_DATE'), nullable=False),
        sa.Column('category', sa.String(length=100), server_default=sa.text("'General'"), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('cover_image', sa.String(length=512), nullable=True),
        sa.Column('attachment_url', sa.String(length=512), nullable=True),
        sa.Column('attachment_name', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=True),
        sa.Column('is_pinned', sa.Boolean(), server_default=sa.text('false'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notices_id'), 'notices', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notices_id'), table_name='notices')
    op.drop_table('notices')
