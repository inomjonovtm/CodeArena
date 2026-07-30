"""TOTP (RFC 6238) — 2FA uchun, tashqi kutubxonasiz."""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote

DIGITS = 6
PERIOD = 30
WINDOW = 1  # oldingi/keyingi 30 soniyaga ham ruxsat (soat farqi uchun)


def generate_secret(length: int = 20) -> str:
    """Base32 sir (Google Authenticator formatida)."""
    return base64.b32encode(secrets.token_bytes(length)).decode("ascii").rstrip("=")


def _code_at(secret: str, counter: int) -> str:
    padding = "=" * (-len(secret) % 8)
    key = base64.b32decode(secret + padding, casefold=True)
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return str(code % (10 ** DIGITS)).zfill(DIGITS)


def now_code(secret: str) -> str:
    return _code_at(secret, int(time.time()) // PERIOD)


def verify(secret: str, code: str) -> bool:
    """Kodni tekshiradi (vaqt farqiga ±30 s bardosh beradi)."""
    if not secret or not code:
        return False
    code = code.strip().replace(" ", "")
    if not code.isdigit() or len(code) != DIGITS:
        return False
    counter = int(time.time()) // PERIOD
    for shift in range(-WINDOW, WINDOW + 1):
        if hmac.compare_digest(_code_at(secret, counter + shift), code):
            return True
    return False


def provisioning_uri(secret: str, account: str, issuer: str = "CodeArena") -> str:
    """Authenticator ilovasi o'qiydigan `otpauth://` havolasi."""
    label = quote(f"{issuer}:{account}")
    return (
        f"otpauth://totp/{label}?secret={secret}&issuer={quote(issuer)}"
        f"&algorithm=SHA1&digits={DIGITS}&period={PERIOD}"
    )


def generate_recovery_codes(count: int = 8) -> list[str]:
    """Bir martalik zaxira kodlar."""
    return [f"{secrets.token_hex(2)}-{secrets.token_hex(2)}".upper() for _ in range(count)]
