"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2, CalendarPlus, Check, CheckCircle2, ChevronLeft, ClipboardList,
  CreditCard, Eye, FileText, Home, ImagePlus, MapPin, MoreHorizontal, Pencil,
  Plus, Search, Share2, Trash2, UserRound, WalletCards, Wrench, X,
} from "lucide-react";
import { Row } from "@/lib/data";
import { message, translate, type Locale } from "@/lib/i18n";
import { formatRp } from "@/lib/utility-token-config";
import { useI18n, useAccess } from "@/components/context";
import { type ModuleId } from "@/lib/access-control";
import { SkeletonTable } from "@/components/skeleton";

export type PageId = "dashboard" | "calendar" | "properties" | "tenants" | "reservations" | "invoices" | "expenses" | "reports" | "tokens" | "contracts" | "messages" | "tickets" | "documents" | "settings";

export const pageFilterOptions: Record<string, string[]> = {
  documents: ["Semua", "Privat", "Terverifikasi"],
  contracts: ["Semua", "Draf", "Menunggu tanda tangan", "Ditandatangani"],
  tickets: ["Semua", "Baru", "Ditugaskan", "Dikerjakan", "Selesai"],
  invoices: ["Semua", "Belum dibayar", "Jatuh tempo", "Terlambat", "Lunas"],
};

export type DialogState = null | { mode: "create" | "edit"; page: PageId; row?: Row };
export type BookingState = { propertyId?: string; unitId?: string };

export const pageMeta: Record<PageId, { title: string; description: string; singular: string }> = {
  dashboard: { title: "Ringkasan", description: "Hal yang perlu Anda tindak lanjuti hari ini.", singular: "aktivitas" },
  calendar: { title: "Kalender", description: "Jadwal pembayaran, kontrak, dan pemeliharaan dalam satu tampilan.", singular: "agenda" },
  properties: { title: "Properti", description: "Pantau hunian dan operasional seluruh portofolio.", singular: "properti" },
  tenants: { title: "Penyewa", description: "Data penyewa aktif, terdahulu, dan yang akan masuk.", singular: "penyewa" },
  reservations: { title: "Reservasi", description: "Lacak status setiap pemesanan dari booking hingga selesai.", singular: "reservasi" },
  invoices: { title: "Tagihan", description: "Buat, kirim, dan rekonsiliasi pembayaran sewa.", singular: "tagihan" },
  expenses: { title: "Pengeluaran", description: "Catat biaya operasional properti.", singular: "pengeluaran" },
  reports: { title: "Laporan Keuangan", description: "Pantau pendapatan, biaya, dan laba rugi.", singular: "laporan" },
  tokens: { title: "Token PLN", description: "Pesanan token listrik dan margin platform.", singular: "pesanan" },
  contracts: { title: "Kontrak", description: "Template dan kontrak sewa yang sudah dibuat.", singular: "kontrak" },
  messages: { title: "Template Pesan", description: "Pesan WhatsApp otomatis untuk setiap peristiwa.", singular: "template" },
  tickets: { title: "Pemeliharaan", description: "Tindak lanjuti keluhan dan pekerjaan vendor.", singular: "tiket" },
  documents: { title: "Dokumen", description: "Arsip privat untuk kontrak, identitas, dan properti.", singular: "dokumen" },
  settings: { title: "Pengaturan", description: "Atur organisasi, penagihan, dan integrasi.", singular: "pengaturan" },
};

export const columnLabels: Record<string, string> = {
  nomor: "Nomor", nama: "Nama", tipe: "Tipe", unit: "Unit", penyewa: "Penyewa",
  terisi: "Terisi", lokasi: "Lokasi", status: "Status", pendapatan: "Pendapatan",
  kode: "Kode", pelanggan: "Pelanggan", meter: "Meter", nominal: "Nominal",
  biaya: "Biaya platform", periode: "Periode", jatuhTempo: "Jatuh tempo",
  total: "Total", sisa: "Sisa", kontak: "Kontak", dibuat: "Dibuat",
  properti: "Properti", judul: "Judul", tiket: "Tiket", telepon: "Telepon",
  masalah: "Masalah", vendor: "Vendor",
};

export function slug(value: unknown) {
  return String(value).toLowerCase().replace(/\s+/g, "-");
}

export function toDateInputValue(value: unknown) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const months: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", mei: "05", may: "05", jun: "06", jul: "07", agu: "08", aug: "08", sep: "09", okt: "10", oct: "10", nov: "11", des: "12", dec: "12" };
  const match = text.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (!match) return "";
  const month = months[match[2].slice(0, 3)];
  return month ? `${match[3]}-${month}-${match[1].padStart(2, "0")}` : "";
}

const VACANT_STATUSES = ["Kosong", "Akan kosong"];
export const idMonthsShort = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const idMonthsLong = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export const isVacant = (row?: Row) => !!row && VACANT_STATUSES.includes(String(row.status));
export const rupiah = (value: unknown) => Number(String(value ?? "0").replace(/[^\d]/g, "")) || 0;
export const todayInput = () => new Date().toISOString().slice(0, 10);
export const parseInput = (value: string) => { const d = new Date(`${(toDateInputValue(value) || todayInput())}T00:00:00Z`); return Number.isNaN(d.getTime()) ? new Date() : d; };
export const addMonths = (date: Date, months: number) => { const d = new Date(date); d.setUTCMonth(d.getUTCMonth() + months); return d; };
export const fmtShort = (d: Date) => `${d.getUTCDate()} ${idMonthsShort[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
export const fmtMonthYear = (d: Date) => `${idMonthsShort[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

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
  const tag = String(property.nama).replace(/^(Kos|Kontrakan|Ruko|Apartemen|Rumah|Paviliun)\s+/i, "").split(/[\s,]+/)[0];
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
  const m = end.trim().match(/^([A-Za-z]{3})\w*\s+(\d{4})$/);
  if (!m) return null;
  const month = idMonthsShort.findIndex(mm => mm.toLowerCase() === m[1].toLowerCase());
  if (month < 0) return null;
  return new Date(Date.UTC(Number(m[2]), month + 1, 0));
}

const daysUntil = (date: Date | null) => date ? Math.ceil((date.getTime() - Date.now()) / 86400000) : Infinity;
export const isExpiringSoon = (r: Row, withinDays = 30) => String(r.status) === "Aktif" && daysUntil(reservationEndDate(r.periode)) <= withinDays;

export const RES_STATUSES = ["Booking", "Draf Kontrak", "Kontrak Ditandatangani", "Aktif", "Tidak Aktif"];
export const statusRank = (s: unknown) => RES_STATUSES.indexOf(String(s));

export function whatsappUrl(phone: unknown) {
  const digits = String(phone || "").replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("0") ? `62${digits.slice(1)}` : digits}`;
}

export function bodySnippet(body: string) {
  const text = body.replace(/<[^>]*>/g, "").replace(/{{[^}]+}}/g, "___").slice(0, 100);
  return text + (text.length >= 100 ? "…" : "");
}

export function Status({ children }: { children: React.ReactNode }) {
  const { v } = useI18n();
  const value = String(children);
  const state = /tidak aktif|tidak|nonaktif|belum ada sewa/i.test(value) ? "" :
    /aktif|lunas|dihuni|selesai|terkirim|ditandatangani|terverifikasi/i.test(value) ? "success" :
    /terlambat|perawatan|perlu perhatian/i.test(value) ? "danger" :
    /\bbooking\b/i.test(value) ? "info" :
    /jatuh|dipesan|kontrak|menunggu|ditugaskan|akan kosong|draf|diproses|dikonfirmasi|token siap/i.test(value) ? "warning" : "";
  return <span className={`badge ${state} ${slug(value)}`}>{v(value)}</span>;
}

export function PageHead({ page, action, back }: { page: PageId; action?: () => void; back?: () => void }) {
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

export function Toolbar({ search, setSearch, page }: { search: string; setSearch: (v: string) => void; page?: PageId }) {
  const { t } = useI18n();
  const filterOptions = page ? pageFilterOptions[page] : undefined;
  const [statusFilter, setStatusFilter] = useState("Semua");
  return <div className="toolbar">
    <div className="field-inline"><Search /><input type="search" enterKeyHint="search" aria-label={t("Cari data")} value={search} onChange={e => setSearch(e.target.value)} placeholder={t("Cari data...")} /></div>
    {filterOptions ? <select aria-label={t("Filter status")} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>{filterOptions.map(o => <option key={o} value={o}>{t(o)}</option>)}</select>
      : <select aria-label={t("Filter status")}><option>{t("Semua status")}</option><option>{t("Aktif")}</option><option>{t("Perlu tindakan")}</option></select>}
  </div>;
}

export function DataTable({ rows, onEdit, onDelete, onSelect, selected, module, loading = false }: { rows: Row[]; onEdit: (r: Row) => void; onDelete: (r: Row) => void; onSelect?: (r: Row) => void; selected?: string; module?: ModuleId; loading?: boolean }) {
  const { t, v } = useI18n();
  const { can } = useAccess();
  const canEdit = !module || can(module, "edit");
  const canDelete = !module || can(module, "delete");
  const keys = rows.length ? Object.keys(rows[0]).filter(k => k !== "id" && !k.startsWith("_")).slice(0, 6) : [];
  if (loading) return <SkeletonTable cols={Math.max(keys.length + 1, 5)} />;
  return <div className="table-wrap"><table>
    <thead><tr>{keys.map(key => <th key={key}>{t(columnLabels[key] || key)}</th>)}<th>{t("Aksi")}</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.id} onClick={() => onSelect?.(row)} className={selected === row.id ? "selected" : ""}>
      {keys.map((key, i) => <td key={key}>{key === "status" || key === "tahap" ? <Status>{row[key]}</Status> : <span className={i === 0 ? "cell-main" : ""}>{v(row[key])}</span>}</td>)}
      <td><div className="actions">{canEdit && <button className="icon-button" aria-label={`${t("Edit")} ${row.id}`} onClick={e => { e.stopPropagation(); onEdit(row); }}><Pencil /></button>}{canDelete && <button className="icon-button" aria-label={`${t("Hapus")} ${row.id}`} onClick={e => { e.stopPropagation(); onDelete(row); }}><Trash2 /></button>}{!canEdit && !canDelete && <span className="cell-sub">{t("Hanya lihat")}</span>}</div></td>
    </tr>)}</tbody>
  </table></div>;
}

export function CrudPage({ page, rows, setRows, openDialog, notify, loading = false }: { page: PageId; rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>; openDialog: (d: DialogState) => void; notify: (s: string) => void; loading?: boolean }) {
  const { locale, t, v } = useI18n();
  const [search, setSearch] = useState("");
  const filtered = rows.filter(row => Object.values(row).some(value => v(value).toLowerCase().includes(search.toLowerCase())));
  const remove = (row: Row) => { setRows(old => old.filter(item => item.id !== row.id)); notify(message(locale, "removed", { item: t(pageMeta[page].singular) })); };
  return <><PageHead page={page} action={() => openDialog({ mode: "create", page })} />
    <section className="panel"><Toolbar search={search} setSearch={setSearch} page={page} />
      {loading ? <SkeletonTable /> : filtered.length ? <DataTable rows={filtered} module={page as ModuleId} onEdit={row => openDialog({ mode: "edit", page, row })} onDelete={remove} /> : <div className="empty"><ClipboardList /><div><strong>{t("Belum ada data yang cocok")}</strong>{locale === "en" ? `Change your search or add a new ${t(pageMeta[page].singular)}.` : `Ubah pencarian atau tambahkan ${pageMeta[page].singular} baru.`}</div></div>}
    </section></>;
}

export function TenantCombobox({ options, value, onSelect, onAddNew }: { options: Row[]; value: string; onSelect: (id: string) => void; onAddNew: () => void }) {
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

export function TenantDialog({ state, onClose, onSave }: { state: Exclude<DialogState, null>; onClose: () => void; onSave: (page: PageId, row: Row) => void }) {
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
    if (values.telegram_id.trim() && !/^\d{5,12}$/.test(values.telegram_id.trim())) return setError(t("Telegram ID harus berupa 5-12 digit angka."));
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

export function PropertyCard({ row, onOpen }: { row: Row; onOpen: () => void }) {
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

export const unitRent = (unit?: Row, property?: Row) => rupiah(unit?.sewa) || rupiah(property?.defaultPrice);
export const unitDeposit = (unit?: Row, property?: Row) => rupiah(unit?.deposit) || rupiah(property?.defaultDeposit) || unitRent(unit, property);

export function PropertyDetail({ property, units, setUnits, setProperties, invoices, tickets, onBook, onViewReservations, onBack, openDialog, notify }: { property: Row; units: Row[]; setUnits: React.Dispatch<React.SetStateAction<Row[]>>; setProperties: React.Dispatch<React.SetStateAction<Row[]>>; invoices: Row[]; tickets: Row[]; onBook: (ctx: BookingState) => void; onViewReservations: () => void; onBack: () => void; openDialog: (d: DialogState) => void; notify: (s: string) => void }) {
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
    {addUnit && <div className="backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && setAddUnit(false)}><form className="dialog" role="dialog" aria-modal="true" aria-labelledby="add-unit-title" onSubmit={handleAddUnit}><div className="dialog-head"><div><h2 id="add-unit-title">{locale === "en" ? "Add unit" : "Tambah unit"}</h2><p>{locale === "en" ? "Add a new unit to this property." : "Tambahkan unit baru ke properti ini."}</p></div><button type="button" className="icon-button" aria-label={t("Tutup")} onClick={() => setAddUnit(false)}><X /></button></div><div className="dialog-body"><div className="form-grid"><div className="form-field"><label htmlFor="au-unit">{locale === "en" ? "Unit name / number" : "Nama / nomor unit"}</label><input id="au-unit" value={unitForm.unit} onChange={e => setUnitForm(f => ({ ...f, unit: e.target.value }))} required /></div><div className="form-field"><label htmlFor="au-tipe">{locale === "en" ? "Type" : "Tipe"}</label><select id="au-tipe" value={unitForm.tipe} onChange={e => setUnitForm(f => ({ ...f, tipe: e.target.value }))}>{["Standar", "Deluxe", "Premium", "Studio"].map(o => <option key={o}>{o}</option>)}</select></div><div className="form-field"><label htmlFor="au-lantai">{locale === "en" ? "Floor" : "Lantai"}</label><input id="au-lantai" value={unitForm.lantai} onChange={e => setUnitForm(f => ({ ...f, lantai: e.target.value }))} /></div><div className="form-field"><label htmlFor="au-sewa">{t("Sewa per bulan")}</label><div className="money-input"><span>Rp</span><input id="au-sewa" type="number" inputMode="numeric" min="0" step="1000" value={unitForm.sewa} onChange={e => setUnitForm(f => ({ ...f, sewa: e.target.value }))} /></div></div><div className="form-field">  <label htmlFor="au-deposit">Deposit</label><div className="money-input"><span>Rp</span><input id="au-deposit" type="number" inputMode="numeric" min="0" step="1000" value={unitForm.deposit} onChange={e => setUnitForm(f => ({ ...f, deposit: e.target.value }))} /></div></div></div></div><div className="dialog-actions"><button type="button" className="button" onClick={setAddUnit.bind(null, false)}>{t("Batal")}</button><button type="submit" className="button primary"><Plus />{locale === "en" ? "Add unit" : "Tambah unit"}</button></div></form></div>}
  </>;
}
