"""add career categories and job fields

Revision ID: e8d9c0b1a2f3
Revises: a1b2c3d4e5f7
Create Date: 2026-09-07 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'e8d9c0b1a2f3'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    # 1. Create career_categories table if not exists
    if not insp.has_table('career_categories'):
        op.create_table(
            'career_categories',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('slug', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('icon', sa.String(length=100), nullable=True),
            sa.Column('badge_color', sa.String(length=50), nullable=True),
            sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=True),
            sa.Column('display_order', sa.Integer(), server_default=sa.text('0'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_career_categories_id'), 'career_categories', ['id'], unique=False)
        op.create_index(op.f('ix_career_categories_slug'), 'career_categories', ['slug'], unique=True)

    # 2. Add columns to career_job_posts if not present
    existing_cols = [c['name'] for c in insp.get_columns('career_job_posts')]
    with op.batch_alter_table('career_job_posts') as batch_op:
        if 'category_id' not in existing_cols:
            batch_op.add_column(sa.Column('category_id', sa.Integer(), nullable=True))
            batch_op.create_foreign_key('fk_career_jobs_category', 'career_categories', ['category_id'], ['id'], ondelete='SET NULL')
            batch_op.create_index(batch_op.f('ix_career_job_posts_category_id'), ['category_id'], unique=False)
        if 'featured_image_url' not in existing_cols:
            batch_op.add_column(sa.Column('featured_image_url', sa.Text(), nullable=True))
        if 'company_name' not in existing_cols:
            batch_op.add_column(sa.Column('company_name', sa.String(length=255), nullable=True))
        if 'company_logo_url' not in existing_cols:
            batch_op.add_column(sa.Column('company_logo_url', sa.Text(), nullable=True))
        if 'tags' not in existing_cols:
            batch_op.add_column(sa.Column('tags', sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('career_job_posts') as batch_op:
        try:
            batch_op.drop_constraint('fk_career_jobs_category', type_='foreignkey')
        except Exception:
            pass
        batch_op.drop_column('tags')
        batch_op.drop_column('company_logo_url')
        batch_op.drop_column('company_name')
        batch_op.drop_column('featured_image_url')
        batch_op.drop_column('category_id')

    try:
        op.drop_table('career_categories')
    except Exception:
        pass
