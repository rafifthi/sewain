"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2, CalendarDays, CalendarPlus, CornerDownLeft, CreditCard, FileText, FileType2, FolderOpen,
  Gauge, MessageSquareText, ReceiptText, Search, SearchX, Settings, UserPlus,
  UsersRound, WalletCards, Wrench, Zap,
} from "lucide-react";
import { useI18n } from "@/components/context";
import type { Row } from "@/lib/data";
import type { ModuleId } from "@/lib/access-control";
import { localizeValue, translate } from "@/lib/i18n";
import type { DialogState, BookingState, PageId } from "@/components/pages/shared";

// Pages whose rows are searchable from the palette.
export type DataPageId = "properties" | "tenants" | "reservations" | "invoices" | "contracts" | "tickets" | "documents" | "tokens" | "expenses";

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  page: PageId;
  navAllowed: (id: string) => boolean;
  canCreate: (module: ModuleId) => boolean;
  go: (id: PageId) => void;
  openDialog: (d: DialogState) => void;
  openBooking: (ctx: BookingState) => void;
  openRecord: (page: DataPageId, row: Row) => void;
  sources: Partial<Record<DataPageId, Row[]>>;
}

// ---- Registries -------------------------------------------------------------

type ModuleEntry = { page: PageId; label: string; icon: LucideIcon; keywords: string[] };
// Labels mirror the sidebar nav; keywords cover Indonesian + English synonyms.
const MODULE_ENTRIES: ModuleEntry[] = [
  { page: "dashboard", label: "Ringkasan", icon: Gauge, keywords: ["dashboard", "overview", "beranda", "home"] },
  { page: "calendar", label: "Kalender", icon: CalendarDays, keywords: ["calendar", "jadwal", "schedule", "agenda"] },
  { page: "properties", label: "Properti", icon: Building2, keywords: ["property", "properties", "kos", "kontrakan", "ruko", "apartemen", "unit", "gedung"] },
  { page: "tenants", label: "Penyewa", icon: UsersRound, keywords: ["tenant", "tenants", "penghuni", "renter", "customer"] },
  { page: "reservations", label: "Reservasi", icon: WalletCards, keywords: ["reservation", "booking", "pemesanan", "sewa"] },
  { page: "invoices", label: "Tagihan", icon: CreditCard, keywords: ["invoice", "bill", "billing", "pembayaran", "payment"] },
  { page: "expenses", label: "Pengeluaran", icon: WalletCards, keywords: ["expense", "expenses", "biaya", "cost", "spending", "operasional"] },
  { page: "reports", label: "Laporan Keuangan", icon: FileText, keywords: ["report", "reports", "laporan", "keuangan", "finance", "laba", "rugi", "profit"] },
  { page: "tokens", label: "Token PLN", icon: Zap, keywords: ["token", "listrik", "electricity", "pln", "meter"] },
  { page: "contracts", label: "Kontrak", icon: FileType2, keywords: ["contract", "perjanjian", "agreement", "tanda tangan", "signature"] },
  { page: "messages", label: "Template Pesan", icon: MessageSquareText, keywords: ["message", "whatsapp", "template", "pesan", "wa", "telegram"] },
  { page: "tickets", label: "Pemeliharaan", icon: Wrench, keywords: ["maintenance", "ticket", "tiket", "keluhan", "complaint", "perbaikan", "vendor"] },
  { page: "documents", label: "Dokumen", icon: FileText, keywords: ["document", "dokumen", "arsip", "file", "berkas"] },
  { page: "settings", label: "Pengaturan", icon: Settings, keywords: ["settings", "konfigurasi", "organisasi", "peran", "role", "integrasi"] },
];

type ActionEntry = { id: string; label: string; icon: LucideIcon; keywords: string[]; module: ModuleId; page: PageId };
const ACTION_ENTRIES: ActionEntry[] = [
  { id: "create-reservation", label: "Buat reservasi", icon: CalendarPlus, keywords: ["booking", "book", "pesan unit", "sewa", "make reservation", "new reservation", "pemesanan baru"], module: "reservations", page: "reservations" },
  { id: "create-tenant", label: "Tambah penyewa", icon: UserPlus, keywords: ["add tenant", "new tenant", "penghuni baru", "daftar penyewa"], module: "tenants", page: "tenants" },
  { id: "create-property", label: "Tambah properti", icon: Building2, keywords: ["add property", "new property", "kos baru", "properti baru"], module: "properties", page: "properties" },
  { id: "create-invoice", label: "Buat tagihan", icon: ReceiptText, keywords: ["new invoice", "bill", "tagihan baru", "invoice baru"], module: "invoices", page: "invoices" },
  { id: "create-ticket", label: "Buat tiket pemeliharaan", icon: Wrench, keywords: ["complaint", "keluhan", "maintenance ticket", "perbaikan", "lapor kerusakan"], module: "tickets", page: "tickets" },
  { id: "create-token", label: "Tambah pesanan token", icon: Zap, keywords: ["token listrik", "pln", "order token", "beli token"], module: "tokens", page: "tokens" },
  { id: "create-document", label: "Unggah dokumen", icon: FolderOpen, keywords: ["upload", "document", "arsip", "dokumen baru"], module: "documents", page: "documents" },
];

type DataConfig = { label: string; singular: string; icon: LucideIcon; titleKeys: string[]; subtitleKeys: string[]; searchKeys: string[] };
const DATA_CONFIG: Record<DataPageId, DataConfig> = {
  properties: { label: "Properti", singular: "Properti", icon: Building2, titleKeys: ["nama"], subtitleKeys: ["tipe", "lokasi"], searchKeys: ["nama", "tipe", "lokasi", "alamat", "status"] },
  tenants: { label: "Penyewa", singular: "Penyewa", icon: UsersRound, titleKeys: ["nama"], subtitleKeys: ["unit", "telepon"], searchKeys: ["nama", "telepon", "email", "unit", "status"] },
  reservations: { label: "Reservasi", singular: "Reservasi", icon: WalletCards, titleKeys: ["penyewa"], subtitleKeys: ["kode", "unit", "periode"], searchKeys: ["kode", "penyewa", "properti", "unit", "periode", "status"] },
  invoices: { label: "Tagihan", singular: "Tagihan", icon: CreditCard, titleKeys: ["id"], subtitleKeys: ["penyewa", "periode", "status"], searchKeys: ["id", "penyewa", "unit", "periode", "status"] },
  contracts: { label: "Kontrak", singular: "Kontrak", icon: FileType2, titleKeys: ["nomor"], subtitleKeys: ["penyewa", "unit", "status"], searchKeys: ["nomor", "penyewa", "unit", "properti", "status"] },
  tickets: { label: "Pemeliharaan", singular: "Tiket", icon: Wrench, titleKeys: ["judul", "masalah"], subtitleKeys: ["tiket", "unit", "vendor"], searchKeys: ["tiket", "judul", "masalah", "unit", "properti", "vendor", "status"] },
  documents: { label: "Dokumen", singular: "Dokumen", icon: FileText, titleKeys: ["nama"], subtitleKeys: ["kategori", "terkait"], searchKeys: ["nama", "kategori", "terkait", "status"] },
  tokens: { label: "Token PLN", singular: "Token", icon: Zap, titleKeys: ["pelanggan"], subtitleKeys: ["meter", "nominal", "status"], searchKeys: ["pelanggan", "meter", "nominal", "status"] },
  expenses: { label: "Pengeluaran", singular: "Pengeluaran", icon: WalletCards, titleKeys: ["nama"], subtitleKeys: ["kategori", "jumlah", "tanggal"], searchKeys: ["nama", "kategori", "jumlah", "tanggal", "catatan"] },
};
const DATA_ORDER: DataPageId[] = ["properties", "tenants", "reservations", "invoices", "contracts", "tickets", "documents", "tokens", "expenses"];

// ---- Matching ---------------------------------------------------------------

const norm = (value: unknown) => String(value ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Best score of a single query token against one haystack term.
function termScore(term: string, token: string): number {
  if (!term) return 0;
  if (term === token) return 100;
  if (term.startsWith(token)) return 80;
  if (term.includes(` ${token}`)) return 60;
  if (term.includes(token)) return 40;
  return 0;
}

// AND semantics: every query token must match somewhere; score favors label hits.
function matchScore(tokens: string[], haystack: string[], primary: string): number {
  let total = 0;
  for (const token of tokens) {
    let best = 0;
    for (const term of haystack) {
      const base = termScore(term, token);
      const score = base ? base + (term === primary ? 10 : 0) : 0;
      if (score > best) best = score;
    }
    if (!best) return 0;
    total += best;
  }
  return total / tokens.length;
}

// Index both the raw (Indonesian) value and its English localization so queries
// in either language match ("unpaid" finds "Belum dibayar").
const bilingual = (value: unknown): string[] => {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  const en = localizeValue("en", raw);
  return en !== raw ? [norm(raw), norm(en)] : [norm(raw)];
};

// ---- Recent items -----------------------------------------------------------

type RecentItem = { kind: "action"; id: string } | { kind: "module"; page: PageId } | { kind: "data"; page: DataPageId; rowId: string };
const RECENT_KEY = "sewain:recent-search";
const RECENT_MAX = 6;

function readRecents(): RecentItem[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as RecentItem[]; } catch { return []; }
}
function pushRecent(item: RecentItem) {
  const key = JSON.stringify(item);
  const next = [item, ...readRecents().filter(existing => JSON.stringify(existing) !== key)].slice(0, RECENT_MAX);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

// ---- Result model -----------------------------------------------------------

type PaletteItem = {
  key: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tag: string;
  score: number;
  select: () => void;
};
type PaletteGroup = { key: string; label: string; items: PaletteItem[] };

const rowTitle = (row: Row, config: DataConfig) => {
  for (const key of config.titleKeys) if (row[key]) return String(row[key]);
  return String(row.id);
};
const rowSubtitle = (row: Row, config: DataConfig, v: (value: unknown) => string) =>
  config.subtitleKeys.map(key => row[key]).filter(Boolean).map(value => v(value)).slice(0, 3).join(" · ");

export function CommandPalette(props: CommandPaletteProps) {
  const { open, onClose, navAllowed, canCreate, go, openDialog, openBooking, openRecord, sources } = props;
  const { locale, t, v } = useI18n();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    setRecents(readRecents());
    inputRef.current?.focus();
  }, [open]);

  const runAction = (entry: ActionEntry) => {
    pushRecent({ kind: "action", id: entry.id });
    onClose();
    if (entry.id === "create-reservation") { openBooking({}); return; }
    go(entry.page);
    openDialog({ mode: "create", page: entry.page });
  };
  const runModule = (entry: ModuleEntry) => {
    pushRecent({ kind: "module", page: entry.page });
    onClose();
    go(entry.page);
  };
  const runData = (page: DataPageId, row: Row) => {
    pushRecent({ kind: "data", page, rowId: String(row.id) });
    onClose();
    openRecord(page, row);
  };

  const allowedActions = useMemo(
    () => ACTION_ENTRIES.filter(entry => navAllowed(entry.module) && canCreate(entry.module)),
    [navAllowed, canCreate],
  );
  const allowedModules = useMemo(() => MODULE_ENTRIES.filter(entry => navAllowed(entry.page)), [navAllowed]);

  const actionItem = (entry: ActionEntry, score = 0): PaletteItem => ({
    key: `action:${entry.id}`, icon: entry.icon, title: t(entry.label), subtitle: t(MODULE_ENTRIES.find(m => m.page === entry.page)?.label || ""), tag: t("Aksi"), score, select: () => runAction(entry),
  });
  const moduleItem = (entry: ModuleEntry, score = 0): PaletteItem => ({
    key: `module:${entry.page}`, icon: entry.icon, title: t(entry.label), subtitle: "", tag: t("Halaman"), score, select: () => runModule(entry),
  });
  const dataItem = (page: DataPageId, row: Row, score = 0): PaletteItem => {
    const config = DATA_CONFIG[page];
    return { key: `data:${page}:${row.id}`, icon: config.icon, title: v(rowTitle(row, config)), subtitle: rowSubtitle(row, config, v), tag: t(config.singular), score, select: () => runData(page, row) };
  };

  const groups = useMemo<PaletteGroup[]>(() => {
    const tokens = norm(query).split(/\s+/).filter(Boolean);

    if (!tokens.length) {
      // Recommendations: recently opened, quick actions, then pages.
      const result: PaletteGroup[] = [];
      const recentItems = recents.flatMap<PaletteItem>(item => {
        if (item.kind === "action") { const entry = allowedActions.find(a => a.id === item.id); return entry ? [actionItem(entry)] : []; }
        if (item.kind === "module") { const entry = allowedModules.find(m => m.page === item.page); return entry ? [moduleItem(entry)] : []; }
        if (!navAllowed(item.page)) return [];
        const row = (sources[item.page] || []).find(candidate => String(candidate.id) === item.rowId);
        return row ? [dataItem(item.page, row)] : [];
      }).slice(0, 4);
      if (recentItems.length) result.push({ key: "recent", label: t("Terakhir dibuka"), items: recentItems });
      const shown = new Set(recentItems.map(item => item.key));
      result.push({ key: "actions", label: t("Aksi cepat"), items: allowedActions.map(entry => actionItem(entry)).filter(item => !shown.has(item.key)).slice(0, 5) });
      result.push({ key: "modules", label: t("Buka halaman"), items: allowedModules.filter(entry => entry.page !== props.page).map(entry => moduleItem(entry)).filter(item => !shown.has(item.key)).slice(0, 6) });
      return result.filter(group => group.items.length);
    }

    const result: PaletteGroup[] = [];
    const actionMatches = allowedActions
      .map(entry => ({ entry, score: matchScore(tokens, [norm(entry.label), norm(translate("en", entry.label)), ...entry.keywords.map(norm)], norm(entry.label)) }))
      .filter(match => match.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    if (actionMatches.length) result.push({ key: "actions", label: t("Aksi"), items: actionMatches.map(match => actionItem(match.entry, match.score)) });

    const moduleMatches = allowedModules
      .map(entry => ({ entry, score: matchScore(tokens, [norm(entry.label), norm(translate("en", entry.label)), ...entry.keywords.map(norm)], norm(entry.label)) }))
      .filter(match => match.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    if (moduleMatches.length) result.push({ key: "modules", label: t("Halaman"), items: moduleMatches.map(match => moduleItem(match.entry, match.score)) });

    for (const page of DATA_ORDER) {
      const rows = sources[page];
      if (!rows?.length || !navAllowed(page)) continue;
      const config = DATA_CONFIG[page];
      const matches = rows
        .map(row => {
          const primary = norm(rowTitle(row, config));
          const haystack = [norm(String(row.id)), ...config.searchKeys.flatMap(key => bilingual(row[key]))];
          return { row, score: matchScore(tokens, haystack, primary) };
        })
        .filter(match => match.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      if (matches.length) result.push({ key: `data:${page}`, label: t(config.label), items: matches.map(match => dataItem(page, match.row, match.score)) });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sources, locale, recents, allowedActions, allowedModules, navAllowed, props.page]);

  const flat = useMemo(() => groups.flatMap(group => group.items), [groups]);

  useEffect(() => { setActiveIndex(0); }, [query]);
  useEffect(() => {
    const active = listRef.current?.querySelector(".palette-item.active");
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, groups]);

  if (!open) return null;

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex(index => flat.length ? (index + 1) % flat.length : 0); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex(index => flat.length ? (index - 1 + flat.length) % flat.length : 0); }
    else if (event.key === "Enter") { event.preventDefault(); flat[activeIndex]?.select(); }
    else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
  };

  let flatIndex = -1;
  return <div className="backdrop palette-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="command-palette" role="dialog" aria-modal="true" aria-label={t("Pencarian global")}>
      <div className="palette-input">
        <Search />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("Cari data, halaman, atau aksi...")}
          aria-label={t("Pencarian global")}
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-listbox"
          aria-activedescendant={flat.length ? `palette-item-${activeIndex}` : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        <span className="kbd">Esc</span>
      </div>
      <div className="palette-results" ref={listRef} role="listbox" id="palette-listbox">
        {groups.length ? groups.map(group => <Fragment key={group.key}>
          <div className="palette-group-label" role="presentation">{group.label}</div>
          {group.items.map(item => {
            flatIndex += 1;
            const index = flatIndex;
            const Icon = item.icon;
            return <button
              key={item.key}
              id={`palette-item-${index}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={`palette-item ${index === activeIndex ? "active" : ""}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={item.select}
            >
              <span className="palette-item-icon"><Icon /></span>
              <span className="palette-item-copy"><strong>{item.title}</strong>{item.subtitle && <span>{item.subtitle}</span>}</span>
              <span className="palette-item-tag">{item.tag}</span>
            </button>;
          })}
        </Fragment>) : <div className="palette-empty">
          <SearchX />
          <strong>{t("Tidak ada hasil untuk")} “{query}”</strong>
          <span>{t("Coba kata kunci lain, misalnya nama penyewa, nomor tagihan, atau nama halaman.")}</span>
        </div>}
      </div>
      <footer className="palette-foot">
        <span><kbd>↑↓</kbd> {t("navigasi")}</span>
        <span><CornerDownLeft size={11} /> {t("pilih")}</span>
        <span><kbd>Esc</kbd> {t("tutup")}</span>
      </footer>
    </div>
  </div>;
}
