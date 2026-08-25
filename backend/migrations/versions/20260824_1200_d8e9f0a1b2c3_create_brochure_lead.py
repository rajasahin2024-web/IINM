"""create_brochure_lead_table

Revision ID: d8e9f0a1b2c3
Revises: c780846d4cdc
Create Date: 2026-08-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd8e9f0a1b2c3'
down_revision: Union[str, Sequence[str], None] = 'c780846d4cdc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create brochure_lead table."""
    op.create_table(
        'brochure_lead',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('course_id', sa.Integer(), sa.ForeignKey('courses.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('lead_type', sa.String(length=100), nullable=True),
        sa.Column('source', sa.String(length=100), nullable=True, server_default='brochure_download'),
        sa.Column('is_read', sa.Boolean(), nullable=True, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_brochure_lead_id', 'brochure_lead', ['id'])
    op.create_index('ix_brochure_lead_course_id', 'brochure_lead', ['course_id'])
    op.create_index('ix_brochure_lead_phone', 'brochure_lead', ['phone'])


def downgrade() -> None:
    """Drop brochure_lead table."""
    op.drop_index('ix_brochure_lead_phone', table_name='brochure_lead')
    op.drop_index('ix_brochure_lead_course_id', table_name='brochure_lead')
    op.drop_index('ix_brochure_lead_id', table_name='brochure_lead')
    op.drop_table('brochure_lead')
