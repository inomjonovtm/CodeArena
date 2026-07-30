from django.urls import path

from . import public_views, social_views, views
from .security_views import totp_disable, totp_enable, totp_setup

urlpatterns = [
    # --- asosiy sessiya
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("register/", views.RegisterView.as_view(), name="auth-register"),
    path("refresh/", views.RefreshView.as_view(), name="auth-refresh"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("me/", views.MeView.as_view(), name="auth-me"),
    path("me/avatar/", social_views.my_avatar, name="auth-me-avatar"),
    path("change-password/", views.ChangePasswordView.as_view(), name="auth-change-password"),
    path("config/", public_views.auth_config, name="auth-config"),
    # --- email tasdiqlash va parolni tiklash
    path("verify-email/", public_views.verify_email, name="auth-verify-email"),
    path("resend-verification/", public_views.resend_verification, name="auth-resend-verification"),
    path("forgot-password/", public_views.forgot_password, name="auth-forgot-password"),
    path("reset-password/", public_views.reset_password, name="auth-reset-password"),
    # --- ijtimoiy kirish
    path("google/", public_views.google_auth, name="auth-google"),
    # --- xavfsizlik: 2FA (foydalanuvchi profilida ham ochiq)
    path("2fa/setup/", totp_setup, name="auth-2fa-setup"),
    path("2fa/enable/", totp_enable, name="auth-2fa-enable"),
    path("2fa/disable/", totp_disable, name="auth-2fa-disable"),
    # --- sessiyalar
    path("sessions/", public_views.my_sessions, name="auth-sessions"),
    path("sessions/revoke-others/", public_views.revoke_other_sessions, name="auth-sessions-revoke-others"),
    path("sessions/<uuid:session_id>/revoke/", public_views.revoke_my_session, name="auth-session-revoke"),
    # --- hisob
    path("deactivate/", public_views.deactivate_account, name="auth-deactivate"),
]
