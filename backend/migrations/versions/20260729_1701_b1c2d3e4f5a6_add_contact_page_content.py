"""add_contact_page_content

Revision ID: b1c2d3e4f5a6
Revises: a7b8c9d0e1f2
Create Date: 2026-07-29 17:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = 'a7b8c9d0e1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Contact page editable copy
    op.add_column('contact_settings', sa.Column('page_title', sa.String(length=255), nullable=True))
    op.add_column('contact_settings', sa.Column('page_subtitle', sa.String(length=500), nullable=True))
    op.add_column('contact_settings', sa.Column('get_in_touch_heading', sa.String(length=255), nullable=True))
    op.add_column('contact_settings', sa.Column('get_in_touch_description', sa.Text(), nullable=True))
    op.add_column('contact_settings', sa.Column('contact_email_label', sa.String(length=100), nullable=True))
    op.add_column('contact_settings', sa.Column('contact_phone_label', sa.String(length=100), nullable=True))
    op.add_column('contact_settings', sa.Column('registered_office_label', sa.String(length=255), nullable=True))
    op.add_column('contact_settings', sa.Column('registered_office_city', sa.String(length=100), nullable=True))
    op.add_column('contact_settings', sa.Column('registered_office_address', sa.Text(), nullable=True))
    op.add_column('contact_settings', sa.Column('form_title', sa.String(length=255), nullable=True))
    op.add_column('contact_settings', sa.Column('form_subtitle', sa.String(length=500), nullable=True))
    op.add_column('contact_settings', sa.Column('state_options', sa.Text(), nullable=True))
    op.add_column('contact_settings', sa.Column('qualification_options', sa.Text(), nullable=True))
    op.add_column('contact_settings', sa.Column('terms_text', sa.Text(), nullable=True))
    op.add_column('contact_settings', sa.Column('terms_url', sa.String(length=500), nullable=True))
    op.add_column('contact_settings', sa.Column('success_message', sa.Text(), nullable=True))
    op.add_column('contact_settings', sa.Column('review_badges', sa.Text(), nullable=True))

    # Inquiry extra fields
    op.add_column('contact_inquiries', sa.Column('state', sa.String(length=100), nullable=True))
    op.add_column('contact_inquiries', sa.Column('qualification', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('contact_inquiries', 'qualification')
    op.drop_column('contact_inquiries', 'state')

    op.drop_column('contact_settings', 'review_badges')
    op.drop_column('contact_settings', 'success_message')
    op.drop_column('contact_settings', 'terms_url')
    op.drop_column('contact_settings', 'terms_text')
    op.drop_column('contact_settings', 'qualification_options')
    op.drop_column('contact_settings', 'state_options')
    op.drop_column('contact_settings', 'form_subtitle')
    op.drop_column('contact_settings', 'form_title')
    op.drop_column('contact_settings', 'registered_office_address')
    op.drop_column('contact_settings', 'registered_office_city')
    op.drop_column('contact_settings', 'registered_office_label')
    op.drop_column('contact_settings', 'contact_phone_label')
    op.drop_column('contact_settings', 'contact_email_label')
    op.drop_column('contact_settings', 'get_in_touch_description')
    op.drop_column('contact_settings', 'get_in_touch_heading')
    op.drop_column('contact_settings', 'page_subtitle')
    op.drop_column('contact_settings', 'page_title')
