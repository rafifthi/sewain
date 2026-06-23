"use client";

import { useState } from "react";
import { Building2, Search, Plus } from "lucide-react";
import { Row } from "@/lib/data";
import { useI18n, type I18nState } from "@/components/context";
import {
  PageHead, PropertyCard, PropertyDetail, isSingleUnit,
  PageId, DialogState, BookingState,
} from "./_shared";

export function PropertiesPage({ rows, setRows, units, setUnits, invoices, tickets, onBook, onViewReservations, openDialog, notify }: { rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>; units: Row[]; setUnits: React.Dispatch<React.SetStateAction<Row[]>>; invoices: Row[]; tickets: Row[]; onBook: (ctx: BookingState) => void; onViewReservations: () => void; openDialog: (d: DialogState) => void; notify: (s: string) => void }) {
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
