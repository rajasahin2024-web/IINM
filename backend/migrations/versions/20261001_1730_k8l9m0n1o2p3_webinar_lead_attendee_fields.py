"""webinar_lead: attendee analytics + caller-sheet priority fields

Adds eWebinar analytics columns (watch_pct, chat_msgs, poll_answer),
CALL ME chat-escalation fields, and the 48h offer_deadline anchor per
marketing/webinar-funnel specs (05/06 + README offer mechanics).

Revision ID: k8l9m0n1o2p3
Revises: j7k8l9m0n1o2
Create Date: 2026-10-01 17:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'k8l9m0n1o2p3'
down_revision: Union[str, Sequence[str], None] = 'j7k8l9m0n1o2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_NEW_COLUMNS = [
    ('watch_pct', sa.Column('watch_pct', sa.Integer(), nullable=True)),
    ('chat_msgs', sa.Column('chat_msgs', sa.Integer(), nullable=True)),
    ('poll_answer', sa.Column('poll_answer', sa.String(length=255), nullable=True)),
    ('callme_flag', sa.Column('callme_flag', sa.Boolean(), nullable=False, server_default=sa.false())),
    ('callme_at', sa.Column('callme_at', sa.DateTime(timezone=True), nullable=True)),
    ('callme_reason', sa.Column('callme_reason', sa.String(length=64), nullable=True)),
    ('callme_excerpt', sa.Column('callme_excerpt', sa.String(length=500), nullable=True)),
    ('offer_deadline', sa.Column('offer_deadline', sa.DateTime(timezone=True), nullable=True)),
]


def upgrade() -> None:
    # main.py runs Base.metadata.create_all() on server start, so columns may
    # already exist before this migration runs. Guard each add so
    # `alembic upgrade head` stays safe in that case.
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if 'webinar_lead' not in set(insp.get_table_names()):
        return
    existing = {c['name'] for c in insp.get_columns('webinar_lead')}
    for name, col in _NEW_COLUMNS:
        if name not in existing:
            op.add_column('webinar_lead', col)


def downgrade() -> None:
    # No-op by policy: drop_table/drop_column are prohibited in migrations.
    pass
