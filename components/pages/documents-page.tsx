"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, FileSignature, FileText, FolderOpen, IdCard, Pencil, Search, Trash2 } from "lucide-react";
import { Row } from "@/lib/data";
import { message } from "@/lib/i18n";
import { useI18n, useAccess } from "@/components/context";
import {
  Status, Toolbar, PageHead, DialogState,
} from "@/components/sewain-app";

export function DocumentsPage({ rows, setRows, openDialog, notify }: { rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>; openDialog: (d: DialogState) => void; notify: (s: string) => void }) {
  const { locale, t, v } = useI18n();
  const { can } = useAccess();
  const L = (id: string, en: string) => (locale === "en" ? en : id);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const remove = (row: Row) => { setRows(old => old.filter(d => d.id !== row.id)); notify(message(locale, "removed", { item: t("dokumen") })); };

  // Group by kategori; blank → "Lainnya / Other".
  const folders = rows.reduce<Record<string, Row[]>>((acc, d) => {
    const key = String(d.kategori || "");
    (acc[key] ||= []).push(d);
    return acc;
  }, {});
  const KATEGORI_ORDER = ["Kontrak", "Identitas", "Properti", "Lainnya"];
  const folderKeys = Object.keys(folders).sort((a, b) => {
    const ia = KATEGORI_ORDER.indexOf(a), ib = KATEGORI_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
  const folderName = (key: string) => key || L("Lainnya", "Other");

  const searching = search.trim().length > 0;
  const matchesDoc = (d: Row) => [d.nama, d.kategori, d.terkait, d.diperbarui, d.status].some(val => v(val).toLowerCase().includes(search.toLowerCase()));
  const searchHits = searching ? rows.filter(matchesDoc) : [];
  const verifiedCount = rows.filter(d => String(d.status) === "Terverifikasi").length;
  const privateCount = rows.filter(d => String(d.status) === "Privat").length;
  const linkedCount = rows.filter(d => String(d.terkait || "").trim()).length;

  const canEdit = can("documents", "edit");
  const canDelete = can("documents", "delete");

  const iconForCategory = (kategori: unknown) => {
    const kat = String(kategori || "");
    if (kat === "Kontrak") return <FileSignature />;
    if (kat === "Identitas") return <IdCard />;
    return <FileText />;
  };
  const docIcon = (d: Row) => iconForCategory(d.kategori);

  const fileRow = (d: Row) => <div key={d.id} role="button" tabIndex={0}
    className="file-row"
    onClick={() => openDialog({ mode: "edit", page: "documents", row: d })}
    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDialog({ mode: "edit", page: "documents", row: d }); } }}>
    <span className="document-type">{docIcon(d)}</span>
    <span className="file-row-text"><strong>{v(d.nama)}</strong><small>{d.terkait ? `${v(d.terkait)} · ` : ""}{v(d.diperbarui)}</small></span>
    <Status>{d.status}</Status>
    <span className="actions">
      {canEdit && <button type="button" className="icon-button" aria-label={`${t("Edit")} ${v(d.nama)}`} onClick={e => { e.stopPropagation(); openDialog({ mode: "edit", page: "documents", row: d }); }}><Pencil /></button>}
      {canDelete && <button type="button" className="icon-button" aria-label={`${t("Hapus")} ${v(d.nama)}`} onClick={e => { e.stopPropagation(); remove(d); }}><Trash2 /></button>}
    </span>
  </div>;

  const openDocs = openFolder !== null ? (folders[openFolder] || []) : [];

  return <>
    <PageHead page="documents" action={can("documents", "create") ? () => openDialog({ mode: "create", page: "documents" }) : undefined} />
    <section className="document-overview" aria-label={L("Ringkasan dokumen", "Document overview")}>
      <div><span>{L("Total arsip", "Total archive")}</span><strong>{rows.length}</strong></div>
      <div><span>{L("Terverifikasi", "Verified")}</span><strong>{verifiedCount}</strong></div>
      <div><span>{L("Privat", "Private")}</span><strong>{privateCount}</strong></div>
      <div><span>{L("Terhubung", "Linked")}</span><strong>{linkedCount}</strong></div>
    </section>
    {openFolder !== null
      ? <section className="panel document-panel">
          <div className="document-folder-head">
            <button className="button tenant-back" onClick={() => setOpenFolder(null)}><ChevronLeft />{L("Semua dokumen", "All documents")}</button>
            <div className="explorer-crumb"><span><FolderOpen /></span><strong>{v(folderName(openFolder))}</strong><span>{L(`${openDocs.length} dokumen`, `${openDocs.length} documents`)}</span></div>
          </div>
          <div className="file-list">{openDocs.map(fileRow)}</div>
        </section>
      : <section className="panel document-panel"><Toolbar search={search} setSearch={setSearch} />
          {!rows.length
            ? <div className="empty"><FileText /><div><strong>{L("Belum ada dokumen", "No documents yet")}</strong>{L("Unggah dokumen baru.", "Upload a new document.")}</div></div>
            : searching
              ? (searchHits.length ? <div className="file-list">{searchHits.map(fileRow)}</div> : <div className="empty"><Search /><div><strong>{L("Tidak ada dokumen yang cocok", "No matching documents")}</strong>{L("Ubah kata kunci pencarian.", "Try a different search term.")}</div></div>)
              : <div className="explorer-grid">{folderKeys.map(key => <button type="button" key={key || "_other"} className="folder-card" onClick={() => setOpenFolder(key)}>
                  <span className="folder-card-icon">{iconForCategory(key)}</span>
                  <span className="folder-card-text"><strong>{v(folderName(key))}</strong><small>{L(`${folders[key].length} dokumen`, `${folders[key].length} documents`)}</small></span>
                  <ChevronRight className="folder-card-chevron" />
                </button>)}</div>}
        </section>}
  </>;
}
