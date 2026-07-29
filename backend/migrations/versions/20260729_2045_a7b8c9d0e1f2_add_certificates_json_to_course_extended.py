"""add certificates_json to course extended content

Revision ID: a7b8c9d0e1f2
Revises: 38ee638b1c07
Create Date: 2026-07-29 20:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = '38ee638b1c07'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'course_extended_contents',
        sa.Column('certificates_json', sa.Text(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('course_extended_contents', 'certificates_json')
