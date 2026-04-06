"""allow nullable invert_serial on inverters

Revision ID: 20260406_0003
Revises: 20260406_0002
Create Date: 2026-04-06
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260406_0003"
down_revision = "20260406_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("inverters", "invert_serial", existing_type=sa.String(length=32), nullable=True)


def downgrade() -> None:
    op.execute("UPDATE inverters SET invert_serial = '' WHERE invert_serial IS NULL")
    op.alter_column("inverters", "invert_serial", existing_type=sa.String(length=32), nullable=False)
