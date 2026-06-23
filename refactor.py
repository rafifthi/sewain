#!/usr/bin/env python3
"""Extract components from sewain-app.tsx into separate files."""
import re, os

with open("components/sewain-app.tsx", "r") as f:
    content = f.read()

lines = content.split("\n")
total = len(lines)

def extract(start_line, end_line):
    """Extract lines from start_line (1-indexed) to end_line (inclusive)."""
    return "\n".join(lines[start_line-1:end_line])

def safe_write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)
    print(f"  Wrote {path} ({len(content.split(chr(10)))} lines)")

# ===== Imports & shared types =====
# Lines 1-99: imports, type defs, nav, pageMeta, notificationItems
header_imports = extract(1, 25)
header_types = extract(26, 60)

# ====== COMMON HEADER (imports + all shared utilities) ======
# Everything before the first component (Status at line 281)
# But we also need all the utility functions
COMMON_IMPORTS = """\"use client\";

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
"""

# ===== 1. CONTEXT FILES =====
print("=== Creating context files ===")

ctx_i18n = COMMON_IMPORTS + """
type I18nState = { locale: Locale; setLocale: (locale: Locale) => void; t: (value: string) => string; v: (value: unknown) => string };
export const I18nContext = createContext<I18nState>({ locale: "id", setLocale: () => {}, t: value => value, v: value => String(value ?? "") });
export const useI18n = () => useContext(I18nContext);
"""
safe_write("components/context/i18n.tsx", ctx_i18n)

ctx_token = COMMON_IMPORTS + """
import { Row } from "@/lib/data";
import { defaultTokenConfig, TokenConfig } from "@/lib/utility-token-config";

type TokenCtx = { config: TokenConfig; setConfig: (c: TokenConfig) => void; properties: Row[] };
export const TokenConfigContext = createContext<TokenCtx>({ config: defaultTokenConfig, setConfig: () => {}, properties: [] });
export const useTokenConfig = () => useContext(TokenConfigContext);
"""
safe_write("components/context/token.tsx", ctx_token)

ctx_access = COMMON_IMPORTS + """
import { can as roleCan, emptyPermissions, initials, Member, MemberStatus, ModuleId,
  PERMISSION_ACTIONS, PERMISSION_MODULES, PermissionAction, Role, SEED_MEMBERS, SEED_ROLES,
} from "@/lib/access-control";

type AccessCtx = {
  roles: Role[]; members: Member[]; currentUserId: string;
  currentMember: Member | undefined; currentRole: Role | undefined;
  setRoles: (roles: Role[]) => void; setMembers: (members: Member[]) => void; setCurrentUserId: (id: string) => void;
  can: (module: ModuleId, action: PermissionAction) => boolean;
};
export const AccessContext = createContext<AccessCtx>({
  roles: [], members: [], currentUserId: "", currentMember: undefined, currentRole: undefined,
  setRoles: () => {}, setMembers: () => {}, setCurrentUserId: () => {}, can: () => true,
});
export const useAccess = () => useContext(AccessContext);
"""
safe_write("components/context/access.tsx", ctx_access)

# ===== 2. LAYOUT FILES =====
print("\n=== Creating layout files ===")

# Shared helpers
shared_helpers = """
import { Row } from "@/lib/data";
import { useI18n } from "@/components/context/i18n";
import { message, translate, localizeValue, Locale } from "@/lib/i18n";
import { formatRp } from "@/lib/utility-token-config";

"""

# Shell + Sidebar + Topbar + Notifications
layout_shell = COMMON_IMPORTS + """
import { useI18n } from "@/components/context/i18n";
import { useAccess } from "@/components/context/access";
import { useTokenConfig } from "@/components/context/token";
import { formatRp } from "@/lib/utility-token-config";
import { initials } from "@/lib/access-control";
import { message } from "@/lib/i18n";

type PageId = "dashboard" | "calendar" | "properties" | "tenants" | "reservations" | "invoices" | "tokens" | "contracts" | "messages" | "tickets" | "documents" | "settings";
type DialogState = null | { mode: "create" | "edit"; page: PageId; row?: Row };
type BookingState = { propertyId?: string; unitId?: string };

""" + extract(61, 99) + "\n\n" + extract(91, 96) + "\n\n" + extract(143, 151) + "\n\n" + extract(153, 291)

# Let me take a more practical approach - write the files directly with the extracted content

print("=== Writing layout: nav data ===")
nav_toolbar_content = """\"use client\";

import { Gauge, CalendarDays, Building2, UsersRound, WalletCards, CreditCard, Zap, FileType2, MessageSquareText, Wrench, FileText, Settings } from "lucide-react";
import { useI18n } from "@/components/context/i18n";
import { Search } from "lucide-react";

export type PageId = "dashboard" | "calendar" | "properties" | "tenants" | "reservations" | "invoices" | "tokens" | "contracts" | "messages" | "tickets" | "documents" | "settings";

export const nav = [
  { id: "dashboard", label: "Ringkasan", icon: Gauge },
  { id: "calendar", label: "Kalender", icon: CalendarDays },
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

export const pageMeta: Record<PageId, { title: string; description: string; singular: string }> = {
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

export function Toolbar({ search, setSearch }: { search: string; setSearch: (v: string) => void }) {
  const { t } = useI18n();
  return <div className="toolbar">
    <div className="field-inline"><Search /><input type="search" enterKeyHint="search" aria-label={t("Cari data")} value={search} onChange={e => setSearch(e.target.value)} placeholder={t("Cari data...")} /></div>
    <select aria-label={t("Filter status")}><option>{t("Semua status")}</option><option>{t("Aktif")}</option><option>{t("Perlu tindakan")}</option></select>
  </div>;
}
"""
safe_write("components/layout/nav-data.tsx", nav_toolbar_content)

print("=== Writing data types ===")
# Write the FormFieldSchema and schemas separately
schema_content = """\"use client\";

type FormFieldSchema = { key: string; label: string; type?: React.HTMLInputAttributeType; options?: string[]; multiline?: boolean; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] };

const schemas: Partial<Record<string, FormFieldSchema[]>> = {
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

export { schemas };
export type { FormFieldSchema };
"""
safe_write("components/layout/schemas.ts", schema_content)

# ===== Write component files =====
print("\n=== Writing shared utility functions ===")

# Write a helpers file with all shared utility functions
helpers_content = """\"use client\";

import { Row } from "@/lib/data";
import { useI18n } from "@/components/context/i18n";
import { formatRp } from "@/lib/utility-token-config";

export function slug(value: unknown) {
  return String(value).toLowerCase().replace(/\\s+/g, "-");
}

export function toDateInputValue(value: unknown) {
  const text = String(value || "").trim();
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(text)) return text;
  const months: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", mei: "05", may: "05", jun: "06", jul: "07", agu: "08", aug: "08", sep: "09", okt: "10", oct: "10", nov: "11", des: "12", dec: "12" };
  const match = text.toLowerCase().match(/^(\\d{1,2})\\s+([a-z]+)\\s+(\\d{4})$/);
  if (!match) return "";
  const month = months[match[2].slice(0, 3)];
  return month ? `${match[3]}-${month}-${match[1].padStart(2, "0")}` : "";
}

export const idMonthsShort = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const idMonthsLong = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export const VACANT_STATUSES = ["Kosong", "Akan kosong"];
export const isVacant = (row?: Row) => !!row && VACANT_STATUSES.includes(String(row.status));
export const rupiah = (value: unknown) => Number(String(value ?? "0").replace(/[^\\d]/g, "")) || 0;
export const todayInput = () => new Date().toISOString().slice(0, 10);
export const parseInput = (value: string) => { const d = new Date(`${(toDateInputValue(value) || todayInput())}T00:00:00Z`); return Number.isNaN(d.getTime()) ? new Date() : d; };
export const addMonths = (date: Date, months: number) => { const d = new Date(date); d.setUTCMonth(d.getUTCMonth() + months); return d; };
export const fmtShort = (d: Date) => `${d.getUTCDate()} ${idMonthsShort[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const fmtMonthYear = (d: Date) => `${idMonthsShort[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

export const isSingleUnit = (property?: Row) => !!property && Number(property.unit || 1) === 1;

export function unitsForProperty(units: Row[], property?: Row): Row[] {
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

export function unitLabelFor(property?: Row, unit?: Row): string {
  if (!property || !unit) return "";
  const tag = String(property.nama).replace(/^(Kos|Kontrakan|Ruko|Apartemen|Rumah|Paviliun)\\s+/i, "").split(/[\\s,]+/)[0];
  return unit._synthetic ? String(property.nama) : `${tag} ${unit.unit}`;
}

export const upsertRow = (setter: React.Dispatch<React.SetStateAction<Row[]>>, row: Row) =>
  setter(old => old.some(r => r.id === row.id) ? old.map(r => r.id === row.id ? row : r) : [row, ...old]);

export function syncPropertyOccupancy(propertyId: string, setProperties: React.Dispatch<React.SetStateAction<Row[]>>, units: Row[]) {
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

export function reservationEndDate(periode: unknown): Date | null {
  const text = String(periode || "");
  const end = text.includes(" - ") ? text.split(" - ")[1] : text;
  const m = end.trim().match(/^([A-Za-z]{3})\\w*\\s+(\\d{4})$/);
  if (!m) return null;
  const month = idMonthsShort.findIndex(mm => mm.toLowerCase() === m[1].toLowerCase());
  if (month < 0) return null;
  return new Date(Date.UTC(Number(m[2]), month + 1, 0));
}
export const daysUntil = (date: Date | null) => date ? Math.ceil((date.getTime() - Date.now()) / 86400000) : Infinity;
export const isExpiringSoon = (r: Row, withinDays = 30) => String(r.status) === "Aktif" && daysUntil(reservationEndDate(r.periode)) <= withinDays;

export const unitRent = (unit?: Row, property?: Row) => rupiah(unit?.sewa) || rupiah(property?.defaultPrice);
export const unitDeposit = (unit?: Row, property?: Row) => rupiah(unit?.deposit) || rupiah(property?.defaultDeposit) || unitRent(unit, property);

export function whatsappUrl(phone: unknown) {
  const digits = String(phone || "").replace(/\\D/g, "");
  return `https://wa.me/${digits.startsWith("0") ? `62${digits.slice(1)}` : digits}`;
}
"""
safe_write("components/layout/helpers.ts", helpers_content)

print("=== Writing Status component ===")
status_content = """\"use client\";

import { useI18n } from "@/components/context/i18n";

function slug(value: unknown) {
  return String(value).toLowerCase().replace(/\\s+/g, "-");
}

export function Status({ children }: { children: React.ReactNode }) {
  const { v } = useI18n();
  const value = String(children);
  const state = /tidak aktif|tidak|nonaktif|belum ada sewa/i.test(value) ? "" :
    /aktif|lunas|dihuni|selesai|terkirim|ditandatangani|terverifikasi/i.test(value) ? "success" :
    /terlambat|perawatan|perlu perhatian/i.test(value) ? "danger" :
    /\\bbooking\\b/i.test(value) ? "info" :
    /jatuh|dipesan|kontrak|menunggu|ditugaskan|akan kosong|draf|diproses|dikonfirmasi|token siap/i.test(value) ? "warning" : "";
  return <span className={`badge ${state} ${slug(value)}`}>{v(value)}</span>;
}
"""
safe_write("components/layout/status.tsx", status_content)

print("=== Writing page components ===")

# Dashboard
dash_content = """\"use client\";

import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, CheckCircle2, ChevronRight, CircleDollarSign, CreditCard, FileText, Gauge, MapPin, UsersRound, Wrench, Zap } from "lucide-react";
import { Row } from "@/lib/data";
import { useI18n } from "@/components/context/i18n";
import { useAccess } from "@/components/context/access";
import { Status } from "@/components/layout/status";
import { isExpiringSoon } from "@/components/layout/helpers";

type PageId = "dashboard" | "calendar" | "properties" | "tenants" | "reservations" | "invoices" | "tokens" | "contracts" | "messages" | "tickets" | "documents" | "settings";

export function Dashboard({ go, reservations }: { go: (p: PageId) => void; reservations: Row[] }) {
  const { t, v } = useI18n();
  const upcoming: [string, string][] = [];
  return (
    <div className="dashboard">
      <div className="page-head"><div><h1>{t("Ringkasan")}</h1><p className="subtext">{t("Hal yang perlu Anda tindak lanjuti hari ini.")}</p></div></div>
      <section className="dashboard-metrics">
        <article className="dashboard-metric"><div className="metric-icon"><Building2 /></div><div><strong>6</strong><span>{t("Properti")}</span></div></article>
        <article className="dashboard-metric"><div className="metric-icon"><UsersRound /></div><div><strong>4</strong><span>{t("Penyewa")}</span></div></article>
        <article className="dashboard-metric"><div className="metric-icon"><CreditCard /></div><div><strong>5</strong><span>{t("Tagihan bulan ini")}</span></div></article>
        <article className="dashboard-metric"><div className="metric-icon"><CircleDollarSign /></div><div><strong>Rp4.750.000</strong><span>{t("Tertunggak")}</span></div></article>
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head"><h2>{t("Ringkasan properti")}</h2><button className="text-button" onClick={() => go("properties")}>{t("Lihat semua")}</button></div>
          <div className="property-mini-list">
            <div className="property-mini" onClick={() => go("properties")}><div><span className="badge success">6</span><span><strong>{t("Aktif")}</strong><small>{t("Properti berjalan")}</small></span></div><ChevronRight /></div>
            <div className="property-mini" onClick={() => go("properties")}><div><span className="badge warning">1</span><span><strong>{t("Perlu perhatian")}</strong><small>{t("Apartemen Arunika")}</small></span></div><ChevronRight /></div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>{t("Aktivitas terbaru")}</h2></div>
          <div className="activity-list">
            <div className="activity"><span className="activity-icon"><CreditCard /></span><span><strong>{t("Pembayaran masuk")}</strong><span className="cell-sub">{t("Dewi Lestari · Melati 203")}</span></span><time>{t("2 menit lalu")}</time></div>
            <div className="activity"><span className="activity-icon"><FileText /></span><span><strong>{t("Kontrak baru")}</strong><span className="cell-sub">{t("M. Iqbal Maulana · KTR-2025-044")}</span></span><time>{t("1 jam lalu")}</time></div>
            <div className="activity"><span className="activity-icon"><Wrench /></span><span><strong>{t("Tiket pemeliharaan")}</strong><span className="cell-sub">{t("AC kamar tidak dingin · Unit 202")}</span></span><time>{t("3 jam lalu")}</time></div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>{t("Yang perlu ditindaklanjuti")}</h2></div>
          <div className="reminder-list">
            <div className="activity urgency"><span className="activity-icon"><CircleDollarSign /></span><span><strong>{t("Tagihan terlambat")}</strong><span className="cell-sub">{t("2 tagihan perlu ditagih")}</span></span><button className="icon-button" aria-label={t("Buka tagihan")} onClick={() => go("invoices")}><ChevronRight /></button></div>
            <div className="activity urgency"><span className="activity-icon"><FileText /></span><span><strong>{t("Kontrak perlu ditandatangani")}</strong><span className="cell-sub">{t("M. Iqbal Maulana · KTR-2025-044")}</span></span><button className="icon-button" aria-label={t("Buka kontrak")} onClick={() => go("contracts")}><ChevronRight /></button></div>
            {reservations.filter(isExpiringSoon).length > 0 && <div className="activity warning"><span className="activity-icon"><CalendarDays /></span><span><strong>{t("Reservasi akan berakhir")}</strong><span className="cell-sub">{t("Beberapa kontrak akan berakhir dalam 30 hari")}</span></span><button className="icon-button" aria-label={t("Buka reservasi")} onClick={() => go("reservations")}><ChevronRight /></button></div>}
          </div>
        </section>
      </div>
    </div>
  );
}
"""
safe_write("components/pages/dashboard.tsx", dash_content)

print("=== Writing CrudPage, DataTable, PageHead ===")
common_components = """\"use client\";

import { useState } from "react";
import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { Row } from "@/lib/data";
import { useI18n } from "@/components/context/i18n";
import { useAccess } from "@/components/context/access";
import { Status } from "@/components/layout/status";
import { Toolbar, pageMeta } from "@/components/layout/nav-data";
import { message } from "@/lib/i18n";

type PageId = "dashboard" | "calendar" | "properties" | "tenants" | "reservations" | "invoices" | "tokens" | "contracts" | "messages" | "tickets" | "documents" | "settings";
type DialogState = null | { mode: "create" | "edit"; page: PageId; row?: Row };
type ModuleId = string;

export function PageHead({ page, action, back }: { page: PageId; action?: () => void; back?: () => void }) {
  const { t } = useI18n();
  const { can } = useAccess();
  const meta = pageMeta[page];
  const showAction = action && can(page as unknown as ModuleId, "create");
  return <div className="page-head">
    <div>
      {back && <button className="button" onClick={back} style={{ marginBottom: 10 }}><ChevronLeft />{t("Kembali ke properti")}</button>}
      <h1>{t(meta.title)}</h1><p className="subtext">{t(meta.description)}</p>
    </div>
    {showAction && <div className="actions"><button className="button primary" onClick={action}><Plus />{t("Tambah")} {t(meta.singular)}</button></div>}
  </div>;
}

import { ChevronLeft } from "lucide-react";

export function DataTable({ rows, onEdit, onDelete, onSelect, selected, module }: { rows: Row[]; onEdit: (r: Row) => void; onDelete: (r: Row) => void; onSelect?: (r: Row) => void; selected?: string; module?: ModuleId }) {
  const { t, v } = useI18n();
  const { can } = useAccess();
  const canEdit = !module || can(module as any, "edit");
  const canDelete = !module || can(module as any, "delete");
  const keys = rows.length ? Object.keys(rows[0]).filter(k => k !== "id" && !k.startsWith("_")).slice(0, 6) : [];
  return <div className="table-wrap"><table>
    <thead><tr>{keys.map(key => <th key={key}>{t(columnLabels[key] || key)}</th>)}<th>{t("Aksi")}</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.id} onClick={() => onSelect?.(row)} className={selected === row.id ? "selected" : ""}>
      {keys.map((key, i) => <td key={key}>{key === "status" || key === "tahap" ? <Status>{row[key]}</Status> : <span className={i === 0 ? "cell-main" : ""}>{v(row[key])}</span>}</td>)}
      <td><div className="actions">{canEdit && <button className="icon-button" aria-label={`${t("Edit")} ${row.id}`} onClick={e => { e.stopPropagation(); onEdit(row); }}><Pencil /></button>}{canDelete && <button className="icon-button" aria-label={`${t("Hapus")} ${row.id}`} onClick={e => { e.stopPropagation(); onDelete(row); }}><Trash2 /></button>}{!canEdit && !canDelete && <span className="cell-sub">{t("Hanya lihat")}</span>}</div></td>
    </tr>)}</tbody>
  </table></div>;
}

const columnLabels: Record<string, string> = {
  nama: "Nama", tipe: "Tipe", lokasi: "Lokasi", unit: "Unit", terisi: "Terisi", pendapatan: "Pendapatan",
  telepon: "WhatsApp", telegram_id: "Telegram", sejak: "Mulai", status: "Status", penyewa: "Penyewa", properti: "Properti", periode: "Periode",
  deposit: "Deposit", tahap: "Tahap", pelanggan: "Pelanggan", meter: "Nomor meter", nominal: "Nominal", biaya: "Biaya",
  kode: "Kode", durasi: "Durasi", sewa: "Sewa", jadwalMasuk: "Jadwal masuk", jadwalKeluar: "Jadwal keluar",
  nomor: "Nomor", dibuat: "Dibuat", peristiwa: "Peristiwa", waktu: "Waktu", saluran: "Saluran", tiket: "Tiket",
  masalah: "Masalah", vendor: "Vendor", kategori: "Kategori", terkait: "Terkait", diperbarui: "Diperbarui",
  jatuhTempo: "Jatuh tempo", total: "Total", sisa: "Sisa",
};

export function CrudPage({ page, rows, setRows, openDialog, notify }: { page: PageId; rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>; openDialog: (d: DialogState) => void; notify: (s: string) => void }) {
  const { locale, t, v } = useI18n();
  const [search, setSearch] = useState("");
  const filtered = rows.filter(row => Object.values(row).some(value => v(value).toLowerCase().includes(search.toLowerCase())));
  const remove = (row: Row) => { setRows(old => old.filter(item => item.id !== row.id)); notify(message(locale, "removed", { item: t(pageMeta[page].singular) })); };
  return <><PageHead page={page} action={() => openDialog({ mode: "create", page })} />
    <section className="panel"><Toolbar search={search} setSearch={setSearch} />
      {filtered.length ? <DataTable rows={filtered} module={page as unknown as ModuleId} onEdit={row => openDialog({ mode: "edit", page, row })} onDelete={remove} /> : <div className="empty"><ClipboardList /><div><strong>{t("Belum ada data yang cocok")}</strong>{locale === "en" ? `Change your search or add a new ${t(pageMeta[page].singular)}.` : `Ubah pencarian atau tambahkan ${pageMeta[page].singular} baru.`}</div></div>}
    </section></>;
}
"""
safe_write("components/pages/crud.tsx", common_components)

print("Done. Now need to write remaining page files and the main refactored file.")
