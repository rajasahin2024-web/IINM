"""create webinar_lead table (₹499 webinar funnel)

Revision ID: j7k8l9m0n1o2
Revises: i2j3k4l5m6n7
Create Date: 2026-10-01 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'j7k8l9m0n1o2'
down_revision: Union[str, Sequence[str], None] = 'i2j3k4l5m6n7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # main.py runs Base.metadata.create_all() on server start, so the table may
    # already exist before this migration runs. Guard so `alembic upgrade head`
    # stays safe in that case.
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if 'webinar_lead' in set(insp.get_table_names()):
        return

    op.create_table(
        'webinar_lead',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('uuid', sa.String(length=64), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=32), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('amount_paise', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=8), nullable=False),
        sa.Column('razorpay_order_id', sa.String(length=64), nullable=True),
        sa.Column('razorpay_payment_id', sa.String(length=64), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('utm_source', sa.String(length=128), nullable=True),
        sa.Column('utm_medium', sa.String(length=128), nullable=True),
        sa.Column('utm_campaign', sa.String(length=128), nullable=True),
        sa.Column('utm_term', sa.String(length=128), nullable=True),
        sa.Column('utm_content', sa.String(length=128), nullable=True),
        sa.Column('fbc', sa.String(length=255), nullable=True),
        sa.Column('fbp', sa.String(length=255), nullable=True),
        sa.Column('referrer', sa.String(length=512), nullable=True),
        sa.Column('ewebinar_registrant_id', sa.String(length=64), nullable=True),
        sa.Column('ewebinar_join_url', sa.String(length=512), nullable=True),
        sa.Column('ewebinar_replay_url', sa.String(length=512), nullable=True),
        sa.Column('ewebinar_session_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ewebinar_state', sa.String(length=32), nullable=True),
        sa.Column('ewebinar_last_action', sa.String(length=48), nullable=True),
        sa.Column('registration_error', sa.Text(), nullable=True),
        sa.Column('registered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('watched_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('call_status', sa.String(length=32), nullable=True),
        sa.Column('call_notes', sa.Text(), nullable=True),
        sa.Column('called_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_webinar_lead_id'), 'webinar_lead', ['id'], unique=False)
    op.create_index(op.f('ix_webinar_lead_uuid'), 'webinar_lead', ['uuid'], unique=True)
    op.create_index(op.f('ix_webinar_lead_email'), 'webinar_lead', ['email'], unique=False)
    op.create_index(op.f('ix_webinar_lead_status'), 'webinar_lead', ['status'], unique=False)
    op.create_index(op.f('ix_webinar_lead_razorpay_order_id'), 'webinar_lead', ['razorpay_order_id'], unique=True)
    op.create_index(op.f('ix_webinar_lead_ewebinar_registrant_id'), 'webinar_lead', ['ewebinar_registrant_id'], unique=False)


def downgrade() -> None:
    # No-op by policy: drop_table/drop_column are prohibited in migrations.
    # To retire the table, do it via a reviewed manual step, not alembic.
    pass
