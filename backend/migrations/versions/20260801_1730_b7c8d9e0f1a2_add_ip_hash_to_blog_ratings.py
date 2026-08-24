"""add ip_hash to blog_ratings for dedup

Revision ID: b7c8d9e0f1a2
Revises: a6b7c8d9e0f1
Create Date: 2026-08-01 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, Sequence[str], None] = 'a6b7c8d9e0f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'blog_ratings',
        sa.Column('ip_hash', sa.String(length=64), nullable=True)
    )
    # Index for fast dedup lookups (one rating per IP per post).
    op.create_index(
        'ix_blog_ratings_post_ip',
        'blog_ratings',
        ['post_id', 'ip_hash'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index('ix_blog_ratings_post_ip', table_name='blog_ratings')
    op.drop_column('blog_ratings', 'ip_hash')
