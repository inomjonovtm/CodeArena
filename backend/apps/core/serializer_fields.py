"""Bir necha ilovada takrorlanadigan serializer maydonlari."""
from __future__ import annotations

from rest_framework import serializers

from apps.core import ranks


class RankField(serializers.Field):
    """Reytingdan rank obyektini hosil qiladi (faqat o'qish uchun).

    Profil ko'rsatiladigan har bir javobda rank bo'lishi kerak — avatar
    ramkasi shundan chiziladi. Har serializerda `SerializerMethodField`
    yozish o'rniga bitta maydon:

        rank = RankField()                 # obyektning o'zida `rating` bor
        user_rank = RankField("user.rating")  # bog'langan obyektdan

    `source="*"` — DRF butun instansiyani beradi, yo'lni o'zimiz yuramiz.
    """

    def __init__(self, path: str = "rating", **kwargs):
        kwargs["read_only"] = True
        kwargs["source"] = "*"
        self.path = path
        super().__init__(**kwargs)

    def to_representation(self, instance) -> dict | None:
        value = instance
        for part in self.path.split("."):
            value = getattr(value, part, None)
            if value is None:
                return None
        return ranks.rank_info(int(value))
