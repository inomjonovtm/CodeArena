"use client";

import { PageHead } from "@/components/kit";
import { LegalDocument, type LegalSection } from "@/components/site/legal";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { formatDate } from "@/lib/utils";

/** Hujjatning oxirgi tahriri — sarlavha meta qatorida ham, mundarijada ham chiqadi. */
const UPDATED_AT = "2026-07-30";

/* Aloqa manzili admin paneldagi «Aloqa emaili» sozlamasidan keladi — qarang:
   `hooks/use-site-settings.ts`. Shu sababli bo'limlar funksiya orqali quriladi. */
const sections = (email: string): LegalSection[] => [
  {
    title: "Umumiy qoidalar",
    body: [
      "Ushbu shartlar CodeArena platformasidan foydalanish tartibini belgilaydi. Hisob yaratish yoki saytdan foydalanish orqali siz quyidagi shartlarga rozilik bildirasiz.",
      "Shartlar saytning barcha bo'limlariga taalluqli: masalalar, musobaqalar, muhokamalar, guruhlar va reyting jadvali.",
      "Agar shartlarning biror qismiga rozi bo'lmasangiz, platformadan foydalanishni to'xtatishingiz kerak.",
    ],
  },
  {
    title: "Kimlar foydalana oladi",
    body: [
      "Platforma 13 yoshdan katta foydalanuvchilar uchun mo'ljallangan.",
      "Hisobingiz avval qoidabuzarlik uchun bloklangan bo'lsa, yangi hisob ochish orqali blokni chetlab o'tish taqiqlanadi.",
      "Tashkilot nomidan foydalanayotgan bo'lsangiz, shu shartlarni qabul qilishga vakolatingiz borligini tasdiqlaysiz.",
    ],
  },
  {
    title: "Hisob va shaxsiy ma'lumotlar",
    body: [
      "Ro'yxatdan o'tishda haqiqiy va amaldagi email manzilini ko'rsating. Hisobingiz xavfsizligi — sizning javobgarligingizda: parolni boshqalarga bermang, iloji bo'lsa ikki bosqichli tasdiqlashni yoqing.",
      "Bir foydalanuvchi bir nechta hisob ochib, reyting yoki musobaqa natijalariga ta'sir qilishi taqiqlanadi.",
      "Hisobingiz orqali bajarilgan barcha harakatlar uchun siz javobgar hisoblanasiz.",
      "Hisobingiz o'g'irlanganini sezsangiz, darhol parolni o'zgartiring, faol sessiyalarni yoping va bizga xabar bering.",
    ],
  },
  {
    title: "Kontentdan foydalanish",
    body: [
      "Platformadagi masalalar, test ma'lumotlari va tahlillar CodeArena yoki mualliflarga tegishli. Ularni tijorat maqsadida ruxsatsiz ko'chirish va tarqatish mumkin emas.",
      "Yashirin testlarni chetlab o'tishga, judge tizimiga zarar yetkazishga yoki avtomatlashtirilgan skriptlar bilan ommaviy so'rov yuborishga urinish taqiqlanadi.",
      "Shaxsiy o'rganish maqsadida masala shartini va o'z yechimingizni saqlab qo'yishingiz mumkin.",
    ],
  },
  {
    title: "Siz joylagan kontent",
    body: [
      "Yozgan kodingiz, muhokamalaringiz va izohlaringiz sizga tegishli bo'lib qoladi — biz ularga egalik da'vo qilmaymiz.",
      "Shu bilan birga, ularni platforma ishlashi uchun zarur darajada saqlash, ko'rsatish va tahlil qilish huquqini bizga berasiz: tekshirish, plagiat tahlili, reyting va statistika.",
      "Joylagan kontentingiz uchunchi shaxs huquqlarini buzmasligiga siz javobgarsiz.",
      "Qoidabuzar kontentni ogohlantirishsiz yashirish yoki o'chirish huquqini saqlab qolamiz.",
    ],
  },
  {
    title: "Halollik va plagiat",
    body: [
      "Boshqa foydalanuvchining yechimini ko'chirib yuborish, musobaqa davomida yechim almashish yoki tayyor yechimni ommaga tarqatish qoidabuzarlik hisoblanadi.",
      "Tizim yechimlar o'xshashligini avtomatik tahlil qiladi. Shubhali holatlar moderatorlar tomonidan qo'lda ko'rib chiqiladi — avtomatik jazo qo'llanmaydi.",
      "Qoidabuzarlik tasdiqlansa: musobaqa natijasi bekor qilinishi, reyting tuzatilishi yoki hisob muddatli/muddatsiz bloklanishi mumkin.",
      "Qaror bilan rozi bo'lmasangiz, unga qarshi murojaat qilishingiz mumkin — murojaat qo'lda ko'rib chiqiladi.",
    ],
  },
  {
    title: "Taqiqlangan xatti-harakatlar",
    body: [
      "Platformaga, judge xizmatiga yoki boshqa foydalanuvchilarga zarar yetkazishga qaratilgan har qanday harakat.",
      "Zararli kod ishga tushirish, server resurslarini ataylab tugatish, tarmoqqa ruxsatsiz chiqishga urinish.",
      "Boshqa foydalanuvchi nomidan ish ko'rish, uning hisobiga kirishga urinish yoki shaxsiy ma'lumotini yig'ish.",
      "Saytni skrap qilish, mazmunini ommaviy ko'chirish yoki API'ga sun'iy yuk berish.",
    ],
  },
  {
    title: "Muhokama qoidalari",
    body: [
      "Muhokamalarda o'zaro hurmatda bo'ling. Haqorat, kamsitish, spam va reklama taqiqlanadi.",
      "Masala ostiga to'liq tayyor yechim tashlash mumkin emas — g'oya va yondashuv haqida yozing.",
      "Moderatorlar qoidabuzar xabarlarni yashirish, mavzuni yopish yoki o'chirish huquqiga ega.",
      "Qoidabuzar xabarni ko'rsangiz, shikoyat tugmasidan foydalaning — bu moderatorlarga tezroq yetadi.",
    ],
  },
  {
    title: "Musobaqalar",
    body: [
      "Musobaqa qoidalari uning sahifasida e'lon qilinadi va shu shartlarga qo'shimcha hisoblanadi.",
      "Reytingli musobaqalarda natija Elo tizimi asosida reytingga qo'llanadi. Virtual (kechiktirilgan) ishtirok reytingga ta'sir qilmaydi.",
      "Yopiq musobaqaga kirish paroli faqat ishtirokchilar uchun — uni tarqatish qoidabuzarlik.",
      "Texnik nosozlik yuz bergan taqdirda tashkilotchilar musobaqani to'xtatish, uzaytirish yoki natijalarni qayta hisoblash huquqini saqlab qoladi.",
    ],
  },
  {
    title: "Ball, reyting va daraja",
    body: [
      "Masala uchun beriladigan ball uning qiyinligiga bog'liq va platforma sozlamalari orqali o'zgarishi mumkin.",
      "Reyting va daraja — o'yin mexanikasi; ular pul qiymatiga ega emas, sotilmaydi va boshqa hisobga o'tkazilmaydi.",
      "Xato yoki suiiste'mol tufayli noto'g'ri berilgan ball va reytingni tuzatish huquqini saqlab qolamiz.",
    ],
  },
  {
    title: "Hisobni to'xtatish",
    body: [
      "Hisobingizni istalgan vaqtda sozlamalardan faolsizlantirishingiz mumkin.",
      "Qoidabuzarlik aniqlansa, biz hisobni vaqtincha yoki butunlay cheklashimiz mumkin; jiddiy holatlarda bu ogohlantirishsiz amalga oshiriladi.",
      "Hisob to'xtatilgach ham musobaqa natijalari va yuborilgan yechimlar arxivda qolishi mumkin — bu boshqa ishtirokchilar natijalarining butunligi uchun zarur.",
    ],
  },
  {
    title: "Xizmatning mavjudligi",
    body: [
      "Platforma «bor holicha» taqdim etiladi. Biz uzluksiz ishlashga harakat qilamiz, lekin texnik ishlar yoki nosozliklar tufayli vaqtincha uzilishlar bo'lishi mumkin.",
      "Biz xizmat imkoniyatlarini o'zgartirish, cheklash yoki to'xtatish huquqini saqlab qolamiz. Muhim o'zgarishlar oldindan e'lon qilinadi.",
      "Texnik ishlar rejimida sayt vaqtincha yopilishi mumkin; bu haqda sahifada xabar ko'rsatiladi.",
    ],
  },
  {
    title: "Javobgarlik chegarasi",
    body: [
      "Platformadan foydalanish natijasida yuzaga kelgan bilvosita zarar — yo'qotilgan vaqt, imkoniyat yoki ma'lumot — uchun javobgarlik olmaymiz.",
      "Judge natijalari va reyting hisob-kitobi to'g'ri bo'lishiga harakat qilamiz, lekin xatolikdan xoli ekanini kafolatlamaymiz.",
      "Qonun ruxsat bergan darajada javobgarligimiz shu shartlar doirasi bilan cheklanadi.",
    ],
  },
  {
    title: "Shartlarning o'zgarishi va aloqa",
    body: [
      "Shartlar vaqti-vaqti bilan yangilanishi mumkin. Yangilangan matn shu sahifada e'lon qilinadi va e'lon qilingan kundan kuchga kiradi.",
      "Muhim o'zgarishlar haqida saytdagi e'lon yoki email orqali xabar beramiz. O'zgarishdan keyin foydalanishni davom ettirish rozilik hisoblanadi.",
      "Savollaringiz bo'lsa: " + email,
    ],
  },
];

export default function TermsPage() {
  const { siteEmail } = useSiteSettings();
  const SECTIONS = sections(siteEmail);

  return (
    <div className="mx-auto flex w-full max-w-[var(--page)] flex-col gap-7">
      <PageHead
        eyebrow="Huquqiy hujjat"
        title="Foydalanish shartlari"
        lead="CodeArena platformasidan foydalanish qoidalari va tomonlarning majburiyatlari."
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
        intro="Quyidagi shartlar CodeArena veb-platformasi va u orqali taqdim etiladigan barcha xizmatlarga taalluqli. Iltimos, ularni diqqat bilan o'qing — hisob yaratish orqali siz ularga rozilik bildirasiz."
        sections={SECTIONS}
      />
    </div>
  );
}
