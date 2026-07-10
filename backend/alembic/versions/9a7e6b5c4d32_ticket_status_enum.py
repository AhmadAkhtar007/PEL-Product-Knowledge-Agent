"""ticket status enum

Revision ID: 9a7e6b5c4d32
Revises: 894e76184791
Create Date: 2026-07-06 17:05:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '9a7e6b5c4d32'
down_revision = '894e76184791'
branch_labels = None
depends_on = None

def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DO $$ BEGIN CREATE TYPE ticket_status_enum AS ENUM ('new', 'assigned', 'in_progress', 'resolved', 'closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;")
        op.execute("ALTER TABLE tickets ALTER COLUMN status TYPE ticket_status_enum USING status::ticket_status_enum")

def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE tickets ALTER COLUMN status TYPE VARCHAR USING status::VARCHAR")
        op.execute("DROP TYPE IF EXISTS ticket_status_enum")
