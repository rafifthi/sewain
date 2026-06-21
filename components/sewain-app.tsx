"use client";

import { createContext, Fragment, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell, Building2, CalendarDays, Check, CheckCircle2, ChevronLeft, CircleDollarSign,
  ClipboardList, CreditCard, FileText, FileType2, Gauge, Home, MessageSquareText,
  Bold, CalendarClock, CalendarPlus, Download, Eye, GripVertical, IdCard, ImagePlus, Italic, List, Mail, MapPin, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Pencil, PenLine, Phone, Plus, Search, Settings, ShieldCheck, Tag, TicketCheck, Trash2,
  UserCheck, UserRound, UsersRound, WalletCards, Wrench, X, Zap,
} from "lucide-react";
import { invoices as seedInvoices, moduleData, properties as seedProperties, Row, units as seedUnits } from "@/lib/data";
import { Locale, localizeValue, message, translate } from "@/lib/i18n";
import { calcFee, defaultTokenConfig, formatRp, PropertyFeeRule, TokenConfig } from "@/lib/utility-token-config";
import {
  eventDescription, eventLabel, eventTiming, findEvent, MessageEvent, MessageTemplate,
  ORG_CONSTANTS, renderPreview, sampleValues, SEED_TEMPLATES, TemplateOption, variableLabel, VariableDef,
} from "@/lib/message-templates";

type PageId = "dashboard" | "properties" | "tenants" | "reservations" | "invoices" | "tokens" | "contracts" | "messages" | "tickets" | "documents" | "settings";
type DialogState = null | { mode: "create" | "edit"; page: PageId; row?: Row };
type BookingState = { propertyId?: string; unitId?: string };

type I18nState = { locale: Locale; setLocale: (locale: Locale) => void; t: (value: string) => string; v: (value: unknown) => string };
const I18nContext = createContext<I18nState>({ locale: "id", setLocale: () => {}, t: value => value, v: value => String(value ?? "") });
const useI18n = () => useContext(I18nContext);

type TokenCtx = { config: TokenConfig; setConfig: (c: TokenConfig) => void; properties: Row[] };
const TokenConfigContext = createContext<TokenCtx>({ config: defaultTokenConfig, setConfig: () => {}, properties: [] });
const useTokenConfig = () => useContext(TokenConfigContext);

const nav = [
  { id: "dashboard", label: "Ringkasan", icon: Gauge },
  { id: "properties", label: "Properti", icon: Building2 },
  { id: "tenants", label: "Penyewa", icon: UsersRound },
  { id: "reservations", label: "Reservasi", icon: WalletCards },
  { id: "invoices", label: "Tagihan", icon: CreditCard },
  { id: "tokens", label: "Token PLN", icon: Zap },
  { id: "contracts", label: "Kontrak", icon: FileType2 },
  { id: "messages", label: "Template Pesan", icon: MessageSquareText },
  { id: "tickets", label: "Pemeliharaan", icon: Wrench },
  { id: "documents", label: "Dokumen", icon: FileText },
  { id: "settings", label: "Pengaturan", icon: Settings },
] as const;

const pageMeta: Record<PageId, { title: string; description: string; singular: string }> = {
  dashboard: { title: "Ringkasan", description: "Hal yang perlu Anda tindak lanjuti hari ini.", singular: "aktivitas" },
  properties: { title: "Properti", description: "Pantau hunian dan operasional seluruh portofolio.", singular: "properti" },
  tenants: { title: "Penyewa", description: "Data penyewa aktif, terdahulu, dan yang akan masuk.", singular: "penyewa" },
  reservations: { title: "Reservasi", description: "Lacak status setiap pemesanan dari booking hingga selesai.", singular: "reservasi" },
  invoices: { title: "Tagihan", description: "Buat, kirim, dan rekonsiliasi pembayaran sewa.", singular: "tagihan" },
  tokens: { title: "Token PLN", description: "Pesanan token listrik dan margin platform.", singular: "pesanan" },
  contracts: { title: "Kontrak", description: "Template dan kontrak sewa yang sudah dibuat.", singular: "kontrak" },
  messages: { title: "Template Pesan", description: "Pesan WhatsApp otomatis untuk setiap peristiwa.", singular: "template" },
  tickets: { title: "Pemeliharaan", description: "Tindak lanjuti keluhan dan pekerjaan vendor.", singular: "tiket" },
  documents: { title: "Dokumen", description: "Arsip privat untuk kontrak, identitas, dan properti.", singular: "dokumen" },
  settings: { title: "Pengaturan", description: "Atur organisasi, penagihan, dan integrasi.", singular: "pengaturan" },
};

type FormFieldSchema = { key: string; label: string; type?: React.HTMLInputTypeAttribute; options?: string[]; multiline?: boolean; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] };

const schemas: Partial<Record<PageId, FormFieldSchema[]>> = {
  properties: [
    { key: "nama", label: "Nama properti" }, { key: "tipe", label: "Tipe", options: ["Kos", "Kontrakan", "Ruko", "Apartemen"] },
    { key: "lokasi", label: "Kota / lokasi" }, { key: "unit", label: "Jumlah unit", type: "number" },
    { key: "terisi", label: "Unit terisi", type: "number" }, { key: "pendapatan", label: "Pendapatan bulanan" },
  ],
  reservations: [
    { key: "penyewa", label: "Penyewa" }, { key: "unit", label: "Properti dan unit" },
    { key: "periode", label: "Periode sewa" }, { key: "deposit", label: "Deposit", inputMode: "numeric" },
    { key: "status", label: "Status", options: ["Booking", "Draf Kontrak", "Kontrak Ditandatangani", "Aktif", "Tidak Aktif"] },
  ],
  invoices: [
    { key: "penyewa", label: "Penyewa" }, { key: "unit", label: "Properti dan unit" },
    { key: "periode", label: "Periode" }, { key: "jatuhTempo", label: "Jatuh tempo", type: "date" },
    { key: "total", label: "Total", inputMode: "numeric" }, { key: "sisa", label: "Sisa tagihan", inputMode: "numeric" },
    { key: "status", label: "Status", options: ["Belum dibayar", "Jatuh tempo", "Terlambat", "Lunas"] },
  ],
  tokens: [
    { key: "pelanggan", label: "Pelanggan" }, { key: "meter", label: "Nomor meter", inputMode: "numeric" },
    { key: "nominal", label: "Nominal", options: ["Rp20.000", "Rp50.000", "Rp100.000", "Rp200.000"] },
    { key: "biaya", label: "Biaya platform" }, { key: "status", label: "Status", options: ["Menunggu bayar", "Diproses", "Token terkirim", "Selesai"] },
  ],
  contracts: [
    { key: "nomor", label: "Nomor kontrak" }, { key: "penyewa", label: "Penyewa" },
    { key: "unit", label: "Properti dan unit" }, { key: "dibuat", label: "Tanggal dibuat", type: "date" },
    { key: "status", label: "Status", options: ["Draf", "Menunggu tanda tangan", "Ditandatangani"] },
  ],
  messages: [
    { key: "peristiwa", label: "Peristiwa" }, { key: "waktu", label: "Waktu kirim" },
    { key: "saluran", label: "Saluran", options: ["WhatsApp"] }, { key: "status", label: "Status", options: ["Aktif", "Nonaktif"] },
  ],
  tickets: [
    { key: "tiket", label: "Nomor tiket" }, { key: "masalah", label: "Masalah", multiline: true },
    { key: "unit", label: "Properti dan unit" }, { key: "vendor", label: "Vendor" },
    { key: "status", label: "Status", options: ["Baru", "Ditugaskan", "Dikerjakan", "Selesai"] },
  ],
  documents: [
    { key: "nama", label: "Nama dokumen" }, { key: "kategori", label: "Kategori", options: ["Kontrak", "Identitas", "Properti", "Lainnya"] },
    { key: "terkait", label: "Terkait dengan" }, { key: "diperbarui", label: "Tanggal", type: "date" },
    { key: "status", label: "Status", options: ["Privat", "Terverifikasi"] },
  ],
};

const columnLabels: Record<string, string> = {
  nama: "Nama", tipe: "Tipe", lokasi: "Lokasi", unit: "Unit", terisi: "Terisi", pendapatan: "Pendapatan",
  telepon: "WhatsApp", sejak: "Mulai", status: "Status", penyewa: "Penyewa", properti: "Properti", periode: "Periode",
  deposit: "Deposit", tahap: "Tahap", pelanggan: "Pelanggan", meter: "Nomor meter", nominal: "Nominal", biaya: "Biaya",
  kode: "Kode", durasi: "Durasi", sewa: "Sewa", jadwalMasuk: "Jadwal masuk", jadwalKeluar: "Jadwal keluar",
  nomor: "Nomor", dibuat: "Dibuat", peristiwa: "Peristiwa", waktu: "Waktu", saluran: "Saluran", tiket: "Tiket",
  masalah: "Masalah", vendor: "Vendor", kategori: "Kategori", terkait: "Terkait", diperbarui: "Diperbarui",
  jatuhTempo: "Jatuh tempo", total: "Total", sisa: "Sisa",
};

function useStoredRows(key: string, initial: Row[]) {
  const [rows, setRows] = useState<Row[]>(initial);
  useEffect(() => {
    const saved = localStorage.getItem(`sewain:${key}`);
    if (!saved) return;
    const parsed = JSON.parse(saved) as Row[];
    if (key === "tenants" && localStorage.getItem("sewain:tenant-samples-v2") !== "true") {
      const unassignedSample = initial.find(row => row.id === "t4");
      if (unassignedSample && !parsed.some(row => row.id === unassignedSample.id)) parsed.push(unassignedSample);
      localStorage.setItem("sewain:tenant-samples-v2", "true");
      localStorage.setItem(`sewain:${key}`, JSON.stringify(parsed));
    }
    if (key === "properties" && localStorage.getItem("sewain:single-unit-samples-v1") !== "true") {
      initial.filter(row => ["p5", "p6"].includes(row.id)).forEach(sample => {
        if (!parsed.some(row => row.id === sample.id)) parsed.push(sample);
      });
      localStorage.setItem("sewain:single-unit-samples-v1", "true");
      localStorage.setItem(`sewain:${key}`, JSON.stringify(parsed));
    }
    setRows(parsed);
  }, [initial, key]);
  useEffect(() => { localStorage.setItem(`sewain:${key}`, JSON.stringify(rows)); }, [key, rows]);
  return [rows, setRows] as const;
}

function useStoredConfig<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const saved = localStorage.getItem(`sewain:${key}`);
    if (saved) try { setValue({ ...initial, ...JSON.parse(saved) }); } catch {}
  }, [initial, key]);
  const set = (next: T) => { setValue(next); localStorage.setItem(`sewain:${key}`, JSON.stringify(next)); };
  return [value, set];
}

function slug(value: unknown) {
  return String(value).toLowerCase().replace(/\s+/g, "-");
}

function toDateInputValue(value: unknown) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const months: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", mei: "05", may: "05", jun: "06", jul: "07", agu: "08", aug: "08", sep: "09", okt: "10", oct: "10", nov: "11", des: "12", dec: "12" };
  const match = text.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (!match) return "";
  const month = months[match[2].slice(0, 3)];
  return month ? `${match[3]}-${month}-${match[1].padStart(2, "0")}` : "";
}

// ---- Booking flow helpers -------------------------------------------------
const VACANT_STATUSES = ["Kosong", "Akan kosong"];
const idMonthsShort = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const idMonthsLong = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const isVacant = (row?: Row) => !!row && VACANT_STATUSES.includes(String(row.status));
const rupiah = (value: unknown) => Number(String(value ?? "0").replace(/[^\d]/g, "")) || 0;
const todayInput = () => new Date().toISOString().slice(0, 10);
const parseInput = (value: string) => { const d = new Date(`${(toDateInputValue(value) || todayInput())}T00:00:00Z`); return Number.isNaN(d.getTime()) ? new Date() : d; };
const addMonths = (date: Date, months: number) => { const d = new Date(date); d.setUTCMonth(d.getUTCMonth() + months); return d; };
const fmtShort = (d: Date) => `${d.getUTCDate()} ${idMonthsShort[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const fmtMonthYear = (d: Date) => `${idMonthsShort[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

const isSingleUnit = (property?: Row) => !!property && Number(property.unit || 1) === 1;

// Units for a property: real rows when present, otherwise a synthetic single unit
// for single-unit properties that have no unit rows yet (e.g. ruko/kontrakan seeds).
function unitsForProperty(units: Row[], property?: Row): Row[] {
  if (!property) return [];
  const rows = units.filter(row => row._propertiId === property.id);
  if (rows.length) return rows;
  if (isSingleUnit(property)) {
    const price = rupiah(property.defaultPrice || property.pendapatan);
    const occupied = Number(property.terisi || 0) > 0;
    const deposit = rupiah(property.defaultDeposit) || price;
    return [{ id: `${property.id}-u1`, unit: "Unit utama", tipe: "Single unit", lantai: "1", penyewa: occupied ? String(property.contactName || "Penyewa") : "Belum ada", status: occupied ? "Dihuni" : "Kosong", sewa: price ? formatRp(price) : "Rp0", deposit: deposit ? formatRp(deposit) : "Rp0", tunggakan: "Rp0", meter: "-", _propertiId: property.id, _synthetic: "1" }];
  }
  return [];
}

// Display label for a unit within a property ("Melati 104", or property name for single-unit).
function unitLabelFor(property?: Row, unit?: Row): string {
  if (!property || !unit) return "";
  const tag = String(property.nama).replace(/^(Kos|Kontrakan|Ruko|Apartemen|Rumah|Paviliun)\s+/i, "").split(/[\s,]+/)[0];
  return unit._synthetic ? String(property.nama) : `${tag} ${unit.unit}`;
}

const upsertRow = (setter: React.Dispatch<React.SetStateAction<Row[]>>, row: Row) =>
  setter(old => old.some(r => r.id === row.id) ? old.map(r => r.id === row.id ? row : r) : [row, ...old]);

// Recompute a property's occupancy after a unit's status changes.
function syncPropertyOccupancy(propertyId: string, setProperties: React.Dispatch<React.SetStateAction<Row[]>>, units: Row[]) {
  setProperties(old => old.map(p => {
    if (p.id !== propertyId) return p;
    const rows = units.filter(u => u._propertiId === propertyId);
    if (isSingleUnit(p)) {
      const occupied = rows.some(u => /dihuni/i.test(String(u.status)));
      return { ...p, terisi: occupied ? 1 : 0, status: occupied ? "Aktif" : p.status };
    }
    if (!rows.length) return p;
    return { ...p, terisi: rows.filter(u => /dihuni/i.test(String(u.status))).length };
  }));
}

// Parse the end of a reservation period string ("Jul 2025 - Jun 2026") to a Date (last day of month).
function reservationEndDate(periode: unknown): Date | null {
  const text = String(periode || "");
  const end = text.includes(" - ") ? text.split(" - ")[1] : text;
  const m = end.trim().match(/^([A-Za-z]{3})\w*\s+(\d{4})$/);
  if (!m) return null;
  const month = idMonthsShort.findIndex(mm => mm.toLowerCase() === m[1].toLowerCase());
  if (month < 0) return null;
  return new Date(Date.UTC(Number(m[2]), month + 1, 0));
}
const daysUntil = (date: Date | null) => date ? Math.ceil((date.getTime() - Date.now()) / 86400000) : Infinity;
const isExpiringSoon = (r: Row, withinDays = 30) => String(r.status) === "Aktif" && daysUntil(reservationEndDate(r.periode)) <= withinDays;

function Status({ children }: { children: React.ReactNode }) {
  const { v } = useI18n();
  const value = String(children);
  const state = /aktif|lunas|dihuni|selesai|terkirim|ditandatangani|terverifikasi/i.test(value) ? "success" :
    /terlambat|perawatan|perlu perhatian/i.test(value) ? "danger" :
    /jatuh|dipesan|booking|kontrak|menunggu|ditugaskan|akan kosong|draf|diproses|dikonfirmasi|token siap/i.test(value) ? "warning" : "";
  return <span className={`badge ${state} ${slug(value)}`}>{v(value)}</span>;
}

function PageHead({ page, action, back }: { page: PageId; action?: () => void; back?: () => void }) {
  const { t } = useI18n();
  const meta = pageMeta[page];
  return <div className="page-head">
    <div>
      {back && <button className="button" onClick={back} style={{ marginBottom: 10 }}><ChevronLeft />{t("Kembali ke properti")}</button>}
      <h1>{t(meta.title)}</h1><p className="subtext">{t(meta.description)}</p>
    </div>
    {action && <div className="actions"><button className="button primary" onClick={action}><Plus />{t("Tambah")} {t(meta.singular)}</button></div>}
  </div>;
}

function Toolbar({ search, setSearch }: { search: string; setSearch: (v: string) => void }) {
  const { t } = useI18n();
  return <div className="toolbar">
    <div className="field-inline"><Search /><input type="search" enterKeyHint="search" aria-label={t("Cari data")} value={search} onChange={e => setSearch(e.target.value)} placeholder={t("Cari data...")} /></div>
    <select aria-label={t("Filter status")}><option>{t("Semua status")}</option><option>{t("Aktif")}</option><option>{t("Perlu tindakan")}</option></select>
  </div>;
}

function DataTable({ rows, onEdit, onDelete, onSelect, selected }: { rows: Row[]; onEdit: (r: Row) => void; onDelete: (r: Row) => void; onSelect?: (r: Row) => void; selected?: string }) {
  const { t, v } = useI18n();
  const keys = rows.length ? Object.keys(rows[0]).filter(k => k !== "id" && !k.startsWith("_")).slice(0, 6) : [];
  return <div className="table-wrap"><table>
    <thead><tr>{keys.map(key => <th key={key}>{t(columnLabels[key] || key)}</th>)}<th>{t("Aksi")}</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.id} onClick={() => onSelect?.(row)} className={selected === row.id ? "selected" : ""}>
      {keys.map((key, i) => <td key={key}>{key === "status" || key === "tahap" ? <Status>{row[key]}</Status> : <span className={i === 0 ? "cell-main" : ""}>{v(row[key])}</span>}</td>)}
      <td><div className="actions"><button className="icon-button" aria-label={`${t("Edit")} ${row.id}`} onClick={e => { e.stopPropagation(); onEdit(row); }}><Pencil /></button><button className="icon-button" aria-label={`${t("Hapus")} ${row.id}`} onClick={e => { e.stopPropagation(); onDelete(row); }}><Trash2 /></button></div></td>
    </tr>)}</tbody>
  </table></div>;
}

function CrudPage({ page, rows, setRows, openDialog, notify }: { page: PageId; rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>; openDialog: (d: DialogState) => void; notify: (s: string) => void }) {
  const { locale, t, v } = useI18n();
  const [search, setSearch] = useState("");
  const filtered = rows.filter(row => Object.values(row).some(value => v(value).toLowerCase().includes(search.toLowerCase())));
  const remove = (row: Row) => { setRows(old => old.filter(item => item.id !== row.id)); notify(message(locale, "removed", { item: t(pageMeta[page].singular) })); };
  return <><PageHead page={page} action={() => openDialog({ mode: "create", page })} />
    <section className="panel"><Toolbar search={search} setSearch={setSearch} />
      {filtered.length ? <DataTable rows={filtered} onEdit={row => openDialog({ mode: "edit", page, row })} onDelete={remove} /> : <div className="empty"><ClipboardList /><div><strong>{t("Belum ada data yang cocok")}</strong>{locale === "en" ? `Change your search or add a new ${t(pageMeta[page].singular)}.` : `Ubah pencarian atau tambahkan ${pageMeta[page].singular} baru.`}</div></div>}
    </section></>;
}

function whatsappUrl(phone: unknown) {
  const digits = String(phone || "").replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("0") ? `62${digits.slice(1)}` : digits}`;
}

function TenantsPage({ rows, setRows, invoices, documents, openDialog, notify, goToProperties }: { rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>; invoices: Row[]; documents: Row[]; openDialog: (d: DialogState) => void; notify: (s: string) => void; goToProperties: () => void }) {
  const { locale, t, v } = useI18n();
  const [selected, setSelected] = useState<Row | null>(null);
  const [search, setSearch] = useState("");
  const filtered = rows.filter(row => [row.nama, row.telepon, row.email, row.unit, row.status].some(value => v(value).toLowerCase().includes(search.toLowerCase())));
  const remove = (row: Row) => {
    setRows(current => current.filter(item => item.id !== row.id));
    setSelected(null);
    notify(message(locale, "removed", { item: t("penyewa") }));
  };

  if (selected) {
    const payments = invoices.filter(invoice => invoice.penyewa === selected.nama);
    const tenantDocuments = documents.filter(document => document.terkait === selected.nama);
    return <TenantDetail tenant={selected} payments={payments} documents={tenantDocuments} onBack={() => setSelected(null)} onEdit={() => openDialog({ mode: "edit", page: "tenants", row: selected })} onDelete={() => remove(selected)} goToProperties={goToProperties} />;
  }

  return <><PageHead page="tenants" action={() => openDialog({ mode: "create", page: "tenants" })} />
    <section className="panel"><Toolbar search={search} setSearch={setSearch} />
      {filtered.length ? <div className="table-wrap"><table className="tenant-table"><thead><tr><th>{t("Nama lengkap")}</th><th>{t("Kontak")}</th><th>{t("Hunian saat ini")}</th><th>{t("Status")}</th><th>{t("Aksi")}</th></tr></thead><tbody>
        {filtered.map(row => <tr key={row.id} onClick={() => setSelected(row)}><td><span className="tenant-name"><span className="avatar small">{String(row.nama).split(" ").map(part => part[0]).slice(0, 2).join("")}</span><span><strong>{v(row.nama)}</strong><small>{v(row.email)}</small></span></span></td><td><span className="cell-main">{v(row.telepon)}</span><span className="cell-sub">WhatsApp</span></td><td><span className="cell-main">{v(row.unit || "Belum ada sewa")}</span><span className="cell-sub">{row.sejak ? `${t("Mulai")} ${v(row.sejak)}` : t("Lewat flow booking")}</span></td><td><Status>{row.status || "Belum ada sewa"}</Status></td><td><div className="actions"><a className="icon-button whatsapp-icon" href={whatsappUrl(row.telepon)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${row.nama}`} onClick={event => event.stopPropagation()}><MessageSquareText /></a><button className="icon-button" aria-label={`${t("Edit")} ${row.nama}`} onClick={event => { event.stopPropagation(); openDialog({ mode: "edit", page: "tenants", row }); }}><Pencil /></button></div></td></tr>)}
      </tbody></table></div> : <div className="empty"><ClipboardList /><div><strong>{t("Belum ada data yang cocok")}</strong>{t("Ubah pencarian atau tambahkan penyewa baru.")}</div></div>}
    </section></>;
}

function TenantDetail({ tenant, payments, documents, onBack, onEdit, onDelete, goToProperties }: { tenant: Row; payments: Row[]; documents: Row[]; onBack: () => void; onEdit: () => void; onDelete: () => void; goToProperties: () => void }) {
  const { locale, t, v } = useI18n();
  const activeLease = tenant.status === "Aktif" ? 1 : 0;
  const rupiahValue = (value: unknown) => Number(String(value || "0").replace(/[^\d]/g, ""));
  const outstanding = payments.reduce((total, payment) => total + rupiahValue(payment.sisa), 0);
  const paid = payments.reduce((total, payment) => total + Math.max(0, rupiahValue(payment.total) - rupiahValue(payment.sisa)), 0);
  const formatRupiah = (amount: number) => v(`Rp${amount.toLocaleString("id-ID")}`);
  return <>
    <button className="button tenant-back" onClick={onBack}><ChevronLeft />{t("Semua penyewa")}</button>
    <section className="panel tenant-summary-card"><div className="tenant-summary-main"><div className="tenant-heading"><span className="avatar tenant-avatar">{String(tenant.nama).split(" ").map(part => part[0]).slice(0, 2).join("")}</span><div><div className="property-title"><h1>{v(tenant.nama)}</h1><Status>{tenant.status || "Belum ada sewa"}</Status></div><p className="subtext">{tenant.sejak ? `${t("Penyewa sejak")} ${v(tenant.sejak)}` : t("Belum ada sewa aktif")}</p></div></div><div className="actions"><a className="button primary whatsapp-cta" href={whatsappUrl(tenant.telepon)} target="_blank" rel="noreferrer"><MessageSquareText />WhatsApp</a><button className="button" onClick={onEdit}><Pencil />{t("Edit")}</button><button className="icon-button" aria-label={t("Opsi lainnya")}><MoreHorizontal /></button></div></div>
      <div className="tenant-metrics"><div><span>{t("Sewa aktif")}</span><strong>{activeLease}</strong></div><div><span>{t("Total tagihan")}</span><strong>{payments.length}</strong></div><div><span>{t("Total dibayar")}</span><strong>{formatRupiah(paid)}</strong></div><div><span>{t("Sisa tagihan")}</span><strong className={outstanding ? "money-danger" : ""}>{formatRupiah(outstanding)}</strong></div></div>
    </section>
    <div className="tenant-detail-layout"><main className="tenant-main-column">
      <section className="panel tenant-card"><div className="tenant-card-head"><div><h2>{t("Status sewa saat ini")}</h2><p>{t("Penempatan unit hanya melalui flow booking.")}</p></div>{tenant.unit && <button className="text-button" onClick={goToProperties}>{t("Lihat properti")}</button>}</div>
        {tenant.unit ? <><div className="current-tenancy"><div><span className="section-icon"><Building2 /></span><span><strong>{v(tenant.unit)}</strong><small>{t("Ditetapkan melalui booking")}</small></span></div><Status>{tenant.status || "Belum ada sewa"}</Status></div><div className="tenancy-facts"><div><span>{t("Tanggal mulai")}</span><strong>{v(tenant.sejak)}</strong></div><div><span>{t("Periode sewa")}</span><strong>{v(tenant.periodeSewa || tenant.sejak)}</strong></div><div><span>{t("Status")}</span><strong>{v(tenant.status)}</strong></div></div></> : <div className="inline-empty"><span>{t("Belum ada sewa aktif untuk penyewa ini.")}</span><button className="button" onClick={goToProperties}>{t("Buka properti untuk booking")}</button></div>}
      </section>
      <section className="panel tenant-card"><div className="tenant-card-head"><div><h2>{t("Riwayat pembayaran")}</h2><p>{payments.length} {t("tagihan ditemukan")}</p></div></div>{payments.length ? <div className="payment-list">{payments.map(payment => <div className="payment-row" key={payment.id}><span><strong>{payment.id}</strong><small>{v(payment.periode)} · {v(payment.unit)}</small></span><span><strong>{v(payment.total)}</strong><small>{t("Sisa")}: {v(payment.sisa)}</small></span><Status>{payment.status}</Status></div>)}</div> : <div className="inline-empty">{t("Belum ada riwayat pembayaran.")}</div>}</section>
    </main><aside className="tenant-side-column">
      <section className="panel tenant-card"><div className="tenant-card-head"><div><h2>{t("Kontak & identitas")}</h2></div></div><div className="contact-list contact-identity-list"><div><MessageSquareText /><span><small>WhatsApp</small><a href={whatsappUrl(tenant.telepon)} target="_blank" rel="noreferrer">{v(tenant.telepon)}</a></span></div><div><Mail /><span><small>Email</small><a href={`mailto:${tenant.email}`}>{v(tenant.email)}</a></span></div><div><IdCard /><span><small>{t("Nomor KTP / identitas")}</small><strong>{v(tenant.nomorIdentitas)}</strong></span></div><div><ShieldCheck /><span><small>{t("Kontak darurat")}</small><strong>{v(tenant.kontakDarurat)}</strong><em>{v(tenant.teleponDarurat)}</em></span></div></div></section>
      <section className="panel tenant-card"><div className="tenant-card-head"><div><h2>{t("Dokumen")}</h2><p>{t("Kontrak dan dokumen identitas")}</p></div></div><div className="identity-document"><img src={String(tenant.gambarIdentitas || "/ktp-placeholder.svg")} alt={`${t("Kartu identitas")} ${tenant.nama}`} /><span><strong>{t("Kartu identitas")}</strong><small>{t("Privat")}</small></span></div><div className="document-list compact-document-list">{documents.map(document => <div className="document-row" key={document.id}><span className="document-type"><FileText /></span><span><strong>{v(document.nama)}</strong><small>{t(String(document.kategori))} · {v(document.diperbarui)}</small></span></div>)}</div></section>
      <button className="button danger tenant-delete" onClick={() => window.confirm(locale === "en" ? "Delete this tenant record?" : "Hapus data penyewa ini?") && onDelete()}><Trash2 />{t("Hapus penyewa")}</button>
    </aside></div>
  </>;
}

const ticketStages = ["Baru", "Ditugaskan", "Dikerjakan", "Selesai"] as const;
const ticketAssignees = ["Belum ditugaskan", "Andi Triono", "Rina Novita"];
const ticketLabels = ["Mendesak", "Plumbing", "Listrik", "HVAC"];
const vendorDirectory: Row[] = [
  { id: "v1", nama: "CV Sejuk Abadi", kontak: "Budi Santoso", telepon: "0812 8800 1422", labels: "AC|HVAC", kota: "Depok", status: "Aktif" },
  { id: "v2", nama: "Teknik Jaya", kontak: "Dimas Prakoso", telepon: "0813 7712 9031", labels: "Listrik|Elektronik", kota: "Jakarta", status: "Aktif" },
  { id: "v3", nama: "Bengkel Kayu Maju", kontak: "Wawan Setiawan", telepon: "0819 2255 1780", labels: "Pintu|Furnitur", kota: "Jakarta Selatan", status: "Aktif" },
  { id: "v4", nama: "Mitra Pipa Bersih", kontak: "Rian Hidayat", telepon: "0857 1033 4812", labels: "Plumbing|Sanitasi", kota: "Depok", status: "Aktif" },
];

type TicketMenuState = { row: Row; x: number; y: number } | null;
type VendorAssignmentState = { ticketId: string; ticketNumber: string } | null;

function MaintenancePage({ rows, setRows, openDialog, notify }: { rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>; openDialog: (d: DialogState) => void; notify: (s: string) => void }) {
  const { locale, t, v } = useI18n();
  const [vendors, setVendors] = useStoredRows("vendors", vendorDirectory);
  const [tab, setTab] = useState<"board" | "vendors">("board");
  const [search, setSearch] = useState("");
  const [dragged, setDragged] = useState<string | null>(null);
  const [dropStage, setDropStage] = useState<string | null>(null);
  const [menu, setMenu] = useState<TicketMenuState>(null);
  const [vendorAssignment, setVendorAssignment] = useState<VendorAssignmentState>(null);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [vendorDetail, setVendorDetail] = useState<Row | null>(null);
  const [vendorDialog, setVendorDialog] = useState(false);
  const [vendorForm, setVendorForm] = useState({ nama: "", kontak: "", telepon: "", kota: "" });
  const [vendorLabels, setVendorLabels] = useState<string[]>([]);
  const [vendorLabelInput, setVendorLabelInput] = useState("");
  const holdTimer = useRef<number | null>(null);
  const heldRef = useRef(false);
  const dropStageRef = useRef<string | null>(null);
  const filtered = rows.filter(row => Object.values(row).some(value => v(value).toLowerCase().includes(search.toLowerCase())));
  const updateTicket = (id: string, patch: Record<string, string | number>) => setRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  const move = (id: string, status: string) => {
    const ticket = rows.find(row => row.id === id);
    if (ticket?.status === "Baru" && status === "Ditugaskan") {
      setVendorAssignment({ ticketId: id, ticketNumber: String(ticket.tiket) });
      setSelectedVendor(ticket.vendor === "Belum ditugaskan" ? "" : String(ticket.vendor || ""));
      setDragged(null);
      setDropStage(null);
      dropStageRef.current = null;
      setMenu(null);
      return;
    }
    updateTicket(id, { status });
    notify(locale === "en" ? `Ticket moved to ${t(status)}.` : `Tiket dipindahkan ke ${status}.`);
    setDragged(null);
    setDropStage(null);
    dropStageRef.current = null;
    setMenu(null);
  };
  const assignVendor = () => {
    if (!vendorAssignment || !selectedVendor) return;
    updateTicket(vendorAssignment.ticketId, { status: "Ditugaskan", vendor: selectedVendor });
    notify(locale === "en" ? `${vendorAssignment.ticketNumber} assigned to ${selectedVendor}.` : `${vendorAssignment.ticketNumber} ditugaskan ke ${selectedVendor}.`);
    setVendorAssignment(null);
    setSelectedVendor("");
  };
  const openVendorForm = () => {
    setVendorForm({ nama: "", kontak: "", telepon: "", kota: "" });
    setVendorLabels([]);
    setVendorLabelInput("");
    setVendorDialog(true);
  };
  const addVendorLabel = (raw = vendorLabelInput) => {
    const label = raw.trim();
    if (!label || vendorLabels.some(item => item.toLowerCase() === label.toLowerCase())) return setVendorLabelInput("");
    setVendorLabels(current => [...current, label]);
    setVendorLabelInput("");
  };
  const saveVendor = (event: React.FormEvent) => {
    event.preventDefault();
    const vendor: Row = { id: `vendor-${Date.now()}`, ...vendorForm, labels: vendorLabels.join("|"), status: "Aktif" };
    setVendors(current => [vendor, ...current]);
    setVendorDialog(false);
    notify(locale === "en" ? `${vendorForm.nama} added to the vendor directory.` : `${vendorForm.nama} ditambahkan ke daftar vendor.`);
  };
  const cancelHold = () => { if (holdTimer.current) window.clearTimeout(holdTimer.current); holdTimer.current = null; };
  const beginHold = (event: React.PointerEvent, row: Row) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, select, input")) return;
    const card = event.currentTarget as HTMLElement;
    const pointerId = event.pointerId;
    heldRef.current = false;
    cancelHold();
    holdTimer.current = window.setTimeout(() => {
      heldRef.current = true;
      setDragged(row.id);
      if (card.isConnected) card.setPointerCapture(pointerId);
    }, 350);
  };
  const trackHold = (event: React.PointerEvent) => {
    if (!heldRef.current) return;
    const column = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-ticket-stage]");
    const nextStage = column?.dataset.ticketStage || null;
    dropStageRef.current = nextStage;
    setDropStage(nextStage);
  };
  const endHold = (event: React.PointerEvent, row: Row) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, select, input")) return;
    cancelHold();
    if (heldRef.current) {
      if (dropStageRef.current && dropStageRef.current !== row.status) move(row.id, dropStageRef.current);
      else { setDragged(null); setDropStage(null); dropStageRef.current = null; }
      window.setTimeout(() => { heldRef.current = false; }, 0);
      return;
    }
    openDialog({ mode: "edit", page: "tickets", row });
  };
  const toggleLabel = (row: Row, label: string) => {
    const labels = String(row.labels || "").split("|").filter(Boolean);
    updateTicket(row.id, { labels: labels.includes(label) ? labels.filter(item => item !== label).join("|") : [...labels, label].join("|") });
    setMenu(current => current ? { ...current, row: { ...current.row, labels: labels.includes(label) ? labels.filter(item => item !== label).join("|") : [...labels, label].join("|") } } : null);
  };
  const removeTicket = (row: Row) => {
    if (!window.confirm(locale === "en" ? `Delete ${row.tiket}?` : `Hapus ${row.tiket}?`)) return;
    setRows(current => current.filter(item => item.id !== row.id));
    setMenu(null);
    notify(locale === "en" ? "Ticket deleted." : "Tiket dihapus.");
  };
  return <><PageHead page="tickets" action={tab === "board" ? () => openDialog({ mode: "create", page: "tickets" }) : undefined} />
    <div className="maintenance-tabs" role="tablist" aria-label={locale === "en" ? "Maintenance views" : "Tampilan pemeliharaan"}><button role="tab" aria-selected={tab === "board"} className={tab === "board" ? "active" : ""} onClick={() => { setTab("board"); setVendorDetail(null); }}><TicketCheck />{locale === "en" ? "Ticket board" : "Papan tiket"}<span>{rows.length}</span></button><button role="tab" aria-selected={tab === "vendors"} className={tab === "vendors" ? "active" : ""} onClick={() => setTab("vendors")}><Wrench />Vendor<span>{vendors.length}</span></button></div>
    {tab === "board" && <><div className="kanban-toolbar"><div className="field-inline"><Search /><input type="search" enterKeyHint="search" aria-label={t("Cari data")} value={search} onChange={event => setSearch(event.target.value)} placeholder={locale === "en" ? "Search title, tenant, unit, or vendor..." : "Cari judul, penyewa, unit, atau vendor..."} /></div><span>{filtered.length} {t("tiket")}</span></div>
    <div className="kanban" aria-label={locale === "en" ? "Maintenance ticket board" : "Papan tiket pemeliharaan"}>
      {ticketStages.map(stage => {
        const stageRows = filtered.filter(row => row.status === stage);
        return <section className={`kanban-column ${dragged ? "drag-active" : ""} ${dropStage === stage ? "drop-target" : ""}`} data-ticket-stage={stage} key={stage}>
          <header className="kanban-column-head"><span className={`stage-indicator ${slug(stage)}`} /><h2>{t(stage)}</h2><span className="kanban-count">{stageRows.length}</span></header>
          <div className="kanban-stack">
            {stageRows.map(row => {
              const proofs = String(row.bukti || "").split("|").filter(Boolean);
              const labels = String(row.labels || "").split("|").filter(Boolean);
              return <article className={`ticket-card ${dragged === row.id ? "dragging" : ""}`} key={row.id} role="button" tabIndex={0} aria-label={`${row.tiket}: ${v(row.judul || row.masalah)}`} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDialog({ mode: "edit", page: "tickets", row }); } }} onPointerDown={event => beginHold(event, row)} onPointerMove={trackHold} onPointerUp={event => endHold(event, row)} onPointerCancel={() => { cancelHold(); setDragged(null); setDropStage(null); dropStageRef.current = null; }} onContextMenu={event => { event.preventDefault(); cancelHold(); setMenu({ row, x: Math.max(8, Math.min(event.clientX, window.innerWidth - 276)), y: Math.max(12, Math.min(event.clientY, window.innerHeight - 460)) }); }}>
                <div className="ticket-card-top"><span className="ticket-id"><GripVertical />{row.tiket}</span><button className="icon-button" aria-label={`${locale === "en" ? "Actions for" : "Aksi untuk"} ${row.tiket}`} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); setMenu({ row, x: Math.max(8, Math.min(rect.right, window.innerWidth - 276)), y: Math.max(12, Math.min(rect.bottom + 4, window.innerHeight - 460)) }); }}><MoreHorizontal /></button></div>
                <div className="ticket-title">{v(row.judul || row.masalah)}</div>
                <div className="ticket-location"><MapPin /> <span>{v(row.properti || "Kos Melati Residence")} · {v(row.unit)}</span></div>
                <p className="ticket-issue">{String(v(row.masalah)).replace(/[*#_`>-]/g, "").replace(/\n+/g, " ")}</p>
                {proofs.length > 0 && <div className="proof-strip">{proofs.slice(0, 3).map((src, index) => <img key={index} src={src} alt={`${locale === "en" ? "Issue proof" : "Bukti masalah"} ${index + 1}`} />)}{proofs.length > 3 && <span>+{proofs.length - 3}</span>}</div>}
                <div className="ticket-person"><span className="avatar small">{String(row.penyewa || "NA").split(" ").map(part => part[0]).slice(0, 2).join("")}</span><span><strong>{v(row.penyewa || "Belum ada")}</strong><small>{v(row.telepon || "-")}</small></span></div>
                {labels.length > 0 && <div className="ticket-labels">{labels.map(label => <span key={label}>{v(label)}</span>)}</div>}
                <div className="ticket-footer"><span className={`vendor-chip ${row.vendor === "Belum ditugaskan" ? "unassigned" : ""}`}><Wrench />{v(row.vendor)}</span>{row.dueDate && <span className="ticket-due"><CalendarClock />{v(row.dueDate)}</span>}</div>
              </article>;
            })}
            {!stageRows.length && <div className="kanban-empty">{locale === "en" ? "Drop a ticket here" : "Taruh tiket di sini"}</div>}
          </div>
        </section>;
      })}
    </div></>}
    {tab === "vendors" && !vendorDetail && <section className="panel vendor-directory"><div className="panel-head"><div><h2>{locale === "en" ? "Vendor directory" : "Daftar vendor"}</h2><p>{locale === "en" ? "Maintenance partners available for ticket assignment" : "Mitra pemeliharaan yang dapat ditugaskan ke tiket"}</p></div><div className="actions"><span className="vendor-total">{vendors.length} vendor</span><button className="button primary" onClick={openVendorForm}><Plus />{locale === "en" ? "Add vendor" : "Tambah vendor"}</button></div></div><div className="table-wrap"><table><thead><tr><th>{locale === "en" ? "Vendor" : "Nama vendor"}</th><th>{locale === "en" ? "Contact person" : "Kontak"}</th><th>Label</th><th>{locale === "en" ? "City" : "Kota"}</th><th>{t("Nomor WhatsApp")}</th><th>{locale === "en" ? "Open tickets" : "Tiket aktif"}</th><th>{t("Status")}</th></tr></thead><tbody>{vendors.map(vendor => { const activeTickets = rows.filter(row => row.vendor === vendor.nama && row.status !== "Selesai").length; const labels = String(vendor.labels || "").split("|").filter(Boolean); return <tr className="vendor-row" key={vendor.id} tabIndex={0} onClick={() => setVendorDetail(vendor)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setVendorDetail(vendor); } }}><td><span className="vendor-name"><span className="vendor-avatar"><Wrench /></span><strong>{vendor.nama}</strong></span></td><td>{v(vendor.kontak)}</td><td><div className="vendor-labels">{labels.map(label => <span key={label}>{v(label)}</span>)}</div></td><td>{v(vendor.kota)}</td><td><a className="link" href={`https://wa.me/62${String(vendor.telepon).replace(/\D/g, "").replace(/^0/, "")}`} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()}>{vendor.telepon}</a></td><td>{activeTickets}</td><td><Status>{vendor.status}</Status></td></tr>; })}</tbody></table></div></section>}
    {tab === "vendors" && vendorDetail && <VendorDetail vendor={vendorDetail} tickets={rows.filter(row => row.vendor === vendorDetail.nama)} onBack={() => setVendorDetail(null)} />}
    {menu && <><button className="context-dismiss" aria-label={locale === "en" ? "Close ticket actions" : "Tutup aksi tiket"} onClick={() => setMenu(null)} onContextMenu={event => { event.preventDefault(); setMenu(null); }} /><div className="ticket-context" role="menu" aria-label={`${locale === "en" ? "Actions for" : "Aksi untuk"} ${menu.row.tiket}`} style={{ left: menu.x, top: menu.y }} onPointerDown={event => event.stopPropagation()}>
      <div className="context-heading"><strong>{menu.row.tiket}</strong><span>{v(menu.row.judul)}</span></div>
      <label className="context-field"><span><CheckCircle2 />{locale === "en" ? "Move status" : "Pindah status"}</span><select value={String(menu.row.status)} onChange={event => move(menu.row.id, event.target.value)}>{ticketStages.map(stage => <option key={stage} value={stage}>{t(stage)}</option>)}</select></label>
      <label className="context-field"><span><UserCheck />{locale === "en" ? "Assignee" : "Penanggung jawab"}</span><select value={String(menu.row.assignee || "Belum ditugaskan")} onChange={event => { updateTicket(menu.row.id, { assignee: event.target.value }); setMenu(current => current ? { ...current, row: { ...current.row, assignee: event.target.value } } : null); }}>{ticketAssignees.map(name => <option key={name} value={name}>{v(name)}</option>)}</select></label>
      <div className="context-field"><span><Tag />Label</span><div className="context-labels">{ticketLabels.map(label => <button type="button" className={String(menu.row.labels || "").split("|").includes(label) ? "selected" : ""} key={label} onClick={() => toggleLabel(menu.row, label)}>{v(label)}</button>)}</div></div>
      <label className="context-field"><span><CalendarClock />{locale === "en" ? "Due date" : "Tenggat"}</span><input type="date" value={String(menu.row.dueDate || "")} onChange={event => { updateTicket(menu.row.id, { dueDate: event.target.value }); setMenu(current => current ? { ...current, row: { ...current.row, dueDate: event.target.value } } : null); }} /></label>
      <button className="context-delete" role="menuitem" onClick={() => removeTicket(menu.row)}><Trash2 />{t("Hapus")}</button>
    </div></>}
    {vendorAssignment && <div className="backdrop vendor-assignment-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setVendorAssignment(null)}><div className="dialog vendor-assignment-dialog" role="dialog" aria-modal="true" aria-labelledby="vendor-assignment-title"><div className="dialog-head"><div><span className="eyebrow">{vendorAssignment.ticketNumber}</span><h2 id="vendor-assignment-title">{locale === "en" ? "Assign a vendor" : "Pilih vendor"}</h2><p>{locale === "en" ? "A vendor is required before moving this ticket to Assigned." : "Vendor wajib dipilih sebelum tiket dipindahkan ke Ditugaskan."}</p></div><button className="icon-button" aria-label={t("Tutup")} onClick={() => setVendorAssignment(null)}><X /></button></div><div className="dialog-body"><div className="vendor-options" role="radiogroup" aria-label={locale === "en" ? "Available vendors" : "Vendor tersedia"}>{vendors.map(vendor => <label className={selectedVendor === vendor.nama ? "selected" : ""} key={vendor.id}><input type="radio" name="vendor" value={String(vendor.nama)} checked={selectedVendor === vendor.nama} onChange={() => setSelectedVendor(String(vendor.nama))} /><span className="vendor-avatar"><Wrench /></span><span><strong>{vendor.nama}</strong><small>{String(vendor.labels || "").split("|").join(", ")} · {v(vendor.kota)}</small></span><Check /></label>)}</div></div><div className="dialog-actions"><button className="button" onClick={() => setVendorAssignment(null)}>{t("Batal")}</button><button className="button primary" disabled={!selectedVendor} onClick={assignVendor}>{locale === "en" ? "Assign and move" : "Tugaskan dan pindahkan"}</button></div></div></div>}
    {vendorDialog && <div className="backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setVendorDialog(false)}><form className="dialog vendor-form-dialog" role="dialog" aria-modal="true" aria-labelledby="vendor-form-title" onSubmit={saveVendor}><div className="dialog-head"><div><h2 id="vendor-form-title">{locale === "en" ? "Add vendor" : "Tambah vendor"}</h2><p>{locale === "en" ? "Add the vendor's business and primary contact details." : "Tambahkan informasi usaha dan kontak utama vendor."}</p></div><button type="button" className="icon-button" aria-label={t("Tutup")} onClick={() => setVendorDialog(false)}><X /></button></div><div className="dialog-body"><div className="form-grid"><div className="form-field full"><label htmlFor="vendor-name">{locale === "en" ? "Vendor name" : "Nama vendor"}</label><input id="vendor-name" autoComplete="organization" value={vendorForm.nama} onChange={event => setVendorForm(current => ({ ...current, nama: event.target.value }))} required /></div><div className="form-field"><label htmlFor="vendor-contact">{locale === "en" ? "Contact person" : "Nama kontak"}</label><input id="vendor-contact" autoComplete="name" value={vendorForm.kontak} onChange={event => setVendorForm(current => ({ ...current, kontak: event.target.value }))} required /></div><div className="form-field"><label htmlFor="vendor-phone">{locale === "en" ? "Contact number" : "Nomor kontak"}</label><input id="vendor-phone" type="tel" inputMode="tel" autoComplete="tel" pattern="[0-9+()\s-]{8,20}" value={vendorForm.telepon} onChange={event => setVendorForm(current => ({ ...current, telepon: event.target.value }))} required /></div><div className="form-field full"><label htmlFor="vendor-label">Label</label><div className="tag-input">{vendorLabels.map(label => <span className="property-tag" key={label}>{label}<button type="button" aria-label={`${t("Hapus")} ${label}`} onClick={() => setVendorLabels(current => current.filter(item => item !== label))}><X /></button></span>)}<input id="vendor-label" value={vendorLabelInput} onChange={event => setVendorLabelInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addVendorLabel(); } }} onBlur={() => addVendorLabel()} placeholder={locale === "en" ? "Type a label, then press Enter" : "Ketik label, lalu tekan Enter"} /></div><div className="tag-suggestions">{["AC", "HVAC", "Listrik", "Plumbing", "Furnitur"].filter(label => !vendorLabels.includes(label)).map(label => <button type="button" key={label} onClick={() => addVendorLabel(label)}>+ {label}</button>)}</div></div><div className="form-field full"><label htmlFor="vendor-city">{locale === "en" ? "City" : "Kota"}</label><input id="vendor-city" autoComplete="address-level2" value={vendorForm.kota} onChange={event => setVendorForm(current => ({ ...current, kota: event.target.value }))} required /></div></div></div><div className="dialog-actions"><button type="button" className="button" onClick={() => setVendorDialog(false)}>{t("Batal")}</button><button type="submit" className="button primary" disabled={!vendorLabels.length}>{locale === "en" ? "Add vendor" : "Tambah vendor"}</button></div></form></div>}
  </>;
}

function VendorDetail({ vendor, tickets, onBack }: { vendor: Row; tickets: Row[]; onBack: () => void }) {
  const { locale, v } = useI18n();
  const labels = String(vendor.labels || "").split("|").filter(Boolean);
  const activeTickets = tickets.filter(ticket => ticket.status !== "Selesai");
  return <><button className="button vendor-detail-back" onClick={onBack}><ChevronLeft />{locale === "en" ? "Back to vendors" : "Kembali ke vendor"}</button><div className="vendor-detail-layout"><main className="panel vendor-detail-main"><div className="vendor-detail-head"><span className="vendor-avatar large"><Wrench /></span><div><span className="eyebrow">Vendor</span><h2>{vendor.nama}</h2><div className="vendor-labels">{labels.map(label => <span key={label}>{v(label)}</span>)}</div></div><Status>{vendor.status}</Status></div><div className="vendor-detail-section"><h3>{locale === "en" ? "Assigned tickets" : "Tiket yang ditugaskan"}</h3>{tickets.length ? <div className="vendor-ticket-list">{tickets.map(ticket => <div key={ticket.id}><span><strong>{ticket.tiket}</strong><small>{v(ticket.judul)} · {v(ticket.properti)} {v(ticket.unit)}</small></span><Status>{ticket.status}</Status></div>)}</div> : <div className="inline-empty">{locale === "en" ? "No tickets have been assigned to this vendor." : "Belum ada tiket yang ditugaskan ke vendor ini."}</div>}</div></main><aside className="panel vendor-contact-card"><div className="panel-head"><div><h2>{locale === "en" ? "Vendor information" : "Informasi vendor"}</h2><p>{activeTickets.length} {locale === "en" ? "open tickets" : "tiket aktif"}</p></div></div><div className="contact-list"><div><UserRound /><span><small>{locale === "en" ? "Contact person" : "Nama kontak"}</small><strong>{v(vendor.kontak)}</strong></span></div><div><Phone /><span><small>{locale === "en" ? "Contact number" : "Nomor kontak"}</small><a href={`https://wa.me/62${String(vendor.telepon).replace(/\D/g, "").replace(/^0/, "")}`} target="_blank" rel="noreferrer">{v(vendor.telepon)}</a></span></div><div><MapPin /><span><small>{locale === "en" ? "City" : "Kota"}</small><strong>{v(vendor.kota)}</strong></span></div></div></aside></div></>;
}

function Dashboard({ go, reservations }: { go: (p: PageId) => void; reservations: Row[] }) {
  const { t, v } = useI18n();
  const upcoming: [string, string][] = [];
  reservations.filter(r => r.status === "Kontrak Ditandatangani" && r.jadwalMasuk).forEach(r => upcoming.push([`Move-in ${v(r.unit)}`, v(r.jadwalMasuk)]));
  reservations.filter(r => isExpiringSoon(r)).forEach(r => upcoming.push([`${t("Kontrak berakhir")} · ${v(r.unit)}`, v(reservationEndDate(r.periode) ? fmtShort(reservationEndDate(r.periode)!) : r.periode)]));
  const activity = [
    ["Pembayaran diterima", t("Dewi Lestari membayar Rp1.200.000"), "10.23"],
    ["Kontrak perlu ditandatangani", "M. Iqbal Maulana, Unit 104", "09.15"],
    ["Tiket baru", "Keran bocor di Unit 103", "Kemarin"],
  ];
  return <>
    <PageHead page="dashboard" />
    <div className="stats-strip">
      <div className="stat"><span>{t("Tingkat hunian")}</span><strong>75%</strong><small>{t("+4% bulan ini")}</small></div>
      <div className="stat"><span>{t("Tagihan diterima")}</span><strong>{v("Rp42,8 jt")}</strong><small>{t("89% tertagih")}</small></div>
      <div className="stat"><span>{t("Perlu ditagih")}</span><strong>{v("Rp8,4 jt")}</strong><small style={{ color: "var(--danger)" }}>{t("6 tagihan")}</small></div>
      <div className="stat"><span>{t("Tiket terbuka")}</span><strong>4</strong><small>{t("2 ditugaskan")}</small></div>
    </div>
    <div className="split dashboard-split">
      <div>
        <section className="panel"><div className="panel-head"><div><h2>{t("Portofolio properti")}</h2><p>{t("Hunian dan pendapatan bulan berjalan")}</p></div><button className="button" onClick={() => go("properties")}>{t("Lihat properti")}</button></div>
          <DataTable rows={seedProperties.slice(0, 4)} onEdit={() => go("properties")} onDelete={() => go("properties")} onSelect={() => go("properties")} />
        </section>
        <section className="panel"><div className="panel-head"><div><h2>{t("Tagihan perlu tindakan")}</h2><p>{t("Urut berdasarkan keterlambatan")}</p></div><button className="button primary" onClick={() => go("invoices")}>{t("Buka tagihan")}</button></div>
          <DataTable rows={seedInvoices.filter(r => r.status !== "Lunas").slice(0, 4)} onEdit={() => go("invoices")} onDelete={() => go("invoices")} />
        </section>
      </div>
      <aside className="detail-pane"><div className="panel-head"><div><h2>{t("Aktivitas terbaru")}</h2><p>{t("Hari ini")}</p></div></div><div className="detail-section">
        {activity.map(([title, desc, time]) => <div className="activity" key={title}><span className="activity-icon"><Check /></span><span><strong>{t(title)}</strong><span className="cell-sub">{t(desc)}</span></span><time>{t(time)}</time></div>)}
      </div><div className="detail-section"><div className="detail-title">{t("Jadwal mendatang")}<button className="text-button" style={{ marginLeft: "auto" }} onClick={() => go("reservations")}>{t("Reservasi")}</button></div>{upcoming.length ? <div className="detail-grid">{upcoming.map(([label, when], i) => <Fragment key={i}><span>{label}</span><span>{when}</span></Fragment>)}</div> : <div className="inline-empty">{t("Tidak ada jadwal mendatang.")}</div>}</div></aside>
    </div>
  </>;
}

function PropertyCard({ row, onOpen, onEdit, onDelete }: { row: Row; onOpen: () => void; onEdit: () => void; onDelete: () => void }) {
  const { locale, t, v } = useI18n();
  const total = Math.max(1, Number(row.unit || 1));
  const occupied = Math.max(0, Math.min(total, Number(row.terisi || 0)));
  const vacant = total - occupied;
  const isMulti = String(row.unitType || (total > 1 ? "Multi unit" : "Single unit")) === "Multi unit";
  const vacancyPercentage = Math.round((vacant / total) * 100);
  const labels = String(row.labels || row.tipe || "").split(/[|,]/).map(label => label.trim()).filter(Boolean);
  const vacancyLabel = isMulti ? (vacant > 0 ? (locale === "en" ? `${vacant} vacant ${vacant === 1 ? "unit" : "units"}` : `${vacant} unit kosong`) : t("Terisi penuh")) : (vacant > 0 ? t("Kosong") : t("Dihuni"));
  const vacancySummary = locale === "en" ? `${vacant} of ${total} ${total === 1 ? "unit" : "units"} vacant` : `${vacant} dari ${total} unit kosong`;
  return <article className="property-card">
    <button type="button" className="property-card-open" onClick={onOpen} aria-label={`${t("Buka detail")} ${v(row.nama)}`}>
      <div className={`property-card-image ${row.image ? "has-image" : ""}`}>{row.image ? <img src={String(row.image)} alt={v(row.nama)} /> : <div className="property-image-placeholder"><Building2 /><span>{t("Gambar belum tersedia")}</span></div>}<span className={`vacancy-badge ${vacant === 0 ? "occupied" : ""}`}>{vacancyLabel}</span>{labels.length > 0 && <div className="property-card-labels">{labels.map(label => <span key={label}>{v(label)}</span>)}</div>}</div>
      <div className="property-card-body"><h2>{v(row.nama)}</h2><p>{v(row.alamat || row.lokasi)}</p>{isMulti && <div className="vacancy-block"><div><span>{vacancySummary}</span><strong>{vacancyPercentage}%</strong></div><div className="vacancy-progress" role="progressbar" aria-label={t("Persentase unit kosong")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={vacancyPercentage}><span style={{ width: `${vacancyPercentage}%` }} /></div></div>}</div>
    </button>
    <div className="property-card-footer"><div><strong>{v(row.pendapatan || "Rp0")}</strong><span>/ {t("bulan")}</span></div><div className="actions"><button type="button" className="icon-button" onClick={onEdit} aria-label={`${t("Edit")} ${v(row.nama)}`}><Pencil /></button><button type="button" className="icon-button" onClick={onDelete} aria-label={`${t("Hapus")} ${v(row.nama)}`}><Trash2 /></button></div></div>
  </article>;
}

function PropertiesPage({ rows, setRows, units, setUnits, onBook, openDialog, notify }: { rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>; units: Row[]; setUnits: React.Dispatch<React.SetStateAction<Row[]>>; onBook: (ctx: BookingState) => void; openDialog: (d: DialogState) => void; notify: (s: string) => void }) {
  const { locale, t, v } = useI18n();
  const [selected, setSelected] = useState<Row | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Semua");
  const labels = Array.from(new Set(rows.flatMap(row => String(row.labels || row.tipe || "").split(/[|,]/).map(label => label.trim()).filter(Boolean))));
  const filters = ["Semua", "Single unit", "Multi unit", ...labels];
  const filtered = rows.filter(row => {
    const searchable = [row.nama, row.alamat, row.lokasi, row.labels, row.tipe, row.kontak, row.contactName];
    const matchesSearch = searchable.some(value => v(value).toLowerCase().includes(search.toLowerCase()));
    const total = Number(row.unit || 1);
    const unitType = String(row.unitType || (total > 1 ? "Multi unit" : "Single unit"));
    const rowLabels = String(row.labels || row.tipe || "").split(/[|,]/).map(label => label.trim());
    return matchesSearch && (filter === "Semua" || filter === unitType || rowLabels.includes(filter));
  });
  if (selected) return <PropertyDetail property={selected} units={units} setUnits={setUnits} onBook={onBook} onBack={() => setSelected(null)} notify={notify} />;
  return <><PageHead page="properties" action={() => openDialog({ mode: "create", page: "properties" })} />
    <div className="property-list-toolbar"><div className="field-inline"><Search /><input type="search" enterKeyHint="search" aria-label={t("Cari properti")} value={search} onChange={event => setSearch(event.target.value)} placeholder={t("Cari properti...")} /></div><div className="property-filter-list" aria-label={t("Filter properti")}>{filters.map(item => <button type="button" className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{v(item)}</button>)}</div></div>
    {filtered.length ? <section className="property-grid">{filtered.map(row => <PropertyCard key={row.id} row={row} onOpen={() => setSelected(row)} onEdit={() => openDialog({ mode: "edit", page: "properties", row })} onDelete={() => { setRows(old => old.filter(item => item.id !== row.id)); notify(locale === "en" ? "Property removed from the list." : "Properti dihapus dari daftar."); }} />)}</section> : <div className="property-empty"><Building2 /><strong>{t("Properti tidak ditemukan")}</strong><span>{t("Ubah pencarian atau filter untuk melihat properti lain.")}</span></div>}
  </>;
}

function PropertyDetail({ property, units, setUnits, onBook, onBack, notify }: { property: Row; units: Row[]; setUnits: React.Dispatch<React.SetStateAction<Row[]>>; onBook: (ctx: BookingState) => void; onBack: () => void; notify: (s: string) => void }) {
  const { locale, t, v } = useI18n();
  const propertyUnits = unitsForProperty(units, property);
  const [selectedId, setSelectedId] = useState<string>(() => (propertyUnits.find(isVacant) || propertyUnits[0])?.id ?? "");
  const selected = propertyUnits.find(row => row.id === selectedId) || propertyUnits[0];
  const total = propertyUnits.length || Number(property.unit || 0);
  const occupied = propertyUnits.filter(row => /dihuni/i.test(String(row.status))).length;
  const vacant = propertyUnits.filter(isVacant).length;
  const occupancy = total ? Math.round((occupied / total) * 100) : 0;
  return <>
    <div className="page-head"><div><button className="button" onClick={onBack} style={{ marginBottom: 10 }}><ChevronLeft />{t("Semua properti")}</button><div className="property-title"><h1>{v(property.nama)}</h1><Status>{property.status}</Status></div><p className="subtext">{v(property.lokasi)} · {property.unit} unit · {locale === "en" ? `${t("Kos")} operations` : "Kos operasional"}</p></div><div className="actions"><button className="button" onClick={() => notify(locale === "en" ? "Property link copied." : "Tautan properti disalin.")}>{t("Bagikan")}</button><button className="button primary" onClick={() => onBook({ propertyId: property.id, unitId: selected && isVacant(selected) ? selected.id : undefined })}><Plus />{t("Buat pemesanan")}</button></div></div>
    <div className="stats-strip"><div className="stat"><span>{t("Total unit")}</span><strong>{total}</strong></div><div className="stat"><span>{t("Terisi")}</span><strong>{occupied}</strong><small>{occupancy}%</small></div><div className="stat"><span>{t("Kosong")}</span><strong>{vacant}</strong></div><div className="stat"><span>{t("Pendapatan bulan ini")}</span><strong>{v(property.pendapatan)}</strong></div></div>
    <div className="split"><section className="panel"><div className="tabs"><button className="tab active">{t("Unit")}</button><button className="tab">{t("Detail properti")}</button><button className="tab">{t("Fasilitas")}</button><button className="tab">{t("Harga & biaya")}</button><button className="tab">{t("Riwayat")}</button></div><Toolbar search="" setSearch={() => {}} />{propertyUnits.length ? <DataTable rows={propertyUnits} selected={selected?.id} onSelect={row => setSelectedId(row.id)} onEdit={row => { setSelectedId(row.id); isVacant(row) ? onBook({ propertyId: property.id, unitId: row.id }) : notify(locale === "en" ? "This unit is occupied. Use the lease to manage its tenant." : "Unit ini terisi. Kelola penyewanya melalui sewa."); }} onDelete={row => { setUnits(old => old.filter(r => r.id !== row.id)); notify(message(locale, "unitRemoved", { unit: row.unit })); }} /> : <div className="empty"><Building2 /><div><strong>{t("Belum ada unit")}</strong>{t("Tambahkan unit pada properti ini untuk mulai membuat pemesanan.")}</div></div>}</section>
      <aside className="detail-pane"><div className="panel-head"><div><h2>{t("Detail unit")} {selected?.unit}</h2><p>{v(selected?.tipe)} · {t("Lantai")} {selected?.lantai}</p></div><MoreHorizontal /></div><div className="detail-section"><div className="detail-title">{t("Status hunian")} <Status>{selected?.status}</Status></div><div className="detail-grid"><span>{t("Penyewa")}</span><span>{v(selected?.penyewa)}</span><span>{t("Sewa per bulan")}</span><span>{v(selected?.sewa)}</span><span>Deposit</span><span>{v(selected?.deposit || formatRp(unitDeposit(selected, property)))}</span><span>{t("Tunggakan")}</span><span className={selected?.tunggakan !== "Rp0" ? "money-danger" : ""}>{v(selected?.tunggakan)}</span></div>{selected && isVacant(selected) && <button className="button primary" style={{ width: "100%", marginTop: 14 }} onClick={() => onBook({ propertyId: property.id, unitId: selected.id })}><CalendarPlus />{t("Pesan unit ini")}</button>}</div><div className="detail-section"><div className="detail-title">{t("Aktivitas unit")}</div><div className="activity"><span className="activity-icon"><Check /></span><span><strong>{t("Inspeksi rutin selesai")}</strong><span className="cell-sub">{t("Tidak ada kerusakan")}</span></span><time>12 Jun</time></div><div className="activity"><span className="activity-icon"><CreditCard /></span><span><strong>{t("Tagihan Juni dibuat")}</strong><span className="cell-sub">{t("Jatuh tempo 5 Juni")}</span></span><time>1 Jun</time></div></div></aside>
    </div>
  </>;
}

// Property defaults only support legacy/synthetic units. Once a unit row exists,
// its own rent and deposit are the source of truth for reservations.
const unitRent = (unit?: Row, property?: Row) => rupiah(unit?.sewa) || rupiah(property?.defaultPrice);
const unitDeposit = (unit?: Row, property?: Row) => rupiah(unit?.deposit) || rupiah(property?.defaultDeposit) || unitRent(unit, property);

type BookingDialogProps = {
  ctx: BookingState;
  properties: Row[];
  units: Row[]; setUnits: React.Dispatch<React.SetStateAction<Row[]>>;
  tenants: Row[]; setTenants: React.Dispatch<React.SetStateAction<Row[]>>;
  setReservations: React.Dispatch<React.SetStateAction<Row[]>>;
  onClose: () => void; onCreated: (id: string) => void; notify: (s: string) => void;
};

function TenantCombobox({ options, value, onSelect, onAddNew }: { options: Row[]; value: string; onSelect: (id: string) => void; onAddNew: () => void }) {
  const { t, v } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.id === value);
  const filtered = options.filter(o => `${o.nama} ${o.telepon}`.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return <div className="combobox" ref={ref}>
    <input className="combobox-input" type="text" role="combobox" aria-expanded={open} aria-controls="tenant-combobox-menu" placeholder={t("Cari nama atau nomor penyewa...")} value={open ? query : (selected ? `${v(selected.nama)} · ${v(selected.telepon)}` : "")} onFocus={() => { setOpen(true); setQuery(""); }} onChange={e => { setQuery(e.target.value); setOpen(true); }} />
    {open && <div className="combobox-menu" id="tenant-combobox-menu" role="listbox">
      {filtered.length ? filtered.map(o => <button type="button" key={o.id} role="option" aria-selected={o.id === value} className={`combobox-option ${o.id === value ? "active" : ""}`} onClick={() => { onSelect(o.id); setOpen(false); }}><strong>{v(o.nama)}</strong><small>{v(o.telepon)}</small></button>) : <div className="combobox-empty">{t("Tidak ada penyewa cocok.")}</div>}
      <button type="button" className="combobox-add" onMouseDown={e => e.preventDefault()} onClick={() => { setOpen(false); onAddNew(); }}><Plus size={15} />{t("Tambah penyewa baru")}</button>
    </div>}
  </div>;
}

function BookingDialog({ ctx, properties, units, setUnits, tenants, setTenants, setReservations, onClose, onCreated, notify }: BookingDialogProps) {
  const { locale, t, v } = useI18n();
  const prospects = tenants.filter(tn => !tn.unit);
  const availableCount = (p?: Row) => unitsForProperty(units, p).filter(isVacant).length;
  const initialPropertyId = ctx.propertyId || properties.find(p => availableCount(p) > 0)?.id || properties[0]?.id || "";
  const initialVacant = unitsForProperty(units, properties.find(p => p.id === initialPropertyId)).filter(isVacant);
  const initialUnit = (ctx.unitId && initialVacant.find(u => u.id === ctx.unitId)) || initialVacant[0];
  const initialProperty = properties.find(p => p.id === initialPropertyId);

  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [unitId, setUnitId] = useState<string>(initialUnit?.id ?? "");
  const [tenantId, setTenantId] = useState<string>("");
  const [duration, setDuration] = useState("12 bulan");
  const [rent, setRent] = useState(String(unitRent(initialUnit, initialProperty)));
  const [deposit, setDeposit] = useState(String(unitDeposit(initialUnit, initialProperty)));
  const [overridePrice, setOverridePrice] = useState(false);
  const [notes, setNotes] = useState("");
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [error, setError] = useState("");

  const property = properties.find(p => p.id === propertyId);
  const propertyUnits = unitsForProperty(units, property);
  const vacantUnits = propertyUnits.filter(isVacant);
  const unit = propertyUnits.find(u => u.id === unitId && isVacant(u)) || vacantUnits[0];
  const unitLabel = unitLabelFor(property, unit);
  const selectedTenant = tenants.find(p => p.id === tenantId);
  const tenantOptions = selectedTenant && !prospects.some(p => p.id === tenantId) ? [selectedTenant, ...prospects] : prospects;
  const tenantName = String(selectedTenant?.nama || "").trim();

  const applyDefaults = (u?: Row, p?: Row) => { setRent(String(unitRent(u, p))); setDeposit(String(unitDeposit(u, p))); setOverridePrice(false); };
  const changeProperty = (pid: string) => { const p = properties.find(x => x.id === pid); const vac = unitsForProperty(units, p).filter(isVacant); setPropertyId(pid); setUnitId(vac[0]?.id ?? ""); applyDefaults(vac[0], p); };
  const changeUnit = (uid: string) => { setUnitId(uid); applyDefaults(propertyUnits.find(u => u.id === uid), property); };

  const valid = !!unit && !!selectedTenant && rupiah(rent) > 0;
  const submit = () => {
    if (!valid || !property || !unit) { setError(t("Lengkapi unit dan penyewa terlebih dahulu.")); return; }
    const reservationId = `resv-${Date.now()}`;
    const kode = `RSV-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
    upsertRow(setReservations, { id: reservationId, kode, penyewa: tenantName, properti: String(property.nama), unit: unitLabel, durasi: duration, sewa: formatRp(rupiah(rent)), deposit: formatRp(rupiah(deposit)), jadwalMasuk: "", periode: "", jadwalKeluar: "", status: "Booking", _propertyId: String(property.id), _unitId: String(unit.id), _tenantId: tenantId, _notes: notes });
    upsertRow(setUnits, { ...unit, sewa: formatRp(unitRent(unit, property)), deposit: formatRp(unitDeposit(unit, property)), penyewa: tenantName, status: "Dipesan" });
    setTenants(old => old.map(tn => tn.id === tenantId ? { ...tn, unit: unitLabel, status: "Dipesan" } : tn));
    notify(message(locale, "reservationCreated", { unit: unitLabel, name: tenantName }));
    onClose();
    onCreated(reservationId);
  };

  return <div className="backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="booking-title">
    <div className="dialog-head"><div><h2 id="booking-title">{t("Buat pemesanan")}</h2><p>{t("Pesan unit untuk calon penyewa. Tahap kontrak hingga move-in dikelola di modul Reservasi.")}</p></div><button className="icon-button" aria-label={t("Tutup")} onClick={onClose}><X /></button></div>
    <div className="dialog-body"><div className="form-grid">
      {!ctx.propertyId && <div className="form-field full"><label htmlFor="booking-property">{t("Properti")}</label><select id="booking-property" value={propertyId} onChange={e => changeProperty(e.target.value)}>{properties.map(p => { const avail = availableCount(p); return <option key={p.id} value={p.id} disabled={avail === 0}>{v(p.nama)} · {avail > 0 ? `${avail} ${t("unit tersedia")}` : t("Penuh")}</option>; })}</select></div>}
      <div className="form-field full"><label htmlFor="booking-unit">{t("Unit")}</label>
        {propertyUnits.length ? <select id="booking-unit" value={unit?.id ?? ""} onChange={e => changeUnit(e.target.value)}>{propertyUnits.map(u => <option key={u.id} value={u.id} disabled={!isVacant(u)}>{(u._synthetic ? t("Unit utama") : `${t("Unit")} ${u.unit}`)} · {v(u.sewa)}/{t("bulan")} · {isVacant(u) ? t("Tersedia") : t("Terisi")}</option>)}</select>
          : <p className="subtext">{t("Tidak ada unit kosong di properti ini.")}</p>}
      </div>
      <div className="form-field full"><label htmlFor="booking-tenant">{t("Penyewa")}</label><TenantCombobox options={tenantOptions} value={tenantId} onSelect={setTenantId} onAddNew={() => setShowTenantForm(true)} /></div>
      <div className="form-field"><label htmlFor="booking-duration">{t("Durasi")}</label><select id="booking-duration" value={duration} onChange={e => setDuration(e.target.value)}>{["1 bulan", "3 bulan", "6 bulan", "12 bulan", "24 bulan"].map(o => <option key={o} value={o}>{v(o)}</option>)}</select></div>
      <div className="form-field"><label htmlFor="booking-rent">{t("Sewa bulanan")}</label><div className="money-input"><span>Rp</span><input id="booking-rent" type="number" inputMode="numeric" min="0" step="1000" value={rent} readOnly={!overridePrice} aria-describedby="booking-price-help" onChange={e => setRent(e.target.value)} /></div></div>
      <div className="form-field"><label htmlFor="booking-deposit">Deposit</label><div className="money-input"><span>Rp</span><input id="booking-deposit" type="number" inputMode="numeric" min="0" step="1000" value={deposit} readOnly={!overridePrice} aria-describedby="booking-price-help" onChange={e => setDeposit(e.target.value)} /></div></div>
      <label className="price-override full"><input type="checkbox" checked={overridePrice} onChange={e => { const enabled = e.target.checked; setOverridePrice(enabled); if (!enabled) applyDefaults(unit, property); }} /><span><strong>{t("Override harga")}</strong><small id="booking-price-help">{t("Harga berasal dari unit. Aktifkan override hanya untuk reservasi ini.")}</small></span></label>
      <div className="form-field full"><label htmlFor="booking-notes">{t("Catatan")}</label><textarea id="booking-notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} /></div>
      {error && <p className="form-error" role="alert" style={{ gridColumn: "1 / -1" }}>{error}</p>}
    </div></div>
    <div className="dialog-actions">
      <button className="button" onClick={onClose}>{t("Batal")}</button>
      <button className="button primary" disabled={!valid} onClick={submit}><CalendarPlus />{t("Buat pemesanan")}</button>
    </div>
    {showTenantForm && <TenantDialog state={{ mode: "create", page: "tenants" }} onClose={() => setShowTenantForm(false)} onSave={(_, row) => { upsertRow(setTenants, row); setTenantId(String(row.id)); setShowTenantForm(false); notify(message(locale, "saved", { item: t("penyewa") })); }} />}
  </div></div>;
}

const RES_STATUSES = ["Booking", "Draf Kontrak", "Kontrak Ditandatangani", "Aktif", "Tidak Aktif"];
const statusRank = (s: unknown) => RES_STATUSES.indexOf(String(s));

type ReservationsPageProps = {
  rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>;
  units: Row[]; setUnits: React.Dispatch<React.SetStateAction<Row[]>>;
  tenants: Row[]; setTenants: React.Dispatch<React.SetStateAction<Row[]>>;
  setProperties: React.Dispatch<React.SetStateAction<Row[]>>;
  setContracts: React.Dispatch<React.SetStateAction<Row[]>>;
  setDocuments: React.Dispatch<React.SetStateAction<Row[]>>;
  setInvoices: React.Dispatch<React.SetStateAction<Row[]>>;
  notify: (s: string) => void; focusId: string; onClearFocus: () => void;
  onBook: (ctx: BookingState) => void;
};

function ReservationsPage(props: ReservationsPageProps) {
  const { locale, t, v } = useI18n();
  const [selectedId, setSelectedId] = useState<string>(props.focusId || "");
  const [search, setSearch] = useState("");
  useEffect(() => { if (props.focusId) { setSelectedId(props.focusId); props.onClearFocus(); } }, [props.focusId]);
  const selected = props.rows.find(r => r.id === selectedId);
  if (selected) return <ReservationDetail reservation={selected} {...props} onBack={() => setSelectedId("")} />;

  const count = (s: string) => props.rows.filter(r => r.status === s).length;
  const expiring = props.rows.filter(r => isExpiringSoon(r)).length;
  const filtered = props.rows.filter(r => Object.values(r).some(val => v(val).toLowerCase().includes(search.toLowerCase())));
  return <><div className="page-head"><div><h1>{t("Reservasi")}</h1><p className="subtext">{t("Lacak status setiap pemesanan dari booking hingga selesai.")}</p></div><div className="actions"><button className="button primary" onClick={() => props.onBook({})}><Plus />{locale === "en" ? "New Reservation" : "Buat Reservasi"}</button></div></div>
    <div className="stats-strip">
      <div className="stat"><span>{t("Booking")}</span><strong>{count("Booking")}</strong></div>
      <div className="stat"><span>{t("Aktif")}</span><strong>{count("Aktif")}</strong></div>
      <div className="stat"><span>{t("Akan berakhir")}</span><strong>{expiring}</strong><small style={{ color: expiring ? "var(--danger)" : undefined }}>{t("≤ 30 hari")}</small></div>
      <div className="stat"><span>{t("Tidak Aktif")}</span><strong>{count("Tidak Aktif")}</strong></div>
    </div>
    <section className="panel"><Toolbar search={search} setSearch={setSearch} />
      {filtered.length ? <div className="table-wrap"><table>
        <thead><tr><th>{t("Kode")}</th><th>{t("Penyewa")}</th><th>{t("Unit")}</th><th>{t("Periode")}</th><th>{t("Status")}</th><th>{t("Aksi")}</th></tr></thead>
        <tbody>{filtered.map(r => <tr key={r.id} onClick={() => setSelectedId(r.id)} className={selectedId === r.id ? "selected" : ""}>
          <td><span className="cell-main">{v(r.kode)}</span></td>
          <td>{v(r.penyewa)}</td>
          <td>{v(r.unit)}</td>
          <td><span className="cell-main">{r.periode ? v(r.periode) : "—"}</span>{isExpiringSoon(r) && <span className="cell-sub" style={{ color: "var(--danger)" }}>{t("Akan berakhir")}</span>}</td>
          <td><Status>{r.status}</Status></td>
          <td><div className="actions"><button className="icon-button" aria-label={`${t("Buka")} ${v(r.kode)}`} onClick={e => { e.stopPropagation(); setSelectedId(r.id); }}><Eye /></button></div></td>
        </tr>)}</tbody>
      </table></div> : <div className="empty"><ClipboardList /><div><strong>{t("Belum ada reservasi")}</strong>{locale === "en" ? "Create a reservation using the button above or from a property's unit." : "Buat reservasi menggunakan tombol di atas atau dari detail unit properti."}</div></div>}
    </section></>;
}

function ReservationDetail({ reservation, rows, setRows, units, setUnits, tenants, setTenants, setProperties, setContracts, setDocuments, setInvoices, notify, onBack }: ReservationsPageProps & { reservation: Row; onBack: () => void }) {
  const { locale, t, v } = useI18n();
  const endDate = reservationEndDate(reservation.periode);
  const [moveInDate, setMoveInDate] = useState(todayInput());
  const [moveOutDate, setMoveOutDate] = useState(endDate ? endDate.toISOString().slice(0, 10) : todayInput());
  const [checklist, setChecklist] = useState({ deposit: false, contract: false, keys: false });
  const [showPreview, setShowPreview] = useState(false);
  void rows;

  const tenant = tenants.find(tn => tn.id === reservation._tenantId) || tenants.find(tn => tn.nama === reservation.penyewa);
  const status = String(reservation.status);
  const rank = statusRank(status);
  const expiring = isExpiringSoon(reservation);
  const update = (patch: Record<string, string | number>) => setRows(old => old.map(r => r.id === reservation.id ? { ...r, ...patch } : r));

  const toDraft = () => {
    const nomor = `KTR-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
    upsertRow(setContracts, { id: `contract-${Date.now()}`, nomor, penyewa: String(reservation.penyewa), unit: String(reservation.unit), dibuat: fmtShort(new Date()), status: "Draf" });
    upsertRow(setDocuments, { id: `doc-${Date.now()}`, nama: `Kontrak ${reservation.penyewa}.pdf`, kategori: "Kontrak", terkait: String(reservation.penyewa), diperbarui: fmtShort(new Date()), status: "Privat" });
    update({ status: "Draf Kontrak", _nomor: nomor });
    notify(message(locale, "draftCreated", { number: nomor }));
  };
  const sign = () => {
    const start = parseInput(moveInDate);
    const months = parseInt(String(reservation.durasi), 10) || 12;
    const periode = `${fmtMonthYear(start)} - ${fmtMonthYear(addMonths(start, months))}`;
    setContracts(old => old.map(c => c.nomor === reservation._nomor ? { ...c, status: "Ditandatangani" } : c));
    update({ status: "Kontrak Ditandatangani", jadwalMasuk: fmtShort(start), periode });
    notify(message(locale, "contractSigned", { date: fmtShort(start) }));
  };
  const activate = () => {
    const nextUnits = units.map(u => u.id === reservation._unitId ? { ...u, penyewa: String(reservation.penyewa), status: "Dihuni" } : u);
    setUnits(nextUnits);
    if (reservation._propertyId) syncPropertyOccupancy(String(reservation._propertyId), setProperties, nextUnits);
    setTenants(old => old.map(tn => tn.id === reservation._tenantId ? { ...tn, unit: String(reservation.unit), sejak: String(reservation.jadwalMasuk), periodeSewa: String(reservation.periode), status: "Aktif" } : tn));
    const start = parseInput(String(reservation.jadwalMasuk));
    const month = start.getUTCMonth();
    const invId = `INV-${String(month + 1).padStart(2, "0")}${String(start.getUTCFullYear()).slice(-2)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    upsertRow(setInvoices, { id: invId, penyewa: String(reservation.penyewa), unit: String(reservation.unit), periode: `${idMonthsLong[month]} ${start.getUTCFullYear()}`, jatuhTempo: fmtShort(new Date(Date.UTC(start.getUTCFullYear(), month, 5))), total: formatRp(rupiah(reservation.sewa)), sisa: formatRp(rupiah(reservation.sewa)), status: "Belum dibayar" });
    update({ status: "Aktif" });
    notify(message(locale, "moveInDone", { unit: String(reservation.unit) }));
  };
  const scheduleMoveOut = () => {
    const d = fmtShort(parseInput(moveOutDate));
    update({ jadwalKeluar: d });
    notify(message(locale, "moveOutScheduled", { name: String(reservation.penyewa), date: d }));
  };
  const endReservation = () => {
    const nextUnits = units.map(u => u.id === reservation._unitId ? { ...u, penyewa: "Belum ada", status: "Kosong" } : u);
    setUnits(nextUnits);
    if (reservation._propertyId) syncPropertyOccupancy(String(reservation._propertyId), setProperties, nextUnits);
    setTenants(old => old.map(tn => tn.id === reservation._tenantId ? { ...tn, unit: "", periodeSewa: "", status: "Belum ada sewa" } : tn));
    update({ status: "Tidak Aktif", jadwalKeluar: fmtShort(parseInput(moveOutDate)) });
    notify(message(locale, "reservationEnded", { unit: String(reservation.unit) }));
  };

  const contractText = () => [
    `KONTRAK SEWA — ${reservation._nomor || reservation.kode}`, "",
    `Penyewa  : ${tenant?.nama || reservation.penyewa}`,
    `Kontak   : ${tenant?.telepon || "-"}`,
    `Properti : ${reservation.properti}`,
    `Unit     : ${reservation.unit}`,
    `Durasi   : ${reservation.durasi}`,
    `Periode  : ${reservation.periode || "-"}`,
    `Sewa     : ${reservation.sewa} / bulan`,
    `Deposit  : ${reservation.deposit}`, "",
    "Dokumen ini dihasilkan oleh Sewain (mode simulasi).",
  ].join("\n");
  const shareContract = () => {
    const msg = `Halo ${tenant?.nama || reservation.penyewa}, berikut kontrak sewa untuk ${reservation.unit}. Tautan: sewain.id/kontrak/${reservation.kode}`;
    window.open(`${whatsappUrl(tenant?.telepon)}?text=${encodeURIComponent(msg)}`, "_blank");
    notify(message(locale, "contractShared", { name: String(tenant?.nama || reservation.penyewa) }));
  };
  const downloadContract = () => {
    const blob = new Blob([contractText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Kontrak-${reservation.kode}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    notify(message(locale, "contractDownloaded", { code: String(reservation.kode) }));
  };

  const signPreview = (() => { const s = parseInput(moveInDate); const m = parseInt(String(reservation.durasi), 10) || 12; return `${fmtMonthYear(s)} - ${fmtMonthYear(addMonths(s, m))}`; })();
  const checklistDone = checklist.deposit && checklist.contract && checklist.keys;

  return <>
    <button className="button tenant-back" onClick={onBack}><ChevronLeft />{t("Semua reservasi")}</button>
    <section className="panel tenant-summary-card"><div className="tenant-summary-main"><div className="tenant-heading"><span className="avatar tenant-avatar"><WalletCards size={18} /></span><div><div className="property-title"><h1>{v(reservation.kode)}</h1><Status>{reservation.status}</Status></div><p className="subtext">{v(reservation.penyewa)} · {v(reservation.unit)} · {v(reservation.properti)}</p></div></div>
      {tenant && <div className="actions"><a className="button primary whatsapp-cta" href={whatsappUrl(tenant.telepon)} target="_blank" rel="noreferrer"><MessageSquareText />WhatsApp</a></div>}</div>
      <div className="tenant-metrics"><div><span>{t("Durasi")}</span><strong>{v(reservation.durasi)}</strong></div><div><span>{t("Sewa bulanan")}</span><strong>{v(reservation.sewa)}</strong></div><div><span>Deposit</span><strong>{v(reservation.deposit)}</strong></div><div><span>{t("Periode sewa")}</span><strong>{reservation.periode ? v(reservation.periode) : "—"}</strong></div></div>
    </section>

    {expiring && <section className="panel reminder-banner"><CalendarClock /><div><strong>{t("Kontrak akan berakhir")}</strong><span>{message(locale, "expirySoon", { days: Math.max(0, daysUntil(endDate)) })}</span></div>
      <div className="reminder-action"><input type="date" aria-label={t("Jadwal keluar")} value={moveOutDate} onChange={e => setMoveOutDate(e.target.value)} /><button className="button" onClick={scheduleMoveOut}><CalendarClock />{t("Jadwalkan move-out")}</button></div></section>}

    <div className="tenant-detail-layout"><main className="tenant-main-column">
      <section className="panel tenant-card"><div className="tenant-card-head"><div><h2>{t("Status reservasi")}</h2><p>{t("Jalankan tahap berikutnya untuk reservasi ini.")}</p></div></div>
        <div className="timeline" style={{ marginBottom: 18 }}>{RES_STATUSES.slice(0, 4).map((s, i) => <div key={s} className={`stage ${i < rank ? "done" : ""} ${i === rank ? "current" : ""}`}><div className="stage-dot">{i < rank ? <Check size={11} /> : i + 1}</div>{t(s)}</div>)}</div>

        {status === "Booking" && <div className="inline-empty"><span>{t("Reservasi dibuat. Buat draf kontrak untuk melanjutkan.")}</span><button className="button primary" onClick={toDraft}><FileType2 />{t("Buat draf kontrak")}</button></div>}

        {status === "Draf Kontrak" && <div className="form-grid"><div className="form-field"><label htmlFor="resv-movein">{t("Jadwal masuk")}</label><input id="resv-movein" type="date" value={moveInDate} onChange={e => setMoveInDate(e.target.value)} /></div><div className="form-field"><label>{t("Periode sewa")}</label><input value={signPreview} readOnly /></div><div className="form-field full"><button className="button primary" onClick={sign}><PenLine />{t("Tandatangani kontrak")}</button></div></div>}

        {status === "Kontrak Ditandatangani" && <div><p className="subtext" style={{ marginBottom: 10 }}>{t("Jadwal masuk")}: {v(reservation.jadwalMasuk)}</p>
          <label className="activity"><span className="activity-icon"><Check /></span><span><strong>{t("Deposit diterima")}</strong><span className="cell-sub">{t("Transfer bank")} · {v(reservation.deposit)}</span></span><input type="checkbox" checked={checklist.deposit} onChange={e => setChecklist(c => ({ ...c, deposit: e.target.checked }))} /></label>
          <label className="activity"><span className="activity-icon"><Check /></span><span><strong>{t("Kontrak ditandatangani")}</strong><span className="cell-sub">{t("Dokumen lengkap")}</span></span><input type="checkbox" checked={checklist.contract} onChange={e => setChecklist(c => ({ ...c, contract: e.target.checked }))} /></label>
          <label className="activity"><span className="activity-icon"><Check /></span><span><strong>{t("Kunci diserahkan")}</strong><span className="cell-sub">{t("2 set kunci")}</span></span><input type="checkbox" checked={checklist.keys} onChange={e => setChecklist(c => ({ ...c, keys: e.target.checked }))} /></label>
          <button className="button primary" style={{ marginTop: 14 }} disabled={!checklistDone} onClick={activate}><UserCheck />{t("Konfirmasi move-in")}</button></div>}

        {status === "Aktif" && <div className="inline-empty"><span>{t("Penyewa aktif menempati unit ini.")}</span><button className="button danger" onClick={endReservation}><CalendarClock />{t("Akhiri sewa / move-out")}</button></div>}

        {status === "Tidak Aktif" && <div className="inline-empty"><span>{t("Reservasi selesai.")} {reservation.jadwalKeluar ? `${t("Jadwal keluar")}: ${v(reservation.jadwalKeluar)}` : ""}</span></div>}
      </section>

      {rank >= 1 && <section className="panel tenant-card"><div className="tenant-card-head"><div><h2>{t("Kontrak sewa")}</h2><p>{v(reservation._nomor || reservation.kode)}</p></div><Status>{rank >= 2 ? "Ditandatangani" : "Draf"}</Status></div>
        <div className="actions"><button className="button" onClick={shareContract}><MessageSquareText />{t("Bagikan ke penyewa")}</button><button className="button" onClick={downloadContract}><Download />{t("Unduh kontrak")}</button><button className="button" onClick={() => setShowPreview(true)}><Eye />{t("Pratinjau dokumen")}</button></div>
      </section>}
    </main><aside className="tenant-side-column">
      <section className="panel tenant-card"><div className="tenant-card-head"><div><h2>{t("Detail reservasi")}</h2></div></div><div className="detail-grid"><span>{t("Penyewa")}</span><span>{v(reservation.penyewa)}</span><span>{t("Unit")}</span><span>{v(reservation.unit)}</span><span>{t("Properti")}</span><span>{v(reservation.properti)}</span><span>{t("Jadwal masuk")}</span><span>{reservation.jadwalMasuk ? v(reservation.jadwalMasuk) : "—"}</span><span>{t("Jadwal keluar")}</span><span>{reservation.jadwalKeluar ? v(reservation.jadwalKeluar) : "—"}</span></div></section>
    </aside></div>
    {showPreview && <ContractPreviewModal reservation={reservation} tenant={tenant} onClose={() => setShowPreview(false)} />}
  </>;
}

function ContractPreviewModal({ reservation, tenant, onClose }: { reservation: Row; tenant?: Row; onClose: () => void }) {
  const { t, v } = useI18n();
  return <div className="backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="contract-preview-title">
    <div className="dialog-head"><div><h2 id="contract-preview-title">{t("Pratinjau kontrak")}</h2><p>{v(reservation._nomor || reservation.kode)}</p></div><button className="icon-button" aria-label={t("Tutup")} onClick={onClose}><X /></button></div>
    <div className="dialog-body"><article className="contract-preview">
      <header><h3>{t("Kontrak Sewa")}</h3><span>{v(reservation._nomor || reservation.kode)}</span></header>
      <div className="detail-grid"><span>{t("Penyewa")}</span><span>{v(tenant?.nama || reservation.penyewa)}</span><span>WhatsApp</span><span>{v(tenant?.telepon || "-")}</span><span>{t("Properti")}</span><span>{v(reservation.properti)}</span><span>{t("Unit")}</span><span>{v(reservation.unit)}</span><span>{t("Durasi")}</span><span>{v(reservation.durasi)}</span><span>{t("Periode sewa")}</span><span>{reservation.periode ? v(reservation.periode) : "—"}</span><span>{t("Sewa bulanan")}</span><span>{v(reservation.sewa)}</span><span>Deposit</span><span>{v(reservation.deposit)}</span></div>
      <p className="subtext">{t("Dokumen ini dihasilkan oleh Sewain (mode simulasi).")}</p>
    </article></div>
    <div className="dialog-actions"><button className="button" onClick={onClose}>{t("Tutup")}</button></div>
  </div></div>;
}

function Field({ label, value, full, type = "text", multiline, options, autoComplete }: { label: string; value: string; full?: boolean; type?: React.HTMLInputTypeAttribute; multiline?: boolean; options?: string[]; autoComplete?: string }) {
  const { t, v } = useI18n();
  const id = `field-${slug(label)}`;
  const inputValue = type === "date" ? toDateInputValue(value) : v(value);
  return <div className={`form-field ${full ? "full" : ""}`}><label htmlFor={id}>{t(label)}</label>{options ? <select id={id} defaultValue={value}>{options.map(option => <option value={option} key={option}>{v(option)}</option>)}</select> : multiline ? <textarea id={id} rows={4} autoComplete={autoComplete} defaultValue={v(value)} /> : <input id={id} type={type} inputMode={type === "tel" ? "tel" : type === "number" ? "numeric" : undefined} autoComplete={autoComplete} defaultValue={inputValue} />}</div>;
}

function InvoicePage({ rows, setRows, openDialog, notify }: { rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>; openDialog: (d: DialogState) => void; notify: (s: string) => void }) {
  const { locale, t, v } = useI18n();
  const [selected, setSelected] = useState<Row>(rows[0]);
  const [search, setSearch] = useState("");
  const filtered = rows.filter(row => Object.values(row).some(value => v(value).toLowerCase().includes(search.toLowerCase())));
  const markPaid = () => { setRows(old => old.map(r => r.id === selected.id ? { ...r, sisa: "Rp0", status: "Lunas" } : r)); setSelected({ ...selected, sisa: "Rp0", status: "Lunas" }); notify(message(locale, "paid", { invoice: selected.id })); };
  return <><PageHead page="invoices" action={() => openDialog({ mode: "create", page: "invoices" })} /><div className="stats-strip"><div className="stat"><span>{t("Terlambat")}</span><strong>2</strong><small style={{ color: "var(--danger)" }}>{v("Rp1,55 jt")}</small></div><div className="stat"><span>{t("Jatuh tempo 7 hari")}</span><strong>1</strong></div><div className="stat"><span>{t("Belum dibayar")}</span><strong>3</strong></div><div className="stat"><span>{t("Lunas bulan ini")}</span><strong>18</strong><small>{v("Rp31,2 jt")}</small></div></div>
    <div className="split"><section className="panel"><Toolbar search={search} setSearch={setSearch} /><DataTable rows={filtered} selected={selected.id} onSelect={setSelected} onEdit={row => openDialog({ mode: "edit", page: "invoices", row })} onDelete={row => { setRows(old => old.filter(r => r.id !== row.id)); notify(locale === "en" ? "Invoice deleted." : "Tagihan dihapus."); }} /></section>
      <aside className="detail-pane"><div className="panel-head"><div><h2>{selected.id}</h2><p>{v(selected.periode)}</p></div><Status>{selected.status}</Status></div><div className="detail-section"><div className="detail-title">{selected.penyewa}</div><div className="detail-grid"><span>{t("Unit")}</span><span>{selected.unit}</span><span>{t("Jatuh tempo")}</span><span>{v(selected.jatuhTempo)}</span><span>{locale === "en" ? "Invoice total" : "Total tagihan"}</span><span>{v(selected.total)}</span><span>{t("Sisa tagihan")}</span><span className={selected.sisa !== "Rp0" ? "money-danger" : ""}>{v(selected.sisa)}</span></div></div>
        <div className="detail-section"><div className="detail-title">{t("Tautan pembayaran")}</div><div style={{ padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 16, fontSize: ".75rem", overflow: "hidden", textOverflow: "ellipsis" }}>sewain.id/bayar/{selected.id}</div><div className="actions" style={{ marginTop: 12 }}><button className="button" onClick={() => notify(locale === "en" ? "Payment link copied." : "Tautan pembayaran disalin.")}>{t("Salin tautan")}</button><button className="button" onClick={() => notify(message(locale, "reminder", { name: selected.penyewa }))}><MessageSquareText />{t("Kirim pengingat")}</button></div></div>
        <div className="detail-section"><div className="detail-title">{t("Riwayat pembayaran")}</div><div className="activity"><span className="activity-icon"><Check /></span><span><strong>{t("Pembayaran transfer")}</strong><span className="cell-sub">{t("Sebagian")} · {v("Rp1.200.000")}</span></span><time>6 Jun</time></div><div className="activity"><span className="activity-icon"><FileText /></span><span><strong>{t("Tagihan dibuat")}</strong><span className="cell-sub">{t("Otomatis dari sewa aktif")}</span></span><time>1 Jun</time></div></div>
        <div className="detail-section"><button className="button primary" style={{ width: "100%" }} disabled={selected.status === "Lunas"} onClick={markPaid}><CircleDollarSign />{t(selected.status === "Lunas" ? "Pembayaran sudah lunas" : "Catat pembayaran penuh")}</button></div>
      </aside></div></>;
}

function SettingsPage({ notify }: { notify: (s: string) => void }) {
  const { locale, t, v } = useI18n();
  const { config: tokenConfig, setConfig: setTokenConfig } = useTokenConfig();
  const [tab, setTab] = useState("Organisasi");
  const [nominalInput, setNominalInput] = useState("");
  const addNominal = () => {
    const n = Number(nominalInput);
    if (n > 0 && !tokenConfig.nominals.includes(n)) setTokenConfig({ ...tokenConfig, nominals: [...tokenConfig.nominals, n] });
    setNominalInput("");
  };
  return <><PageHead page="settings" /><section className="panel"><div className="tabs">{["Organisasi", "Penagihan", "Token PLN", "Integrasi", "Pengguna"].map(item => <button key={item} onClick={() => setTab(item)} className={`tab ${tab === item ? "active" : ""}`}>{t(item)}</button>)}</div><div className="dialog-body" style={{ maxWidth: 720 }}>
    {tab === "Organisasi" && <div className="form-grid"><Field label="Nama organisasi" value="PT Makmur Sejahtera" autoComplete="organization" /><Field label="Zona waktu" value="Asia/Jakarta" options={["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]} /><Field full multiline label="Alamat" value="Jl. Melati No. 45, Depok, Jawa Barat" autoComplete="street-address" /></div>}
    {tab === "Penagihan" && <div className="form-grid"><Field label="Tanggal pembuatan tagihan" value="1" type="number" /><Field label="Jatuh tempo standar" value="Tanggal 5" options={["Tanggal 1", "Tanggal 5", "Tanggal 10", "Tanggal 15"]} /><Field label="Pengingat pertama" value="3 hari sebelum" options={["1 hari sebelum", "3 hari sebelum", "7 hari sebelum"]} /><Field label="Pengingat terlambat" value="Setiap 3 hari" options={["Setiap hari", "Setiap 3 hari", "Setiap 7 hari"]} /></div>}
    {tab === "Token PLN" && <div className="form-grid">
      <div className="form-field full">
        <label>{locale === "en" ? "Available denominations" : "Nominal yang tersedia"}</label>
        <div className="tag-input">
          {[...tokenConfig.nominals].sort((a, b) => a - b).map(n => (
            <span className="property-tag" key={n}>{v(formatRp(n))}<button type="button" aria-label={`Hapus ${formatRp(n)}`} onClick={() => setTokenConfig({ ...tokenConfig, nominals: tokenConfig.nominals.filter(x => x !== n) })}><X /></button></span>
          ))}
          <input type="number" min="1000" step="1000" value={nominalInput} onChange={e => setNominalInput(e.target.value)} placeholder={locale === "en" ? "Amount, press Enter" : "Nominal, tekan Enter"} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addNominal(); } }} />
        </div>
      </div>
      <div className="form-field full">
        <label>{locale === "en" ? "Platform fee" : "Biaya platform"}</label>
        <p className="subtext">{locale === "en" ? "Manage the global platform fee from the Token PLN page using the \"Manage fee\" button." : "Kelola biaya platform global dari halaman Token PLN menggunakan tombol \"Kelola biaya\"."}</p>
      </div>
    </div>}
    {tab === "Integrasi" && <div><div className="activity"><span className="activity-icon"><MessageSquareText /></span><span><strong>WhatsApp · {t("Mode simulasi")}</strong><span className="cell-sub">{t("Pesan dicatat tanpa dikirim ke nomor asli")}</span></span><button className="button" onClick={() => notify(locale === "en" ? "WhatsApp test succeeded in simulation mode." : "Tes WhatsApp berhasil dalam mode simulasi.")}>{t("Tes")}</button></div><div className="activity"><span className="activity-icon"><CreditCard /></span><span><strong>Payment gateway · {t("Mode simulasi")}</strong><span className="cell-sub">{t("Tautan pembayaran menggunakan data lokal")}</span></span><button className="button" onClick={() => notify(locale === "en" ? "Payment gateway test succeeded." : "Tes payment gateway berhasil.")}>{t("Tes")}</button></div><div className="activity"><span className="activity-icon"><Zap /></span><span><strong>{locale === "en" ? "PPOB (utility payments)" : "PPOB"} · {t("Mode simulasi")}</strong><span className="cell-sub">{t("Token PLN tidak diterbitkan secara nyata")}</span></span><button className="button" onClick={() => notify(locale === "en" ? "PPOB test succeeded." : "Tes PPOB berhasil.")}>{t("Tes")}</button></div></div>}
    {tab === "Pengguna" && <div><div className="activity"><span className="avatar">AT</span><span><strong>Andi Triono</strong><span className="cell-sub">andi@sewain.id · {t("Pemilik")}</span></span><Status>Aktif</Status></div><div className="activity"><span className="avatar">RN</span><span><strong>Rina Novita</strong><span className="cell-sub">rina@sewain.id · {t("Admin")}</span></span><Status>Aktif</Status></div></div>}
    <div className="actions" style={{ marginTop: 20 }}><button className="button primary" onClick={() => notify(message(locale, "settings", { section: t(tab) }))}>{t("Simpan perubahan")}</button></div>
  </div></section></>;
}

function PropertyDialog({ state, onClose, onSave }: { state: Exclude<DialogState, null>; onClose: () => void; onSave: (page: PageId, row: Row) => void }) {
  const { locale, t } = useI18n();
  const row = state.row;
  const initialLabels = String(row?.labels || row?.tipe || "").split(/[|,]/).map(item => item.trim()).filter(Boolean);
  const legacyContact = String(row?.kontak || "");
  const legacyPhone = legacyContact.match(/(?:\+?\d[\d\s-]{7,})$/)?.[0]?.trim() || "";
  const [name, setName] = useState(String(row?.nama || ""));
  const [address, setAddress] = useState(String(row?.alamat || row?.lokasi || ""));
  const [contactName, setContactName] = useState(String(row?.contactName || legacyContact.replace(legacyPhone, "").replace(/[·,|-]+$/, "").trim()));
  const [contactPhone, setContactPhone] = useState(String(row?.contactPhone || legacyPhone));
  const [labels, setLabels] = useState<string[]>(initialLabels);
  const [labelInput, setLabelInput] = useState("");
  const [unitType, setUnitType] = useState(String(row?.unitType || (Number(row?.unit || 1) > 1 ? "Multi unit" : "Single unit")));
  const [unitPrefix, setUnitPrefix] = useState(String(row?.unitPrefix || ""));
  const [unitStart, setUnitStart] = useState(Number(row?.unitStart || 1));
  const [unitQty, setUnitQty] = useState(Number(row?.unitQty || row?.unit || 1));
  const [generatedUnits, setGeneratedUnits] = useState<string[]>(String(row?.generatedUnits || "").split("|").filter(Boolean));
  const [defaultPrice, setDefaultPrice] = useState(String(row?.defaultPrice || ""));
  const [defaultDeposit, setDefaultDeposit] = useState(String(row?.defaultDeposit || ""));
  const [billingCycle, setBillingCycle] = useState(String(row?.billingCycle || "Bulanan"));
  const [imageData, setImageData] = useState(String(row?.image || ""));
  const [imageName, setImageName] = useState(String(row?.imageName || ""));
  const [error, setError] = useState("");

  const addLabel = (raw = labelInput) => {
    const next = raw.trim();
    if (!next || labels.some(item => item.toLowerCase() === next.toLowerCase())) return setLabelInput("");
    setLabels(current => [...current, next]);
    setLabelInput("");
  };
  const updateUnitBuilder = (update: () => void) => { update(); setGeneratedUnits([]); };
  const generateUnits = () => {
    const quantity = Math.max(1, Math.min(500, unitQty));
    const start = Math.max(0, unitStart);
    setUnitQty(quantity);
    setUnitStart(start);
    setGeneratedUnits(Array.from({ length: quantity }, (_, index) => `${unitPrefix}${start + index}`));
    setError("");
  };
  const handleImage = (file?: File) => {
    if (!file) return;
    if (file.size > 1024 * 1024) return setError(t("Ukuran gambar maksimal 1 MB."));
    const reader = new FileReader();
    reader.onload = () => { setImageData(String(reader.result)); setImageName(file.name); setError(""); };
    reader.readAsDataURL(file);
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!labels.length) return setError(t("Tambahkan minimal satu label properti."));
    if (unitType === "Multi unit" && (unitQty < 1 || generatedUnits.length !== unitQty)) return setError(t("Buat daftar unit sebelum menyimpan."));
    const totalUnits = unitType === "Multi unit" ? unitQty : 1;
    const rupiah = (value: string) => value ? `Rp${Number(value).toLocaleString("id-ID")}` : "Rp0";
    onSave("properties", {
      ...row,
      id: row?.id || `properties-${Date.now()}`,
      nama: name,
      tipe: labels.join(", "),
      lokasi: address,
      unit: totalUnits,
      terisi: Math.min(Number(row?.terisi || 0), totalUnits),
      pendapatan: defaultPrice ? rupiah(defaultPrice) : String(row?.pendapatan || "Rp0"),
      status: String(row?.status || "Aktif"),
      alamat: address,
      kontak: `${contactName} · ${contactPhone}`,
      contactName,
      contactPhone,
      labels: labels.join("|"),
      unitType,
      unitPrefix: unitType === "Multi unit" ? unitPrefix : "",
      unitStart: unitType === "Multi unit" ? unitStart : 1,
      unitQty: totalUnits,
      generatedUnits: unitType === "Multi unit" ? generatedUnits.join("|") : "1",
      defaultPrice: Number(defaultPrice || 0),
      defaultDeposit: Number(defaultDeposit || 0),
      billingCycle,
      image: imageData,
      imageName,
    });
  };

  return <div className="backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><form className="dialog property-dialog" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="property-form-title">
    <div className="dialog-head"><div><h2 id="property-form-title">{t(state.mode === "create" ? "Tambah properti" : "Edit properti")}</h2><p>{t("Lengkapi identitas, struktur unit, dan ketentuan sewa.")}</p></div><button type="button" className="icon-button" aria-label={t("Tutup")} onClick={onClose}><X /></button></div>
    <div className="dialog-body property-form">
      <section className="form-section"><div className="form-section-head"><strong>{t("Informasi properti")}</strong><span>1</span></div><div className="form-grid">
        <div className="form-field full"><label htmlFor="property-name">{t("Nama properti")}</label><input id="property-name" autoComplete="organization" value={name} onChange={event => setName(event.target.value)} required /></div>
        <div className="form-field full"><label htmlFor="property-address">{t("Alamat")}</label><textarea id="property-address" autoComplete="street-address" rows={4} value={address} onChange={event => setAddress(event.target.value)} required /></div>
        <fieldset className="form-field full contact-fieldset"><legend>{t("Penanggung jawab")}</legend><div className="contact-row"><div className="form-field"><label htmlFor="contact-name">{t("Nama penanggung jawab")}</label><input id="contact-name" autoComplete="name" value={contactName} onChange={event => setContactName(event.target.value)} required placeholder={t("Nama lengkap")} /></div><div className="form-field"><label htmlFor="contact-phone">{t("Nomor telepon")}</label><input id="contact-phone" type="tel" inputMode="tel" autoComplete="tel" pattern="[0-9+()\s-]{8,20}" value={contactPhone} onChange={event => setContactPhone(event.target.value)} required placeholder="08xx xxxx xxxx" /></div></div></fieldset>
        <div className="form-field full"><label htmlFor="property-label">{t("Label properti")}</label><div className="tag-input">{labels.map(label => <span className="property-tag" key={label}>{label}<button type="button" onClick={() => setLabels(current => current.filter(item => item !== label))} aria-label={`${t("Hapus")} ${label}`}><X /></button></span>)}<input id="property-label" value={labelInput} onChange={event => setLabelInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addLabel(); } }} onBlur={() => addLabel()} placeholder={labels.length ? "" : t("Ketik label lalu tekan Enter")} /></div><div className="tag-suggestions">{["Kosan", "Ruko", "Kontrakan", "Apartemen"].filter(item => !labels.includes(item)).map(item => <button type="button" key={item} onClick={() => addLabel(item)}>+ {t(item)}</button>)}</div></div>
      </div></section>

      <section className="form-section"><div className="form-section-head"><strong>{t("Struktur unit")}</strong><span>2</span></div><div className="form-field"><label>{t("Tipe unit")}</label><div className="choice-row">{["Single unit", "Multi unit"].map(option => <label key={option} className={unitType === option ? "selected" : ""}><input type="radio" name="unitType" value={option} checked={unitType === option} onChange={() => { setUnitType(option); setGeneratedUnits([]); }} /><span>{t(option)}</span><small>{t(option === "Single unit" ? "Satu properti disewakan sebagai satu unit." : "Properti memiliki beberapa unit atau kamar.")}</small></label>)}</div></div>
        {unitType === "Multi unit" && <div className="unit-builder"><div className="unit-builder-fields"><div className="form-field"><label htmlFor="unit-prefix">{t("Prefix")}</label><input id="unit-prefix" value={unitPrefix} onChange={event => updateUnitBuilder(() => setUnitPrefix(event.target.value.toUpperCase()))} placeholder="A-" /></div><div className="form-field"><label htmlFor="unit-start">{t("Nomor awal")}</label><input id="unit-start" type="number" min="0" value={unitStart} onChange={event => updateUnitBuilder(() => setUnitStart(Number(event.target.value)))} /></div><div className="form-field"><label htmlFor="unit-qty">{t("Jumlah unit / kamar")}</label><input id="unit-qty" type="number" min="1" max="500" value={unitQty} onChange={event => updateUnitBuilder(() => setUnitQty(Number(event.target.value)))} /></div><button type="button" className="button" onClick={generateUnits}>{t("Buat unit")}</button></div>{generatedUnits.length > 0 && <div className="unit-preview"><div><strong>{generatedUnits.length} {t("unit siap dibuat")}</strong><span>{t("Periksa penomoran sebelum menyimpan.")}</span></div><div className="unit-list">{generatedUnits.slice(0, 20).map(unit => <span key={unit}>{unit}</span>)}{generatedUnits.length > 20 && <span>+{generatedUnits.length - 20}</span>}</div></div>}</div>}
      </section>

      <section className="form-section"><div className="form-section-head"><strong>{t("Harga dan penagihan")}</strong><span>3</span></div><div className="form-grid"><div className="form-field"><label htmlFor="default-price">{t("Harga default")}</label><div className="money-input"><span>Rp</span><input id="default-price" type="number" inputMode="numeric" min="0" step="1000" value={defaultPrice} onChange={event => setDefaultPrice(event.target.value)} required /></div></div><div className="form-field"><label htmlFor="default-deposit">{t("Deposit default")}</label><div className="money-input"><span>Rp</span><input id="default-deposit" type="number" inputMode="numeric" min="0" step="1000" value={defaultDeposit} onChange={event => setDefaultDeposit(event.target.value)} required /></div></div><div className="form-field full"><label htmlFor="billing-cycle">{t("Siklus penagihan")}</label><select id="billing-cycle" value={billingCycle} onChange={event => setBillingCycle(event.target.value)}><option value="Bulanan">{t("Bulanan")}</option><option value="Tahunan">{t("Tahunan")}</option></select></div></div></section>

      <section className="form-section"><div className="form-section-head"><strong>{t("Gambar properti")}</strong><span>4</span></div><label className={`image-upload ${imageData ? "has-image" : ""}`} htmlFor="property-image">{imageData ? <img src={imageData} alt={t("Pratinjau gambar properti")} /> : <ImagePlus />}<span><strong>{imageName || t("Unggah gambar properti")}</strong><small>{t("JPG, PNG, atau WebP. Maksimal 1 MB.")}</small></span><input id="property-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => handleImage(event.target.files?.[0])} /></label></section>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    <div className="dialog-actions"><button type="button" className="button" onClick={onClose}>{t("Batal")}</button><button className="button primary" type="submit">{t(state.mode === "create" ? "Tambah properti" : "Simpan perubahan")}</button></div>
  </form></div>;
}

function GenericEditDialog({ state, onClose, onSave }: { state: Exclude<DialogState, null>; onClose: () => void; onSave: (page: PageId, row: Row) => void }) {
  const { locale, t } = useI18n();
  const schema = schemas[state.page] || [];
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(schema.map(field => {
    const value = state.row?.[field.key] ?? "";
    return [field.key, field.type === "date" ? toDateInputValue(value) : String(value)];
  })));
  const submit = (e: React.FormEvent) => { e.preventDefault(); onSave(state.page, { id: state.row?.id || `${state.page}-${Date.now()}`, ...values }); };
  const update = (key: string, value: string) => setValues(current => ({ ...current, [key]: value }));
  return <div className="backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}><form className="dialog" onSubmit={submit} role="dialog" aria-modal="true"><div className="dialog-head"><div><h2>{t(state.mode === "create" ? "Tambah" : "Edit")} {t(pageMeta[state.page].singular)}</h2><p>{locale === "en" ? "Changes are saved automatically on this device." : "Perubahan disimpan otomatis di perangkat ini."}</p></div><button type="button" className="icon-button" aria-label={t("Tutup")} onClick={onClose}><X /></button></div><div className="dialog-body"><div className="form-grid">{schema.map((field, i) => <div className={`form-field ${(field.multiline || (i === schema.length - 1 && schema.length % 2)) ? "full" : ""}`} key={field.key}><label htmlFor={field.key}>{t(field.label)}</label>{field.options ? <select id={field.key} value={values[field.key]} required onChange={e => update(field.key, e.target.value)}><option value="">{t("Pilih")} {t(field.label).toLowerCase()}</option>{field.options.map(o => <option key={o} value={o}>{t(o)}</option>)}</select> : field.multiline ? <textarea id={field.key} rows={5} value={values[field.key]} required onChange={e => update(field.key, e.target.value)} /> : <input id={field.key} type={field.type || "text"} inputMode={field.inputMode} value={values[field.key]} required onChange={e => update(field.key, e.target.value)} />}</div>)}</div></div><div className="dialog-actions"><button type="button" className="button" onClick={onClose}>{t("Batal")}</button><button className="button primary" type="submit">{t(state.mode === "create" ? "Tambahkan" : "Simpan perubahan")}</button></div></form></div>;
}

function TenantDialog({ state, onClose, onSave }: { state: Exclude<DialogState, null>; onClose: () => void; onSave: (page: PageId, row: Row) => void }) {
  const { locale, t } = useI18n();
  const row = state.row;
  const [values, setValues] = useState({
    nama: String(row?.nama || ""), telepon: String(row?.telepon || ""), email: String(row?.email || ""),
    nomorIdentitas: String(row?.nomorIdentitas || ""), gambarIdentitas: String(row?.gambarIdentitas || ""),
    kontakDarurat: String(row?.kontakDarurat || ""), teleponDarurat: String(row?.teleponDarurat || ""),
  });
  const [imageName, setImageName] = useState("");
  const [error, setError] = useState("");
  const update = (key: keyof typeof values, value: string) => setValues(current => ({ ...current, [key]: value }));
  const handleImage = (file?: File) => {
    if (!file) return;
    if (file.size > 1024 * 1024) return setError(t("Ukuran gambar maksimal 1 MB."));
    const reader = new FileReader();
    reader.onload = () => { update("gambarIdentitas", String(reader.result)); setImageName(file.name); setError(""); };
    reader.readAsDataURL(file);
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.gambarIdentitas) return setError(t("Unggah gambar kartu identitas."));
    onSave("tenants", { ...row, id: row?.id || `tenants-${Date.now()}`, ...values, status: row?.status || "Belum ada sewa" });
  };
  return <div className="backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><form className="dialog tenant-dialog" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="tenant-form-title">
    <div className="dialog-head"><div><h2 id="tenant-form-title">{t(state.mode === "create" ? "Tambah penyewa" : "Edit penyewa")}</h2><p>{t("Simpan kontak dan identitas penyewa tanpa menetapkan properti.")}</p></div><button type="button" className="icon-button" aria-label={t("Tutup")} onClick={onClose}><X /></button></div>
    <div className="dialog-body tenant-form"><div className="booking-notice"><Home /><span><strong>{t("Penempatan unit dilakukan lewat booking")}</strong><small>{t("Buka detail properti dan pilih Buat pemesanan untuk menetapkan penyewa ke unit.")}</small></span></div>
      <section className="form-section"><div className="form-section-head"><strong>{t("Detail kontak")}</strong><span>1</span></div><div className="form-grid"><div className="form-field full"><label htmlFor="tenant-name">{t("Nama lengkap")}</label><input id="tenant-name" autoComplete="name" value={values.nama} onChange={event => update("nama", event.target.value)} required /></div><div className="form-field"><label htmlFor="tenant-whatsapp">{t("Nomor WhatsApp")}</label><input id="tenant-whatsapp" type="tel" inputMode="tel" autoComplete="tel" pattern="[0-9+()\s-]{8,20}" placeholder="08xx xxxx xxxx" value={values.telepon} onChange={event => update("telepon", event.target.value)} required /></div><div className="form-field"><label htmlFor="tenant-email">Email</label><input id="tenant-email" type="email" inputMode="email" autoComplete="email" value={values.email} onChange={event => update("email", event.target.value)} required /></div></div></section>
      <section className="form-section"><div className="form-section-head"><strong>{t("Kartu identitas")}</strong><span>2</span></div><div className="form-grid"><div className="form-field full"><label htmlFor="tenant-id-number">{t("Nomor KTP / identitas")}</label><input id="tenant-id-number" type="text" inputMode="numeric" autoComplete="off" pattern="[0-9]{12,20}" minLength={12} maxLength={20} value={values.nomorIdentitas} onChange={event => update("nomorIdentitas", event.target.value)} required /></div><div className="form-field full"><label className={`image-upload identity-upload ${values.gambarIdentitas ? "has-image" : ""}`} htmlFor="tenant-id-image">{values.gambarIdentitas ? <img src={values.gambarIdentitas} alt={t("Pratinjau kartu identitas")} /> : <ImagePlus />}<span><strong>{imageName || t(values.gambarIdentitas ? "Ganti gambar kartu identitas" : "Unggah gambar kartu identitas")}</strong><small>{t("JPG, PNG, atau WebP. Maksimal 1 MB.")}</small></span><input id="tenant-id-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => handleImage(event.target.files?.[0])} /></label></div></div></section>
      <section className="form-section"><div className="form-section-head"><strong>{t("Kontak darurat")}</strong><span>3</span></div><div className="form-grid"><div className="form-field"><label htmlFor="emergency-name">{t("Nama kontak darurat")}</label><input id="emergency-name" autoComplete="name" value={values.kontakDarurat} onChange={event => update("kontakDarurat", event.target.value)} required /></div><div className="form-field"><label htmlFor="emergency-phone">{t("Nomor kontak darurat")}</label><input id="emergency-phone" type="tel" inputMode="tel" autoComplete="tel" pattern="[0-9+()\s-]{8,20}" value={values.teleponDarurat} onChange={event => update("teleponDarurat", event.target.value)} required /></div></div></section>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div><div className="dialog-actions"><button type="button" className="button" onClick={onClose}>{t("Batal")}</button><button type="submit" className="button primary">{t(state.mode === "create" ? "Tambah penyewa" : "Simpan perubahan")}</button></div>
  </form></div>;
}

function TicketDialog({ state, onClose, onSave }: { state: Exclude<DialogState, null>; onClose: () => void; onSave: (page: PageId, row: Row) => void }) {
  const { locale, t } = useI18n();
  const { properties } = useTokenConfig();
  const row = state.row;
  const [values, setValues] = useState({ tiket: String(row?.tiket || `TKT-${String(Date.now()).slice(-4)}`), judul: String(row?.judul || ""), properti: String(row?.properti || ""), unit: String(row?.unit || ""), penyewa: String(row?.penyewa || ""), telepon: String(row?.telepon || ""), masalah: String(row?.masalah || ""), vendor: String(row?.vendor || "Belum ditugaskan"), status: String(row?.status || "Baru") });
  const [proofs, setProofs] = useState<string[]>(String(row?.bukti || "").split("|").filter(Boolean));
  const [error, setError] = useState("");
  const optionValues = (items: unknown[], current: string) => Array.from(new Set([current, ...items.map(String)].filter(Boolean)));
  const propertyOptions = optionValues(properties.map(item => item.nama), values.properti);
  const unitOptions = optionValues(seedUnits.map(item => item.unit), values.unit);
  const tenantOptions = optionValues(moduleData.tenants.map(item => item.nama), values.penyewa);
  const vendorOptions = optionValues(vendorDirectory.map(item => item.nama), values.vendor);
  const update = (key: string, value: string) => setValues(current => ({ ...current, [key]: value }));
  const format = (before: string, after = before) => {
    const area = document.getElementById("ticket-issue") as HTMLTextAreaElement | null;
    if (!area) return;
    const start = area.selectionStart; const end = area.selectionEnd; const selected = values.masalah.slice(start, end) || (locale === "en" ? "text" : "teks");
    update("masalah", `${values.masalah.slice(0, start)}${before}${selected}${after}${values.masalah.slice(end)}`);
    requestAnimationFrame(() => area.focus());
  };
  const addProofs = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files).slice(0, 4 - proofs.length);
    if (selected.some(file => file.size > 800 * 1024)) return setError(locale === "en" ? "Each image must be smaller than 800 KB." : "Setiap gambar harus lebih kecil dari 800 KB.");
    Promise.all(selected.map(file => new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); }))).then(images => { setProofs(current => [...current, ...images].slice(0, 4)); setError(""); });
  };
  const submit = (event: React.FormEvent) => { event.preventDefault(); onSave("tickets", { id: row?.id || `tickets-${Date.now()}`, ...values, bukti: proofs.join("|") }); };
  return <div className="backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><form className="dialog ticket-dialog" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="ticket-form-title">
    <div className="dialog-head"><div><span className="eyebrow">{values.tiket}</span><h2 id="ticket-form-title">{locale === "en" ? (state.mode === "create" ? "New maintenance ticket" : "Edit maintenance ticket") : (state.mode === "create" ? "Tiket pemeliharaan baru" : "Edit tiket pemeliharaan")}</h2></div><button type="button" className="icon-button" aria-label={t("Tutup")} onClick={onClose}><X /></button></div>
    <div className="dialog-body ticket-form"><div className="form-grid">
      <div className="form-field full"><label htmlFor="ticket-title">{locale === "en" ? "Ticket title" : "Judul tiket"}</label><input id="ticket-title" value={values.judul} onChange={event => update("judul", event.target.value)} required /></div>
      <div className="form-field"><label htmlFor="ticket-property">{t("Properti")}</label><select id="ticket-property" value={values.properti} onChange={event => update("properti", event.target.value)} required><option value="">{t("Pilih")} {t("Properti").toLowerCase()}</option>{propertyOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></div><div className="form-field"><label htmlFor="ticket-unit">{t("Unit")}</label><select id="ticket-unit" value={values.unit} onChange={event => update("unit", event.target.value)} required><option value="">{t("Pilih")} {t("Unit").toLowerCase()}</option>{unitOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></div>
      <div className="form-field"><label htmlFor="ticket-tenant">{t("Penyewa")}</label><select id="ticket-tenant" value={values.penyewa} onChange={event => update("penyewa", event.target.value)} required><option value="">{t("Pilih")} {t("Penyewa").toLowerCase()}</option>{tenantOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></div><div className="form-field"><label htmlFor="ticket-phone">{t("Nomor WhatsApp")}</label><div className="input-with-icon"><Phone /><input id="ticket-phone" type="tel" inputMode="tel" autoComplete="tel" pattern="[0-9+()\s-]{8,20}" value={values.telepon} onChange={event => update("telepon", event.target.value)} required /></div></div>
      <div className="form-field full"><label htmlFor="ticket-issue">{t("Masalah")}</label><div className="rich-editor"><div className="rich-toolbar" aria-label={locale === "en" ? "Text formatting" : "Format teks"}><button type="button" onClick={() => format("**")} aria-label="Bold"><Bold /></button><button type="button" onClick={() => format("_")} aria-label="Italic"><Italic /></button><button type="button" onClick={() => format("- ", "")} aria-label="List"><List /></button></div><textarea id="ticket-issue" value={values.masalah} onChange={event => update("masalah", event.target.value)} required rows={7} placeholder={locale === "en" ? "Describe the issue, checks already performed, and access notes..." : "Jelaskan masalah, pemeriksaan yang sudah dilakukan, dan catatan akses..."} /></div></div>
      <div className="form-field full"><label>{locale === "en" ? "Image proof" : "Bukti gambar"}</label><div className="proof-uploader">{proofs.map((src, index) => <div className="proof-preview" key={index}><img src={src} alt={`${locale === "en" ? "Proof" : "Bukti"} ${index + 1}`} /><button type="button" aria-label={t("Hapus")} onClick={() => setProofs(current => current.filter((_, item) => item !== index))}><X /></button></div>)}{proofs.length < 4 && <label className="proof-add"><ImagePlus /><span>{locale === "en" ? "Add photos" : "Tambah foto"}</span><small>JPG, PNG, WebP · 800 KB</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => addProofs(event.target.files)} /></label>}</div></div>
      <div className="form-field"><label htmlFor="ticket-vendor">{t("Vendor")}</label><select id="ticket-vendor" value={values.vendor} onChange={event => update("vendor", event.target.value)} required>{vendorOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></div><div className="form-field"><label htmlFor="ticket-status">{t("Status")}</label><select id="ticket-status" value={values.status} onChange={event => update("status", event.target.value)}>{ticketStages.map(stage => <option key={stage} value={stage}>{t(stage)}</option>)}</select></div>
    </div>{error && <p className="form-error" role="alert">{error}</p>}</div>
    <div className="dialog-actions">{row && <button type="button" className="button danger" onClick={() => onSave("tickets", { ...row, _delete: 1 })}>{t("Hapus")}</button>}<span className="dialog-spacer" /><button type="button" className="button" onClick={onClose}>{t("Batal")}</button><button type="submit" className="button primary">{t(state.mode === "create" ? "Tambahkan" : "Simpan perubahan")}</button></div>
  </form></div>;
}

const tokenStatuses = ["Dikonfirmasi", "Diproses", "Token Siap", "Selesai"] as const;

function TokenOrderDialog({ state, onClose, onSave }: { state: Exclude<DialogState, null>; onClose: () => void; onSave: (page: PageId, row: Row) => void }) {
  const { locale, t, v } = useI18n();
  const { config: tokenConfig } = useTokenConfig();
  const row = state.row;
  const isCreate = state.mode === "create";

  const [allUnits, setAllUnits] = useState<Row[]>([]);
  useEffect(() => {
    const saved = localStorage.getItem("sewain:units");
    setAllUnits(saved ? JSON.parse(saved) : seedUnits);
  }, []);

  const [unitId, setUnitId] = useState(String(row?._unitId || ""));
  const [pelanggan, setPelanggan] = useState(String(row?.pelanggan || ""));
  const [unitNo, setUnitNo] = useState(String(row?.unit || ""));
  const [meter, setMeter] = useState(String(row?.meter || ""));
  const [nominalRaw, setNominalRaw] = useState<number>(() => {
    if (row?.nominal) return Number(String(row.nominal).replace(/[^\d]/g, ""));
    const sorted = [...tokenConfig.nominals].sort((a, b) => a - b);
    return sorted[1] ?? sorted[0] ?? 50000;
  });

  const platformFee = calcFee(nominalRaw, tokenConfig.fee);
  const total = nominalRaw + platformFee;
  const feeHint = tokenConfig.fee.type === "percent" ? ` (${tokenConfig.fee.value}%)` : "";

  const handleUnitChange = (id: string) => {
    setUnitId(id);
    const u = allUnits.find(u => u.id === id);
    if (u) {
      setPelanggan(String(u.penyewa || ""));
      setUnitNo(String(u.unit || ""));
      setMeter(String(u.meter || ""));
    }
  };

  const occupiedUnits = allUnits.filter(u => u.penyewa && u.penyewa !== "Belum ada");

  const buildRow = (): Row => ({
    id: row?.id || `tokens-${Date.now()}`,
    pelanggan,
    unit: unitNo,
    meter,
    nominal: formatRp(nominalRaw),
    biaya: formatRp(platformFee),
    status: String(row?.status || "Dikonfirmasi"),
    _unitId: unitId,
  });

  const submit = (e: React.FormEvent) => { e.preventDefault(); onSave("tokens", buildRow()); };

  return (
    <div className="backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="dialog" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="token-dialog-title">
        <div className="dialog-head">
          <div>
            <h2 id="token-dialog-title">{locale === "en" ? (isCreate ? "Add token order" : "Edit token order") : (isCreate ? "Tambah pesanan token" : "Edit pesanan token")}</h2>
            <p>{locale === "en" ? "Electricity token for a unit." : "Token listrik untuk unit."}</p>
          </div>
          <button type="button" className="icon-button" aria-label={t("Tutup")} onClick={onClose}><X /></button>
        </div>
        <div className="dialog-body">
          <div className="form-grid">
            {isCreate && (
              <div className="form-field full">
                <label htmlFor="token-unit">{t("Unit")}</label>
                <select id="token-unit" value={unitId} required onChange={e => handleUnitChange(e.target.value)}>
                  <option value="">{locale === "en" ? "Select unit..." : "Pilih unit..."}</option>
                  {occupiedUnits.map(u => (
                    <option key={String(u.id)} value={String(u.id)}>Unit {u.unit} — {v(u.penyewa)}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-field">
              <label htmlFor="token-pelanggan">{t("Pelanggan")}</label>
              <input id="token-pelanggan" value={pelanggan} onChange={e => setPelanggan(e.target.value)} required readOnly={isCreate && !!unitId} />
            </div>
            <div className="form-field">
              <label htmlFor="token-meter">{t("Nomor meter")}</label>
              <input id="token-meter" type="text" inputMode="numeric" autoComplete="off" pattern="[0-9\s-]{6,24}" value={meter} onChange={e => setMeter(e.target.value)} required placeholder={locale === "en" ? "Enter meter number" : "Masukkan nomor meter"} />
            </div>
            <div className="form-field">
              <label htmlFor="token-nominal">{t("Nominal")}</label>
              <select id="token-nominal" value={nominalRaw} onChange={e => setNominalRaw(Number(e.target.value))}>
                {[...tokenConfig.nominals].sort((a, b) => a - b).map(n => (
                  <option key={n} value={n}>{v(formatRp(n))}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>{locale === "en" ? "Platform fee" : "Biaya platform"}</label>
              <input readOnly value={`${v(formatRp(platformFee))}${feeHint}`} />
            </div>
            <div className="form-field full">
              <label>{locale === "en" ? "Total" : "Total tagihan"}</label>
              <input readOnly value={v(formatRp(total))} style={{ fontWeight: 600 }} />
            </div>
          </div>
        </div>
        <div className="dialog-actions">
          <button type="button" className="button" onClick={onClose}>{t("Batal")}</button>
          <button type="submit" className="button primary">{t(isCreate ? "Tambahkan" : "Simpan perubahan")}</button>
        </div>
      </form>
    </div>
  );
}

function FeeConfigDialog({ onClose }: { onClose: () => void }) {
  const { locale, t, v } = useI18n();
  const { config: tokenConfig, setConfig: setTokenConfig } = useTokenConfig();
  const [feeType, setFeeType] = useState<"flat" | "percent">(tokenConfig.fee.type);
  const [feeValue, setFeeValue] = useState(tokenConfig.fee.value);

  const save = () => {
    setTokenConfig({ ...tokenConfig, fee: { type: feeType, value: feeValue } });
    onClose();
  };

  return (
    <div className="backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="fee-dialog-title">
        <div className="dialog-head">
          <div>
            <h2 id="fee-dialog-title">{locale === "en" ? "Manage platform fee" : "Kelola biaya platform"}</h2>
            <p>{locale === "en" ? "Applied to every token order." : "Ditambahkan ke setiap pesanan token."}</p>
          </div>
          <button type="button" className="icon-button" aria-label={t("Tutup")} onClick={onClose}><X /></button>
        </div>
        <div className="dialog-body">
          <div className="form-grid">
            <div className="form-field full">
              <label>{locale === "en" ? "Fee type" : "Tipe biaya"}</label>
              <div className="choice-row">
                {(["flat", "percent"] as const).map(val => (
                  <label key={val} className={feeType === val ? "selected" : ""}>
                    <input type="radio" name="fee-type" value={val} checked={feeType === val} onChange={() => setFeeType(val)} />
                    <span>{val === "flat" ? (locale === "en" ? "Fixed (Rp)" : "Nominal tetap (Rp)") : (locale === "en" ? "Percentage (%)" : "Persentase (%)")}</span>
                    <small>{val === "flat" ? (locale === "en" ? "Same amount for every denomination." : "Sama untuk semua nominal token.") : (locale === "en" ? "Scales with token denomination." : "Proporsional terhadap nominal token.")}</small>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-field">
              <label>{feeType === "flat" ? (locale === "en" ? "Fee amount" : "Nominal biaya") : (locale === "en" ? "Percentage" : "Persentase")}</label>
              {feeType === "flat"
                ? <div className="money-input"><span>Rp</span><input type="number" min="0" value={feeValue} onChange={e => setFeeValue(Number(e.target.value))} /></div>
                : <input type="number" min="0" max="100" step="0.1" value={feeValue} onChange={e => setFeeValue(Number(e.target.value))} placeholder="%" />
              }
            </div>
            <div className="form-field full">
              <label>{locale === "en" ? "Fee preview" : "Pratinjau biaya"}</label>
              <div className="detail-grid">
                {[...tokenConfig.nominals].sort((a, b) => a - b).map(n => {
                  const fee = calcFee(n, { type: feeType, value: feeValue });
                  return [
                    <span key={`n-${n}`}>{v(formatRp(n))}</span>,
                    <span key={`t-${n}`}>+ {v(formatRp(fee))} = <strong>{v(formatRp(n + fee))}</strong></span>,
                  ];
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="dialog-actions">
          <button type="button" className="button" onClick={onClose}>{t("Batal")}</button>
          <button type="button" className="button primary" onClick={save}>{t("Simpan perubahan")}</button>
        </div>
      </div>
    </div>
  );
}

const tokenActionMap: Record<string, { label: string; labelEn: string; next: string }> = {
  "Dikonfirmasi": { label: "Proses Pesanan", labelEn: "Process Order", next: "Diproses" },
  "Diproses": { label: "Token Sudah Dibeli", labelEn: "Token Purchased", next: "Token Siap" },
  "Token Siap": { label: "Tandai Selesai", labelEn: "Mark Complete", next: "Selesai" },
};

function TokenPage({ rows, setRows, openDialog, notify }: { rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>; openDialog: (d: DialogState) => void; notify: (s: string) => void }) {
  const { locale, t, v } = useI18n();
  const [selected, setSelected] = useState<Row | null>(rows[0] ?? null);
  const [search, setSearch] = useState("");
  const [feeDialog, setFeeDialog] = useState(false);

  const filtered = rows.filter(row =>
    ["pelanggan", "unit", "meter", "nominal", "biaya", "status"].some(k => v(String(row[k] ?? "")).toLowerCase().includes(search.toLowerCase()))
  );

  const advance = (row: Row, nextStatus: string) => {
    const updated = { ...row, status: nextStatus };
    setRows(old => old.map(r => r.id === row.id ? updated : r));
    setSelected(updated);
    notify(locale === "en" ? `Order moved to ${nextStatus}.` : `Status diubah ke ${nextStatus}.`);
  };

  const remove = (row: Row) => {
    if (!window.confirm(locale === "en" ? "Delete this order?" : "Hapus pesanan ini?")) return;
    setRows(old => old.filter(r => r.id !== row.id));
    if (selected?.id === row.id) setSelected(filtered.find(r => r.id !== row.id) ?? null);
    notify(locale === "en" ? "Order deleted." : "Pesanan dihapus.");
  };

  const action = selected ? tokenActionMap[String(selected.status)] : null;
  const nominal = selected ? Number(String(selected.nominal || "0").replace(/[^\d]/g, "")) : 0;
  const biaya = selected ? Number(String(selected.biaya || "0").replace(/[^\d]/g, "")) : 0;

  return (
    <>
      <div className="page-head">
        <div><h1>{t("Token PLN")}</h1><p className="subtext">{locale === "en" ? "Electricity token orders and platform margin." : "Pesanan token listrik dan margin platform."}</p></div>
        <div className="actions">
          <button className="button" onClick={() => setFeeDialog(true)}><Settings />{locale === "en" ? "Manage fee" : "Kelola biaya"}</button>
          <button className="button primary" onClick={() => openDialog({ mode: "create", page: "tokens" })}><Plus />{locale === "en" ? "Add order" : "Tambah pesanan"}</button>
        </div>
      </div>
      <div className="split">
        <section className="panel">
          <Toolbar search={search} setSearch={setSearch} />
          <DataTable rows={filtered} selected={selected?.id} onSelect={setSelected} onEdit={row => openDialog({ mode: "edit", page: "tokens", row })} onDelete={remove} />
        </section>
        {selected ? (
          <aside className="detail-pane">
            <div className="panel-head">
              <div><h2>{v(selected.pelanggan)}</h2><p className="subtext">Unit {v(selected.unit)} · {v(selected.meter)}</p></div>
              <Status>{selected.status}</Status>
            </div>
            <div className="detail-section">
              <div className="detail-title">{locale === "en" ? "Order details" : "Detail pesanan"}</div>
              <div className="detail-grid">
                <span>{locale === "en" ? "Nominal" : "Nominal"}</span><span>{v(selected.nominal)}</span>
                <span>{locale === "en" ? "Platform fee" : "Biaya platform"}</span><span>{v(selected.biaya)}</span>
                <span><strong>Total</strong></span><span><strong>{v(formatRp(nominal + biaya))}</strong></span>
              </div>
            </div>
            {action && (
              <div className="detail-section">
                <button className="button primary" style={{ width: "100%" }} onClick={() => advance(selected, action.next)}>
                  {locale === "en" ? action.labelEn : action.label}
                </button>
              </div>
            )}
            {selected.status === "Selesai" && (
              <div className="detail-section">
                <div className="activity"><span className="activity-icon"><CheckCircle2 /></span><span><strong>{locale === "en" ? "Order complete" : "Pesanan selesai"}</strong><span className="cell-sub">{locale === "en" ? "Token has been entered into the meter." : "Token sudah dimasukkan ke meteran."}</span></span></div>
              </div>
            )}
            <div className="detail-section">
              <div className="actions">
                <button className="button" onClick={() => openDialog({ mode: "edit", page: "tokens", row: selected })}><Pencil />{t("Edit")}</button>
                <button className="icon-button" aria-label={t("Hapus")} onClick={() => remove(selected)}><Trash2 /></button>
              </div>
            </div>
          </aside>
        ) : (
          <aside className="detail-pane"><div className="empty"><ClipboardList /><div><strong>{locale === "en" ? "No orders yet" : "Belum ada pesanan"}</strong><span>{locale === "en" ? "Add a token order to get started." : "Tambahkan pesanan token untuk memulai."}</span></div></div></aside>
        )}
      </div>
      {feeDialog && <FeeConfigDialog onClose={() => setFeeDialog(false)} />}
    </>
  );
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*[^*\n]+\*|_[^_\n]+_|\{\{\s*[a-z0-9_]+\s*\}\})/gi;
  let last = 0;
  let index = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("*")) nodes.push(<strong key={`${keyPrefix}-${index}`}>{token.slice(1, -1)}</strong>);
    else if (token.startsWith("_")) nodes.push(<em key={`${keyPrefix}-${index}`}>{token.slice(1, -1)}</em>);
    else nodes.push(<span className="wa-token" key={`${keyPrefix}-${index}`}>{token}</span>);
    last = match.index + token.length;
    index += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function MessageBubbleText({ text }: { text: string }) {
  return <>{text.split("\n").map((line, idx) => {
    if (line.trim() === "") return <span className="wa-line-gap" key={idx} />;
    if (line.startsWith("- ")) return <span className="wa-list-item" key={idx}>{renderInline(line.slice(2), `l${idx}`)}</span>;
    return <span className="wa-line" key={idx}>{renderInline(line, `p${idx}`)}</span>;
  })}</>;
}

function bodySnippet(body: string) {
  const firstLine = body.split("\n").find(line => line.trim() !== "") || "";
  const plain = firstLine.replace(/[*_]/g, "").replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_m, token: string) => `[${token}]`);
  return plain.length > 90 ? `${plain.slice(0, 90)}…` : plain;
}

function MessageTemplatesPage({ templates, setTemplates, notify }: { templates: MessageTemplate[]; setTemplates: (value: MessageTemplate[]) => void; notify: (value: string) => void }) {
  const { locale } = useI18n();
  const L = (id: string, en: string) => (locale === "en" ? en : id);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = templates.find(template => template.id === editingId);
  const editingEvent = editing && findEvent(editing.eventId);

  if (editing && editingEvent) {
    return <MessageTemplateEditor template={editing} event={editingEvent} onBack={() => setEditingId(null)} onSave={updated => {
      setTemplates(templates.map(template => template.id === updated.id ? updated : template));
      setEditingId(null);
      notify(L("Template pesan disimpan.", "Message template saved."));
    }} />;
  }

  const toggleActive = (id: string) => {
    let next = false;
    setTemplates(templates.map(template => {
      if (template.id !== id) return template;
      next = !template.active;
      return { ...template, active: next };
    }));
    notify(next ? L("Template diaktifkan.", "Template activated.") : L("Template dinonaktifkan.", "Template deactivated."));
  };

  return <>
    <PageHead page="messages" />
    <section className="panel template-intro">
      <span className="template-intro-icon"><MessageSquareText /></span>
      <div>
        <strong>{L("Pesan otomatis berdasarkan peristiwa", "Event-driven automated messages")}</strong>
        <p>{L("Setiap peristiwa membawa datanya sendiri (penyewa, jatuh tempo, tautan pembayaran). Logika & variabel dikelola sistem — Anda mengatur isi pesan dan status aktifnya.", "Each event carries its own data (tenant, due date, payment link). The logic and variables are managed by the system — you author the message body and its active status.")}</p>
      </div>
    </section>
    <section className="panel template-list-panel">
      <div className="template-list">
        {templates.map(template => {
          const event = findEvent(template.eventId);
          if (!event) return null;
          return <article className={`template-row ${template.active ? "" : "is-inactive"}`} key={template.id}>
            <button type="button" className="template-row-main" onClick={() => setEditingId(template.id)}>
              <span className="template-row-icon"><MessageSquareText /></span>
              <span className="template-row-copy">
                <span className="template-row-title"><strong>{eventLabel(event, locale)}</strong>{template.interactive && <span className="template-badge">{L("Interaktif", "Interactive")}</span>}</span>
                <small>{eventTiming(event, locale)} · WhatsApp</small>
                <span className="template-row-snippet">{bodySnippet(template.body)}</span>
              </span>
            </button>
            <div className="template-row-actions">
              <label className="switch" title={L("Aktif", "Active")}>
                <input type="checkbox" checked={template.active} onChange={() => toggleActive(template.id)} aria-label={`${eventLabel(event, locale)} — ${L("Aktif", "Active")}`} />
                <span className="switch-track"><span className="switch-thumb" /></span>
              </label>
              <button type="button" className="button template-edit-button" onClick={() => setEditingId(template.id)}><Pencil />{L("Ubah", "Edit")}</button>
            </div>
          </article>;
        })}
      </div>
    </section>
  </>;
}

function MessageTemplateEditor({ template, event, onBack, onSave }: { template: MessageTemplate; event: MessageEvent; onBack: () => void; onSave: (template: MessageTemplate) => void }) {
  const { locale } = useI18n();
  const L = (id: string, en: string) => (locale === "en" ? en : id);
  const [active, setActive] = useState(template.active);
  const [body, setBody] = useState(template.body);
  const [interactive, setInteractive] = useState(Boolean(template.interactive));
  const [question, setQuestion] = useState(template.interactive?.question || "");
  const [options, setOptions] = useState<TemplateOption[]>(template.interactive?.options || []);
  const [branches, setBranches] = useState<Record<string, string>>(template.interactive?.branches || {});
  const [optionInput, setOptionInput] = useState("");
  const [showVars, setShowVars] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const eventVariables: VariableDef[] = event.variables;
  const values = sampleValues(event);

  const insertAtCursor = (snippet: string) => {
    const area = document.getElementById("template-body") as HTMLTextAreaElement | null;
    if (!area) { setBody(current => current + snippet); return; }
    const start = area.selectionStart;
    const end = area.selectionEnd;
    setBody(current => `${current.slice(0, start)}${snippet}${current.slice(end)}`);
    requestAnimationFrame(() => { area.focus(); const caret = start + snippet.length; area.setSelectionRange(caret, caret); });
  };
  const wrapSelection = (before: string, after = before) => {
    const area = document.getElementById("template-body") as HTMLTextAreaElement | null;
    if (!area) return;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selected = body.slice(start, end) || (locale === "en" ? "text" : "teks");
    setBody(`${body.slice(0, start)}${before}${selected}${after}${body.slice(end)}`);
    requestAnimationFrame(() => area.focus());
  };
  const insertVariable = (token: string) => { insertAtCursor(`{{${token}}}`); setShowVars(false); };

  const addOption = (raw = optionInput) => {
    const label = raw.trim();
    if (!label || options.some(option => option.label === label)) { setOptionInput(""); return; }
    setOptions(current => [...current, { label, reply: label }]);
    setBranches(current => ({ ...current, [label]: current[label] || "" }));
    setOptionInput("");
  };
  const removeOption = (label: string) => {
    setOptions(current => current.filter(option => option.label !== label));
    setBranches(current => { const next = { ...current }; delete next[label]; return next; });
    if (preview === label) setPreview(null);
  };
  const setBranch = (label: string, text: string) => setBranches(current => ({ ...current, [label]: text }));

  const save = () => onSave({
    ...template,
    active,
    body,
    interactive: interactive && options.length > 0 ? { question, options, branches } : undefined,
  });


  return <div className="template-editor">
    <button type="button" className="button template-back" onClick={onBack}><ChevronLeft />{L("Kembali ke daftar", "Back to list")}</button>
    <div className="template-editor-head">
      <div>
        <span className="eyebrow">{L("Template pesan", "Message template")} · WhatsApp</span>
        <h1>{eventLabel(event, locale)}</h1>
        <p>{eventDescription(event, locale)} · {eventTiming(event, locale)}</p>
      </div>
      <div className="template-editor-head-actions">
        <label className="switch-inline"><span>{active ? L("Aktif", "Active") : L("Nonaktif", "Inactive")}</span><span className="switch"><input type="checkbox" checked={active} onChange={() => setActive(value => !value)} /><span className="switch-track"><span className="switch-thumb" /></span></span></label>
        <button type="button" className="button" onClick={onBack}>{L("Batal", "Cancel")}</button>
        <button type="button" className="button primary" onClick={save}>{L("Simpan", "Save")}</button>
      </div>
    </div>

    <div className="template-editor-layout">
      <div className="template-editor-form">
        <div className="template-locked-note"><ShieldCheck /><span>{L("Logika & pemicu dikelola sistem. Anda hanya mengubah isi pesan & status aktif.", "The trigger and logic are managed by the system. You only change the message body and active status.")}</span></div>

        <section className="form-section">
          <div className="form-section-head"><strong>{L("Isi pesan", "Message body")}</strong></div>
          <div className="rich-editor">
            <div className="rich-toolbar" aria-label={L("Format teks", "Text formatting")}>
              <button type="button" onClick={() => wrapSelection("*")} aria-label="Bold"><Bold /></button>
              <button type="button" onClick={() => wrapSelection("_")} aria-label="Italic"><Italic /></button>
              <button type="button" onClick={() => wrapSelection("\n- ", "")} aria-label="List"><List /></button>
              <div className="variable-picker">
                <button type="button" className="variable-picker-trigger" onClick={() => setShowVars(value => !value)} aria-expanded={showVars}><Tag />{L("Sisipkan variabel", "Insert variable")}</button>
                {showVars && <div className="variable-menu" role="menu">
                  <div className="variable-menu-group">{L("Variabel peristiwa", "Event variables")}</div>
                  {eventVariables.map(variable => <button type="button" key={variable.token} role="menuitem" onClick={() => insertVariable(variable.token)}><code>{`{{${variable.token}}}`}</code><span>{variableLabel(variable, locale)}</span></button>)}
                  <div className="variable-menu-group">{L("Konstanta organisasi", "Organization constants")}</div>
                  {ORG_CONSTANTS.map(variable => <button type="button" key={variable.token} role="menuitem" onClick={() => insertVariable(variable.token)}><code>{`{{${variable.token}}}`}</code><span>{variableLabel(variable, locale)}</span></button>)}
                </div>}
              </div>
            </div>
            <textarea id="template-body" rows={8} value={body} onChange={field => setBody(field.target.value)} placeholder={L("Tulis pesan WhatsApp…", "Write the WhatsApp message…")} />
          </div>
          <div className="variable-hints">{eventVariables.slice(0, 6).map(variable => <button type="button" key={variable.token} onClick={() => insertVariable(variable.token)}>+ {variableLabel(variable, locale)}</button>)}</div>
        </section>

        <section className="form-section">
          <div className="form-section-head">
            <strong>{L("Balasan interaktif", "Interactive reply")}</strong>
            <label className="switch-inline"><span>{interactive ? L("Aktif", "On") : L("Nonaktif", "Off")}</span><span className="switch"><input type="checkbox" checked={interactive} onChange={() => setInteractive(value => !value)} /><span className="switch-track"><span className="switch-thumb" /></span></span></label>
          </div>
          {interactive ? <div className="interactive-builder">
            <div className="form-field full"><label htmlFor="template-question">{L("Pertanyaan", "Question")}</label><input id="template-question" value={question} onChange={field => setQuestion(field.target.value)} placeholder={L("Mis. Apakah unit bisa diakses?", "e.g. Is the unit accessible?")} /></div>
            <div className="form-field full"><label htmlFor="template-option">{L("Pilihan tombol", "Reply buttons")}</label>
              <div className="tag-input">{options.map(option => <span className="property-tag" key={option.label}>{option.label}<button type="button" aria-label={`${L("Hapus", "Remove")} ${option.label}`} onClick={() => removeOption(option.label)}><X /></button></span>)}
                <input id="template-option" value={optionInput} onChange={field => setOptionInput(field.target.value)} onKeyDown={field => { if (field.key === "Enter" || field.key === ",") { field.preventDefault(); addOption(); } }} onBlur={() => addOption()} placeholder={L("Ketik pilihan, tekan Enter", "Type an option, press Enter")} />
              </div>
            </div>
            <div className="branch-list">{options.map(option => <div className="branch-item" key={option.label}>
              <label htmlFor={`branch-${option.label}`}>{L("Jika penyewa memilih", "If the tenant selects")} <strong>“{option.label}”</strong> {L("→ kirim", "→ send")}</label>
              <textarea id={`branch-${option.label}`} rows={3} value={branches[option.label] || ""} onChange={field => setBranch(option.label, field.target.value)} placeholder={L("Pesan balasan untuk pilihan ini…", "Reply message for this option…")} />
            </div>)}{options.length === 0 && <p className="inline-empty">{L("Tambahkan pilihan tombol untuk membuat cabang pesan.", "Add reply buttons to create message branches.")}</p>}</div>
          </div> : <p className="inline-empty">{L("Aktifkan untuk menambahkan tombol pilihan & percabangan pesan (if/else).", "Turn on to add reply buttons and message branching (if/else).")}</p>}
        </section>
      </div>

      <aside className="template-preview-column">
        <div className="template-preview-label">{L("Pratinjau WhatsApp", "WhatsApp preview")}</div>
        <div className="wa-preview">
          <div className="wa-header"><span className="wa-avatar">{values.org_name?.split(" ").map(part => part[0]).slice(0, 2).join("") || "PT"}</span><div className="wa-header-copy"><strong>{values.org_name || "Sewain"}</strong><small>{L("daring", "online")}</small></div></div>
          <div className="wa-thread">
            <div className="wa-bubble in"><MessageBubbleText text={renderPreview(body, values)} /><span className="wa-meta">09.00</span></div>
            {interactive && options.length > 0 && !preview && <div className="wa-quick-replies">{options.map(option => <button type="button" key={option.label} className="wa-quick-reply" onClick={() => setPreview(option.label)}>{option.label}</button>)}</div>}
            {preview && <>
              <div className="wa-bubble out">{options.find(option => option.label === preview)?.reply || preview}<span className="wa-meta">09.01 <Check /></span></div>
              {branches[preview] ? <div className="wa-bubble in"><MessageBubbleText text={renderPreview(branches[preview], values)} /><span className="wa-meta">09.01</span></div> : <div className="wa-bubble in wa-bubble-empty">{L("Belum ada pesan balasan untuk pilihan ini.", "No reply message for this option yet.")}<span className="wa-meta">09.01</span></div>}
              <button type="button" className="wa-reset" onClick={() => setPreview(null)}>{L("Ulangi pratinjau", "Reset preview")}</button>
            </>}
          </div>
        </div>
      </aside>
    </div>
  </div>;
}

function EditDialog(props: { state: Exclude<DialogState, null>; onClose: () => void; onSave: (page: PageId, row: Row) => void }) {
  return props.state.page === "properties" ? <PropertyDialog {...props} /> : props.state.page === "tenants" ? <TenantDialog {...props} /> : props.state.page === "tickets" ? <TicketDialog {...props} /> : props.state.page === "tokens" ? <TokenOrderDialog {...props} /> : <GenericEditDialog {...props} />;
}

function SewainContent() {
  const { locale, setLocale, t } = useI18n();
  const [page, setPage] = useState<PageId>("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [booking, setBooking] = useState<BookingState | null>(null);
  const [focusReservationId, setFocusReservationId] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [toast, setToast] = useState("");
  const [propertyRows, setPropertyRows] = useStoredRows("properties", seedProperties);
  const [tokenConfig, setTokenConfig] = useStoredConfig<TokenConfig>("token-config", defaultTokenConfig);
  const [invoiceRows, setInvoiceRows] = useStoredRows("invoices", seedInvoices);
  const [tenants, setTenants] = useStoredRows("tenants", moduleData.tenants);
  const [reservations, setReservations] = useStoredRows("reservations", moduleData.reservations);
  const [tokens, setTokens] = useStoredRows("tokens", moduleData.tokens);
  const [contracts, setContracts] = useStoredRows("contracts", moduleData.contracts);
  const [templates, setTemplates] = useStoredConfig<MessageTemplate[]>("message-templates-v1", SEED_TEMPLATES);
  const [tickets, setTickets] = useStoredRows("tickets", moduleData.tickets);
  const [documents, setDocuments] = useStoredRows("documents", moduleData.documents);
  const [units, setUnits] = useStoredRows("units", seedUnits);
  useEffect(() => { setSidebarCollapsed(localStorage.getItem("sewain:sidebar-collapsed") === "true"); }, []);
  const stores: Partial<Record<PageId, [Row[], React.Dispatch<React.SetStateAction<Row[]>>]>> = useMemo(() => ({ properties: [propertyRows, setPropertyRows], invoices: [invoiceRows, setInvoiceRows], tenants: [tenants, setTenants], reservations: [reservations, setReservations], tokens: [tokens, setTokens], contracts: [contracts, setContracts], tickets: [tickets, setTickets], documents: [documents, setDocuments] }), [propertyRows, invoiceRows, tenants, reservations, tokens, contracts, tickets, documents, setPropertyRows, setInvoiceRows, setTenants, setReservations, setTokens, setContracts, setTickets, setDocuments]);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3200); };
  const go = (id: PageId) => { setPage(id); setMobileNav(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const toggleSidebar = () => setSidebarCollapsed(current => {
    localStorage.setItem("sewain:sidebar-collapsed", String(!current));
    return !current;
  });
  const openBooking = (ctx: BookingState) => { setBooking(ctx); setMobileNav(false); };
  const save = (target: PageId, row: Row) => { const store = stores[target]; if (!store) return; const [, setter] = store; setter(old => row._delete ? old.filter(item => item.id !== row.id) : old.some(r => r.id === row.id) ? old.map(r => r.id === row.id ? row : r) : [row, ...old]); setDialog(null); notify(row._delete ? message(locale, "removed", { item: t(pageMeta[target].singular) }) : message(locale, "saved", { item: t(pageMeta[target].singular) })); };
  const currentStore = stores[page];

  return <TokenConfigContext.Provider value={{ config: tokenConfig, setConfig: setTokenConfig, properties: propertyRows }}><div className={`app ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}><a className="skip-link" href="#main-content">{t("Lewati navigasi")}</a>
    {mobileNav && <button className="mobile-overlay" aria-label={t("Tutup navigasi")} onClick={() => setMobileNav(false)} />}
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <div className="brand"><span className="brand-mark"><Home size={16} /></span><span className="brand-name">Sewain</span><button className="collapse-button" onClick={toggleSidebar} aria-label={t(sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar")} aria-pressed={sidebarCollapsed} title={t(sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar")}>{sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</button></div>
      <nav className="nav" aria-label={t("Navigasi utama")}><div className="nav-label">{t("Operasional")}</div>{nav.slice(0, 9).map(item => <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => go(item.id as PageId)} aria-label={t(item.label)} title={sidebarCollapsed ? t(item.label) : undefined}><item.icon /><span className="nav-item-label">{t(item.label)}</span></button>)}<div className="nav-label">Workspace</div>{nav.slice(9).map(item => <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => go(item.id as PageId)} aria-label={t(item.label)} title={sidebarCollapsed ? t(item.label) : undefined}><item.icon /><span className="nav-item-label">{t(item.label)}</span></button>)}</nav>
      <div className="language-switcher"><span className="language-flag" aria-hidden="true">{locale === "id" ? "🇮🇩" : "🇬🇧"}</span><select id="locale" aria-label={t("Bahasa")} value={locale} onChange={event => setLocale(event.target.value as Locale)}><option value="id">Indonesia</option><option value="en">English</option></select></div>
      <div className="profile" title={sidebarCollapsed ? "Andi Triono" : undefined}><span className="avatar">AT</span><div className="profile-copy"><strong>Andi Triono</strong><span>{t("Pemilik · PT Makmur")}</span></div></div>
    </aside>
    <div className="shell"><header className="topbar"><button className="icon-button menu-button" aria-label={t("Buka navigasi")} onClick={() => setMobileNav(true)}><PanelLeftOpen /></button><div className="global-search"><Search /><input type="search" enterKeyHint="search" aria-label={t("Pencarian global")} placeholder={t("Cari properti, penyewa, atau tagihan...")} /><span className="kbd">⌘K</span></div><div className="top-actions"><button className="icon-button hide-mobile" aria-label={t("Jadwal")}><CalendarDays /></button><button className="icon-button" aria-label={t("Notifikasi")}><Bell /></button></div></header>
      <main className="main" id="main-content">
        {page === "dashboard" && <Dashboard go={go} reservations={reservations} />}
        {page === "properties" && <PropertiesPage rows={propertyRows} setRows={setPropertyRows} units={units} setUnits={setUnits} onBook={openBooking} openDialog={setDialog} notify={notify} />}
        {page === "tenants" && <TenantsPage rows={tenants} setRows={setTenants} invoices={invoiceRows} documents={documents} openDialog={setDialog} notify={notify} goToProperties={() => go("properties")} />}
        {page === "invoices" && <InvoicePage rows={invoiceRows} setRows={setInvoiceRows} openDialog={setDialog} notify={notify} />}
        {page === "tickets" && <MaintenancePage rows={tickets} setRows={setTickets} openDialog={setDialog} notify={notify} />}
        {page === "tokens" && <TokenPage rows={tokens} setRows={setTokens} openDialog={setDialog} notify={notify} />}
        {page === "settings" && <SettingsPage notify={notify} />}
        {page === "messages" && <MessageTemplatesPage templates={templates} setTemplates={setTemplates} notify={notify} />}
        {page === "reservations" && <ReservationsPage rows={reservations} setRows={setReservations} units={units} setUnits={setUnits} tenants={tenants} setTenants={setTenants} setProperties={setPropertyRows} setContracts={setContracts} setDocuments={setDocuments} setInvoices={setInvoiceRows} notify={notify} focusId={focusReservationId} onClearFocus={() => setFocusReservationId("")} onBook={openBooking} />}
        {currentStore && !["properties", "tenants", "invoices", "tickets", "tokens", "messages", "reservations"].includes(page) && <CrudPage page={page} rows={currentStore[0]} setRows={currentStore[1]} openDialog={setDialog} notify={notify} />}
      </main>
    </div>
    {dialog && <EditDialog state={dialog} onClose={() => setDialog(null)} onSave={save} />}
    {booking && <BookingDialog ctx={booking} properties={propertyRows} units={units} setUnits={setUnits} tenants={tenants} setTenants={setTenants} setReservations={setReservations} onClose={() => setBooking(null)} onCreated={id => { setFocusReservationId(id); go("reservations"); }} notify={notify} />}
    {toast && <div className="toast" role="status"><CheckCircle2 />{toast}</div>}
  </div></TokenConfigContext.Provider>;
}

export function SewainApp() {
  const [locale, setLocaleState] = useState<Locale>("id");
  useEffect(() => {
    const saved = localStorage.getItem("sewain:locale") as Locale | null;
    if (saved === "id" || saved === "en") setLocaleState(saved);
  }, []);
  const setLocale = (next: Locale) => {
    setLocaleState(next);
    localStorage.setItem("sewain:locale", next);
  };
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const context = useMemo<I18nState>(() => ({ locale, setLocale, t: value => translate(locale, value), v: value => localizeValue(locale, value) }), [locale]);
  return <I18nContext.Provider value={context}><SewainContent /></I18nContext.Provider>;
}
