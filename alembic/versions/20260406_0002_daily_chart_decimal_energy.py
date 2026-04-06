"""change daily chart energy columns to numeric(10,1)

Revision ID: 20260406_0002
Revises: 20260402_0001
Create Date: 2026-04-06
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260406_0002"
down_revision = "20260402_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "daily_chart_v2",
        "pv",
        existing_type=sa.Integer(),
        type_=sa.Numeric(10, 1),
        postgresql_using="pv::numeric(10,1)",
    )
    op.alter_column(
        "daily_chart_v2",
        "battery_charged",
        existing_type=sa.Integer(),
        type_=sa.Numeric(10, 1),
        postgresql_using="battery_charged::numeric(10,1)",
    )
    op.alter_column(
        "daily_chart_v2",
        "battery_discharged",
        existing_type=sa.Integer(),
        type_=sa.Numeric(10, 1),
        postgresql_using="battery_discharged::numeric(10,1)",
    )
    op.alter_column(
        "daily_chart_v2",
        "grid_import",
        existing_type=sa.Integer(),
        type_=sa.Numeric(10, 1),
        postgresql_using="grid_import::numeric(10,1)",
    )
    op.alter_column(
        "daily_chart_v2",
        "grid_export",
        existing_type=sa.Integer(),
        type_=sa.Numeric(10, 1),
        postgresql_using="grid_export::numeric(10,1)",
    )


def downgrade() -> None:
    op.alter_column(
        "daily_chart_v2",
        "grid_export",
        existing_type=sa.Numeric(10, 1),
        type_=sa.Integer(),
        postgresql_using="round(grid_export)::integer",
    )
    op.alter_column(
        "daily_chart_v2",
        "grid_import",
        existing_type=sa.Numeric(10, 1),
        type_=sa.Integer(),
        postgresql_using="round(grid_import)::integer",
    )
    op.alter_column(
        "daily_chart_v2",
        "battery_discharged",
        existing_type=sa.Numeric(10, 1),
        type_=sa.Integer(),
        postgresql_using="round(battery_discharged)::integer",
    )
    op.alter_column(
        "daily_chart_v2",
        "battery_charged",
        existing_type=sa.Numeric(10, 1),
        type_=sa.Integer(),
        postgresql_using="round(battery_charged)::integer",
    )
    op.alter_column(
        "daily_chart_v2",
        "pv",
        existing_type=sa.Numeric(10, 1),
        type_=sa.Integer(),
        postgresql_using="round(pv)::integer",
    )
