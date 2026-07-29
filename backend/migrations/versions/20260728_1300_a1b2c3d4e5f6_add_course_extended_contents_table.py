"""add_course_extended_contents_table

Revision ID: a1b2c3d4e5f6
Revises: 5c4c2143331f
Create Date: 2026-07-28 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '5c4c2143331f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'course_extended_contents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('hero_badges_json', sa.Text(), nullable=True),
        sa.Column('hiring_companies_json', sa.Text(), nullable=True),
        sa.Column('market_impact_json', sa.Text(), nullable=True),
        sa.Column('who_is_for_json', sa.Text(), nullable=True),
        sa.Column('career_outcomes_json', sa.Text(), nullable=True),
        sa.Column('projects_json', sa.Text(), nullable=True),
        sa.Column('comparison_matrix_json', sa.Text(), nullable=True),
        sa.Column('video_testimonials_json', sa.Text(), nullable=True),
        sa.Column('faqs_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_course_extended_contents_id'), 'course_extended_contents', ['id'], unique=False)
    op.create_index(op.f('ix_course_extended_contents_course_id'), 'course_extended_contents', ['course_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_course_extended_contents_course_id'), table_name='course_extended_contents')
    op.drop_index(op.f('ix_course_extended_contents_id'), table_name='course_extended_contents')
    op.drop_table('course_extended_contents')
