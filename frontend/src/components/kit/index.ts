/**
 * Kit — mahsulotning yagona komponent tili.
 *
 * Barcha yangi ekranlar shu yerdan quriladi. Eski `components/site/ui.tsx` va
 * `components/ui/*` migratsiya tugaguncha saqlanadi va bosqichma-bosqich
 * bo'shatiladi.
 */

export {
  Button,
  LinkButton,
  IconButton,
  Chip,
  Count,
  LiveDot,
  KeyHint,
  Divider,
  DividerLabel,
  Eyebrow,
  DifficultyMark,
} from "./primitives";
export { Pane, PaneHead, PageHead, Stat, StatRow, StatCell, Section, SplitLayout } from "./surface";
export { Field, Input, Textarea, SearchField, Toggle, ChoiceRow, inputClass, textareaClass, fieldBase } from "./form";
export { Empty, Block, TextLines, ListSkeleton, CardSkeleton, Spinner, Alert, Meter } from "./feedback";
export { Segmented, ChipRail, Breadcrumb, Pagination } from "./nav";
export { Carousel } from "./carousel";
/* Dropdown — TIZIM `<select>` i EMAS, o'z ro'yxatimiz.
   Native `<select>` ochilganda operatsion tizim chizadigan ro'yxat
   chiqadi: boshqa shrift, ko'k tanlov chizig'i, burchaksiz oq quti —
   ya'ni saytning dizayn tizimidan butunlay tashqarida. `Listbox` esa
   o'sha tokenlar bilan chiziladi, ichida qidiruv bor va klaviatura
   bilan to'liq boshqariladi. */
export { Listbox, Select, FilterSelect, PageSizeSelect } from "../ui/select";
export type { SelectOption } from "../ui/select";
export { Modal, Tooltip, Popover, MenuItem, MenuLink } from "./overlay";
