"use client";

import { useState } from "react";
import { Archive, Check, CircleDollarSign, Download, FileText, MessageSquareText, Pencil, Search, Trash2 } from "lucide-react";
import { Row } from "@/lib/data";
import { useI18n, useAccess } from "@/components/context";
import { message } from "@/lib/i18n";
import { downloadBatchPDF, downloadInvoicePDF, type OrgInfo } from "@/lib/pdf-invoice";
import { PageHead, Status, columnLabels, type PageId } from "./shared";
import { SkeletonStats, SkeletonTable } from "@/components/skeleton";

const fallbackOrgInfo: OrgInfo = {
  namaOrganisasi: "PT Makmur Sejahtera",
  alamat: "Jl. Melati No. 45, Depok, Jawa Barat",
};

function readOrgInfo(): OrgInfo {
  const saved = localStorage.getItem("sewain:org-info");
  if (!saved) return fallbackOrgInfo;
  try {
    return { ...fallbackOrgInfo, ...JSON.parse(saved) };
  } catch {
    return fallbackOrgInfo;
  }
}

export function InvoicePage({ rows, setRows, openDialog, notify, loading = false }: { rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>; openDialog: (d: null | { mode: "create" | "edit"; page: PageId; row?: Row }) => void; notify: (s: string) => void; loading?: boolean }) {
  const { locale, t, v } = useI18n();
  const { can } = useAccess();
  const [selected, setSelected] = useState<Row>(rows[0]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const filtered = rows.filter(row => Object.values(row).some(value => v(value).toLowerCase().includes(search.toLowerCase())));
  const selectedInvoices = rows.filter(row => selectedIds.includes(row.id));
  const canEdit = can("invoices", "edit");
  const canDelete = can("invoices", "delete");
  const keys = ["penyewa", "unit", "periode", "jatuhTempo", "total", "sisa", "status"];
  const allFilteredSelected = filtered.length > 0 && filtered.every(row => selectedIds.includes(row.id));
  const toggleInvoice = (id: string) => setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const toggleFiltered = () => setSelectedIds(current => {
    const visible = filtered.map(row => row.id);
    if (visible.every(id => current.includes(id))) return current.filter(id => !visible.includes(id));
    return Array.from(new Set([...current, ...visible]));
  });
  const downloadOne = async () => {
    await downloadInvoicePDF(selected, readOrgInfo());
    notify(locale === "en" ? "Invoice PDF downloaded." : "PDF tagihan diunduh.");
  };
  const downloadMany = async () => {
    await downloadBatchPDF(selectedInvoices, readOrgInfo());
    notify(locale === "en" ? "Invoice ZIP downloaded." : "ZIP tagihan diunduh.");
  };
  const markPaid = () => { setRows(old => old.map(r => r.id === selected.id ? { ...r, sisa: "Rp0", status: "Lunas" } : r)); setSelected({ ...selected, sisa: "Rp0", status: "Lunas" }); notify(message(locale, "paid", { invoice: selected.id })); };
  return <><PageHead page="invoices" action={() => openDialog({ mode: "create", page: "invoices" })} />{loading ? <SkeletonStats /> : <div className="stats-strip"><div className="stat"><span>{t("Terlambat")}</span><strong>2</strong><small style={{ color: "var(--danger)" }}>{v("Rp1,55 jt")}</small></div><div className="stat"><span>{t("Jatuh tempo 7 hari")}</span><strong>1</strong></div><div className="stat"><span>{t("Belum dibayar")}</span><strong>3</strong></div><div className="stat"><span>{t("Lunas bulan ini")}</span><strong>18</strong><small>{v("Rp31,2 jt")}</small></div></div>}
    <div className="split"><section className="panel"><div className="toolbar"><div className="field-inline"><Search /><input type="search" enterKeyHint="search" aria-label={t("Cari data")} value={search} onChange={event => setSearch(event.target.value)} placeholder={t("Cari data...")} /></div><select aria-label={t("Filter status")}><option>{t("Semua")}</option><option>{t("Belum dibayar")}</option><option>{t("Jatuh tempo")}</option><option>{t("Terlambat")}</option><option>{t("Lunas")}</option></select>{selectedInvoices.length > 1 && <button className="button" onClick={downloadMany}><Archive />Download ZIP ({selectedInvoices.length} invoice)</button>}</div>{loading ? <SkeletonTable cols={keys.length + 2} /> : <div className="table-wrap"><table>
        <thead><tr><th style={{ width: 44 }}><input type="checkbox" aria-label={t("Pilih semua tagihan")} checked={allFilteredSelected} onChange={toggleFiltered} /></th>{keys.map(key => <th key={key}>{t(columnLabels[key] || key)}</th>)}<th>{t("Aksi")}</th></tr></thead>
        <tbody>{filtered.map(row => <tr key={row.id} onClick={() => setSelected(row)} className={selected.id === row.id ? "selected" : ""}>
          <td onClick={event => event.stopPropagation()}><input type="checkbox" aria-label={`${t("Pilih")} ${row.id}`} checked={selectedIds.includes(row.id)} onChange={() => toggleInvoice(row.id)} /></td>
          {keys.map((key, i) => <td key={key}>{key === "status" ? <Status>{row[key]}</Status> : <span className={i === 0 ? "cell-main" : ""}>{v(row[key])}</span>}</td>)}
          <td><div className="actions">{canEdit && <button className="icon-button" aria-label={`${t("Edit")} ${row.id}`} onClick={event => { event.stopPropagation(); openDialog({ mode: "edit", page: "invoices", row }); }}><Pencil /></button>}{canDelete && <button className="icon-button" aria-label={`${t("Hapus")} ${row.id}`} onClick={event => { event.stopPropagation(); setRows(old => old.filter(r => r.id !== row.id)); setSelectedIds(current => current.filter(id => id !== row.id)); notify(locale === "en" ? "Invoice deleted." : "Tagihan dihapus."); }}><Trash2 /></button>}{!canEdit && !canDelete && <span className="cell-sub">{t("Hanya lihat")}</span>}</div></td>
        </tr>)}</tbody>
      </table></div>}</section>
      <aside className="detail-pane"><div className="panel-head"><div><h2>{selected.id}</h2><p>{v(selected.periode)}</p></div><Status>{selected.status}</Status></div><div className="detail-section"><div className="detail-title">{selected.penyewa}</div><div className="detail-grid"><span>{t("Unit")}</span><span>{selected.unit}</span><span>{t("Jatuh tempo")}</span><span>{v(selected.jatuhTempo)}</span><span>{locale === "en" ? "Invoice total" : "Total tagihan"}</span><span>{v(selected.total)}</span><span>{t("Sisa tagihan")}</span><span className={selected.sisa !== "Rp0" ? "money-danger" : ""}>{v(selected.sisa)}</span></div></div>
        <div className="detail-section"><div className="detail-title">{t("Tautan pembayaran")}</div><div style={{ padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 16, fontSize: ".75rem", overflow: "hidden", textOverflow: "ellipsis" }}>sewain.id/bayar/{selected.id}</div><div className="actions" style={{ marginTop: 12 }}><button className="button" onClick={() => notify(locale === "en" ? "Payment link copied." : "Tautan pembayaran disalin.")}>{t("Salin tautan")}</button><button className="button" onClick={() => notify(message(locale, "reminder", { name: selected.penyewa }))}><MessageSquareText />{t("Kirim pengingat")}</button><button className="button" onClick={downloadOne}><Download />Download PDF</button></div></div>
        <div className="detail-section"><div className="detail-title">{t("Riwayat pembayaran")}</div><div className="activity"><span className="activity-icon"><Check /></span><span><strong>{t("Pembayaran transfer")}</strong><span className="cell-sub">{t("Sebagian")} · {v("Rp1.200.000")}</span></span><time>6 Jun</time></div><div className="activity"><span className="activity-icon"><FileText /></span><span><strong>{t("Tagihan dibuat")}</strong><span className="cell-sub">{t("Otomatis dari sewa aktif")}</span></span><time>1 Jun</time></div></div>
        <div className="detail-section"><button className="button primary" style={{ width: "100%" }} disabled={selected.status === "Lunas"} onClick={markPaid}><CircleDollarSign />{t(selected.status === "Lunas" ? "Pembayaran sudah lunas" : "Catat pembayaran penuh")}</button></div>
      </aside></div></>;
}
