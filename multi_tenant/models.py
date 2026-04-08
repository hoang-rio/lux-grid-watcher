from __future__ import annotations

import uuid
from datetime import datetime, timezone
from os import environ
from zoneinfo import ZoneInfo

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def get_current_datetime():
    """Get current datetime in the configured timezone (TZ env var).
    Falls back to UTC if TZ is not set or invalid.
    """
    tz_name = environ.get("TZ", "UTC")
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("UTC")
    return datetime.now(tz)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    email_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=get_current_datetime)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=get_current_datetime, onupdate=get_current_datetime)

    inverters: Mapped[list[Inverter]] = relationship(back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=get_current_datetime)


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=get_current_datetime)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=get_current_datetime)


class Inverter(Base):
    __tablename__ = "inverters"
    __table_args__ = (
        UniqueConstraint("dongle_serial", name="uq_inverters_dongle_serial"),
        UniqueConstraint("invert_serial", name="uq_inverters_invert_serial"),
        Index("idx_inverters_user_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    dongle_serial: Mapped[str] = mapped_column(String(32), nullable=False)
    invert_serial: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=get_current_datetime)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=get_current_datetime, onupdate=get_current_datetime)

    user: Mapped[User] = relationship(back_populates="inverters")


class InverterLatestState(Base):
    __tablename__ = "inverter_latest_state"

    inverter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inverters.id", ondelete="CASCADE"), primary_key=True)
    device_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=get_current_datetime, onupdate=get_current_datetime)


class HourlyChart(Base):
    __tablename__ = "hourly_chart_v2"
    __table_args__ = (Index("idx_hourly_chart_v2_inverter_datetime", "inverter_id", "datetime"),)

    inverter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inverters.id", ondelete="CASCADE"), primary_key=True)
    datetime: Mapped[datetime] = mapped_column(DateTime, primary_key=True)
    pv: Mapped[int] = mapped_column(Integer, nullable=False)
    battery: Mapped[int] = mapped_column(Integer, nullable=False)
    grid: Mapped[int] = mapped_column(Integer, nullable=False)
    consumption: Mapped[int] = mapped_column(Integer, nullable=False)
    soc: Mapped[int] = mapped_column(Integer, nullable=False)


class DailyChart(Base):
    __tablename__ = "daily_chart_v2"
    __table_args__ = (Index("idx_daily_chart_v2_inverter_date", "inverter_id", "date"),)

    inverter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inverters.id", ondelete="CASCADE"), primary_key=True)
    date: Mapped[Date] = mapped_column(Date, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    pv: Mapped[float] = mapped_column(Numeric(10, 1), nullable=False)
    battery_charged: Mapped[float] = mapped_column(Numeric(10, 1), nullable=False)
    battery_discharged: Mapped[float] = mapped_column(Numeric(10, 1), nullable=False)
    grid_import: Mapped[float] = mapped_column(Numeric(10, 1), nullable=False)
    grid_export: Mapped[float] = mapped_column(Numeric(10, 1), nullable=False)
    consumption: Mapped[float] = mapped_column(Numeric(10, 1), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=get_current_datetime, onupdate=get_current_datetime)


class NotificationHistory(Base):
    __tablename__ = "notification_history_v2"
    __table_args__ = (
        Index("idx_notification_history_v2_user_notified", "user_id", "notified_at"),
        Index("idx_notification_history_v2_inverter_notified", "inverter_id", "notified_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    inverter_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("inverters.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notified_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=get_current_datetime)


class UserDeviceToken(Base):
    __tablename__ = "user_device_tokens"
    __table_args__ = (
        UniqueConstraint("token", name="uq_user_device_tokens_token"),
        Index("idx_user_device_tokens_user_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=get_current_datetime)


class ScopedSetting(Base):
    __tablename__ = "scoped_settings"
    __table_args__ = (
        UniqueConstraint("scope", "scope_id", "key", name="uq_scoped_settings_scope_scope_id_key"),
        Index("idx_scoped_settings_scope_scope_id", "scope", "scope_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scope: Mapped[str] = mapped_column(String(16), nullable=False)
    scope_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    key: Mapped[str] = mapped_column(String(128), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=get_current_datetime, onupdate=get_current_datetime)
