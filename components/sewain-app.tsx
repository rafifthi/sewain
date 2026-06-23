"use client";

import { createContext, Fragment, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell, Bot, Building2, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleDollarSign,
  ClipboardList, CreditCard, FileText, FileType2, FolderOpen, Gauge, Home, MessageSquareText,
  Bold, CalendarClock, CalendarPlus, Download, Eraser, Eye, FileSignature, GripVertical, IdCard, ImagePlus, Italic, LayoutTemplate, List, Mail, MapPin, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Pencil, PenLine, Phone, Plus, Printer, Search, Send, Settings, Share2, ShieldCheck, Tag, TicketCheck, Trash2, Upload,
  UserCheck, UserRound, UsersRound, WalletCards, Wrench, X, Zap,
} from "lucide-react";
import { invoices as seedInvoices, moduleData, properties as seedProperties, Row, units as seedUnits } from "@/lib/data";
import { Locale, localizeValue, message, translate } from "@/lib/i18n";
import { calcFee, defaultTokenConfig, formatRp, PropertyFeeRule, TokenConfig } from "@/lib/utility-token-config";
import {
  eventDescription, eventLabel, eventTiming, findEvent, MessageEvent, MessageTemplate,
  ORG_CONSTANTS, renderPreview, SEED_TEMPLATES, slugifyToken, TemplateOption, variableLabel, VariableDef,
} from "@/lib/message-templates";
import {
  can as roleCan, emptyPermissions, initials, Member, MemberStatus, ModuleId,
  PERMISSION_ACTIONS, PERMISSION_MODULES, PermissionAction, Role, SEED_MEMBERS, SEED_ROLES,
} from "@/lib/access-control";
import {
  CONTRACT_ORG, CONTRACT_PLACEHOLDERS, ContractTemplate, contractValues,
  DEFAULT_CONTRACT_TEMPLATE_ID, findContractTemplate, SEED_CONTRACT_TEMPLATES,
} from "@/lib/contracts";
import { Sidebar, Topbar } from "@/components/layout";

type PageId = "dashboard" | "calendar" | "properties" | "tenants" | "reservations" | "invoices" | "tokens" | "contracts" | "messages" | "tickets" | "documents" | "settings";

const pageFilterOptions: Record<string, string[]> = {
  documents: ["Semua", "Privat", "Terverifikasi"],
  contracts: ["Semua", "Draf", "Menunggu tanda tangan", "Ditandatangani"],
  tickets: ["Semua", "Baru", "Ditugaskan", "Dikerjakan", "Selesai"],
  invoices: ["Semua", "Belum dibayar", "Jatuh tempo", "Terlambat", "Lunas"],
};
type DialogState = null | { mode: "create" | "edit"; page: PageId; row?: Row };
type BookingState = { propertyId?: string; unitId?: string };
type NotificationItem = {
  id: string;
  page: PageId;
  rowId: string;
  kind: "payment" | "reminder" | "maintenance" | "contract";
  title: string;
  description: string;
  time: string;
};
type IntegrationConfig = { botUrl: string; apiKey: string };
const defaultIntegrationConfig: IntegrationConfig = {
  botUrl: process.env.NEXT_PUBLIC_BOT_URL || "https://property-manager-bot.vercel.app",
  apiKey: process.env.NEXT_PUBLIC_BOT_API_KEY || "sewain-dev-key",
};

import { I18nContext, useI18n, TokenConfigContext, useTokenConfig, AccessContext, useAccess, type I18nState, type AccessCtx } from "@/components/context";

const pageMeta: Record<PageId, { title: string; description: string; singular: string }> = {
  dashboard: { title: "Ringkasan", description: "Hal yang perlu Anda tindak lanjuti hari ini.", singular: "aktivitas" },
  calendar: { title: "Kalender", description: "Jadwal pembayaran, kontrak, dan pemeliharaan dalam satu tampilan.", singular: "agenda" },
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

const notificationItems: NotificationItem[] = [
  { id: "payment-in", page: "invoices", rowId: "INV-0525-0062", kind: "payment", title: "Pembayaran masuk", description: "Dewi Lestari membayar Rp1.200.000", time: "2 menit lalu" },
  { id: "invoice-due", page: "invoices", rowId: "INV-0625-0090", kind: "reminder", title: "Tagihan jatuh tempo hari ini", description: "Ahmad Fauzi · Melati 101 · Rp1.200.000", time: "18 menit lalu" },
  { id: "wa-maintenance", page: "tickets", rowId: "x2", kind: "maintenance", title: "Keluhan baru dari WA bot", description: "Keran wastafel terus bocor · Unit 103", time: "42 menit lalu" },
  { id: "contract-signature", page: "contracts", rowId: "k2", kind: "contract", title: "Kontrak perlu ditandatangani", description: "M. Iqbal Maulana · KTR-2025-044", time: "1 jam lalu" },
];

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
    { key: "saluran", label: "Saluran", options: ["WhatsApp", "Telegram"] }, { key: "status", label: "Status", options: ["Aktif", "Nonaktif"] },
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
  telepon: "WhatsApp", telegram_id: "Telegram", sejak: "Mulai", status: "Status", penyewa: "Penyewa", properti: "Properti", periode: "Periode",
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

// Like useStoredConfig but replaces the value wholesale (no object merge), so it is
// safe for arrays and primitives that the spread-merge above would corrupt.
function useStoredState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const saved = localStorage.getItem(`sewain:${key}`);
    if (saved) try { setValue(JSON.parse(saved) as T); } catch {}
  }, [key]);
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
  const state = /tidak aktif|tidak|nonaktif|belum ada sewa/i.test(value) ? "" :
    /aktif|lunas|dihuni|selesai|terkirim|ditandatangani|terverifikasi/i.test(value) ? "success" :
    /terlambat|perawatan|perlu perhatian/i.test(value) ? "danger" :
    /\bbooking\b/i.test(value) ? "info" :
    /jatuh|dipesan|kontrak|menunggu|ditugaskan|akan kosong|draf|diproses|dikonfirmasi|token siap/i.test(value) ? "warning" : "";
  return <span className={`badge ${state} ${slug(value)}`}>{v(value)}</span>;
}

function PageHead({ page, action, back }: { page: PageId; action?: () => void; back?: () => void }) {
  const { t } = useI18n();
  const { can } = useAccess();
  const meta = pageMeta[page];
  const showAction = action && can(page as ModuleId, "create");
  return <div className="page-head">
    <div>
      {back && <button className="button" onClick={back} style={{ marginBottom: 10 }}><ChevronLeft />{t("Kembali ke properti")}</button>}
      <h1>{t(meta.title)}</h1><p className="subtext">{t(meta.description)}</p>
    </div>
    {showAction && <div className="actions"><button className="button primary" onClick={action}><Plus />{t("Tambah")} {t(meta.singular)}</button></div>}
  </div>;
}

function Toolbar({ search, setSearch, page }: { search: string; setSearch: (v: string) => void; page?: PageId }) {
  const { t } = useI18n();
  const filterOptions = page ? pageFilterOptions[page] : undefined;
  const [statusFilter, setStatusFilter] = useState("Semua");
  return <div className="toolbar">
    <div className="field-inline"><Search /><input type="search" enterKeyHint="search" aria-label={t("Cari data")} value={search} onChange={e => setSearch(e.target.value)} placeholder={t("Cari data...")} /></div>
    {filterOptions ? <select aria-label={t("Filter status")} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>{filterOptions.map(o => <option key={o} value={o}>{t(o)}</option>)}</select>
      : <select aria-label={t("Filter status")}><option>{t("Semua status")}</option><option>{t("Aktif")}</option><option>{t("Perlu tindakan")}</option></select>}
  </div>;
}

function DataTable({ rows, onEdit, onDelete, onSelect, selected, module }: { rows: Row[]; onEdit: (r: Row) => void; onDelete: (r: Row) => void; onSelect?: (r: Row) => void; selected?: string; module?: ModuleId }) {
  const { t, v } = useI18n();
  const { can } = useAccess();
  const canEdit = !module || can(module, "edit");
  const canDelete = !module || can(module, "delete");
  const keys = rows.length ? Object.keys(rows[0]).filter(k => k !== "id" && !k.startsWith("_")).slice(0, 6) : [];
  return <div className="table-wrap"><table>
    <thead><tr>{keys.map(key => <th key={key}>{t(columnLabels[key] || key)}</th>)}<th>{t("Aksi")}</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.id} onClick={() => onSelect?.(row)} className={selected === row.id ? "selected" : ""}>
      {keys.map((key, i) => <td key={key}>{key === "status" || key === "tahap" ? <Status>{row[key]}</Status> : <span className={i === 0 ? "cell-main" : ""}>{v(row[key])}</span>}</td>)}
      <td><div className="actions">{canEdit && <button className="icon-button" aria-label={`${t("Edit")} ${row.id}`} onClick={e => { e.stopPropagation(); onEdit(row); }}><Pencil /></button>}{canDelete && <button className="icon-button" aria-label={`${t("Hapus")} ${row.id}`} onClick={e => { e.stopPropagation(); onDelete(row); }}><Trash2 /></button>}{!canEdit && !canDelete && <span className="cell-sub">{t("Hanya lihat")}</span>}</div></td>
    </tr>)}</tbody>
  </table></div>;
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
  const sendTelegram = async () => {
    const text = window.prompt(locale === "en" ? "Message text" : "Teks pesan");
    if (!text) return;
    try {
      const response = await fetch("https://property-manager-bot.vercel.app/api/send", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": "sewain-dev-key" }, body: JSON.stringify({ chat_id: Number(tenant.telegram_id), text }) });
      if (!response.ok) throw new Error("Telegram send failed");
      window.alert(locale === "en" ? "Telegram message sent." : "Pesan Telegram terkirim.");
    } catch {
      window.alert(locale === "en" ? "Failed to send Telegram message." : "Gagal mengirim pesan Telegram.");
    }
  };
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
      <section className="panel tenant-card"><div className="tenant-card-head"><div><h2>{t("Kontak & identitas")}</h2></div></div><div className="contact-list contact-identity-list"><div><MessageSquareText /><span><small>WhatsApp</small><a href={whatsappUrl(tenant.telepon)} target="_blank" rel="noreferrer">{v(tenant.telepon)}</a></span></div>{tenant.telegram_id && <div><Send /><span><small>Telegram</small><button className="text-button" onClick={sendTelegram}>Kirim pesan</button></span></div>}<div><Mail /><span><small>Email</small><a href={`mailto:${tenant.email}`}>{v(tenant.email)}</a></span></div><div><IdCard /><span><small>{t("Nomor KTP / identitas")}</small><strong>{v(tenant.nomorIdentitas)}</strong></span></div><div><ShieldCheck /><span><small>{t("Kontak darurat")}</small><strong>{v(tenant.kontakDarurat)}</strong><em>{v(tenant.teleponDarurat)}</em></span></div></div></section>
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
type TicketDragPreviewState = { row: Row; x: number; y: number; width: number; height: number; offsetX: number; offsetY: number } | null;


function MaintenancePage({ rows, setRows, openDialog, notify }: { rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>; openDialog: (d: DialogState) => void; notify: (s: string) => void }) {
  const { locale, t, v } = useI18n();
  const [vendors, setVendors] = useStoredRows("vendors", vendorDirectory);
  const [tab, setTab] = useState<"board" | "vendors">("board");
  const [search, setSearch] = useState("");
  const [dragged, setDragged] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<TicketDragPreviewState>(null);
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
  const pressRef = useRef<{ startX: number; startY: number; currentX: number; currentY: number; card: HTMLElement; pointerId: number; pointerType: string; row: Row; offsetX: number; offsetY: number } | null>(null);
  const movedBeforeHoldRef = useRef(false);
  const dropStageRef = useRef<string | null>(null);
  const filtered = rows.filter(row => Object.values(row).some(value => v(value).toLowerCase().includes(search.toLowerCase())));
  useEffect(() => {
    const seedTickets = moduleData.tickets;
    setRows(current => {
      let changed = false;
      const next = current.map(row => {
        const seed = seedTickets.find(ticket => ticket.id === row.id);
        if (!seed) return row;
        const createdAt = row.createdAt || seed.createdAt;
        const assignedAt = row.assignedAt || seed.assignedAt;
        if (createdAt === row.createdAt && assignedAt === row.assignedAt) return row;
        changed = true;
        return { ...row, createdAt, assignedAt };
      });
      return changed ? next : current;
    });
  }, [setRows]);
  const updateTicket = (id: string, patch: Record<string, string | number>) => setRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  const move = (id: string, status: string) => {
    const ticket = rows.find(row => row.id === id);
    if (ticket?.status === "Baru" && status === "Ditugaskan") {
      setVendorAssignment({ ticketId: id, ticketNumber: String(ticket.tiket) });
      setSelectedVendor(ticket.vendor === "Belum ditugaskan" ? "" : String(ticket.vendor || ""));
      setDragged(null);
      setDragPreview(null);
      setDropStage(null);
      dropStageRef.current = null;
      setMenu(null);
      return;
    }
    updateTicket(id, { status, ...(status === "Ditugaskan" && !ticket?.assignedAt ? { assignedAt: new Date().toISOString() } : {}) });
    notify(locale === "en" ? `Ticket moved to ${t(status)}.` : `Tiket dipindahkan ke ${status}.`);
    setDragged(null);
    setDragPreview(null);
    setDropStage(null);
    dropStageRef.current = null;
    setMenu(null);
  };
  const assignVendor = () => {
    if (!vendorAssignment || !selectedVendor) return;
    const ticket = rows.find(row => row.id === vendorAssignment.ticketId);
    updateTicket(vendorAssignment.ticketId, { status: "Ditugaskan", vendor: selectedVendor, assignedAt: ticket?.assignedAt || new Date().toISOString() });
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
  const activateDrag = (press: NonNullable<typeof pressRef.current>) => {
    if (heldRef.current || !press.card.isConnected) return;
    cancelHold();
    const rect = press.card.getBoundingClientRect();
    heldRef.current = true;
    setDragged(press.row.id);
    setDragPreview({ row: press.row, x: press.currentX - press.offsetX, y: press.currentY - press.offsetY, width: rect.width, height: rect.height, offsetX: press.offsetX, offsetY: press.offsetY });
  };
  const beginHold = (event: React.PointerEvent, row: Row) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, select, input")) return;
    const card = event.currentTarget as HTMLElement;
    const pointerId = event.pointerId;
    const rect = card.getBoundingClientRect();
    pressRef.current = { startX: event.clientX, startY: event.clientY, currentX: event.clientX, currentY: event.clientY, card, pointerId, pointerType: event.pointerType, row, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    heldRef.current = false;
    movedBeforeHoldRef.current = false;
    cancelHold();
    card.setPointerCapture(pointerId);
    if (event.pointerType !== "mouse") holdTimer.current = window.setTimeout(() => {
      const press = pressRef.current;
      if (press) activateDrag(press);
    }, 300);
  };
  const trackHold = (event: React.PointerEvent) => {
    const press = pressRef.current;
    if (press) {
      press.currentX = event.clientX;
      press.currentY = event.clientY;
    }
    if (!heldRef.current) {
      const deltaX = press ? Math.abs(event.clientX - press.startX) : 0;
      const deltaY = press ? Math.abs(event.clientY - press.startY) : 0;
      if (press?.pointerType === "mouse" && Math.hypot(deltaX, deltaY) > 4) {
        activateDrag(press);
        return;
      }
      if (press?.pointerType !== "mouse" && deltaY > 18 && deltaY > deltaX * 1.25) {
        movedBeforeHoldRef.current = true;
        cancelHold();
      }
      return;
    }
    setDragPreview(current => current ? { ...current, x: event.clientX - current.offsetX, y: event.clientY - current.offsetY } : current);
    const column = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-ticket-stage]");
    const nextStage = column?.dataset.ticketStage || null;
    dropStageRef.current = nextStage;
    setDropStage(nextStage);
  };
  const endHold = (event: React.PointerEvent, row: Row) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, select, input")) return;
    cancelHold();
    const press = pressRef.current;
    if (press?.card.hasPointerCapture(press.pointerId)) press.card.releasePointerCapture(press.pointerId);
    pressRef.current = null;
    if (heldRef.current) {
      if (dropStageRef.current && dropStageRef.current !== row.status) move(row.id, dropStageRef.current);
      else { setDragged(null); setDragPreview(null); setDropStage(null); dropStageRef.current = null; }
      window.setTimeout(() => { heldRef.current = false; }, 0);
      return;
    }
    if (movedBeforeHoldRef.current) return;
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
          <header className={`kanban-column-head ${slug(stage)}`}><span className={`stage-indicator ${slug(stage)}`} /><h2>{t(stage)}</h2><span className="kanban-count">{stageRows.length}</span></header>
          <div className="kanban-stack">
            {stageRows.map(row => {
              const proofs = String(row.bukti || "").split("|").filter(Boolean);
              const labels = String(row.labels || "").split("|").filter(Boolean);
              return <article className={`ticket-card ${dragged === row.id ? "drag-source" : ""}`} key={row.id} role="button" tabIndex={0} aria-label={`${row.tiket}: ${v(row.judul || row.masalah)}`} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDialog({ mode: "edit", page: "tickets", row }); } }} onPointerDown={event => beginHold(event, row)} onPointerMove={trackHold} onPointerUp={event => endHold(event, row)} onPointerCancel={() => { cancelHold(); heldRef.current = false; movedBeforeHoldRef.current = false; setDragged(null); setDragPreview(null); setDropStage(null); pressRef.current = null; dropStageRef.current = null; }} onContextMenu={event => { event.preventDefault(); cancelHold(); pressRef.current = null; setMenu({ row, x: Math.max(8, Math.min(event.clientX, window.innerWidth - 276)), y: Math.max(12, Math.min(event.clientY, window.innerHeight - 460)) }); }}>
                <div className="ticket-card-top"><span className="ticket-id"><GripVertical />{row.tiket}</span><button className="icon-button" aria-label={`${locale === "en" ? "Actions for" : "Aksi untuk"} ${row.tiket}`} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); setMenu({ row, x: Math.max(8, Math.min(rect.right, window.innerWidth - 276)), y: Math.max(12, Math.min(rect.bottom + 4, window.innerHeight - 460)) }); }}><MoreHorizontal /></button></div>
                <div className="ticket-title">{v(row.judul || row.masalah)}</div>
                <div className="ticket-location"><MapPin /> <span>{v(row.properti || "Kos Melati Residence")} · {v(row.unit)}</span></div>
                <p className="ticket-issue">{String(v(row.masalah)).replace(/[*#_`>-]/g, "").replace(/\n+/g, " ")}</p>
                {proofs.length > 0 && <div className="proof-strip">{proofs.slice(0, 3).map((src, index) => <img key={index} src={src} alt={`${locale === "en" ? "Issue proof" : "Bukti masalah"} ${index + 1}`} />)}{proofs.length > 3 && <span>+{proofs.length - 3}</span>}</div>}
                <div className="ticket-person"><span className="avatar small">{String(row.penyewa || "NA").split(" ").map(part => part[0]).slice(0, 2).join("")}</span><span><strong>{v(row.penyewa || "Belum ada")}</strong><small>{v(row.telepon || "-")}</small></span></div>
                {labels.length > 0 && <div className="ticket-labels">{labels.map(label => <span key={label}>{v(label)}</span>)}</div>}
                <TicketTimestamps row={row} />
                <div className="ticket-footer"><span className={`vendor-chip ${row.vendor === "Belum ditugaskan" ? "unassigned" : ""}`}><Wrench />{v(row.vendor)}</span>{row.dueDate && <span className="ticket-due"><CalendarClock />{v(row.dueDate)}</span>}</div>
              </article>;
            })}
            {!stageRows.length && <div className="kanban-empty">{locale === "en" ? "Drop a ticket here" : "Taruh tiket di sini"}</div>}
          </div>
        </section>;
      })}
    </div>{dragPreview && <TicketDragPreview preview={dragPreview} />}</>}
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

function TicketDragPreview({ preview }: { preview: Exclude<TicketDragPreviewState, null> }) {
  const { locale, v } = useI18n();
  const row = preview.row;
  const labels = String(row.labels || "").split("|").filter(Boolean);
  return <div className="ticket-drag-preview" aria-hidden="true" style={{ width: preview.width, minHeight: preview.height, transform: `translate3d(${preview.x}px, ${preview.y}px, 0) rotate(.6deg) scale(1.02)` }}>
    <div className="ticket-card-top"><span className="ticket-id"><GripVertical />{row.tiket}</span><span className="drag-status">{locale === "en" ? "Moving" : "Memindahkan"}</span></div>
    <div className="ticket-title">{v(row.judul || row.masalah)}</div>
    <div className="ticket-location"><MapPin /><span>{v(row.properti || "Kos Melati Residence")} · {v(row.unit)}</span></div>
    <p className="ticket-issue">{String(v(row.masalah)).replace(/[*#_`>-]/g, "").replace(/\n+/g, " ")}</p>
    <div className="ticket-person"><span className="avatar small">{String(row.penyewa || "NA").split(" ").map(part => part[0]).slice(0, 2).join("")}</span><span><strong>{v(row.penyewa || "Belum ada")}</strong><small>{v(row.telepon || "-")}</small></span></div>
    {labels.length > 0 && <div className="ticket-labels">{labels.map(label => <span key={label}>{v(label)}</span>)}</div>}
    <TicketTimestamps row={row} />
    <div className="ticket-footer"><span className={`vendor-chip ${row.vendor === "Belum ditugaskan" ? "unassigned" : ""}`}><Wrench />{v(row.vendor)}</span>{row.dueDate && <span className="ticket-due"><CalendarClock />{v(row.dueDate)}</span>}</div>
  </div>;
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

function PropertyCard({ row, onOpen }: { row: Row; onOpen: () => void }) {
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
      <div className="property-card-body"><h2>{v(row.nama)}</h2><p>{v(row.alamat || row.lokasi)}</p>{isMulti && <div className="vacancy-block"><div><span>{vacancySummary}</span><strong>{vacancyPercentage}%</strong></div><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="vacancy-progress" role="progressbar" aria-label={t("Persentase unit kosong")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={vacancyPercentage} style={{ flex: 1 }}><span style={{ width: `${vacancyPercentage}%` }} /></div><span style={{ fontSize: '.75rem', fontWeight: 700, minWidth: 32, textAlign: 'right', color: 'var(--text-secondary)' }}>{vacancyPercentage}%</span></div></div>}</div>
    </button>
    <div className="property-card-footer"><div><strong>{v(row.pendapatan || "Rp0")}</strong><span>/ {t("bulan")}</span></div></div>
  </article>;
}

function PropertiesPage({ rows, setRows, units, setUnits, invoices, tickets, onBook, onViewReservations, openDialog, notify }: { rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>; units: Row[]; setUnits: React.Dispatch<React.SetStateAction<Row[]>>; invoices: Row[]; tickets: Row[]; onBook: (ctx: BookingState) => void; onViewReservations: () => void; openDialog: (d: DialogState) => void; notify: (s: string) => void }) {
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
  const liveSelected = selected ? rows.find(r => r.id === selected.id) || selected : null;
  if (liveSelected) return <PropertyDetail property={liveSelected} units={units} setUnits={setUnits} setProperties={setRows} invoices={invoices} tickets={tickets} onBook={onBook} onViewReservations={onViewReservations} onBack={() => setSelected(null)} openDialog={openDialog} notify={notify} />;
  return <><PageHead page="properties" action={() => openDialog({ mode: "create", page: "properties" })} />
    <div className="property-list-toolbar"><div className="field-inline"><Search /><input type="search" enterKeyHint="search" aria-label={t("Cari properti")} value={search} onChange={event => setSearch(event.target.value)} placeholder={t("Cari properti...")} /></div><div className="property-filter-list" aria-label={t("Filter properti")}>{filters.map(item => <button type="button" className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{v(item)}</button>)}</div></div>
    {filtered.length ? <section className="property-grid">{filtered.map(row => <PropertyCard key={row.id} row={row} onOpen={() => setSelected(row)} />)}</section> : <div className="property-empty"><Building2 /><strong>{t("Properti tidak ditemukan")}</strong><span>{t("Ubah pencarian atau filter untuk melihat properti lain.")}</span></div>}
  </>;
}

function PropertyDetail({ property, units, setUnits, setProperties, invoices, tickets, onBook, onViewReservations, onBack, openDialog, notify }: { property: Row; units: Row[]; setUnits: React.Dispatch<React.SetStateAction<Row[]>>; setProperties: React.Dispatch<React.SetStateAction<Row[]>>; invoices: Row[]; tickets: Row[]; onBook: (ctx: BookingState) => void; onViewReservations: () => void; onBack: () => void; openDialog: (d: DialogState) => void; notify: (s: string) => void }) {
  const { locale, t, v } = useI18n();
  const [activeTab, setActiveTab] = useState<"units" | "invoices" | "tickets">("units");
  const propertyUnits = unitsForProperty(units, property);
  const [unitSearch, setUnitSearch] = useState("");
  const [unitDrawer, setUnitDrawer] = useState<Row | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [addUnit, setAddUnit] = useState(false);
  const [unitForm, setUnitForm] = useState({ unit: "", tipe: "Standar", lantai: "1", sewa: "", deposit: "" });
  const filteredUnits = propertyUnits.filter(row => Object.values(row).some(value => v(value).toLowerCase().includes(unitSearch.toLowerCase())));
  const total = propertyUnits.length || Number(property.unit || 0);
  const occupied = propertyUnits.filter(row => /dihuni/i.test(String(row.status))).length;
  const vacant = propertyUnits.filter(isVacant).length;
  const occupancy = total ? Math.round((occupied / total) * 100) : 0;
  const propLabels = String(property.labels || property.tipe || "").split(/[|,]/).map(l => l.trim()).filter(Boolean);
  const propertyTag = String(property.nama).replace(/^(Kos|Kontrakan|Ruko|Apartemen|Rumah|Paviliun)\s+/i, "").split(/[\s,]+/)[0];
  const propertyInvoices = invoices.filter(inv => String(inv.unit || "").startsWith(propertyTag) || String(inv.unit || "") === String(property.nama));
  const propertyTickets = tickets.filter(tkt => String(tkt.properti) === String(property.nama));
  const openTickets = propertyTickets.filter(tkt => tkt.status !== "Selesai");
  const waHref = property.contactPhone ? `https://wa.me/62${String(property.contactPhone).replace(/\D/g, "").replace(/^0/, "")}` : undefined;
  const singleUnit = isSingleUnit(property);
  const primaryUnit = singleUnit ? propertyUnits[0] : undefined;

  const handleSetStatus = (status: string) => {
    setProperties(old => old.map(r => r.id === property.id ? { ...r, status } : r));
    notify(locale === "en" ? `Property set to ${status}.` : `Status properti diubah ke ${status}.`);
    setShowMore(false);
  };
  const handleDeleteProperty = () => {
    setProperties(old => old.filter(r => r.id !== property.id));
    notify(locale === "en" ? "Property deleted." : "Properti dihapus.");
    onBack();
  };
  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    const newUnit: Row = { id: `unit-${Date.now()}`, unit: unitForm.unit, tipe: unitForm.tipe, lantai: unitForm.lantai, penyewa: "Belum ada", status: "Kosong", sewa: unitForm.sewa ? formatRp(rupiah(unitForm.sewa)) : "Rp0", deposit: unitForm.deposit ? formatRp(rupiah(unitForm.deposit)) : "Rp0", tunggakan: "Rp0", meter: "-", _propertiId: property.id };
    const nextUnits = [...units, newUnit];
    setUnits(nextUnits);
    setProperties(old => old.map(p => p.id === property.id ? { ...p, unit: Number(p.unit || 1) + 1 } : p));
    notify(locale === "en" ? "Unit added." : "Unit berhasil ditambahkan.");
    setAddUnit(false);
    setUnitForm({ unit: "", tipe: "Standar", lantai: "1", sewa: "", deposit: "" });
  };

  const singleUnitView = primaryUnit ? <section className="single-unit-panel">
    <div className="single-unit-head"><div><span className="eyebrow">{locale === "en" ? "Primary unit" : "Unit utama"}</span><h2>{v(property.nama)}</h2><p>{v(primaryUnit.tipe)} · {t("Lantai")} {v(primaryUnit.lantai)}</p></div><div className="single-unit-head-actions"><Status>{primaryUnit.status}</Status>{isVacant(primaryUnit) ? <button className="button primary" onClick={() => onBook({ propertyId: property.id, unitId: primaryUnit.id })}><CalendarPlus />{t("Buat pemesanan")}</button> : <button className="button" onClick={onViewReservations}><WalletCards />{locale === "en" ? "View active lease" : "Lihat sewa aktif"}</button>}</div></div>
    <div className="single-unit-facts"><section><span>{locale === "en" ? "Occupancy" : "Hunian"}</span><dl><div><dt>{t("Penyewa")}</dt><dd>{v(primaryUnit.penyewa)}</dd></div><div><dt>{t("Status")}</dt><dd>{v(primaryUnit.status)}</dd></div></dl></section><section><span>{locale === "en" ? "Pricing" : "Harga"}</span><dl><div><dt>{t("Sewa per bulan")}</dt><dd>{v(primaryUnit.sewa)}</dd></div><div><dt>Deposit</dt><dd>{v(primaryUnit.deposit || formatRp(unitDeposit(primaryUnit, property)))}</dd></div><div><dt>{t("Siklus penagihan")}</dt><dd>{v(property.billingCycle || "Bulanan")}</dd></div></dl></section><section><span>{locale === "en" ? "Utilities and balance" : "Utilitas dan saldo"}</span><dl><div><dt>{t("Nomor meter")}</dt><dd>{v(primaryUnit.meter || "-")}</dd></div><div><dt>{t("Tunggakan")}</dt><dd className={primaryUnit.tunggakan !== "Rp0" ? "money-danger" : ""}>{v(primaryUnit.tunggakan || "Rp0")}</dd></div></dl></section></div>
    <div className="single-unit-activity"><div className="detail-title">{t("Aktivitas unit")}</div><div className="activity"><span className="activity-icon"><Check /></span><span><strong>{t("Inspeksi rutin selesai")}</strong><span className="cell-sub">{t("Tidak ada kerusakan")}</span></span><time>12 Jun</time></div><div className="activity"><span className="activity-icon"><CreditCard /></span><span><strong>{t("Tagihan Juni dibuat")}</strong><span className="cell-sub">{t("Jatuh tempo 5 Juni")}</span></span><time>1 Jun</time></div></div>
  </section> : null;

  return <>
    <div className="page-head">
      <div><button className="button" onClick={onBack} style={{ marginBottom: 10 }}><ChevronLeft />{t("Semua properti")}</button><div className="property-title"><h1>{v(property.nama)}</h1><Status>{property.status}</Status></div></div>
      <div className="actions">
        <button className="button" onClick={() => openDialog({ mode: "edit", page: "properties", row: property })}><Pencil />{t("Edit")}</button>
        <div className="more-menu-wrap">
          <button className="icon-button" aria-label={t("Opsi lainnya")} onClick={() => setShowMore(v => !v)}><MoreHorizontal /></button>
          {showMore && <><button className="more-dismiss" aria-hidden="true" onClick={() => setShowMore(false)} /><div className="more-popover" role="menu">
            <button role="menuitem" onClick={() => { notify(locale === "en" ? "Property link copied." : "Tautan properti disalin."); setShowMore(false); }}><Share2 />{t("Bagikan")}</button>
            <button role="menuitem" onClick={() => handleSetStatus(String(property.status) === "Aktif" ? "Tidak Aktif" : "Aktif")}><Eye />{String(property.status) === "Aktif" ? (locale === "en" ? "Set inactive" : "Nonaktifkan") : (locale === "en" ? "Set active" : "Aktifkan")}</button>
            <div className="more-popover-divider" />
            <button role="menuitem" className="more-popover-danger" onClick={() => { setShowMore(false); setShowDeleteConfirm(true); }}><Trash2 />{locale === "en" ? "Delete property" : "Hapus properti"}</button>
          </div></>}
        </div>
        <button className="button primary" onClick={() => onBook({ propertyId: property.id })}><Plus />{t("Buat pemesanan")}</button>
      </div>
    </div>

    <section className="panel property-overview">
      <div className="property-overview-main">
        <div className="property-overview-media">{property.image ? <img src={String(property.image)} alt={v(property.nama)} /> : <div className="property-image-placeholder"><Building2 /><span>{t("Gambar belum tersedia")}</span></div>}</div>
        <div className="property-overview-copy">
          <div className="property-header-labels">{propLabels.map(label => <span key={label}>{v(label)}</span>)}</div>
          <div className="property-overview-facts"><p><MapPin />{v(property.alamat || property.lokasi)}</p>{property.contactName && <p><UserRound />{waHref ? <a href={waHref} target="_blank" rel="noreferrer">{v(property.contactName)} · {v(property.contactPhone)}</a> : v(property.contactName)}</p>}<p><CreditCard />{v(property.billingCycle || "Bulanan")}</p></div>
        </div>
      </div>
      <div className="property-overview-metrics"><div><span>{t("Total unit")}</span><strong>{total}</strong></div><div><span>{t("Terisi")}</span><strong>{occupied}</strong><small>{occupancy}%</small></div><div><span>{t("Kosong")}</span><strong>{vacant}</strong></div><div><span>{t("Pendapatan bulan ini")}</span><strong>{v(property.pendapatan || "Rp0")}</strong></div></div>
    </section>

    <section className={`panel property-workspace ${singleUnit ? "single-unit-mode" : ""}`}>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={activeTab === "units"} className={`tab ${activeTab === "units" ? "active" : ""}`} onClick={() => setActiveTab("units")}>{t("Unit")}<span className="tab-count">{propertyUnits.length}</span></button>
        <button role="tab" aria-selected={activeTab === "invoices"} className={`tab ${activeTab === "invoices" ? "active" : ""}`} onClick={() => setActiveTab("invoices")}>{t("Tagihan")}{propertyInvoices.length > 0 && <span className="tab-count">{propertyInvoices.length}</span>}</button>
        <button role="tab" aria-selected={activeTab === "tickets"} className={`tab ${activeTab === "tickets" ? "active" : ""}`} onClick={() => setActiveTab("tickets")}>{locale === "en" ? "Tickets" : "Tiket"}{openTickets.length > 0 && <span className="tab-count">{openTickets.length}</span>}</button>
      </div>
      {activeTab === "units" && singleUnitView}
      {activeTab === "units" && <div className="property-unit-list">
        {!singleUnit && <div className="unit-list-head"><button className="button" onClick={() => setAddUnit(true)}><Plus />{locale === "en" ? "Add unit" : "Tambah unit"}</button></div>}
        <Toolbar search={unitSearch} setSearch={setUnitSearch} />
        {filteredUnits.length ? <DataTable rows={filteredUnits} onSelect={row => setUnitDrawer(row)} onEdit={row => { isVacant(row) ? onBook({ propertyId: property.id, unitId: row.id }) : notify(locale === "en" ? "This unit is occupied. Use the lease to manage its tenant." : "Unit ini terisi. Kelola penyewanya melalui sewa."); }} onDelete={row => { setUnits(old => old.filter(r => r.id !== row.id)); notify(message(locale, "unitRemoved", { unit: row.unit })); }} /> : <div className="empty"><Building2 /><div><strong>{unitSearch ? t("Belum ada data yang cocok") : t("Belum ada unit")}</strong><span>{unitSearch ? t("Ubah pencarian atau filter untuk melihat properti lain.") : t("Tambahkan unit pada properti ini untuk mulai membuat pemesanan.")}</span></div></div>}
      </div>}
      {activeTab === "invoices" && (propertyInvoices.length ? <div className="table-wrap"><table><thead><tr><th>ID</th><th>{t("Penyewa")}</th><th>Unit</th><th>{t("Periode")}</th><th>{t("Jatuh tempo")}</th><th>Total</th><th>Sisa</th><th>Status</th></tr></thead><tbody>{propertyInvoices.map(inv => <tr key={inv.id}><td><span className="ticket-id">{inv.id}</span></td><td>{v(inv.penyewa)}</td><td>{v(inv.unit)}</td><td>{v(inv.periode)}</td><td>{v(inv.jatuhTempo)}</td><td>{v(inv.total)}</td><td className={inv.sisa !== "Rp0" ? "money-danger" : ""}>{v(inv.sisa)}</td><td><Status>{inv.status}</Status></td></tr>)}</tbody></table></div> : <div className="empty"><CreditCard /><div><strong>{locale === "en" ? "No invoices" : "Belum ada tagihan"}</strong><span>{locale === "en" ? "Invoices for units in this property appear here." : "Tagihan unit properti ini akan muncul di sini."}</span></div></div>)}
      {activeTab === "tickets" && (propertyTickets.length ? <div className="table-wrap"><table><thead><tr><th>Tiket</th><th>Judul</th><th>Unit</th><th>{t("Penyewa")}</th><th>Vendor</th><th>Status</th></tr></thead><tbody>{propertyTickets.map(tkt => <tr key={tkt.id}><td><span className="ticket-id">{v(tkt.tiket)}</span></td><td>{v(tkt.judul)}</td><td>{v(tkt.unit)}</td><td>{v(tkt.penyewa)}</td><td>{v(tkt.vendor)}</td><td><Status>{tkt.status}</Status></td></tr>)}</tbody></table></div> : <div className="empty"><Wrench /><div><strong>{locale === "en" ? "No tickets" : "Belum ada tiket"}</strong><span>{locale === "en" ? "Maintenance tickets for this property appear here." : "Tiket pemeliharaan properti ini akan muncul di sini."}</span></div></div>)}
    </section>

    {/* Unit side drawer */}
    {unitDrawer && <>
      <button className="more-dismiss" aria-hidden="true" onClick={() => setUnitDrawer(null)} />
      <aside className="unit-drawer" role="dialog" aria-modal="true" aria-label={`${t("Detail unit")} ${unitDrawer.unit}`}>
        <div className="unit-drawer-head">
          <div><h2>{t("Detail unit")} {v(unitDrawer.unit)}</h2><p>{v(unitDrawer.tipe)} · {t("Lantai")} {v(unitDrawer.lantai)}</p></div>
          <button className="icon-button" aria-label={t("Tutup")} onClick={() => setUnitDrawer(null)}><X /></button>
        </div>
        <div className="unit-drawer-body">
          <div className="detail-section"><div className="detail-title">{t("Status hunian")} <Status>{unitDrawer.status}</Status></div><div className="detail-grid"><span>{t("Penyewa")}</span><span>{v(unitDrawer.penyewa)}</span><span>{t("Sewa per bulan")}</span><span>{v(unitDrawer.sewa)}</span><span>Deposit</span><span>{v(unitDrawer.deposit || formatRp(unitDeposit(unitDrawer, property)))}</span><span>{t("Tunggakan")}</span><span className={unitDrawer.tunggakan !== "Rp0" ? "money-danger" : ""}>{v(unitDrawer.tunggakan)}</span><span>{t("Nomor meter")}</span><span>{v(unitDrawer.meter || "-")}</span></div>{isVacant(unitDrawer) && <button className="button primary unit-booking-action" onClick={() => { setUnitDrawer(null); onBook({ propertyId: property.id, unitId: unitDrawer.id }); }}><CalendarPlus />{t("Pesan unit ini")}</button>}</div>
          <div className="detail-section"><div className="detail-title">{t("Aktivitas unit")}</div><div className="activity"><span className="activity-icon"><Check /></span><span><strong>{t("Inspeksi rutin selesai")}</strong><span className="cell-sub">{t("Tidak ada kerusakan")}</span></span><time>12 Jun</time></div><div className="activity"><span className="activity-icon"><CreditCard /></span><span><strong>{t("Tagihan Juni dibuat")}</strong><span className="cell-sub">{t("Jatuh tempo 5 Juni")}</span></span><time>1 Jun</time></div></div>
        </div>
      </aside>
    </>}

    {/* Delete property confirmation */}
    {showDeleteConfirm && <div className="backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && setShowDeleteConfirm(false)}><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="delete-property-title"><div className="dialog-head"><div><h2 id="delete-property-title">{locale === "en" ? "Delete property?" : "Hapus properti?"}</h2><p>{locale === "en" ? `This will permanently remove "${v(property.nama)}" and cannot be undone.` : `Tindakan ini akan menghapus "${v(property.nama)}" secara permanen dan tidak dapat dibatalkan.`}</p></div><button className="icon-button" aria-label={t("Tutup")} onClick={() => setShowDeleteConfirm(false)}><X /></button></div><div className="dialog-actions"><button className="button" onClick={() => setShowDeleteConfirm(false)}>{t("Batal")}</button><button className="button danger" onClick={handleDeleteProperty}><Trash2 />{locale === "en" ? "Delete" : "Hapus"}</button></div></div></div>}

    {/* Add unit dialog */}
    {addUnit && <div className="backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && setAddUnit(false)}><form className="dialog" role="dialog" aria-modal="true" aria-labelledby="add-unit-title" onSubmit={handleAddUnit}><div className="dialog-head"><div><h2 id="add-unit-title">{locale === "en" ? "Add unit" : "Tambah unit"}</h2><p>{locale === "en" ? "Add a new unit to this property." : "Tambahkan unit baru ke properti ini."}</p></div><button type="button" className="icon-button" aria-label={t("Tutup")} onClick={() => setAddUnit(false)}><X /></button></div><div className="dialog-body"><div className="form-grid"><div className="form-field"><label htmlFor="au-unit">{locale === "en" ? "Unit name / number" : "Nama / nomor unit"}</label><input id="au-unit" value={unitForm.unit} onChange={e => setUnitForm(f => ({ ...f, unit: e.target.value }))} required /></div><div className="form-field"><label htmlFor="au-tipe">{locale === "en" ? "Type" : "Tipe"}</label><select id="au-tipe" value={unitForm.tipe} onChange={e => setUnitForm(f => ({ ...f, tipe: e.target.value }))}>{["Standar", "Deluxe", "Premium", "Studio"].map(o => <option key={o}>{o}</option>)}</select></div><div className="form-field"><label htmlFor="au-lantai">{locale === "en" ? "Floor" : "Lantai"}</label><input id="au-lantai" value={unitForm.lantai} onChange={e => setUnitForm(f => ({ ...f, lantai: e.target.value }))} /></div><div className="form-field"><label htmlFor="au-sewa">{t("Sewa per bulan")}</label><div className="money-input"><span>Rp</span><input id="au-sewa" type="number" inputMode="numeric" min="0" step="1000" value={unitForm.sewa} onChange={e => setUnitForm(f => ({ ...f, sewa: e.target.value }))} /></div></div><div className="form-field">  <label htmlFor="au-deposit">Deposit</label><div className="money-input"><span>Rp</span><input id="au-deposit" type="number" inputMode="numeric" min="0" step="1000" value={unitForm.deposit} onChange={e => setUnitForm(f => ({ ...f, deposit: e.target.value }))} /></div></div></div></div><div className="dialog-actions"><button type="button" className="button" onClick={() => setAddUnit(false)}>{t("Batal")}</button><button type="submit" className="button primary"><Plus />{locale === "en" ? "Add unit" : "Tambah unit"}</button></div></form></div>}
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
}


const actionLabel: Record<PermissionAction, string> = { view: "Lihat", create: "Tambah", edit: "Ubah", delete: "Hapus" };
const memberStatusLabel: Record<MemberStatus, string> = { active: "Aktif", invited: "Diundang", inactive: "Nonaktif" };





function PropertyDialog({ state, onClose, onSave }: { state: Exclude<DialogState, null>; onClose: () => void; onSave: (page: PageId, row: Row) => void }) {
  const { locale, t } = useI18n();
  const row = state.row;
  const initialLabels = String(row?.labels || row?.tipe || "").split(/[|,]/).map(item => item.trim()).filter(Boolean);
  const legacyContact = String(row?.kontak || "");
  const legacyPhone = legacyContact.match(/(?:\+?\d[\d\s-]{7,})$/)?.[0]?.trim() || "";
  const [name, setName] = useState(String(row?.nama || ""));
  const fullAddress = String(row?.alamat || row?.lokasi || "");
  const [addressStreet, setAddressStreet] = useState(String(row?.addressStreet || fullAddress));
  const [addressCity, setAddressCity] = useState(String(row?.addressCity || ""));
  const [addressProvince, setAddressProvince] = useState(String(row?.addressProvince || ""));
  const [addressZip, setAddressZip] = useState(String(row?.addressZip || ""));
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
      lokasi: [addressStreet, addressCity].filter(Boolean).join(", "),
      unit: totalUnits,
      terisi: Math.min(Number(row?.terisi || 0), totalUnits),
      pendapatan: defaultPrice ? rupiah(defaultPrice) : String(row?.pendapatan || "Rp0"),
      status: String(row?.status || "Aktif"),
      alamat: [addressStreet, addressCity, addressProvince, addressZip].filter(Boolean).join(", "),
      addressStreet,
      addressCity,
      addressProvince,
      addressZip,
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
        <div className="form-field full"><label htmlFor="property-address">{t("Alamat")}</label><input id="property-address" autoComplete="street-address" value={addressStreet} onChange={event => setAddressStreet(event.target.value)} required placeholder={locale === "en" ? "Street address" : "Jalan, nomor, RT/RW"} /></div>
        <div className="form-field"><label htmlFor="property-city">{locale === "en" ? "City" : "Kota"}</label><input id="property-city" autoComplete="address-level2" value={addressCity} onChange={event => setAddressCity(event.target.value)} required placeholder={locale === "en" ? "City" : "Kota"} /></div>
        <div className="form-field"><label htmlFor="property-province">{locale === "en" ? "Province" : "Provinsi"}</label><input id="property-province" autoComplete="address-level1" value={addressProvince} onChange={event => setAddressProvince(event.target.value)} required placeholder={locale === "en" ? "Province" : "Provinsi"} /></div>
        <div className="form-field"><label htmlFor="property-zip">{locale === "en" ? "Zip code" : "Kode pos"}</label><input id="property-zip" autoComplete="postal-code" inputMode="numeric" value={addressZip} onChange={event => setAddressZip(event.target.value)} required placeholder="12345" /></div>
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
    nama: String(row?.nama || ""), telepon: String(row?.telepon || ""), email: String(row?.email || ""), telegram_id: String(row?.telegram_id || ""),
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
      <section className="form-section"><div className="form-section-head"><strong>{t("Detail kontak")}</strong><span>1</span></div><div className="form-grid"><div className="form-field full"><label htmlFor="tenant-name">{t("Nama lengkap")}</label><input id="tenant-name" autoComplete="name" value={values.nama} onChange={event => update("nama", event.target.value)} required /></div><div className="form-field"><label htmlFor="tenant-whatsapp">{t("Nomor WhatsApp")}</label><input id="tenant-whatsapp" type="tel" inputMode="tel" autoComplete="tel" pattern="[0-9+()\s-]{8,20}" placeholder="08xx xxxx xxxx" value={values.telepon} onChange={event => update("telepon", event.target.value)} required /></div><div className="form-field"><label htmlFor="tenant-email">Email</label><input id="tenant-email" type="email" inputMode="email" autoComplete="email" value={values.email} onChange={event => update("email", event.target.value)} required /></div><div className="form-field"><label htmlFor="tenant-telegram">Telegram ID</label><input id="tenant-telegram" type="text" inputMode="numeric" placeholder="Chat ID (angka)" value={values.telegram_id} onChange={event => update("telegram_id", event.target.value)} /></div></div></section>
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
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const now = new Date().toISOString();
    onSave("tickets", {
      id: row?.id || `tickets-${Date.now()}`,
      ...values,
      bukti: proofs.join("|"),
      createdAt: row?.createdAt || now,
      assignedAt: row?.assignedAt || (values.status === "Ditugaskan" ? now : ""),
    });
  };
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



const tokenActionMap: Record<string, { label: string; labelEn: string; next: string }> = {
  "Dikonfirmasi": { label: "Proses Pesanan", labelEn: "Process Order", next: "Diproses" },
  "Diproses": { label: "Token Sudah Dibeli", labelEn: "Token Purchased", next: "Token Siap" },
  "Token Siap": { label: "Tandai Selesai", labelEn: "Mark Complete", next: "Selesai" },
};







function EditDialog(props: { state: Exclude<DialogState, null>; onClose: () => void; onSave: (page: PageId, row: Row) => void }) {
  return props.state.page === "properties" ? <PropertyDialog {...props} /> : props.state.page === "tenants" ? <TenantDialog {...props} /> : props.state.page === "tickets" ? <TicketDialog {...props} /> : props.state.page === "tokens" ? <TokenOrderDialog {...props} /> : <GenericEditDialog {...props} />;
}

type CalendarEventKind = "payment" | "maintenance" | "contract" | "move";
type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  titleEn: string;
  detail: string;
  kind: CalendarEventKind;
  target: PageId;
  status: "ongoing" | "upcoming";
  time?: string;
};

const calendarEvents: CalendarEvent[] = [
  { id: "cal-1", date: "2026-06-22", title: "Perbaikan pipa bocor", titleEn: "Leaking pipe repair", detail: "Kost Menteng Indah · Unit 109", kind: "maintenance", target: "tickets", status: "ongoing", time: "09.00–12.00" },
  { id: "cal-2", date: "2026-06-22", title: "8 tagihan jatuh tempo", titleEn: "8 invoices due", detail: "3 properti · Rp9.600.000", kind: "payment", target: "invoices", status: "ongoing", time: "Hari ini" },
  { id: "cal-3", date: "2026-06-24", title: "Kunjungan teknisi AC", titleEn: "AC technician visit", detail: "Villa Bintaro Residence · Unit 204", kind: "maintenance", target: "tickets", status: "upcoming", time: "10.30" },
  { id: "cal-4", date: "2026-06-25", title: "Pengingat pembayaran", titleEn: "Payment reminder", detail: "12 penyewa belum membayar", kind: "payment", target: "invoices", status: "upcoming", time: "08.00" },
  { id: "cal-5", date: "2026-06-26", title: "Serah terima unit", titleEn: "Unit handover", detail: "Apartemen Setiabudi · Unit A-18", kind: "move", target: "reservations", status: "upcoming", time: "14.00" },
  { id: "cal-6", date: "2026-06-28", title: "3 kontrak berakhir", titleEn: "3 contracts expire", detail: "Perlu keputusan perpanjangan", kind: "contract", target: "contracts", status: "upcoming" },
  { id: "cal-7", date: "2026-07-01", title: "Tagihan sewa diterbitkan", titleEn: "Rent invoices issued", detail: "Seluruh penyewa aktif", kind: "payment", target: "invoices", status: "upcoming", time: "Otomatis" },
  { id: "cal-8", date: "2026-07-03", title: "Inspeksi unit keluar", titleEn: "Move-out inspection", detail: "Kos Melati · Unit 104", kind: "move", target: "reservations", status: "upcoming", time: "13.00" },
];

const calendarKindMeta: Record<CalendarEventKind, { label: string; labelEn: string; icon: typeof CalendarDays }> = {
  payment: { label: "Pembayaran", labelEn: "Payment", icon: CircleDollarSign },
  maintenance: { label: "Pemeliharaan", labelEn: "Maintenance", icon: Wrench },
  contract: { label: "Kontrak", labelEn: "Contract", icon: FileType2 },
  move: { label: "Masuk / keluar", labelEn: "Move in / out", icon: UserCheck },
};

const calendarDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;



function SewainContent() {
  const { locale, setLocale, t } = useI18n();
  const [page, setPage] = useState<PageId>("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [booking, setBooking] = useState<BookingState | null>(null);
  const [focusReservationId, setFocusReservationId] = useState("");
  const [focusContractId, setFocusContractId] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [toast, setToast] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [actingAsOpen, setActingAsOpen] = useState(false);
  const actingAsRef = useRef<HTMLDivElement>(null);
  const [propertyRows, setPropertyRows] = useStoredRows("properties", seedProperties);
  const [tokenConfig, setTokenConfig] = useStoredConfig<TokenConfig>("token-config", defaultTokenConfig);
  const [invoiceRows, setInvoiceRows] = useStoredRows("invoices", seedInvoices);
  const [tenants, setTenants] = useStoredRows("tenants", moduleData.tenants);
  const [reservations, setReservations] = useStoredRows("reservations", moduleData.reservations);
  const [tokens, setTokens] = useStoredRows("tokens", moduleData.tokens);
  const [contracts, setContracts] = useStoredRows("contracts", moduleData.contracts);
  const [templates, setTemplates] = useStoredState<MessageTemplate[]>("message-templates-v1", SEED_TEMPLATES);
  const [contractTemplates, setContractTemplates] = useStoredConfig<ContractTemplate[]>("contract-templates-v1", SEED_CONTRACT_TEMPLATES);
  const [integrationConfig, setIntegrationConfig] = useStoredConfig<IntegrationConfig>("sewain-integration", defaultIntegrationConfig);
  const [tickets, setTickets] = useStoredRows("tickets", moduleData.tickets);
  const [documents, setDocuments] = useStoredRows("documents", moduleData.documents);
  const [units, setUnits] = useStoredRows("units", seedUnits);
  const [roles, setRoles] = useStoredState<Role[]>("roles-v1", SEED_ROLES);
  const [members, setMembers] = useStoredState<Member[]>("members-v1", SEED_MEMBERS);
  const [currentUserId, setCurrentUserId] = useStoredState<string>("current-user-v1", SEED_MEMBERS[0].id);
  const access = useMemo<AccessCtx>(() => {
    const currentMember = members.find(member => member.id === currentUserId) ?? members[0];
    const currentRole = roles.find(role => role.id === currentMember?.roleId);
    return {
      roles, members, currentUserId, currentMember, currentRole,
      setRoles, setMembers, setCurrentUserId,
      can: (module, action) => roleCan(currentRole, module, action),
    };
  }, [roles, members, currentUserId, setRoles, setMembers, setCurrentUserId]);
  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem("sewain:sidebar-collapsed") === "true");
    try { setReadNotifications(JSON.parse(localStorage.getItem("sewain:read-notifications") || "[]")); } catch { setReadNotifications([]); }
  }, []);
  useEffect(() => {
    if (!notificationsOpen) return;
    const close = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [notificationsOpen]);
  useEffect(() => {
    if (!actingAsOpen) return;
    const close = (event: MouseEvent) => {
      if (!actingAsRef.current?.contains(event.target as Node)) setActingAsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setActingAsOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", closeOnEscape); };
  }, [actingAsOpen]);
  const stores: Partial<Record<PageId, [Row[], React.Dispatch<React.SetStateAction<Row[]>>]>> = useMemo(() => ({ properties: [propertyRows, setPropertyRows], invoices: [invoiceRows, setInvoiceRows], tenants: [tenants, setTenants], reservations: [reservations, setReservations], tokens: [tokens, setTokens], contracts: [contracts, setContracts], tickets: [tickets, setTickets], documents: [documents, setDocuments] }), [propertyRows, invoiceRows, tenants, reservations, tokens, contracts, tickets, documents, setPropertyRows, setInvoiceRows, setTenants, setReservations, setTokens, setContracts, setTickets, setDocuments]);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3200); };
  const go = (id: PageId) => { setPage(id); setMobileNav(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const rememberRead = (ids: string[]) => {
    const next = Array.from(new Set([...readNotifications, ...ids]));
    setReadNotifications(next);
    localStorage.setItem("sewain:read-notifications", JSON.stringify(next));
  };
  const openNotification = (item: NotificationItem) => {
    rememberRead([item.id]);
    setNotificationsOpen(false);
    go(item.page);
    const store = stores[item.page];
    const row = store?.[0].find(candidate => candidate.id === item.rowId);
    if (row) setDialog({ mode: "edit", page: item.page, row });
  };
  const toggleSidebar = () => setSidebarCollapsed(current => {
    localStorage.setItem("sewain:sidebar-collapsed", String(!current));
    return !current;
  });
  const openBooking = (ctx: BookingState) => { setBooking(ctx); setMobileNav(false); };
  const save = (target: PageId, row: Row) => { const store = stores[target]; if (!store) return; const [, setter] = store; setter(old => row._delete ? old.filter(item => item.id !== row.id) : old.some(r => r.id === row.id) ? old.map(r => r.id === row.id ? row : r) : [row, ...old]); setDialog(null); notify(row._delete ? message(locale, "removed", { item: t(pageMeta[target].singular) }) : message(locale, "saved", { item: t(pageMeta[target].singular) })); };
  const currentStore = stores[page];

  const navAllowed = (id: string) => id === "dashboard" || id === "calendar" || access.can(id as ModuleId, "view");
  return <TokenConfigContext.Provider value={{ config: tokenConfig, setConfig: setTokenConfig, properties: propertyRows }}><AccessContext.Provider value={access}><div className={`app ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}><a className="skip-link" href="#main-content">{t("Lewati navigasi")}</a>
    {mobileNav && <button className="mobile-overlay" aria-label={t("Tutup navigasi")} onClick={() => setMobileNav(false)} />}
    <Sidebar sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} locale={locale} setLocale={setLocale} page={page} go={go} navAllowed={navAllowed} access={access} t={t} mobileNav={mobileNav} setMobileNav={setMobileNav} />
    <div className="shell"><Topbar toggleSidebar={toggleSidebar} sidebarCollapsed={sidebarCollapsed} t={t} setMobileNav={setMobileNav} page={page} go={go} access={access} setActingAsOpen={setActingAsOpen} actingAsOpen={actingAsOpen} actingAsRef={actingAsRef} locale={locale} notificationsRef={notificationsRef} notificationsOpen={notificationsOpen} setNotificationsOpen={setNotificationsOpen} notificationItems={notificationItems} readNotifications={readNotifications} rememberRead={rememberRead} openNotification={openNotification} />
      <main className="main" id="main-content">
        {page === "dashboard" && <Dashboard go={go} reservations={reservations} />}
        {page === "calendar" && <CalendarPage onOpenEvent={event => go(event.target)} />}
        {page === "properties" && <PropertiesPage rows={propertyRows} setRows={setPropertyRows} units={units} setUnits={setUnits} invoices={invoiceRows} tickets={tickets} onBook={openBooking} onViewReservations={() => go("reservations")} openDialog={setDialog} notify={notify} />}
        {page === "tenants" && <TenantsPage rows={tenants} setRows={setTenants} invoices={invoiceRows} documents={documents} openDialog={setDialog} notify={notify} goToProperties={() => go("properties")} />}
        {page === "invoices" && <InvoicePage rows={invoiceRows} setRows={setInvoiceRows} openDialog={setDialog} notify={notify} />}
        {page === "tickets" && <MaintenancePage rows={tickets} setRows={setTickets} openDialog={setDialog} notify={notify} />}
        {page === "tokens" && <TokenPage rows={tokens} setRows={setTokens} openDialog={setDialog} notify={notify} />}
        {page === "settings" && <SettingsPage notify={notify} integrationConfig={integrationConfig} setIntegrationConfig={setIntegrationConfig} />}
        {page === "messages" && <MessageTemplatesPage templates={templates} setTemplates={setTemplates} notify={notify} />}
        {page === "reservations" && <ReservationsPage rows={reservations} setRows={setReservations} units={units} setUnits={setUnits} tenants={tenants} setTenants={setTenants} properties={propertyRows} setProperties={setPropertyRows} setContracts={setContracts} setDocuments={setDocuments} setInvoices={setInvoiceRows} notify={notify} focusId={focusReservationId} onClearFocus={() => setFocusReservationId("")} onBook={openBooking} onOpenContract={nomor => { setFocusContractId(nomor); go("contracts"); }} />}
        {page === "contracts" && <ContractsPage contracts={contracts} setContracts={setContracts} templates={contractTemplates} setTemplates={setContractTemplates} reservations={reservations} setReservations={setReservations} tenants={tenants} notify={notify} focusId={focusContractId} onClearFocus={() => setFocusContractId("")} />}
        {page === "documents" && <DocumentsPage rows={documents} setRows={setDocuments} openDialog={setDialog} notify={notify} />}
        {currentStore && !["properties", "tenants", "invoices", "tickets", "tokens", "messages", "reservations", "contracts", "documents"].includes(page) && <CrudPage page={page} rows={currentStore[0]} setRows={currentStore[1]} openDialog={setDialog} notify={notify} />}
      </main>
    </div>
    {dialog && <EditDialog state={dialog} onClose={() => setDialog(null)} onSave={save} />}
    {booking && <BookingDialog ctx={booking} properties={propertyRows} units={units} setUnits={setUnits} tenants={tenants} setTenants={setTenants} setReservations={setReservations} onClose={() => setBooking(null)} onCreated={id => { setFocusReservationId(id); go("reservations"); }} notify={notify} />}
    {toast && <div className="toast" role="status"><CheckCircle2 />{toast}</div>}
  </div></AccessContext.Provider></TokenConfigContext.Provider>;
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
