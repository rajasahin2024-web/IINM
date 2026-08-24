"""seo_aeo_tables: extend site_settings + add seo_page_meta, redirects, course_faqs, gsc_properties, gsc_query_stats

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-08-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e6f7a8b9c0d1'
down_revision: str = 'd5e6f7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(bind, table_name: str) -> bool:
    return bind.dialect.has_table(bind, table_name)


def _column_exists(bind, table_name: str, column_name: str) -> bool:
    insp = sa.inspect(bind)
    if not insp.has_table(table_name):
        return False
    return column_name in [c['name'] for c in insp.get_columns(table_name)]


def upgrade() -> None:
    bind = op.get_bind()

    # ── Extend site_settings with SEO/AEO columns (all nullable, idempotent) ──
    new_cols = [
        ('og_image_url', sa.Text()),
        ('twitter_handle', sa.String(length=255)),
        ('canonical_base_url', sa.String(length=255)),
        ('google_site_verification', sa.String(length=255)),
        ('default_robots_index', sa.Boolean()),
        ('organization_schema', sa.Text()),
        ('llms_txt', sa.Text()),
        ('llms_full_enabled', sa.Boolean()),
        ('ai_bot_allow', sa.Text()),
        ('gsc_refresh_token', sa.Text()),
    ]
    for col_name, col_type in new_cols:
        if not _column_exists(bind, 'site_settings', col_name):
            op.add_column('site_settings', sa.Column(col_name, col_type, nullable=True))

    # ── New table: seo_page_meta ──
    if not _table_exists(bind, 'seo_page_meta'):
        op.create_table(
            'seo_page_meta',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('page_key', sa.String(length=100), nullable=False),
            sa.Column('seo_title', sa.String(length=255), nullable=True),
            sa.Column('seo_description', sa.Text(), nullable=True),
            sa.Column('seo_keywords', sa.Text(), nullable=True),
            sa.Column('canonical_path', sa.String(length=255), nullable=True),
            sa.Column('og_image_url', sa.Text(), nullable=True),
            sa.Column('schema_json', sa.Text(), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint('page_key', name='uq_seo_page_meta_page_key'),
        )
    insp = sa.inspect(bind)
    if 'ix_seo_page_meta_page_key' not in [i['name'] for i in insp.get_indexes('seo_page_meta')]:
        op.create_index('ix_seo_page_meta_page_key', 'seo_page_meta', ['page_key'])

    # ── New table: redirects ──
    if not _table_exists(bind, 'redirects'):
        op.create_table(
            'redirects',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('from_path', sa.String(length=500), nullable=False),
            sa.Column('to_path', sa.String(length=500), nullable=False),
            sa.Column('status_code', sa.Integer(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint('from_path', name='uq_redirects_from_path'),
        )
    if 'ix_redirects_from_path' not in [i['name'] for i in insp.get_indexes('redirects')]:
        op.create_index('ix_redirects_from_path', 'redirects', ['from_path'])

    # ── New table: course_faqs ──
    if not _table_exists(bind, 'course_faqs'):
        op.create_table(
            'course_faqs',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('course_id', sa.Integer(), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
            sa.Column('question', sa.Text(), nullable=False),
            sa.Column('answer', sa.Text(), nullable=False),
            sa.Column('order_index', sa.Integer(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        )
    if 'ix_course_faqs_course_id' not in [i['name'] for i in insp.get_indexes('course_faqs')]:
        op.create_index('ix_course_faqs_course_id', 'course_faqs', ['course_id'])

    # ── New table: gsc_properties ──
    if not _table_exists(bind, 'gsc_properties'):
        op.create_table(
            'gsc_properties',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('site_url', sa.String(length=500), nullable=False),
            sa.Column('is_default', sa.Boolean(), nullable=True),
            sa.UniqueConstraint('site_url', name='uq_gsc_properties_site_url'),
        )

    # ── New table: gsc_query_stats ──
    if not _table_exists(bind, 'gsc_query_stats'):
        op.create_table(
            'gsc_query_stats',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('property_id', sa.Integer(), sa.ForeignKey('gsc_properties.id', ondelete='CASCADE'), nullable=True),
            sa.Column('query', sa.String(length=500), nullable=True),
            sa.Column('page', sa.String(length=500), nullable=True),
            sa.Column('impressions', sa.Integer(), nullable=True),
            sa.Column('clicks', sa.Integer(), nullable=True),
            sa.Column('ctr', sa.Float(), nullable=True),
            sa.Column('position', sa.Float(), nullable=True),
            sa.Column('date', sa.Date(), nullable=True),
        )
    if 'ix_gsc_query_stats_property_id' not in [i['name'] for i in insp.get_indexes('gsc_query_stats')]:
        op.create_index('ix_gsc_query_stats_property_id', 'gsc_query_stats', ['property_id'])
    if 'ix_gsc_query_stats_query' not in [i['name'] for i in insp.get_indexes('gsc_query_stats')]:
        op.create_index('ix_gsc_query_stats_query', 'gsc_query_stats', ['query'])
    if 'ix_gsc_query_stats_date' not in [i['name'] for i in insp.get_indexes('gsc_query_stats')]:
        op.create_index('ix_gsc_query_stats_date', 'gsc_query_stats', ['date'])


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    for idx_name, table in [
        ('ix_gsc_query_stats_date', 'gsc_query_stats'),
        ('ix_gsc_query_stats_query', 'gsc_query_stats'),
        ('ix_gsc_query_stats_property_id', 'gsc_query_stats'),
    ]:
        if insp.has_table(table) and idx_name in [i['name'] for i in insp.get_indexes(table)]:
            op.drop_index(idx_name, table_name=table)
    if _table_exists(bind, 'gsc_query_stats'):
        op.drop_table('gsc_query_stats')
    if _table_exists(bind, 'gsc_properties'):
        op.drop_table('gsc_properties')
    if insp.has_table('course_faqs') and 'ix_course_faqs_course_id' in [i['name'] for i in insp.get_indexes('course_faqs')]:
        op.drop_index('ix_course_faqs_course_id', table_name='course_faqs')
    if _table_exists(bind, 'course_faqs'):
        op.drop_table('course_faqs')
    if insp.has_table('redirects') and 'ix_redirects_from_path' in [i['name'] for i in insp.get_indexes('redirects')]:
        op.drop_index('ix_redirects_from_path', table_name='redirects')
    if _table_exists(bind, 'redirects'):
        op.drop_table('redirects')
    if insp.has_table('seo_page_meta') and 'ix_seo_page_meta_page_key' in [i['name'] for i in insp.get_indexes('seo_page_meta')]:
        op.drop_index('ix_seo_page_meta_page_key', table_name='seo_page_meta')
    if _table_exists(bind, 'seo_page_meta'):
        op.drop_table('seo_page_meta')
    for col_name in ['gsc_refresh_token', 'ai_bot_allow', 'llms_full_enabled', 'llms_txt', 'organization_schema', 'default_robots_index', 'google_site_verification', 'canonical_base_url', 'twitter_handle', 'og_image_url']:
        if _column_exists(bind, 'site_settings', col_name):
            op.drop_column('site_settings', col_name)
