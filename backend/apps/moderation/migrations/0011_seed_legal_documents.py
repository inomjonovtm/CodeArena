"""Maxfiylik siyosati va foydalanish shartlarining boshlang'ich matni.

Matn ilgari frontend sahifalarida (`privacy/page.tsx`, `terms/page.tsx`) kodga
yozilgan edi. Endi u bazada turadi va admin panelda tahrirlanadi — shuning
uchun mavjud matn shu migratsiya orqali ko'chiriladi. Matndagi `{email}`
belgisi ochiq API'da sayt aloqa manziliga almashtiriladi.
"""
from django.db import migrations

PRIVACY_MD = """\
## Qanday ma'lumot yig'amiz

Hisob ma'lumotlari: foydalanuvchi nomi, email, ixtiyoriy ravishda to'liq ism, avatar, bio, viloyat/tuman, ta'lim muassasasi va havolalar (shaxsiy sahifa, veb-sayt).

Faoliyat ma'lumotlari: yuborgan kodingiz, tekshiruv natijalari, yechilgan masalalar, musobaqa natijalari, guruh a'zoligi, muhokama va izohlaringiz, xatcho'plaringiz.

Texnik ma'lumotlar: IP manzil, brauzer va qurilma turi, kirish vaqti, faol sessiyalar ro'yxati. Bular xavfsizlik va noto'g'ri foydalanishni aniqlash uchun kerak.

Biz sizdan hech qachon to'lov kartasi ma'lumotlarini, pasport yoki boshqa shaxsni tasdiqlovchi hujjat raqamlarini so'ramaymiz.

## Ma'lumotdan qanday foydalanamiz

Xizmatni ko'rsatish: yechimlarni tekshirish, ball va reytingni hisoblash, progressingizni saqlash, musobaqa natijalarini shakllantirish.

Xavfsizlik: hisobni himoya qilish, ko'p hisob va plagiat holatlarini aniqlash, suiiste'molning oldini olish, kirish urinishlarini cheklash.

Aloqa: email tasdiqlash, parolni tiklash, musobaqa eslatmalari va muhim e'lonlar. Bildirishnoma turlarini sozlamalardan alohida o'chirib qo'yish mumkin.

Statistika: platformani yaxshilash uchun umumlashtirilgan (shaxsni aniqlab bo'lmaydigan) hisobotlar — masalan, qaysi masala ko'p yechiladi yoki qaysi til mashhur.

## Nima uchun qayta ishlashga haqlimiz

Hisob va faoliyat ma'lumotlari — siz bilan tuzilgan foydalanish shartlarini bajarish uchun: ularsiz yechim tekshirish va reyting hisoblash mumkin emas.

Texnik va xavfsizlik ma'lumotlari — platformani himoya qilishdagi qonuniy manfaatimiz asosida.

Marketing xarakteridagi xatlar — faqat siz rozilik bergan holda; rozilikni istalgan vaqtda sozlamalardan qaytarib olishingiz mumkin.

## Ochiq ko'rinadigan ma'lumotlar

Profilingiz ommaviy: foydalanuvchi nomi, avatar, bio, hudud, reyting, ball, daraja, yechilgan masalalar soni va faollik kalendari boshqalarga ko'rinadi.

Musobaqa natijalari va reyting jadvalidagi o'rningiz ochiq bo'ladi — bu musobaqa formatining ajralmas qismi.

Emailingiz, IP manzilingiz va yuborgan kodingiz hech qachon boshqa foydalanuvchilarga ko'rsatilmaydi.

Muhokama va izohlaringiz ochiq — ularda shaxsiy ma'lumot yozmang.

## Cookie va brauzer xotirasi

Kirish uchun himoyalangan cookie ishlatiladi: uni sahifadagi skriptlar o'qiy olmaydi.

Tema (yorug'/qorong'i), til tanlovi va masala qoralamalari faqat brauzeringiz xotirasida saqlanadi va serverga yuborilmaydi.

Uchinchi tomon reklama yoki kuzatuv cookie'laridan foydalanmaymiz. Bizda reklama tarmoqlari uchun piksel yoki treker yo'q.

Cookie'ni brauzer sozlamalaridan o'chirsangiz, tizimdan chiqarilasiz — boshqa hech qanday ma'lumot yo'qolmaydi.

## Ma'lumotni uchinchi tomonlarga berish

Ma'lumotlaringizni sotmaymiz va reklama maqsadida uzatmaymiz.

Kod tekshiruvi tashqi tarmoqdan uzilgan, ajratilgan muhitda bajariladi; unga faqat kodingiz va test ma'lumotlari beriladi — kim yuborgani emas.

Google orqali kirishni tanlasangiz, Google'dan faqat email, ism va avatar olinadi.

Xatlar pochta yetkazib berish xizmati orqali jo'natiladi; unga faqat email manzilingiz va xat matni uzatiladi.

Qonuniy asos bo'lgan hollarda vakolatli organlarga ma'lumot berilishi mumkin.

## Ma'lumot xavfsizligi

Parollar hech qachon ochiq holda saqlanmaydi — faqat qaytarib bo'lmaydigan xesh ko'rinishida.

Ikki bosqichli tasdiqlashni (2FA) yoqishingiz mumkin; bu hisobni parol o'g'irlangan taqdirda ham himoya qiladi.

Faol sessiyalar ro'yxatini sozlamalarda ko'rasiz va begona qurilmani istalgan vaqtda uzib qo'yishingiz mumkin.

Xavfsizlik nuqsonini topsangiz, undan foydalanmasdan bizga xabar bering: {email}

## Saqlash muddati

Hisobingiz faol bo'lgan davrda ma'lumotlar saqlanadi. Hisobni faolsizlantirsangiz, profil ommadan yopiladi.

Yuborilgan yechimlar musobaqa natijalari va plagiat tekshiruvi uchun arxivda qoladi.

Admin paneldan o'chirilgan yozuvlar «savatcha»da 30 kun turadi va shundan keyin butunlay yo'q qilinadi.

To'liq o'chirishni so'rasangiz, {email}

 manziliga yozing — so'rov 30 kun ichida bajariladi.

## Sizning huquqlaringiz

Profil ma'lumotlaringizni istalgan vaqtda sozlamalardan o'zgartirishingiz mumkin.

Faol sessiyalarni ko'rish va yopish, ikki bosqichli tasdiqlashni yoqish imkoni bor.

Bildirishnoma sozlamalarini alohida boshqarasiz: email, push va musobaqa eslatmalarini o'chirib qo'yish mumkin.

O'zingiz haqingizdagi ma'lumotlarning nusxasini so'rash yoki noto'g'ri yozuvni tuzatishni talab qilish huquqiga egasiz.

So'rovlaringizga javob bermasak yoki javobdan qoniqmasangiz, shikoyat qilish huquqingiz saqlanadi.

## Bildirishnomalar

Brauzer push-bildirishnomalarini faqat siz ruxsat berganingizdan keyin yuboramiz; ruxsatni brauzer sozlamalaridan qaytarib olish mumkin.

Har bir qurilma alohida obuna hisoblanadi — sozlamalarda ro'yxatni ko'rasiz va keraksizini o'chirasiz.

Hisob xavfsizligiga oid xatlar (parol o'zgarishi, yangi qurilmadan kirish) majburiy: ularni o'chirib bo'lmaydi.

## Bolalar maxfiyligi

Platforma 13 yoshdan katta foydalanuvchilar uchun mo'ljallangan.

Kichik yoshdagi foydalanuvchi ma'lumoti aniqlansa, hisob o'chiriladi va unga tegishli ma'lumotlar yo'q qilinadi.

Farzandingiz ma'lumoti bizda ekanini o'ylasangiz, quyidagi manzil orqali murojaat qiling — tez ko'rib chiqamiz.

## Siyosatning o'zgarishi va aloqa

Ushbu siyosat vaqti-vaqti bilan yangilanishi mumkin. Yangilangan matn shu sahifada e'lon qilinadi va sahifa yuqorisida oxirgi tahrir sanasi ko'rsatiladi.

Muhim o'zgarishlar haqida saytdagi e'lon yoki email orqali xabar beramiz.

Maxfiylik bo'yicha savollar: {email}"""

TERMS_MD = """\
## Umumiy qoidalar

Ushbu shartlar CodeArena platformasidan foydalanish tartibini belgilaydi. Hisob yaratish yoki saytdan foydalanish orqali siz quyidagi shartlarga rozilik bildirasiz.

Shartlar saytning barcha bo'limlariga taalluqli: masalalar, musobaqalar, muhokamalar, guruhlar va reyting jadvali.

Agar shartlarning biror qismiga rozi bo'lmasangiz, platformadan foydalanishni to'xtatishingiz kerak.

## Kimlar foydalana oladi

Platforma 13 yoshdan katta foydalanuvchilar uchun mo'ljallangan.

Hisobingiz avval qoidabuzarlik uchun bloklangan bo'lsa, yangi hisob ochish orqali blokni chetlab o'tish taqiqlanadi.

Tashkilot nomidan foydalanayotgan bo'lsangiz, shu shartlarni qabul qilishga vakolatingiz borligini tasdiqlaysiz.

## Hisob va shaxsiy ma'lumotlar

Ro'yxatdan o'tishda haqiqiy va amaldagi email manzilini ko'rsating. Hisobingiz xavfsizligi — sizning javobgarligingizda: parolni boshqalarga bermang, iloji bo'lsa ikki bosqichli tasdiqlashni yoqing.

Bir foydalanuvchi bir nechta hisob ochib, reyting yoki musobaqa natijalariga ta'sir qilishi taqiqlanadi.

Hisobingiz orqali bajarilgan barcha harakatlar uchun siz javobgar hisoblanasiz.

Hisobingiz o'g'irlanganini sezsangiz, darhol parolni o'zgartiring, faol sessiyalarni yoping va bizga xabar bering.

## Kontentdan foydalanish

Platformadagi masalalar, test ma'lumotlari va tahlillar CodeArena yoki mualliflarga tegishli. Ularni tijorat maqsadida ruxsatsiz ko'chirish va tarqatish mumkin emas.

Yashirin testlarni chetlab o'tishga, tekshiruv tizimiga zarar yetkazishga yoki avtomatlashtirilgan skriptlar bilan ommaviy so'rov yuborishga urinish taqiqlanadi.

Shaxsiy o'rganish maqsadida masala shartini va o'z yechimingizni saqlab qo'yishingiz mumkin.

## Siz joylagan kontent

Yozgan kodingiz, muhokamalaringiz va izohlaringiz sizga tegishli bo'lib qoladi — biz ularga egalik da'vo qilmaymiz.

Shu bilan birga, ularni platforma ishlashi uchun zarur darajada saqlash, ko'rsatish va tahlil qilish huquqini bizga berasiz: tekshirish, plagiat tahlili, reyting va statistika.

Joylagan kontentingiz uchunchi shaxs huquqlarini buzmasligiga siz javobgarsiz.

Qoidabuzar kontentni ogohlantirishsiz yashirish yoki o'chirish huquqini saqlab qolamiz.

## Halollik va plagiat

Boshqa foydalanuvchining yechimini ko'chirib yuborish, musobaqa davomida yechim almashish yoki tayyor yechimni ommaga tarqatish qoidabuzarlik hisoblanadi.

Tizim yechimlar o'xshashligini avtomatik tahlil qiladi. Shubhali holatlar moderatorlar tomonidan qo'lda ko'rib chiqiladi — avtomatik jazo qo'llanmaydi.

Qoidabuzarlik tasdiqlansa: musobaqa natijasi bekor qilinishi, reyting tuzatilishi yoki hisob muddatli/muddatsiz bloklanishi mumkin.

Qaror bilan rozi bo'lmasangiz, unga qarshi murojaat qilishingiz mumkin — murojaat qo'lda ko'rib chiqiladi.

## Taqiqlangan xatti-harakatlar

Platformaga, tekshiruv tizimiga yoki boshqa foydalanuvchilarga zarar yetkazishga qaratilgan har qanday harakat.

Zararli kod ishga tushirish, server resurslarini ataylab tugatish, tarmoqqa ruxsatsiz chiqishga urinish.

Boshqa foydalanuvchi nomidan ish ko'rish, uning hisobiga kirishga urinish yoki shaxsiy ma'lumotini yig'ish.

Saytni avtomatik nusxalash, mazmunini ommaviy ko'chirish yoki serverga sun'iy yuk berish.

## Muhokama qoidalari

Muhokamalarda o'zaro hurmatda bo'ling. Haqorat, kamsitish, spam va reklama taqiqlanadi.

Masala ostiga to'liq tayyor yechim tashlash mumkin emas — g'oya va yondashuv haqida yozing.

Moderatorlar qoidabuzar xabarlarni yashirish, mavzuni yopish yoki o'chirish huquqiga ega.

Qoidabuzar xabarni ko'rsangiz, shikoyat tugmasidan foydalaning — bu moderatorlarga tezroq yetadi.

## Musobaqalar

Musobaqa qoidalari uning sahifasida e'lon qilinadi va shu shartlarga qo'shimcha hisoblanadi.

Reytingli musobaqalarda natija reytingingizga qo'llanadi. Virtual (kechiktirilgan) ishtirok reytingga ta'sir qilmaydi.

Yopiq musobaqaga kirish paroli faqat ishtirokchilar uchun — uni tarqatish qoidabuzarlik.

Texnik nosozlik yuz bergan taqdirda tashkilotchilar musobaqani to'xtatish, uzaytirish yoki natijalarni qayta hisoblash huquqini saqlab qoladi.

## Ball, reyting va daraja

Masala uchun beriladigan ball uning qiyinligiga bog'liq va platforma sozlamalari orqali o'zgarishi mumkin.

Reyting va daraja — o'yin mexanikasi; ular pul qiymatiga ega emas, sotilmaydi va boshqa hisobga o'tkazilmaydi.

Xato yoki suiiste'mol tufayli noto'g'ri berilgan ball va reytingni tuzatish huquqini saqlab qolamiz.

## Hisobni to'xtatish

Hisobingizni istalgan vaqtda sozlamalardan faolsizlantirishingiz mumkin.

Qoidabuzarlik aniqlansa, biz hisobni vaqtincha yoki butunlay cheklashimiz mumkin; jiddiy holatlarda bu ogohlantirishsiz amalga oshiriladi.

Hisob to'xtatilgach ham musobaqa natijalari va yuborilgan yechimlar arxivda qolishi mumkin — bu boshqa ishtirokchilar natijalarining butunligi uchun zarur.

## Xizmatning mavjudligi

Platforma «bor holicha» taqdim etiladi. Biz uzluksiz ishlashga harakat qilamiz, lekin texnik ishlar yoki nosozliklar tufayli vaqtincha uzilishlar bo'lishi mumkin.

Biz xizmat imkoniyatlarini o'zgartirish, cheklash yoki to'xtatish huquqini saqlab qolamiz. Muhim o'zgarishlar oldindan e'lon qilinadi.

Texnik ishlar rejimida sayt vaqtincha yopilishi mumkin; bu haqda sahifada xabar ko'rsatiladi.

## Javobgarlik chegarasi

Platformadan foydalanish natijasida yuzaga kelgan bilvosita zarar — yo'qotilgan vaqt, imkoniyat yoki ma'lumot — uchun javobgarlik olmaymiz.

Judge natijalari va reyting hisob-kitobi to'g'ri bo'lishiga harakat qilamiz, lekin xatolikdan xoli ekanini kafolatlamaymiz.

Qonun ruxsat bergan darajada javobgarligimiz shu shartlar doirasi bilan cheklanadi.

## Shartlarning o'zgarishi va aloqa

Shartlar vaqti-vaqti bilan yangilanishi mumkin. Yangilangan matn shu sahifada e'lon qilinadi va e'lon qilingan kundan kuchga kiradi.

Muhim o'zgarishlar haqida saytdagi e'lon yoki email orqali xabar beramiz. O'zgarishdan keyin foydalanishni davom ettirish rozilik hisoblanadi.

Savollaringiz bo'lsa: {email}"""

DOCUMENTS = [
    {
        "slug": "privacy",
        "title_uz": "Maxfiylik siyosati",
        "summary_uz": "Qanday ma'lumot yig'amiz, nima uchun ishlatamiz va uni qanday himoya qilamiz.",
        "body_md": PRIVACY_MD,
        "version": "1.0",
        "effective_from": "2026-07-30",
    },
    {
        "slug": "terms",
        "title_uz": "Foydalanish shartlari",
        "summary_uz": "Platformadan foydalanish qoidalari va tomonlarning majburiyatlari.",
        "body_md": TERMS_MD,
        "version": "1.0",
        "effective_from": "2026-07-30",
    },
]


def seed(apps, schema_editor):
    LegalDocument = apps.get_model("moderation", "LegalDocument")
    for row in DOCUMENTS:
        LegalDocument.objects.update_or_create(slug=row["slug"], defaults=row)


def unseed(apps, schema_editor):
    LegalDocument = apps.get_model("moderation", "LegalDocument")
    LegalDocument.objects.filter(slug__in=[row["slug"] for row in DOCUMENTS]).delete()


class Migration(migrations.Migration):
    dependencies = [("moderation", "0010_legaldocument")]

    operations = [migrations.RunPython(seed, unseed)]
