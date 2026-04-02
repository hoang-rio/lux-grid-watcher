"""init multitenant schema

Revision ID: 20260402_0001
Revises:
Create Date: 2026-04-02
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260402_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("email_confirmed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )

    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "email_verification_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "password_reset_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "inverters",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("dongle_serial", sa.String(length=32), nullable=False),
        sa.Column("invert_serial", sa.String(length=32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dongle_serial", name="uq_inverters_dongle_serial"),
        sa.UniqueConstraint("invert_serial", name="uq_inverters_invert_serial"),
    )
    op.create_index("idx_inverters_user_id", "inverters", ["user_id"])

    op.create_table(
        "inverter_latest_state",
        sa.Column("inverter_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("device_time", sa.DateTime(), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["inverter_id"], ["inverters.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("inverter_id"),
    )

    op.create_table(
        "hourly_chart_v2",
        sa.Column("inverter_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("datetime", sa.DateTime(), nullable=False),
        sa.Column("pv", sa.Integer(), nullable=False),
        sa.Column("battery", sa.Integer(), nullable=False),
        sa.Column("grid", sa.Integer(), nullable=False),
        sa.Column("consumption", sa.Integer(), nullable=False),
        sa.Column("soc", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["inverter_id"], ["inverters.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("inverter_id", "datetime"),
    )
    op.create_index("idx_hourly_chart_v2_inverter_datetime", "hourly_chart_v2", ["inverter_id", "datetime"])

    op.create_table(
        "daily_chart_v2",
        sa.Column("inverter_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("pv", sa.Integer(), nullable=False),
        sa.Column("battery_charged", sa.Integer(), nullable=False),
        sa.Column("battery_discharged", sa.Integer(), nullable=False),
        sa.Column("grid_import", sa.Integer(), nullable=False),
        sa.Column("grid_export", sa.Integer(), nullable=False),
        sa.Column("consumption", sa.Numeric(10, 1), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["inverter_id"], ["inverters.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("inverter_id", "date"),
    )
    op.create_index("idx_daily_chart_v2_inverter_date", "daily_chart_v2", ["inverter_id", "date"])

    op.create_table(
        "notification_history_v2",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("inverter_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("notified_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["inverter_id"], ["inverters.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_notification_history_v2_user_notified", "notification_history_v2", ["user_id", "notified_at"])
    op.create_index("idx_notification_history_v2_inverter_notified", "notification_history_v2", ["inverter_id", "notified_at"])

    op.create_table(
        "user_device_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token", sa.String(length=500), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token", name="uq_user_device_tokens_token"),
    )
    op.create_index("idx_user_device_tokens_user_id", "user_device_tokens", ["user_id"])

    op.create_table(
        "scoped_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("scope", sa.String(length=16), nullable=False),
        sa.Column("scope_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("key", sa.String(length=128), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("scope", "scope_id", "key", name="uq_scoped_settings_scope_scope_id_key"),
    )
    op.create_index("idx_scoped_settings_scope_scope_id", "scoped_settings", ["scope", "scope_id"])


def downgrade() -> None:
    op.drop_index("idx_scoped_settings_scope_scope_id", table_name="scoped_settings")
    op.drop_table("scoped_settings")

    op.drop_index("idx_user_device_tokens_user_id", table_name="user_device_tokens")
    op.drop_table("user_device_tokens")

    op.drop_index("idx_notification_history_v2_inverter_notified", table_name="notification_history_v2")
    op.drop_index("idx_notification_history_v2_user_notified", table_name="notification_history_v2")
    op.drop_table("notification_history_v2")

    op.drop_index("idx_daily_chart_v2_inverter_date", table_name="daily_chart_v2")
    op.drop_table("daily_chart_v2")

    op.drop_index("idx_hourly_chart_v2_inverter_datetime", table_name="hourly_chart_v2")
    op.drop_table("hourly_chart_v2")

    op.drop_table("inverter_latest_state")

    op.drop_index("idx_inverters_user_id", table_name="inverters")
    op.drop_table("inverters")

    op.drop_table("password_reset_tokens")
    op.drop_table("email_verification_tokens")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
