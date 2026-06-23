"use client";

import { useState } from "react";
import { Check, CheckCircle2, CircleDollarSign, ClipboardList, FileText, MessageSquareText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Row, invoices as seedInvoices } from "@/lib/data";
import { useI18n } from "@/components/context";
import { message } from "@/lib/i18n";
import { PageHead, Toolbar, DataTable, Status, type PageId } from "./shared";

export function InvoicePage({ rows, setRows, openDialog, notify }: { rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>; openDialog: (d: null | { mode: "create" | "edit"; page: PageId; row?: Row }) => void; notify: (s: string) => void }) {
  const { locale, t, v } = useI18n();
  const [selected, setSelected] = useState<Row>(rows[0]);
  const [search, setSearch] = useState("");
  const filtered = rows.filter(row => Object.values(row).some(value => v(value).toLowerCase().includes(search.toLowerCase())));
  const markPaid = () => { setRows(old => old.map(r => r.id === selected.id ? { ...r, sisa: "Rp0", status: "Lunas" } : r)); setSelected({ ...selected, sisa: "Rp0", status: "Lunas" }); notify(message(locale, "paid", { invoice: selected.id })); };
  return <><PageHead page="invoices" action={() => openDialog({ mode: "create", page: "invoices" })} /><div className="stats-strip"><div className="stat"><span>{t("Terlambat")}</span><strong>2</strong><small style={{ color: "var(--danger)" }}>{v("Rp1,55 jt")}</small></div><div className="stat"><span>{t("Jatuh tempo 7 hari")}</span><strong>1</strong></div><div className="stat"><span>{t("Belum dibayar")}</span><strong>3</strong></div><div className="stat"><span>{t("Lunas bulan ini")}</span><strong>18</strong><small>{v("Rp31,2 jt")}</small></div></div>
    <div className="split"><section className="panel"><Toolbar search={search} setSearch={setSearch} page="invoices" /><DataTable rows={filtered} module="invoices" selected={selected.id} onSelect={setSelected} onEdit={row => openDialog({ mode: "edit", page: "invoices", row })} onDelete={row => { setRows(old => old.filter(r => r.id !== row.id)); notify(locale === "en" ? "Invoice deleted." : "Tagihan dihapus."); }} /></section>
      <aside className="detail-pane"><div className="panel-head"><div><h2>{selected.id}</h2><p>{v(selected.periode)}</p></div><Status>{selected.status}</Status></div><div className="detail-section"><div className="detail-title">{selected.penyewa}</div><div className="detail-grid"><span>{t("Unit")}</span><span>{selected.unit}</span><span>{t("Jatuh tempo")}</span><span>{v(selected.jatuhTempo)}</span><span>{locale === "en" ? "Invoice total" : "Total tagihan"}</span><span>{v(selected.total)}</span><span>{t("Sisa tagihan")}</span><span className={selected.sisa !== "Rp0" ? "money-danger" : ""}>{v(selected.sisa)}</span></div></div>
        <div className="detail-section"><div className="detail-title">{t("Tautan pembayaran")}</div><div style={{ padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 16, fontSize: ".75rem", overflow: "hidden", textOverflow: "ellipsis" }}>sewain.id/bayar/{selected.id}</div><div className="actions" style={{ marginTop: 12 }}><button className="button" onClick={() => notify(locale === "en" ? "Payment link copied." : "Tautan pembayaran disalin.")}>{t("Salin tautan")}</button><button className="button" onClick={() => notify(message(locale, "reminder", { name: selected.penyewa }))}><MessageSquareText />{t("Kirim pengingat")}</button></div></div>
        <div className="detail-section"><div className="detail-title">{t("Riwayat pembayaran")}</div><div className="activity"><span className="activity-icon"><Check /></span><span><strong>{t("Pembayaran transfer")}</strong><span className="cell-sub">{t("Sebagian")} · {v("Rp1.200.000")}</span></span><time>6 Jun</time></div><div className="activity"><span className="activity-icon"><FileText /></span><span><strong>{t("Tagihan dibuat")}</strong><span className="cell-sub">{t("Otomatis dari sewa aktif")}</span></span><time>1 Jun</time></div></div>
        <div className="detail-section"><button className="button primary" style={{ width: "100%" }} disabled={selected.status === "Lunas"} onClick={markPaid}><CircleDollarSign />{t(selected.status === "Lunas" ? "Pembayaran sudah lunas" : "Catat pembayaran penuh")}</button></div>
      </aside></div></>;
}
