"use client";

import { useState } from "react";
import { ChevronLeft, ClipboardList, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Row } from "@/lib/data";
import { useI18n, useAccess } from "@/components/context";
import { message } from "@/lib/i18n";

type PageId = "dashboard" | "calendar" | "properties" | "tenants" | "reservations" | "invoices" | "tokens" | "contracts" | "messages" | "tickets" | "documents" | "settings";

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

type ModuleId = string;

function slug(value: unknown) {
  return String(value).toLowerCase().replace(/\s+/g, "-");
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
  const showAction = action && can(page as unknown as ModuleId, "create");
  return <div className="page-head">
    <div>
      {back && <button className="button" onClick={back} style={{ marginBottom: 10 }}><ChevronLeft />{t("Kembali")}</button>}
      <h1>{t(meta.title)}</h1><p className="subtext">{t(meta.description)}</p>
    </div>
    {showAction && <div className="actions"><button className="button primary" onClick={action}><Plus />{t("Tambah")} {t(meta.singular)}</button></div>}
  </div>;
}

export function Toolbar({ search, setSearch, page }: { search: string; setSearch: (v: string) => void; page?: PageId }) {
  const { t } = useI18n();
  return <div className="toolbar">
    <div className="field-inline"><Search /><input type="search" enterKeyHint="search" aria-label={t("Cari data")} value={search} onChange={e => setSearch(e.target.value)} placeholder={t("Cari data...")} /></div>
    {page && pageFilterOptions[page] && <select aria-label={t("Filter status")}>{pageFilterOptions[page].map(opt => <option key={opt}>{t(opt)}</option>)}</select>}
  </div>;
}

const pageFilterOptions: Record<string, string[]> = {
  documents: ["Semua", "Privat", "Terverifikasi"],
  contracts: ["Semua", "Draf", "Menunggu tanda tangan", "Ditandatangani"],
  tickets: ["Semua", "Baru", "Ditugaskan", "Dikerjakan", "Selesai"],
  invoices: ["Semua", "Belum dibayar", "Jatuh tempo", "Terlambat", "Lunas"],
};

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

type DialogState = null | { mode: "create" | "edit"; page: PageId; row?: Row };

export function CrudPage({ page, rows, setRows, openDialog, notify }: { page: PageId; rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>; openDialog: (d: DialogState) => void; notify: (s: string) => void }) {
  const { locale, t, v } = useI18n();
  const [search, setSearch] = useState("");
  const filtered = rows.filter(row => Object.values(row).some(value => v(value).toLowerCase().includes(search.toLowerCase())));
  const remove = (row: Row) => { setRows(old => old.filter(item => item.id !== row.id)); notify(message(locale, "removed", { item: t(pageMeta[page].singular) })); };
  return <><PageHead page={page} action={() => openDialog({ mode: "create", page })} />
    <section className="panel"><Toolbar search={search} setSearch={setSearch} page={page} />
      {filtered.length ? <DataTable rows={filtered} module={page as unknown as ModuleId} onEdit={row => openDialog({ mode: "edit", page, row })} onDelete={remove} /> : <div className="empty"><ClipboardList /><div><strong>{t("Belum ada data yang cocok")}</strong>{locale === "en" ? `Change your search or add a new ${t(pageMeta[page].singular)}.` : `Ubah pencarian atau tambahkan ${pageMeta[page].singular} baru.`}</div></div>}
    </section></>;
}

export { pageMeta, type PageId, type DialogState };
