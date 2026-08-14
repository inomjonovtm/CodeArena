import { cn } from "@/lib/utils";

/**
 * O'RAMA — endi hech qanday animatsiya qilmaydi.
 *
 * Ilgari bu komponent `IntersectionObserver` bilan elementni kuzatib,
 * ekranga kirganda uni 20px pastdan suzdirib chiqarardi ("Apple uslubidagi"
 * scroll animatsiyasi), `delay` bilan esa ketma-ket to'lqin hosil qilardi.
 *
 * Yangi dizayn tizimida scroll animatsiyasi YO'Q: u sahifani sekin va
 * betoqat qiladi, klaviatura bilan tez o'tayotgan foydalanuvchida esa
 * kontent hali ko'rinmasdan turib fokus unga tushadi. Komponent o'zi
 * saqlanib qoldi — u o'nlab joyda chaqiriladi va semantik tegni (`as`)
 * belgilaydi; endi u shunchaki o'z bolasini chizadi.
 */
export function Reveal({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  /** Saqlangan, lekin e'tiborga olinmaydi. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "header";
  /** Saqlangan, lekin e'tiborga olinmaydi. */
  once?: boolean;
}) {
  const Component = Tag as React.ElementType;
  return <Component className={cn(className)}>{children}</Component>;
}
