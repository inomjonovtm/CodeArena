"use client";

import { PageHead } from "@/components/kit";
import { LegalDocument, type LegalSection } from "@/components/site/legal";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { formatDate } from "@/lib/utils";

/** Hujjatning oxirgi tahriri — sarlavha meta qatorida ham, mundarijada ham chiqadi. */
const UPDATED_AT = "2026-07-30";

/* Aloqa manzili admin paneldagi «Aloqa emaili» sozlamasidan keladi, shuning
   uchun bo'limlar funksiya orqali quriladi — matnga qattiq yozilgan email
   sozlama o'zgarganda eskirib qolardi. */
const sections = (email: string): LegalSection[] => [
  {
    title: "Qanday ma'lumot yig'amiz",
    body: [
      "Hisob ma'lumotlari: foydalanuvchi nomi, email, ixtiyoriy ravishda to'liq ism, avatar, bio, viloyat/tuman, ta'lim muassasasi va havolalar (GitHub, veb-sayt).",
      "Faoliyat ma'lumotlari: yuborgan kodingiz, tekshiruv natijalari, yechilgan masalalar, musobaqa natijalari, guruh a'zoligi, muhokama va izohlaringiz, xatcho'plaringiz.",
      "Texnik ma'lumotlar: IP manzil, brauzer va qurilma turi, kirish vaqti, faol sessiyalar ro'yxati. Bular xavfsizlik va noto'g'ri foydalanishni aniqlash uchun kerak.",
      "Biz sizdan hech qachon to'lov kartasi ma'lumotlarini, pasport yoki boshqa shaxsni tasdiqlovchi hujjat raqamlarini so'ramaymiz.",
    ],
  },
  {
    title: "Ma'lumotdan qanday foydalanamiz",
    body: [
      "Xizmatni ko'rsatish: yechimlarni tekshirish, ball va reytingni hisoblash, progressingizni saqlash, musobaqa natijalarini shakllantirish.",
      "Xavfsizlik: hisobni himoya qilish, ko'p hisob va plagiat holatlarini aniqlash, suiiste'molning oldini olish, kirish urinishlarini cheklash.",
      "Aloqa: email tasdiqlash, parolni tiklash, musobaqa eslatmalari va muhim e'lonlar. Bildirishnoma turlarini sozlamalardan alohida o'chirib qo'yish mumkin.",
      "Statistika: platformani yaxshilash uchun umumlashtirilgan (shaxsni aniqlab bo'lmaydigan) hisobotlar — masalan, qaysi masala ko'p yechiladi yoki qaysi til mashhur.",
    ],
  },
  {
    title: "Nima uchun qayta ishlashga haqlimiz",
    body: [
      "Hisob va faoliyat ma'lumotlari — siz bilan tuzilgan foydalanish shartlarini bajarish uchun: ularsiz yechim tekshirish va reyting hisoblash mumkin emas.",
      "Texnik va xavfsizlik ma'lumotlari — platformani himoya qilishdagi qonuniy manfaatimiz asosida.",
      "Marketing xarakteridagi xatlar — faqat siz rozilik bergan holda; rozilikni istalgan vaqtda sozlamalardan qaytarib olishingiz mumkin.",
    ],
  },
  {
    title: "Ochiq ko'rinadigan ma'lumotlar",
    body: [
      "Profilingiz ommaviy: foydalanuvchi nomi, avatar, bio, hudud, reyting, ball, daraja, yechilgan masalalar soni va faollik kalendari boshqalarga ko'rinadi.",
      "Musobaqa natijalari va reyting jadvalidagi o'rningiz ochiq bo'ladi — bu musobaqa formatining ajralmas qismi.",
      "Emailingiz, IP manzilingiz va yuborgan kodingiz hech qachon boshqa foydalanuvchilarga ko'rsatilmaydi.",
      "Muhokama va izohlaringiz ochiq — ularda shaxsiy ma'lumot yozmang.",
    ],
  },
  {
    title: "Cookie va brauzer xotirasi",
    body: [
      "Kirish uchun HttpOnly cookie ishlatiladi — u JavaScript orqali o'qib bo'lmaydi va XSS hujumlariga chidamli.",
      "Tema (yorug'/qorong'i), til tanlovi va masala qoralamalari brauzeringizning localStorage'ida saqlanadi va serverga yuborilmaydi.",
      "Uchinchi tomon reklama yoki kuzatuv cookie'laridan foydalanmaymiz. Bizda reklama tarmoqlari uchun piksel yoki treker yo'q.",
      "Cookie'ni brauzer sozlamalaridan o'chirsangiz, tizimdan chiqarilasiz — boshqa hech qanday ma'lumot yo'qolmaydi.",
    ],
  },
  {
    title: "Ma'lumotni uchinchi tomonlarga berish",
    body: [
      "Ma'lumotlaringizni sotmaymiz va reklama maqsadida uzatmaymiz.",
      "Kod tekshiruvi izolyatsiyalangan judge xizmatida bajariladi; unga faqat kodingiz va test ma'lumotlari yuboriladi — kim yuborgani emas.",
      "Google orqali kirishni tanlasangiz, Google'dan faqat email, ism va avatar olinadi.",
      "Xatlar pochta yetkazib berish xizmati orqali jo'natiladi; unga faqat email manzilingiz va xat matni uzatiladi.",
      "Qonuniy asos bo'lgan hollarda vakolatli organlarga ma'lumot berilishi mumkin.",
    ],
  },
  {
    title: "Ma'lumot xavfsizligi",
    body: [
      "Parollar hech qachon ochiq holda saqlanmaydi — faqat qaytarib bo'lmaydigan xesh ko'rinishida.",
      "Ikki bosqichli tasdiqlashni (2FA) yoqishingiz mumkin; bu hisobni parol o'g'irlangan taqdirda ham himoya qiladi.",
      "Faol sessiyalar ro'yxatini sozlamalarda ko'rasiz va begona qurilmani istalgan vaqtda uzib qo'yishingiz mumkin.",
      "Xavfsizlik nuqsonini topsangiz, undan foydalanmasdan bizga xabar bering: " + email,
    ],
  },
  {
    title: "Saqlash muddati",
    body: [
      "Hisobingiz faol bo'lgan davrda ma'lumotlar saqlanadi. Hisobni faolsizlantirsangiz, profil ommadan yopiladi.",
      "Yuborilgan yechimlar musobaqa natijalari va plagiat tekshiruvi uchun arxivda qoladi.",
      "Admin paneldan o'chirilgan yozuvlar «savatcha»da 30 kun turadi va shundan keyin butunlay yo'q qilinadi.",
      "To'liq o'chirishni so'rasangiz, " + email + " manziliga yozing — so'rov 30 kun ichida bajariladi.",
    ],
  },
  {
    title: "Sizning huquqlaringiz",
    body: [
      "Profil ma'lumotlaringizni istalgan vaqtda sozlamalardan o'zgartirishingiz mumkin.",
      "Faol sessiyalarni ko'rish va yopish, ikki bosqichli tasdiqlashni yoqish imkoni bor.",
      "Bildirishnoma sozlamalarini alohida boshqarasiz: email, push va musobaqa eslatmalarini o'chirib qo'yish mumkin.",
      "O'zingiz haqingizdagi ma'lumotlarning nusxasini so'rash yoki noto'g'ri yozuvni tuzatishni talab qilish huquqiga egasiz.",
      "So'rovlaringizga javob bermasak yoki javobdan qoniqmasangiz, shikoyat qilish huquqingiz saqlanadi.",
    ],
  },
  {
    title: "Bildirishnomalar",
    body: [
      "Brauzer push-bildirishnomalarini faqat siz ruxsat berganingizdan keyin yuboramiz; ruxsatni brauzer sozlamalaridan qaytarib olish mumkin.",
      "Har bir qurilma alohida obuna hisoblanadi — sozlamalarda ro'yxatni ko'rasiz va keraksizini o'chirasiz.",
      "Hisob xavfsizligiga oid xatlar (parol o'zgarishi, yangi qurilmadan kirish) majburiy: ularni o'chirib bo'lmaydi.",
    ],
  },
  {
    title: "Bolalar maxfiyligi",
    body: [
      "Platforma 13 yoshdan katta foydalanuvchilar uchun mo'ljallangan.",
      "Kichik yoshdagi foydalanuvchi ma'lumoti aniqlansa, hisob o'chiriladi va unga tegishli ma'lumotlar yo'q qilinadi.",
      "Farzandingiz ma'lumoti bizda ekanini o'ylasangiz, quyidagi manzil orqali murojaat qiling — tez ko'rib chiqamiz.",
    ],
  },
  {
    title: "Siyosatning o'zgarishi va aloqa",
    body: [
      "Ushbu siyosat vaqti-vaqti bilan yangilanishi mumkin. Yangilangan matn shu sahifada e'lon qilinadi va sahifa yuqorisida oxirgi tahrir sanasi ko'rsatiladi.",
      "Muhim o'zgarishlar haqida saytdagi e'lon yoki email orqali xabar beramiz.",
      "Maxfiylik bo'yicha savollar: " + email,
    ],
  },
];

export default function PrivacyPage() {
  const { siteEmail } = useSiteSettings();
  const SECTIONS = sections(siteEmail);

  return (
    <div className="mx-auto flex w-full max-w-[var(--page)] flex-col gap-7">
      <PageHead
        eyebrow="Huquqiy hujjat"
        title="Maxfiylik siyosati"
        lead="Qanday ma'lumot yig'amiz, nima uchun ishlatamiz va uni qanday himoya qilamiz."
        meta={
          <>
            <span className="t-meta text-[var(--ink-4)]">
              Oxirgi yangilanish:{" "}
              <span className="t-num text-[var(--ink-2)]">{formatDate(UPDATED_AT, false)}</span>
            </span>
            <span className="t-meta text-[var(--ink-4)]">
              <span className="t-num text-[var(--ink-2)]">{SECTIONS.length}</span> ta bo&apos;lim
            </span>
          </>
        }
      />
      <LegalDocument
        updatedAt={UPDATED_AT}
        intro="Maxfiyligingiz biz uchun muhim. Ushbu hujjat CodeArena qanday ma'lumotlarni yig'ishi, ulardan qanday foydalanishi, kim bilan bo'lishishi va sizda qanday huquqlar borligini tushuntiradi."
        sections={SECTIONS}
      />
    </div>
  );
}
