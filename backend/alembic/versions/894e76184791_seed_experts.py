"""Seed experts

Revision ID: 894e76184791
Revises: f62da3d36ae3
Create Date: 2026-07-06 21:23:46.116125

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '894e76184791'
down_revision: Union[str, Sequence[str], None] = 'f62da3d36ae3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    experts_table = sa.table(
        'experts',
        sa.column('name', sa.String),
        sa.column('role_title', sa.String),
        sa.column('department', sa.String),
        sa.column('phone', sa.String),
        sa.column('email', sa.String)
    )
    op.bulk_insert(
        experts_table,
        [
            {
                "name": "Engr. Muhammad Asif",
                "role_title": "Refrigerator Division Head",
                "department": "refrigerators",
                "phone": "+92-300-1112223",
                "email": "asif.refrigerator@pel.com.pk"
            },
            {
                "name": "Engr. Yasir Mahmood",
                "role_title": "AC Division Head",
                "department": "air_conditioners",
                "phone": "+92-300-4445556",
                "email": "yasir.ac@pel.com.pk"
            },
            {
                "name": "Engr. Fatima Shah",
                "role_title": "Washing Machine Division Head",
                "department": "washing_machines",
                "phone": "+92-300-7778889",
                "email": "fatima.wm@pel.com.pk"
            }
        ]
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DELETE FROM experts WHERE email IN ('asif.refrigerator@pel.com.pk', 'yasir.ac@pel.com.pk', 'fatima.wm@pel.com.pk')")

