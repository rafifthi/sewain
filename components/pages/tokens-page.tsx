"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardList, Pencil, Plus, Search, Settings, Trash2, X } from "lucide-react";
import { Row } from "@/lib/data";
import { useI18n, useTokenConfig } from "@/components/context";
import { formatRp, defaultTokenConfig, calcFee, type TokenConfig } from "@/lib/utility-token-config";
import { PageHead, Toolbar, DataTable, CrudPage, type PageId } from "./shared";
import { SkeletonTable } from "@/components/skeleton";

const tokenActionMap: Record<string, { label: string; labelEn: string; next: string }> = {
  "Dikonfirmasi": { label: "Proses Pesanan", labelEn: "Process Order", next: "Diproses" },
  "Diproses": { label: "Token Sudah Dibeli", labelEn: "Token Purchased", next: "Token Siap" },
  "Token Siap": { label: "Tandai Selesai", labelEn: "Mark Complete", next: "Selesai" },
};

function Status({ children }: { children: React.ReactNode }) {
  const { v } = useI18n();
  const value = String(children);
  const slug = (s: unknown) => String(s).toLowerCase().replace(/\s+/g, "-");
  const state = /tidak aktif|tidak|nonaktif|belum ada sewa/i.test(value) ? "" :
    /aktif|lunas|dihuni|selesai|terkirim|ditandatangani|terverifikasi/i.test(value) ? "success" :
    /terlambat|perawatan|perlu perhatian/i.test(value) ? "danger" :
    /\bbooking\b/i.test(value) ? "info" :
    /jatuh|dipesan|kontrak|menunggu|ditugaskan|akan kosong|draf|diproses|dikonfirmasi|token siap/i.test(value) ? "warning" : "";
  return <span className={`badge ${state} ${slug(value)}`}>{v(value)}</span>;
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
          <div><h2 id="fee-dialog-title">{locale === "en" ? "Platform fee" : "Biaya platform"}</h2><p>{locale === "en" ? "Manage the fee charged on each token order." : "Atur biaya yang dikenakan pada setiap pesanan token."}</p></div>
          <button type="button" className="icon-button" aria-label={t("Tutup")} onClick={onClose}><X /></button>
        </div>
        <div className="dialog-body">
          <div className="form-grid">
            <div className="form-field"><label htmlFor="fee-type">{locale === "en" ? "Fee type" : "Jenis biaya"}</label>
              <select id="fee-type" value={feeType} onChange={e => setFeeType(e.target.value as "flat" | "percent")}>
                <option value="flat">{locale === "en" ? "Flat (Rp)" : "Flat (Rp)"}</option>
                <option value="percent">{locale === "en" ? "Percent (%)" : "Persen (%)"}</option>
              </select>
            </div>
            <div className="form-field"><label htmlFor="fee-value">{locale === "en" ? "Fee value" : "Nilai biaya"}</label>
              <input id="fee-value" type="number" min={0} value={feeValue} onChange={e => setFeeValue(Number(e.target.value))} />
            </div>
            <div className="form-field full">
              <div className="fee-preview">
                <span>{locale === "en" ? "Example:" : "Contoh:"} Rp50.000 + {feeType === "flat" ? `Rp${feeValue.toLocaleString("id-ID")}` : `${feeValue}%`} = {v(formatRp(50000 + calcFee(50000, { type: feeType, value: feeValue })))}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="dialog-actions">
          <button type="button" className="button" onClick={onClose}>{t("Batal")}</button>
          <button type="button" className="button primary" onClick={save}>{t("Simpan")}</button>
        </div>
      </div>
    </div>
  );
}

export function TokenPage({ rows, setRows, openDialog, notify, loading = false }: { rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>; openDialog: (d: null | { mode: "create" | "edit"; page: PageId; row?: Row }) => void; notify: (s: string) => void; loading?: boolean }) {
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
          {loading ? <SkeletonTable /> : <DataTable rows={filtered} selected={selected?.id} onSelect={setSelected} onEdit={row => openDialog({ mode: "edit", page: "tokens", row })} onDelete={remove} />}
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

export { CrudPage };
