"""O'zbekiston viloyatlari va tumanlari — ro'yxatdan o'tish formasi uchun.

Ro'yxat backendda turadi va `GET /api/geo/regions/` orqali beriladi: shunda
frontend bilan backend bir xil ma'lumotdan foydalanadi va tekshiruv ham shu
yerda bo'ladi (foydalanuvchi ixtiyoriy matn yubora olmaydi).
"""
from __future__ import annotations

REGIONS: dict[str, list[str]] = {
    "Toshkent shahri": [
        "Bektemir", "Chilonzor", "Mirobod", "Mirzo Ulug'bek", "Olmazor",
        "Sergeli", "Shayxontohur", "Uchtepa", "Yakkasaroy", "Yashnobod",
        "Yunusobod", "Yangihayot",
    ],
    "Toshkent viloyati": [
        "Angren", "Bekobod", "Bekobod tumani", "Bo'ka", "Bo'stonliq", "Chinoz",
        "Chirchiq", "Nurafshon", "O'rta Chirchiq", "Ohangaron", "Olmaliq",
        "Oqqo'rg'on", "Parkent", "Piskent", "Quyi Chirchiq", "Toshkent tumani",
        "Yangiyo'l", "Yuqori Chirchiq", "Zangiota",
    ],
    "Andijon": [
        "Andijon shahri", "Andijon tumani", "Asaka", "Baliqchi", "Bo'ston",
        "Buloqboshi", "Izboskan", "Jalaquduq", "Xo'jaobod", "Qo'rg'ontepa",
        "Marhamat", "Oltinko'l", "Paxtaobod", "Shahrixon", "Ulug'nor",
    ],
    "Buxoro": [
        "Buxoro shahri", "Buxoro tumani", "G'ijduvon", "Jondor", "Kogon",
        "Kogon tumani", "Olot", "Peshku", "Qorako'l", "Qorovulbozor",
        "Romitan", "Shofirkon", "Vobkent",
    ],
    "Farg'ona": [
        "Farg'ona shahri", "Farg'ona tumani", "Beshariq", "Bog'dod", "Buvayda",
        "Dang'ara", "Furqat", "Yozyovon", "Quva", "Quvasoy", "Qo'shtepa",
        "Marg'ilon", "Oltiariq", "Rishton", "So'x", "Toshloq", "Uchko'prik",
        "O'zbekiston tumani",
    ],
    "Jizzax": [
        "Jizzax shahri", "Arnasoy", "Baxmal", "Do'stlik", "Forish", "G'allaorol",
        "Sharof Rashidov", "Mirzacho'l", "Paxtakor", "Yangiobod", "Zafarobod",
        "Zomin",
    ],
    "Xorazm": [
        "Urganch", "Urganch tumani", "Bog'ot", "Gurlan", "Xiva", "Xiva tumani",
        "Xonqa", "Qo'shko'pir", "Shovot", "Yangiariq", "Yangibozor", "Hazorasp",
        "Tuproqqal'a",
    ],
    "Namangan": [
        "Namangan shahri", "Namangan tumani", "Chortoq", "Chust", "Kosonsoy",
        "Mingbuloq", "Norin", "Pop", "To'raqo'rg'on", "Uychi", "Uchqo'rg'on",
        "Yangiqo'rg'on", "Davlatobod",
    ],
    "Navoiy": [
        "Navoiy shahri", "Zarafshon", "G'ozg'on", "Karmana", "Konimex",
        "Navbahor", "Nurota", "Qiziltepa", "Tomdi", "Uchquduq", "Xatirchi",
    ],
    "Qashqadaryo": [
        "Qarshi", "Qarshi tumani", "Chiroqchi", "Dehqonobod", "G'uzor",
        "Kasbi", "Kitob", "Ko'kdala", "Mirishkor", "Muborak", "Nishon",
        "Shahrisabz", "Shahrisabz tumani", "Yakkabog'", "Ko'son",
    ],
    "Qoraqalpog'iston Respublikasi": [
        "Nukus", "Nukus tumani", "Amudaryo", "Beruniy", "Chimboy", "Ellikqal'a",
        "Kegeyli", "Mo'ynoq", "Qanliko'l", "Qo'ng'irot", "Qorao'zak",
        "Shumanay", "Taxtako'pir", "To'rtko'l", "Xo'jayli", "Taxiatosh",
    ],
    "Samarqand": [
        "Samarqand shahri", "Samarqand tumani", "Bulung'ur", "Ishtixon",
        "Jomboy", "Kattaqo'rg'on", "Kattaqo'rg'on tumani", "Narpay", "Nurobod",
        "Oqdaryo", "Payariq", "Pastdarg'om", "Paxtachi",
        "Toyloq", "Urgut", "Qo'shrabot",
    ],
    "Sirdaryo": [
        "Guliston", "Guliston tumani", "Boyovut", "Mirzaobod", "Oqoltin",
        "Sardoba", "Sayxunobod", "Sirdaryo tumani", "Shirin", "Xovos",
        "Yangiyer",
    ],
    "Surxondaryo": [
        "Termiz", "Termiz tumani", "Angor", "Bandixon", "Boysun", "Denov",
        "Jarqo'rg'on", "Muzrabot", "Oltinsoy", "Qiziriq", "Qumqo'rg'on",
        "Sariosiyo", "Sherobod", "Sho'rchi", "Uzun",
    ],
}

REGION_NAMES: list[str] = list(REGIONS)


def districts_of(region: str) -> list[str]:
    return REGIONS.get(region, [])


def is_valid(region: str, district: str = "") -> bool:
    """Viloyat mavjudligini (va berilgan bo'lsa tumanni) tekshiradi."""
    if region not in REGIONS:
        return False
    if district and district not in REGIONS[region]:
        return False
    return True


def as_list() -> list[dict]:
    """`GET /api/geo/regions/` javobi uchun shakl."""
    return [{"name": name, "districts": districts} for name, districts in REGIONS.items()]
