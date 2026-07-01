"use client";

import { useState } from "react";
import { ClipboardList, MessageSquareText, Pencil, Send } from "lucide-react";
import { Row } from "@/lib/data";
import { message } from "@/lib/i18n";
import { useI18n, type I18nState } from "@/components/context";
import { TenantDetail } from "@/components/sewain-app";
import {
  PageHead, Toolbar, Status, whatsappUrl,
  DialogState,
} from "./shared";
import { SkeletonTable } from "@/components/skeleton";

export function TenantsPage({ rows, setRows, invoices, documents, openDialog, notify, goToProperties, loading = false }: { rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>; invoices: Row[]; documents: Row[]; openDialog: (d: DialogState) => void; notify: (s: string) => void; goToProperties: () => void; loading?: boolean }) {
  const { locale, t, v } = useI18n();
  const [selected, setSelected] = useState<Row | null>(null);
  const [search, setSearch] = useState("");
  const filtered = rows.filter(row => [row.nama, row.telepon, row.email, row.unit, row.status, row.telegram_id].some(value => v(value).toLowerCase().includes(search.toLowerCase())));
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
      {loading ? <SkeletonTable cols={5} /> : filtered.length ? <div className="table-wrap"><table className="tenant-table"><thead><tr><th>{t("Nama lengkap")}</th><th>{t("Kontak")}</th><th>{t("Hunian saat ini")}</th><th>{t("Status")}</th><th>{t("Aksi")}</th></tr></thead><tbody>
        {filtered.map(row => <tr key={row.id} onClick={() => setSelected(row)}><td><span className="tenant-name"><span className="avatar small">{String(row.nama).split(" ").map(part => part[0]).slice(0, 2).join("")}</span><span><strong>{v(row.nama)}</strong><small>{v(row.email)}</small></span></span></td><td><span className="cell-main">{v(row.telepon)}</span><span className="cell-sub">{row.telegram_id ? <>Telegram · <Send size={12} /></> : "WhatsApp"}</span></td><td><span className="cell-main">{v(row.unit || "Belum ada sewa")}</span><span className="cell-sub">{row.sejak ? `${t("Mulai")} ${v(row.sejak)}` : t("Lewat flow booking")}</span></td><td><Status>{row.status || "Belum ada sewa"}</Status></td><td><div className="actions"><a className="icon-button whatsapp-icon" href={whatsappUrl(row.telepon)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${row.nama}`} onClick={event => event.stopPropagation()}><MessageSquareText /></a><button className="icon-button" aria-label={`${t("Edit")} ${row.nama}`} onClick={event => { event.stopPropagation(); openDialog({ mode: "edit", page: "tenants", row }); }}><Pencil /></button></div></td></tr>)}
      </tbody></table></div> : <div className="empty"><ClipboardList /><div><strong>{t("Belum ada data yang cocok")}</strong>{t("Ubah pencarian atau tambahkan penyewa baru.")}</div></div>}
    </section></>;
}
