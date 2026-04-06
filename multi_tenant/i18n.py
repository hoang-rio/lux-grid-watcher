from __future__ import annotations

from typing import Literal

Locale = Literal["en", "vi"]


_TRANSLATIONS_VI: dict[str, str] = {
    "Unauthorized": "Chưa xác thực",
    "Token expired": "Phiên đăng nhập đã hết hạn",
    "Invalid token": "Token không hợp lệ",
    "Invalid JSON body": "Nội dung JSON không hợp lệ",
    "Invalid email address": "Địa chỉ email không hợp lệ",
    "Password must be at least 8 characters": "Mật khẩu phải có ít nhất 8 ký tự",
    "Email already registered": "Email đã được đăng ký",
    "Registration failed": "Đăng ký thất bại",
    "Registration successful. Please check your email to verify your account.": "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.",
    "Invalid email or password": "Email hoặc mật khẩu không đúng",
    "Login failed": "Đăng nhập thất bại",
    "refresh_token is required": "Cần refresh_token",
    "Invalid or expired refresh token": "Refresh token không hợp lệ hoặc đã hết hạn",
    "User not found": "Không tìm thấy người dùng",
    "Token refresh failed": "Làm mới token thất bại",
    "Logged out": "Đã đăng xuất",
    "Logout failed": "Đăng xuất thất bại",
    "Failed to load profile": "Tải thông tin người dùng thất bại",
    "Email already verified": "Email đã được xác thực",
    "Verification email sent": "Đã gửi email xác thực",
    "Failed to send verification email": "Gửi email xác thực thất bại",
    "token is required": "Cần token",
    "Invalid or expired verification token": "Token xác thực không hợp lệ hoặc đã hết hạn",
    "Email verified successfully": "Xác thực email thành công",
    "Email verification failed": "Xác thực email thất bại",
    "email is required": "Cần email",
    "If that email is registered and verified, a reset link has been sent.": "Nếu email đã đăng ký và đã xác thực, liên kết đặt lại mật khẩu đã được gửi.",
    "Invalid or expired reset token": "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn",
    "Password reset successfully. Please log in with your new password.": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.",
    "Password reset failed": "Đặt lại mật khẩu thất bại",
    "Failed to create inverter": "Tạo inverter thất bại",
    "Failed to load inverters": "Tải danh sách inverter thất bại",
    "Inverter removed": "Đã xóa inverter",
    "Failed to remove inverter": "Xóa inverter thất bại",
    "Invalid inverter id": "ID inverter không hợp lệ",
    "Inverter not found": "Không tìm thấy inverter",
    "dongle_serial is required": "Cần dongle_serial",
    "invert_serial is required": "Cần invert_serial",
    "dongle_serial already registered": "dongle_serial đã được đăng ký",
    "invert_serial already registered": "invert_serial đã được đăng ký",
    "name is required": "Cần nhập tên",
    "Failed to update inverter": "Cập nhật inverter thất bại",
    "Forbidden": "Không có quyền truy cập",
    "inverter_id is required": "Cần inverter_id",
    "Failed to resolve inverter scope": "Không thể xác định phạm vi inverter",
    "Forbidden inverter scope": "Không có quyền truy cập inverter này",
    "Missing required parameter 'token'": "Thiếu tham số bắt buộc 'token'",
    "Device register success": "Đăng ký thiết bị thành công",
    "Current password is required": "Cần nhập mật khẩu hiện tại",
    "New password must be different from current password": "Mật khẩu mới phải khác mật khẩu hiện tại",
    "Password changed successfully. Please log in with your new password.": "Đổi mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.",
    "Password change failed": "Đổi mật khẩu thất bại",
    "Current password is incorrect": "Mật khẩu hiện tại không đúng",
}


_EMAIL_SUBJECTS = {
    "verification": {
        "en": "Confirm your email address",
        "vi": "Xác nhận địa chỉ email",
    },
    "reset_password": {
        "en": "Reset your password",
        "vi": "Đặt lại mật khẩu",
    },
}


_EMAIL_BODIES = {
    "verification": {
        "en": """
    <p>Please verify your email address by clicking the link below:</p>
    <p><a href=\"{url}\">{url}</a></p>
    <p>This link expires in 24 hours.</p>
    <p>If you did not register, you can ignore this email.</p>
    """,
        "vi": """
    <p>Vui lòng xác thực địa chỉ email bằng cách nhấn vào liên kết bên dưới:</p>
    <p><a href=\"{url}\">{url}</a></p>
    <p>Liên kết này hết hạn sau 24 giờ.</p>
    <p>Nếu bạn không đăng ký, vui lòng bỏ qua email này.</p>
    """,
    },
    "reset_password": {
        "en": """
    <p>You requested a password reset. Click the link below to set a new password:</p>
    <p><a href=\"{url}\">{url}</a></p>
    <p>This link expires in 1 hour. If you did not request this, please ignore this email.</p>
    """,
        "vi": """
    <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấn vào liên kết bên dưới để tạo mật khẩu mới:</p>
    <p><a href=\"{url}\">{url}</a></p>
    <p>Liên kết này hết hạn sau 1 giờ. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
    """,
    },
}


def normalize_locale(value: str | None) -> Locale:
    if not value:
        return "en"
    lowered = value.lower()
    if lowered.startswith("vi"):
        return "vi"
    return "en"


def get_locale_from_accept_language(accept_language: str | None) -> Locale:
    if not accept_language:
        return "en"
    first = accept_language.split(",", 1)[0].strip()
    return normalize_locale(first)


def translate(message: str, locale: Locale) -> str:
    if locale == "vi":
        return _TRANSLATIONS_VI.get(message, message)
    return message


def email_subject(kind: Literal["verification", "reset_password"], locale: Locale) -> str:
    return _EMAIL_SUBJECTS[kind][locale]


def email_body_html(kind: Literal["verification", "reset_password"], locale: Locale, *, url: str) -> str:
    return _EMAIL_BODIES[kind][locale].format(url=url)
