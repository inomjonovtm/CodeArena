"use client";

import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  LifeBuoy,
  Mail,
  MessageSquare,
  Search,
  Shield,
  Swords,
  Terminal,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  Button,
  Count,
  Divider,
  Empty,
  LinkButton,
  PageHead,
  Pane,
  PaneHead,
  SearchField,
  SplitLayout,
} from "@/components/kit";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { cn } from "@/lib/utils";

type Category = {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: { q: string; a: string }[];
};

const CATEGORIES: Category[] = [
  {
    id: "boshlash",
    title: "Boshlash",
    icon: <BookOpen className="size-4" />,
    items: [
      {
        q: "CodeArena nima?",
        a: "CodeArena — algoritmik masalalar yechish platformasi. Masalalar o'zbek tilida, yechimlar avtomatik tekshiriladi, natijalar reyting va musobaqalarda hisobga olinadi.",
      },
      {
        q: "Ro'yxatdan o'tish shartmi?",
        a: "Masalalarni ko'rish uchun shart emas. Lekin yechim yuborish, ball to'plash, musobaqalarda qatnashish va progressni saqlash uchun hisob kerak.",
      },
      {
        q: "Qaysi tillarda kod yozish mumkin?",
        a: "Hozircha Python, JavaScript (Node.js) va C++ qo'llab-quvvatlanadi. Har bir masalada tanlangan til uchun boshlang'ich shablon beriladi.",
      },
      {
        q: "Emailimni tasdiqlashim kerakmi?",
        a: "Ro'yxatdan o'tgach emailingizga havola yuboriladi. Tasdiqlash hisobingizni tiklash va bildirishnomalarni olish uchun kerak bo'ladi.",
      },
    ],
  },
  {
    id: "masala-yechish",
    title: "Masala yechish",
    icon: <Terminal className="size-4" />,
    items: [
      {
        q: "«Ishga tushirish» va «Yuborish» farqi nimada?",
        a: "«Ishga tushirish» kodni faqat ochiq namuna testlarda (yoki siz kiritgan maxsus ma'lumotda) sinaydi — natija saqlanmaydi va ball berilmaydi. «Yuborish» esa barcha, jumladan yashirin testlarda tekshiradi va natija tarixga yoziladi.",
      },
      {
        q: "Nega yashirin testlarning ma'lumotini ko'rmayapman?",
        a: "Yashirin testlarning kirish va chiqish qiymatlari ataylab ko'rsatilmaydi — bu masalani halol yechishni ta'minlaydi. Sizga faqat nechanchi testda xato bo'lgani aytiladi.",
      },
      {
        q: "Bir daqiqada nechta yechim yuborish mumkin?",
        a: "Tizim barqarorligi uchun daqiqasiga 10 tagacha yechim qabul qilinadi. Limitga yetsangiz bir oz kutib, qayta yuboring.",
      },
      {
        q: "Kodim yo'qolib qolmaydimi?",
        a: "Yo'q. Yozayotgan kodingiz har bir masala va til uchun brauzeringizda avtomatik saqlanadi — sahifani yangilasangiz ham joyida qoladi.",
      },
      {
        q: "Tahlil (editorial) qachon ochiladi?",
        a: "Masala tahlili faqat siz uni muvaffaqiyatli yechganingizdan keyin ochiladi.",
      },
    ],
  },
  {
    id: "ball-reyting",
    title: "Ball va reyting",
    icon: <Trophy className="size-4" />,
    items: [
      {
        q: "Ball qanday beriladi?",
        a: "Har bir masalaning o'z bali bor (oson — 10, o'rta — 30, qiyin — 50 atrofida). Ball faqat masalani birinchi marta yechganingizda qo'shiladi.",
      },
      {
        q: "Reyting nima va qanday o'zgaradi?",
        a: "Reyting — musobaqalardagi natijalaringizga qarab hisoblanadigan Elo ko'rsatkichi. Boshlang'ich qiymat 1500. Reytingli musobaqadan keyin o'rningizga qarab oshadi yoki kamayadi.",
      },
      {
        q: "Seriya (streak) qanday ishlaydi?",
        a: "Har kuni kamida bitta yangi masala yechsangiz seriya bir kunga uzayadi. Bir kun tashlab ketsangiz, seriya noldan boshlanadi.",
      },
      {
        q: "Amaliyot yechimlari reytingga ta'sir qiladimi?",
        a: "Yo'q. Oddiy masalalar faqat ball va yechilganlar soniga ta'sir qiladi; reyting esa faqat reytingli musobaqalarda o'zgaradi.",
      },
    ],
  },
  {
    id: "musobaqalar",
    title: "Musobaqalar",
    icon: <Swords className="size-4" />,
    items: [
      {
        q: "Musobaqaga qanday qo'shilaman?",
        a: "Musobaqa sahifasidagi «Qo'shilish» tugmasini bosing. Yopiq musobaqalarda tashkilotchidan olingan parol so'raladi.",
      },
      {
        q: "Masalalar qachon ochiladi?",
        a: "Musobaqa masalalari aynan boshlanish vaqtida ro'yxatdan o'tgan ishtirokchilarga ochiladi. Musobaqa tugagach esa hammaga ochiq bo'ladi.",
      },
      {
        q: "Virtual rejim nima?",
        a: "Tugagan musobaqani xuddi jonli kabi qayta yechish imkoni. Natijangiz alohida belgilanadi va reytingga ta'sir qilmaydi.",
      },
      {
        q: "Jarima (penalty) qanday hisoblanadi?",
        a: "Keyinchalik yechilgan masala bo'yicha har bir noto'g'ri urinish uchun 10 daqiqa jarima qo'shiladi. Ballar teng bo'lsa, jarimasi kam ishtirokchi yuqori turadi.",
      },
    ],
  },
  {
    id: "jamiyat",
    title: "Jamiyat va moderatsiya",
    icon: <Users className="size-4" />,
    items: [
      {
        q: "Guruh nima uchun kerak?",
        a: "Guruh — do'stlaringiz, kursdoshlaringiz bilan alohida ichki reyting yuritish uchun. Guruh yarating va taklif kodini ulashing.",
      },
      {
        q: "Muhokamada tayyor yechim tashlash mumkinmi?",
        a: "Yo'q. Tayyor yechim tarqatish qoidabuzarlik hisoblanadi — bunday xabarlar o'chiriladi, takrorlansa hisob cheklanadi.",
      },
      {
        q: "Noto'g'ri kontentni qanday xabar qilaman?",
        a: "Har bir mavzu va izoh ostidagi «Xabar berish» tugmasidan foydalaning. Moderatorlar ko'rib chiqadi.",
      },
    ],
  },
  {
    id: "hisob",
    title: "Hisob va xavfsizlik",
    icon: <Shield className="size-4" />,
    items: [
      {
        q: "Parolni unutdim, nima qilay?",
        a: "Kirish sahifasidagi «Parolni unutdingizmi?» havolasini bosing va emailingizni kiriting. Tiklash havolasi 2 soat amal qiladi.",
      },
      {
        q: "Ikki bosqichli tasdiqlash (2FA) qanday yoqiladi?",
        a: "Sozlamalar → Xavfsizlik bo'limida QR kodni Google Authenticator yoki shunga o'xshash ilovada skanerlab, 6 xonali kodni tasdiqlang.",
      },
      {
        q: "Boshqa qurilmadagi sessiyani qanday yopaman?",
        a: "Sozlamalar → Xavfsizlik bo'limida barcha faol sessiyalar ro'yxati bor. Har birini alohida yoki hammasini bir vaqtda yopish mumkin.",
      },
      {
        q: "Hisobimni o'chira olamanmi?",
        a: "Ha. Sozlamalar → Hisob bo'limida parolingizni tasdiqlab, hisobni faolsizlantirishingiz mumkin.",
      },
    ],
  },
];

const TOTAL_QUESTIONS = CATEGORIES.reduce((sum, category) => sum + category.items.length, 0);

/** Tez o'tish yo'llari — qidiruv kartasi ichidagi botiq kafellar. */
type Shortcut = { href: string; icon: React.ReactNode; title: string; hint: string; external?: boolean };

/* Qo'llab-quvvatlash manzili admin paneldagi «Aloqa emaili» sozlamasidan
   keladi — shuning uchun ro'yxat funksiya orqali quriladi. */
const shortcuts = (email: string): Shortcut[] => [
  {
    href: "/problems",
    icon: <Terminal className="size-4" />,
    title: "Birinchi masala",
    hint: "Oson masaladan boshlang",
  },
  {
    href: "/discussions",
    icon: <MessageSquare className="size-4" />,
    title: "Savol berish",
    hint: "Jamiyatdan yordam so'rang",
  },
  {
    href: `mailto:${email}`,
    icon: <Mail className="size-4" />,
    title: "Qo'llab-quvvatlash",
    hint: email,
    external: true,
  },
];

/**
 * Savol qatori — akkordeon.
 *
 * Karta emas: qatorlar faqat ajratgich chizig'i bilan bo'linadi, shu tufayli
 * uzun ro'yxat sahifani chegaralarga to'ldirmaydi. Qidiruv paytida javob
 * darhol ochiq keladi (`defaultOpen`) — foydalanuvchi ikki marta bosmaydi.
 */
function FaqRow({
  question,
  answer,
  defaultOpen,
}: {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          "focus-ring flex w-full items-center justify-between gap-4 rounded-[var(--r-ctl)] py-4 text-left",
          "transition-colors duration-[var(--t-fast)]",
        )}
      >
        <span
          className={cn(
            "text-[14.5px] font-medium transition-colors duration-[var(--t-fast)]",
            open ? "text-[var(--brand-ink)]" : "text-[var(--ink)]",
          )}
        >
          {question}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[var(--ink-4)] transition-transform duration-[var(--t-base)] ease-[var(--ease-snap)]",
            open && "rotate-180 text-[var(--brand)]",
          )}
        />
      </button>

      {open ? (
        <p className="t-body enter -mt-1 pr-8 pb-4 text-[var(--ink-3)]">{answer}</p>
      ) : null}
    </div>
  );
}

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const { siteEmail } = useSiteSettings();
  const SHORTCUTS = shortcuts(siteEmail);

  // Qidiruv savol va javob matni bo'yicha — mahalliy, so'rovsiz
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return CATEGORIES;
    return CATEGORIES.map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          item.q.toLowerCase().includes(needle) || item.a.toLowerCase().includes(needle),
      ),
    })).filter((category) => category.items.length > 0);
  }, [query]);

  const found = filtered.reduce((sum, category) => sum + category.items.length, 0);
  const searching = query.trim().length > 0;

  return (
    /* Har bir mazmun bloki alohida kartada, orasi bir tekis 20px */
    <div className="flex flex-col gap-7">
      {/* ------------------------------------------------- sarlavha kartasi */}
      <PageHead
        eyebrow="Yordam"
        title="Yordam markazi"
        lead="Ko'p beriladigan savollar va platformadan foydalanish bo'yicha qo'llanma."
        meta={
          <span className="t-meta text-[var(--ink-4)]">
            <span className="t-num text-[var(--ink-2)]">{TOTAL_QUESTIONS}</span> ta savol ·{" "}
            <span className="t-num text-[var(--ink-2)]">{CATEGORIES.length}</span> ta bo&apos;lim
          </span>
        }
        actions={
          <LinkButton href="/discussions" icon={<MessageSquare className="size-4" />}>
            Muhokamalar
          </LinkButton>
        }
      />

      {/* ---------------------------------------- qidiruv va tez o'tish kartasi */}
      <Pane inset="lg" className="enter">
        <SearchField
          value={query}
          onValueChange={setQuery}
          placeholder="Savolingizni yozing — masalan «reyting» yoki «parol»"
          className="max-w-xl"
        />
        <p className="t-meta mt-2.5 text-[var(--ink-3)]">
          {searching ? (
            <>
              <span className="t-num text-[var(--ink)]">{found}</span> ta natija
            </>
          ) : (
            "Javobni topa olmasangiz — pastdagi yo'llardan foydalaning."
          )}
        </p>

        <div className="enter-stagger mt-5 grid gap-2.5 sm:grid-cols-3">
          {SHORTCUTS.map((shortcut) => {
            const inner = (
              <>
                {/* Ikonka plitkasiz — rangli kvadrat matndan ko'proq e'tibor tortadi */}
                <span
                  className={cn(
                    "shrink-0 text-[var(--ink-4)] transition-colors duration-[var(--t-fast)]",
                    "group-hover:text-[var(--brand)] [&_svg]:size-[18px]",
                  )}
                >
                  {shortcut.icon}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-[var(--ink)]">
                    {shortcut.title}
                  </span>
                  <span className="t-meta block truncate text-[var(--ink-4)]">{shortcut.hint}</span>
                </span>
              </>
            );

            // Karta ichida karta emas — botiq kafel; hoverda ikonka ko'kka to'ladi
            const tileClass = cn(
              "pane-sunken focus-ring group flex items-center gap-3",
              "rounded-[var(--r-field)] px-3.5 py-3",
              "transition-colors duration-[var(--t-fast)] hover:border-[var(--brand-edge)]",
            );

            return shortcut.external ? (
              <a key={shortcut.href} href={shortcut.href} className={tileClass}>
                {inner}
              </a>
            ) : (
              <Link key={shortcut.href} href={shortcut.href} className={tileClass}>
                {inner}
              </Link>
            );
          })}
        </div>
      </Pane>

      {/* --------------------------------------------- bo'limlar va savollar */}
      <SplitLayout
        aside={
          <Pane inset="md">
            <p className="t-eyebrow px-2.5">Bo&apos;limlar</p>
            <nav className="mt-2 flex flex-col gap-0.5">
              {CATEGORIES.map((category) => (
                <a
                  key={category.id}
                  href={`#${category.id}`}
                  className={cn(
                    "focus-ring flex items-center gap-2.5 rounded-[var(--r-ctl)] px-2.5 py-2 text-[13px]",
                    "text-[var(--ink-2)] transition-colors duration-[var(--t-fast)]",
                    "hover:bg-[var(--pane-hover)] hover:text-[var(--ink)]",
                  )}
                >
                  <span className="text-[var(--ink-4)]">{category.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{category.title}</span>
                  <Count value={category.items.length} />
                </a>
              ))}
            </nav>

            <Divider className="my-3" />

            <p className="t-meta px-2.5 text-[var(--ink-4)]">
              Savolingizga javob yo&apos;qmi? Bizga yozing —{" "}
              <Link
                href="/contact"
                className="focus-ring rounded-[4px] font-medium text-[var(--brand-ink)] hover:text-[var(--brand)]"
              >
                aloqa sahifasi
              </Link>
              .
            </p>
          </Pane>
        }
      >
        {filtered.length === 0 ? (
          <Pane tone="solid" inset="none" className="overflow-hidden">
            <Empty
              icon={<Search className="size-5" />}
              title="Hech narsa topilmadi"
              description="Boshqa so'z bilan qidirib ko'ring yoki savolingizni to'g'ridan-to'g'ri bizga yuboring."
              action={
                <>
                  <Button onClick={() => setQuery("")}>Qidiruvni tozalash</Button>
                  <LinkButton href="/contact" variant="primary">
                    Bog&apos;lanish
                  </LinkButton>
                </>
              }
            />
          </Pane>
        ) : (
          /* Har bir bo'lim — o'z kartasi; ichida faqat ajratgichli akkordeon */
          <div className="flex flex-col gap-5">
            {filtered.map((category) => (
              <Pane key={category.id} inset="lg">
                <PaneHead
                  title={
                    <span id={category.id} className="flex scroll-mt-[calc(var(--bar)+24px)] items-center gap-2.5">
                      <span className="flex size-8 items-center justify-center rounded-full border border-[var(--edge-strong)] bg-[var(--pane)] text-[var(--ink-4)]">
                        {category.icon}
                      </span>
                      {category.title}
                    </span>
                  }
                  action={<Count value={category.items.length} />}
                />

                <div className="enter-stagger mt-3 divide-y divide-[var(--edge-soft)] border-t border-[var(--edge)]">
                  {category.items.map((item) => (
                    <FaqRow
                      key={`${item.q}-${searching ? "s" : ""}`}
                      question={item.q}
                      answer={item.a}
                      defaultOpen={searching}
                    />
                  ))}
                </div>
              </Pane>
            ))}
          </div>
        )}
      </SplitLayout>

      {/* -------------------------------------------- yagona to'yingan chaqiriq */}
      <div className="pane-brand enter flex flex-wrap items-center gap-5 rounded-[var(--r-pane-lg)] p-7">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--r-ctl)] bg-[var(--pane-solid)] text-[var(--brand)]">
          <LifeBuoy className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold">Javob topmadingizmi?</p>
          <p className="t-meta mt-1 opacity-85">
            Muhokamalarda savol bering yoki bizga to&apos;g&apos;ridan-to&apos;g&apos;ri yozing.
          </p>
        </div>
        <LinkButton
          href="/contact"
          variant="ghost"
          className="bg-[var(--pane-solid)] text-[var(--brand-ink)] hover:bg-[var(--brand-wash)] hover:text-[var(--brand-ink)]"
          iconAfter={<ArrowRight className="size-4" />}
        >
          Bog&apos;lanish
        </LinkButton>
      </div>
    </div>
  );
}
