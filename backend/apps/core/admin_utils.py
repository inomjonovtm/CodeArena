"""Boshqaruv paneli uchun umumiy yordamchilar.

Django filtr sarlavhasini maydonning `verbose_name` idan oladi va uni
«By status» ko'rinishida yozadi. Bizda interfeys o'zbekcha, shuning uchun
sarlavha ham o'zbekcha bo'lishi kerak — `titled` shu ishni qiladi.
"""
from __future__ import annotations


def titled(filter_class, title: str):
    """Filtr klassining nusxasini berilgan sarlavha bilan qaytaradi.

    Ishlatilishi:

        list_filter = (("status", titled(ChoicesDropdownFilter, "Holat")),)

    Django filtr klassini har bir maydon uchun qaytadan yaratadi, shuning
    uchun sarlavhani `__init__` da qo'yamiz — klass darajasidagi atribut
    `field.verbose_name` bilan almashib ketardi.
    """

    class TitledFilter(filter_class):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self.title = title

    TitledFilter.__name__ = f"{filter_class.__name__}_{title}"
    return TitledFilter
