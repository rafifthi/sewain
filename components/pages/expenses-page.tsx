"use client";

import { useState } from "react";
import {
  ClipboardList, Pencil, Plus, Search, Trash2, X,
} from "lucide-react";
import { useI18n, useAccess } from "@/components/context";
import { type Row } from "@/lib/data";
import { message, type Locale } from "@/lib/i18n";
import { SkeletonTable } from "@/components/skeleton";
import { PageHead, Toolbar, Status, pageMeta, type DialogState } from "@/components/pages/shared";
import { formatRp } from "@/lib/utility-token-config";

const rupiah = (value: unknown) => Number(String(value ?? "0").replace(/[^\d]/g, "")) || 0;

const EXPENSE_CATEGORIES = ["Listrik", "Air", "Internet", "Kebersihan", "Gaji", "Perawatan", "Pajak", "Sampah", "Keamanan", "Lainnya"];

const EXPENSE_FILTER_OPTIONS = ["Semua", ...EXPENSE_CATEGORIES];

export function ExpensesPage({ rows, setRows, properties, openDialog, notify }: {
  rows: Row[];
  setRows: (rows: Row[]) => void;
  properties: Row[];
  openDialog: (d: DialogState) => void;
  notify: (s: string) => void;
}) {
  const { locale, t, v } = useI18n();
  const { can } = useAccess();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const [propertyFilter, setPropertyFilter] = useState("Semua");
  const [deleteConfirm, setDeleteConfirm] = useState<Row | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);

  const filtered = rows.filter(row => {
    if (categoryFilter !== "Semua" && row.kategori !== categoryFilter) return false;
    if (propertyFilter !== "Semua" && String(row.propertiId) !== propertyFilter) return false;
    return Object.values(row).some(value => v(value).toLowerCase().includes(search.toLowerCase()));
  });

  const handleDelete = (row: Row) => {
    setRows(rows.filter(item => item.id !== row.id));
    notify(message(locale, "removed", { item: t("pengeluaran") }));
    setDeleteConfirm(null);
  };

  // Form state
  const [formData, setFormData] = useState({
    nama: "", propertiId: "", kategori: "Listrik", jumlah: "", tanggal: "", catatan: "",
  });
  const [formError, setFormError] = useState("");

  const openForm = (row?: Row) => {
    if (row) {
      setEditRow(row);
      const numJumlah = rupiah(row.jumlah);
      setFormData({
        nama: String(row.nama || ""),
        propertiId: String(row.propertiId || ""),
        kategori: String(row.kategori || "Lainnya"),
        jumlah: numJumlah ? String(numJumlah) : "",
        tanggal: toDateInputValue(row.tanggal),
        catatan: String(row.catatan || ""),
      });
    } else {
      setEditRow(null);
      setFormData({
        nama: "", propertiId: properties[0]?.id || "", kategori: "Listrik",
        jumlah: "", tanggal: new Date().toISOString().slice(0, 10), catatan: "",
      });
    }
    setFormError("");
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.jumlah || !formData.tanggal || !formData.propertiId) {
      setFormError(locale === "en" ? "Please fill all required fields." : "Isi semua field yang wajib.");
      return;
    }
    const jumlah = Number(formData.jumlah);
    if (jumlah < 1) {
      setFormError(locale === "en" ? "Amount must be greater than zero." : "Jumlah harus lebih dari nol.");
      return;
    }
    const dateObj = new Date(`${formData.tanggal}T00:00:00Z`);
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const tanggal = `${dateObj.getUTCDate()} ${months[dateObj.getUTCMonth()]} ${dateObj.getUTCFullYear()}`;

    const row: Row = {
      id: editRow?.id || `exp-${Date.now()}`,
      propertiId: formData.propertiId,
      nama: formData.nama.trim(),
      kategori: formData.kategori,
      jumlah: formatRp(jumlah),
      tanggal,
      catatan: formData.catatan.trim() || "",
    };

    if (editRow) {
      setRows(rows.map(r => r.id === editRow.id ? row : r));
    } else {
      setRows([row, ...rows]);
    }
    notify(message(locale, "saved", { item: t("pengeluaran") }));
    setFormOpen(false);
  };

  return (
    <>
      <PageHead page="expenses" action={() => openForm()} />
      <section className="panel">
        <div className="toolbar">
          <div className="field-inline">
            <Search />
            <input type="search" enterKeyHint="search" aria-label={t("Cari data")}
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t("Cari data...")} />
          </div>
          <select aria-label={t("Kategori")} value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}>
            {EXPENSE_FILTER_OPTIONS.map(o => (
              <option key={o} value={o}>{t(o)}</option>
            ))}
          </select>
          <select aria-label={t("Properti")} value={propertyFilter}
            onChange={e => setPropertyFilter(e.target.value)}>
            <option value="Semua">{t("Semua properti")}</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{v(p.nama)}</option>
            ))}
          </select>
        </div>

        {filtered.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("Nama")}</th>
                  <th>{t("Properti")}</th>
                  <th>{t("Kategori")}</th>
                  <th>{t("Jumlah")}</th>
                  <th>{t("Tanggal")}</th>
                  <th>{t("Aksi")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => {
                  const property = properties.find(p => p.id === row.propertiId);
                  return (
                    <tr key={row.id}>
                      <td><span className="cell-main">{v(row.nama)}</span>
                        {row.catatan && <span className="cell-sub"> {v(row.catatan)}</span>}
                      </td>
                      <td>{property ? v(property.nama) : "-"}</td>
                      <td><Status>{row.kategori}</Status></td>
                      <td className="money-danger">{v(row.jumlah)}</td>
                      <td>{v(row.tanggal)}</td>
                      <td>
                        <div className="actions">
                          {can("tickets", "edit") && (
                            <button className="icon-button" aria-label={`${t("Edit")} ${row.id}`}
                              onClick={() => openForm(row)}><Pencil /></button>
                          )}
                          {can("tickets", "delete") && (
                            <button className="icon-button" aria-label={`${t("Hapus")} ${row.id}`}
                              onClick={() => setDeleteConfirm(row)}><Trash2 /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <ClipboardList />
            <div>
              <strong>{t("Belum ada data yang cocok")}</strong>
              {locale === "en"
                ? "Change your search or add a new expense."
                : "Ubah pencarian atau tambahkan pengeluaran baru."}
            </div>
          </div>
        )}
      </section>

      {/* Form Dialog */}
      {formOpen && (
        <div className="backdrop" role="presentation"
          onMouseDown={e => e.target === e.currentTarget && setFormOpen(false)}>
          <form className="dialog" onSubmit={handleSubmit} role="dialog" aria-modal="true"
            aria-labelledby="expense-form-title">
            <div className="dialog-head">
              <div>
                <h2 id="expense-form-title">
                  {t(editRow ? "Edit" : "Tambah")} {t("Pengeluaran")}
                </h2>
                <p>{locale === "en" ? "Record a property expense." : "Catat pengeluaran properti."}</p>
              </div>
              <button type="button" className="icon-button" aria-label={t("Tutup")}
                onClick={() => setFormOpen(false)}><X /></button>
            </div>
            <div className="dialog-body">
              <div className="form-grid">
                <div className="form-field full">
                  <label htmlFor="exp-nama">{t("Nama")}</label>
                  <input id="exp-nama" value={formData.nama}
                    onChange={e => setFormData(f => ({ ...f, nama: e.target.value }))} required
                    placeholder={locale === "en" ? "e.g. Electricity bill" : "Contoh: Tagihan listrik"} />
                </div>
                <div className="form-field">
                  <label htmlFor="exp-properti">{t("Properti")}</label>
                  <select id="exp-properti" value={formData.propertiId}
                    onChange={e => setFormData(f => ({ ...f, propertiId: e.target.value }))} required>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{v(p.nama)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="exp-kategori">{t("Kategori")}</label>
                  <select id="exp-kategori" value={formData.kategori}
                    onChange={e => setFormData(f => ({ ...f, kategori: e.target.value }))} required>
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c} value={c}>{t(c)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="exp-jumlah">{t("Jumlah")}</label>
                  <div className="money-input">
                    <span>Rp</span>
                    <input id="exp-jumlah" type="number" inputMode="numeric" min="1" step="100"
                      value={formData.jumlah}
                      onChange={e => setFormData(f => ({ ...f, jumlah: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="exp-tanggal">{t("Tanggal")}</label>
                  <input id="exp-tanggal" type="date" value={formData.tanggal}
                    onChange={e => setFormData(f => ({ ...f, tanggal: e.target.value }))} required />
                </div>
                <div className="form-field full">
                  <label htmlFor="exp-catatan">{t("Catatan")}</label>
                  <textarea id="exp-catatan" rows={3} value={formData.catatan}
                    onChange={e => setFormData(f => ({ ...f, catatan: e.target.value }))}
                    placeholder={locale === "en" ? "Optional notes..." : "Catatan opsional..."} />
                </div>
              </div>
              {formError && <p className="form-error" role="alert">{formError}</p>}
            </div>
            <div className="dialog-actions">
              <button type="button" className="button"
                onClick={() => setFormOpen(false)}>{t("Batal")}</button>
              <button type="submit" className="button primary">
                {t(editRow ? "Simpan perubahan" : "Tambahkan")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="backdrop" role="presentation"
          onMouseDown={e => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="delete-expense-title">
            <div className="dialog-head">
              <div>
                <h2 id="delete-expense-title">
                  {locale === "en" ? "Delete expense?" : "Hapus pengeluaran?"}
                </h2>
                <p>{locale === "en"
                  ? `This will permanently remove "${v(deleteConfirm.nama)}".`
                  : `Tindakan ini akan menghapus "${v(deleteConfirm.nama)}" secara permanen.`}</p>
              </div>
              <button className="icon-button" aria-label={t("Tutup")}
                onClick={() => setDeleteConfirm(null)}><X /></button>
            </div>
            <div className="dialog-actions">
              <button className="button"
                onClick={() => setDeleteConfirm(null)}>{t("Batal")}</button>
              <button className="button danger" onClick={() => handleDelete(deleteConfirm)}>
                <Trash2 />{t("Hapus")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
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
