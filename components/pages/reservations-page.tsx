"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock, Check, CheckCircle2, ChevronLeft, ClipboardList, Eye, FileSignature, FileText, FileType2,
  MessageSquareText, Plus, UserCheck, WalletCards,
} from "lucide-react";
import { Row } from "@/lib/data";
import { message } from "@/lib/i18n";
import { formatRp } from "@/lib/utility-token-config";
import { DEFAULT_CONTRACT_TEMPLATE_ID } from "@/lib/contracts";
import { useI18n } from "@/components/context";
import {
  Status, Toolbar, TenantCombobox, TenantDialog, isExpiringSoon, reservationEndDate, todayInput, statusRank,
  rupiah, upsertRow, fmtMonthYear, addMonths, fmtShort, parseInput, syncPropertyOccupancy, whatsappUrl,
  unitLabelFor, unitsForProperty, isVacant, unitRent, unitDeposit, idMonthsLong, daysUntil,
  BookingState,
} from "@/components/sewain-app";

type ReservationsPageProps = {
  rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>;
  units: Row[]; setUnits: React.Dispatch<React.SetStateAction<Row[]>>;
  tenants: Row[]; setTenants: React.Dispatch<React.SetStateAction<Row[]>>;
  properties: Row[]; setProperties: React.Dispatch<React.SetStateAction<Row[]>>;
  setContracts: React.Dispatch<React.SetStateAction<Row[]>>;
  setDocuments: React.Dispatch<React.SetStateAction<Row[]>>;
  setInvoices: React.Dispatch<React.SetStateAction<Row[]>>;
  notify: (s: string) => void; focusId: string; onClearFocus: () => void;
  onBook: (ctx: BookingState) => void;
  onOpenContract: (nomor: string) => void;
};

export function ReservationsPage(props: ReservationsPageProps) {
  const { locale, t, v } = useI18n();
  const [selectedId, setSelectedId] = useState<string>(props.focusId || "");
  const [search, setSearch] = useState("");
  useEffect(() => { if (props.focusId) { setSelectedId(props.focusId); props.onClearFocus(); } }, [props.focusId]);
  const selected = props.rows.find(r => r.id === selectedId);
  if (selected) return <ReservationDetail reservation={selected} {...props} onBack={() => setSelectedId("")} />;

  const count = (s: string) => props.rows.filter(r => r.status === s).length;
  const expiring = props.rows.filter(r => isExpiringSoon(r)).length;
  const filtered = props.rows.filter(r => Object.values(r).some(val => v(val).toLowerCase().includes(search.toLowerCase())));
  return <><div className="page-head"><div><h1>{t("Reservasi")}</h1><p className="subtext">{t("Lacak status setiap pemesanan dari booking hingga selesai.")}</p></div><div className="actions"><button className="button primary" onClick={() => props.onBook({})}><Plus />{locale === "en" ? "New Reservation" : "Buat Reservasi"}</button></div></div>
    <div className="stats-strip">
      <div className="stat"><span>{t("Booking")}</span><strong>{count("Booking")}</strong></div>
      <div className="stat"><span>{t("Aktif")}</span><strong>{count("Aktif")}</strong></div>
      <div className="stat"><span>{t("Akan berakhir")}</span><strong>{expiring}</strong><small style={{ color: expiring ? "var(--danger)" : undefined }}>{t("≤ 30 hari")}</small></div>
      <div className="stat"><span>{t("Tidak Aktif")}</span><strong>{count("Tidak Aktif")}</strong></div>
    </div>
    <section className="panel"><Toolbar search={search} setSearch={setSearch} />
      {filtered.length ? <div className="table-wrap"><table>
        <thead><tr><th>{t("Kode")}</th><th>{t("Penyewa")}</th><th>{t("Unit")}</th><th>{t("Periode")}</th><th>{t("Status")}</th><th>{t("Aksi")}</th></tr></thead>
        <tbody>{filtered.map(r => <tr key={r.id} onClick={() => setSelectedId(r.id)} className={selectedId === r.id ? "selected" : ""}>
          <td><span className="cell-main">{v(r.kode)}</span></td>
          <td>{v(r.penyewa)}</td>
          <td>{v(r.unit)}</td>
          <td><span className="cell-main">{r.periode ? v(r.periode) : "—"}</span>{isExpiringSoon(r) && <span className="cell-sub" style={{ color: "var(--danger)" }}>{t("Akan berakhir")}</span>}</td>
          <td><Status>{r.status}</Status></td>
          <td><div className="actions"><button className="icon-button" aria-label={`${t("Buka")} ${v(r.kode)}`} onClick={e => { e.stopPropagation(); setSelectedId(r.id); }}><Eye /></button></div></td>
        </tr>)}</tbody>
      </table></div> : <div className="empty"><ClipboardList /><div><strong>{t("Belum ada reservasi")}</strong>{locale === "en" ? "Create a reservation using the button above or from a property's unit." : "Buat reservasi menggunakan tombol di atas atau dari detail unit properti."}</div></div>}
    </section></>;
}

function ReservationDetail({ reservation, rows, setRows, units, setUnits, tenants, setTenants, properties, setProperties, setContracts, setDocuments, setInvoices, notify, onBack, onOpenContract }: ReservationsPageProps & { reservation: Row; onBack: () => void }) {
  const { locale, t, v } = useI18n();
  const endDate = reservationEndDate(reservation.periode);
  const [moveOutDate, setMoveOutDate] = useState(endDate ? endDate.toISOString().slice(0, 10) : todayInput());
  const [checklist, setChecklist] = useState({ deposit: false, contract: false, keys: false });
  void rows;

  const status = String(reservation.status);
  const rank = statusRank(status);
  const editable = rank < 2; // editable while still a draft (Booking / Draf Kontrak)
  const expiring = isExpiringSoon(reservation);
  const update = (patch: Record<string, string | number>) => setRows(old => old.map(r => r.id === reservation.id ? { ...r, ...patch } : r));

  // Resolve the reservation's links (seeded rows have no _propertyId/_unitId/_tenantId — fall back to name/label matching).
  const currentPropertyId = String(reservation._propertyId || properties.find(p => p.nama === reservation.properti)?.id || "");
  const currentProperty = properties.find(p => p.id === currentPropertyId);
  const currentUnitId = String(reservation._unitId || unitsForProperty(units, currentProperty).find(u => unitLabelFor(currentProperty, u) === reservation.unit)?.id || "");
  const currentTenantId = String(reservation._tenantId || tenants.find(tn => tn.nama === reservation.penyewa)?.id || "");
  const tenant = tenants.find(tn => tn.id === currentTenantId);

  // Draft editing — fields stay editable until the contract is signed.
  const [propertyId, setPropertyId] = useState(currentPropertyId);
  const [unitId, setUnitId] = useState(currentUnitId);
  const [tenantId, setTenantId] = useState(currentTenantId);
  const [duration, setDuration] = useState(String(reservation.durasi || "12 bulan"));
  const [rent, setRent] = useState(String(rupiah(reservation.sewa)));
  const [deposit, setDeposit] = useState(String(rupiah(reservation.deposit)));
  const [notes, setNotes] = useState(String(reservation._notes || ""));
  const [showTenantForm, setShowTenantForm] = useState(false);

  const editProperty = properties.find(p => p.id === propertyId);
  const editUnits = unitsForProperty(units, editProperty);
  const availableCount = (p?: Row) => unitsForProperty(units, p).filter(isVacant).length;
  const isUnitSelectable = (u: Row) => isVacant(u) || u.id === currentUnitId;
  const prospects = tenants.filter(tn => !tn.unit || tn.id === currentTenantId);
  const editTenant = tenants.find(tn => tn.id === tenantId);
  const tenantOptions = editTenant && !prospects.some(p => p.id === tenantId) ? [editTenant, ...prospects] : prospects;
  const changeEditProperty = (pid: string) => { const p = properties.find(x => x.id === pid); const vac = unitsForProperty(units, p).filter(isVacant); setPropertyId(pid); setUnitId(vac[0]?.id ?? ""); setRent(String(unitRent(vac[0], p))); setDeposit(String(unitDeposit(vac[0], p))); };

  const saveDraft = () => {
    const prop = properties.find(p => p.id === propertyId);
    const newUnit = unitsForProperty(units, prop).find(u => u.id === unitId);
    const newTenant = tenants.find(tn => tn.id === tenantId);
    if (!prop || !newUnit || !newTenant) { notify(t("Lengkapi unit dan penyewa terlebih dahulu.")); return; }
    const label = unitLabelFor(prop, newUnit);
    const unitChanged = currentUnitId !== newUnit.id;
    const tenantChanged = currentTenantId !== newTenant.id;

    if (unitChanged) {
      let base = units.map(u => u.id === currentUnitId ? { ...u, penyewa: "Belum ada", status: "Kosong" } : u);
      const claimed = { ...newUnit, sewa: formatRp(rupiah(rent)), deposit: formatRp(rupiah(deposit)), penyewa: String(newTenant.nama), status: "Dipesan" };
      base = base.some(u => u.id === newUnit.id) ? base.map(u => u.id === newUnit.id ? claimed : u) : [claimed, ...base];
      setUnits(base);
      if (currentPropertyId) syncPropertyOccupancy(currentPropertyId, setProperties, base);
      if (prop.id !== currentPropertyId) syncPropertyOccupancy(String(prop.id), setProperties, base);
    } else {
      setUnits(units.map(u => u.id === newUnit.id ? { ...u, penyewa: String(newTenant.nama), sewa: formatRp(rupiah(rent)), deposit: formatRp(rupiah(deposit)) } : u));
    }

    if (tenantChanged) {
      setTenants(old => old.map(tn => tn.id === currentTenantId ? { ...tn, unit: "", status: "Belum ada sewa" } : tn.id === newTenant.id ? { ...tn, unit: label, status: "Dipesan" } : tn));
    } else if (unitChanged) {
      setTenants(old => old.map(tn => tn.id === newTenant.id ? { ...tn, unit: label } : tn));
    }

    update({ penyewa: String(newTenant.nama), properti: String(prop.nama), unit: label, durasi: duration, sewa: formatRp(rupiah(rent)), deposit: formatRp(rupiah(deposit)), _propertyId: String(prop.id), _unitId: String(newUnit.id), _tenantId: String(newTenant.id), _notes: notes });
    notify(message(locale, "saved", { item: t("reservasi") }));
  };

  const toDraft = () => {
    const nomor = `KTR-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
    const months = parseInt(String(reservation.durasi), 10) || 12;
    const start = parseInput(todayInput());
    upsertRow(setContracts, {
      id: `contract-${Date.now()}`, nomor, penyewa: String(reservation.penyewa), unit: String(reservation.unit),
      properti: String(reservation.properti), kontak: String(tenant?.telepon || "-"), durasi: String(reservation.durasi),
      periode: `${fmtMonthYear(start)} - ${fmtMonthYear(addMonths(start, months))}`, sewa: String(reservation.sewa), deposit: String(reservation.deposit),
      jadwalMasuk: fmtShort(start), dibuat: fmtShort(new Date()), status: "Draf", templateId: DEFAULT_CONTRACT_TEMPLATE_ID, _reservationId: String(reservation.id),
    });
    upsertRow(setDocuments, { id: `doc-${Date.now()}`, nama: `Kontrak ${reservation.penyewa}.pdf`, kategori: "Kontrak", terkait: String(reservation.penyewa), diperbarui: fmtShort(new Date()), status: "Privat" });
    update({ status: "Draf Kontrak", _nomor: nomor });
    notify(message(locale, "draftCreated", { number: nomor }));
    onOpenContract(nomor);
  };
  const activate = () => {
    const nextUnits = units.map(u => u.id === currentUnitId ? { ...u, penyewa: String(reservation.penyewa), status: "Dihuni" } : u);
    setUnits(nextUnits);
    if (currentPropertyId) syncPropertyOccupancy(currentPropertyId, setProperties, nextUnits);
    setTenants(old => old.map(tn => tn.id === currentTenantId ? { ...tn, unit: String(reservation.unit), sejak: String(reservation.jadwalMasuk), periodeSewa: String(reservation.periode), status: "Aktif" } : tn));
    const start = parseInput(String(reservation.jadwalMasuk));
    const month = start.getUTCMonth();
    const invId = `INV-${String(month + 1).padStart(2, "0")}${String(start.getUTCFullYear()).slice(-2)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    upsertRow(setInvoices, { id: invId, penyewa: String(reservation.penyewa), unit: String(reservation.unit), periode: `${idMonthsLong[month]} ${start.getUTCFullYear()}`, jatuhTempo: fmtShort(new Date(Date.UTC(start.getUTCFullYear(), month, 5))), total: formatRp(rupiah(reservation.sewa)), sisa: formatRp(rupiah(reservation.sewa)), status: "Belum dibayar" });
    update({ status: "Aktif" });
    notify(message(locale, "moveInDone", { unit: String(reservation.unit) }));
  };
  const scheduleMoveOut = () => {
    const d = fmtShort(parseInput(moveOutDate));
    update({ jadwalKeluar: d });
    notify(message(locale, "moveOutScheduled", { name: String(reservation.penyewa), date: d }));
  };
  const endReservation = () => {
    const nextUnits = units.map(u => u.id === currentUnitId ? { ...u, penyewa: "Belum ada", status: "Kosong" } : u);
    setUnits(nextUnits);
    if (currentPropertyId) syncPropertyOccupancy(currentPropertyId, setProperties, nextUnits);
    setTenants(old => old.map(tn => tn.id === currentTenantId ? { ...tn, unit: "", periodeSewa: "", status: "Belum ada sewa" } : tn));
    update({ status: "Tidak Aktif", jadwalKeluar: fmtShort(parseInput(moveOutDate)) });
    notify(message(locale, "reservationEnded", { unit: String(reservation.unit) }));
  };

  const checklistDone = checklist.deposit && checklist.contract && checklist.keys;

  return <>
    <button className="button tenant-back" onClick={onBack}><ChevronLeft />{t("Semua reservasi")}</button>
    <div className="page-head"><div><div className="property-title"><h1>{v(reservation.kode)}</h1><Status>{reservation.status}</Status></div><p className="subtext">{v(reservation.penyewa)} · {v(reservation.unit)} · {v(reservation.properti)}</p></div>
      {tenant && <div className="actions"><a className="button primary whatsapp-cta" href={whatsappUrl(tenant.telepon)} target="_blank" rel="noreferrer"><MessageSquareText />WhatsApp</a></div>}</div>

    {expiring && <section className="panel reminder-banner"><CalendarClock /><div><strong>{t("Kontrak akan berakhir")}</strong><span>{message(locale, "expirySoon", { days: Math.max(0, daysUntil(endDate)) })}</span></div>
      <div className="reminder-action"><input type="date" aria-label={t("Jadwal keluar")} value={moveOutDate} onChange={e => setMoveOutDate(e.target.value)} /><button className="button" onClick={scheduleMoveOut}><CalendarClock />{t("Jadwalkan move-out")}</button></div></section>}

    <div className="reservation-form">
      <section className="panel tenant-card"><div className="tenant-card-head"><div className="card-head-title"><span className="section-icon"><ClipboardList /></span><h2>{t("Informasi reservasi")}</h2></div></div>
        <div className="form-grid">
          <div className="form-field full"><label htmlFor="rd-property">{t("Properti")}</label>
            {editable ? <select id="rd-property" value={propertyId} onChange={e => changeEditProperty(e.target.value)}>{properties.map(p => { const avail = availableCount(p) + (p.id === reservation._propertyId ? 1 : 0); return <option key={p.id} value={p.id} disabled={avail === 0 && p.id !== reservation._propertyId}>{v(p.nama)} · {avail > 0 ? `${avail} ${t("unit tersedia")}` : t("Penuh")}</option>; })}</select>
              : <input id="rd-property" value={v(reservation.properti)} readOnly />}
          </div>
          <div className="form-field full"><label htmlFor="rd-unit">{t("Unit")}</label>
            {editable ? <select id="rd-unit" value={unitId} onChange={e => { setUnitId(e.target.value); const u = editUnits.find(x => x.id === e.target.value); setRent(String(unitRent(u, editProperty))); setDeposit(String(unitDeposit(u, editProperty))); }}>{editUnits.map(u => <option key={u.id} value={u.id} disabled={!isUnitSelectable(u)}>{(u._synthetic ? t("Unit utama") : `${t("Unit")} ${u.unit}`)} · {isUnitSelectable(u) ? t("Tersedia") : t("Terisi")}</option>)}</select>
              : <input id="rd-unit" value={v(reservation.unit)} readOnly />}
          </div>
          <div className="form-field full"><label htmlFor="rd-tenant">{t("Penyewa")}</label>
            {editable ? <TenantCombobox options={tenantOptions} value={tenantId} onSelect={setTenantId} onAddNew={() => setShowTenantForm(true)} />
              : <input id="rd-tenant" value={v(reservation.penyewa)} readOnly />}
          </div>
        </div>
      </section>

      <section className="panel tenant-card"><div className="tenant-card-head"><div className="card-head-title"><span className="section-icon"><WalletCards /></span><h2>{t("Ketentuan sewa")}</h2></div></div>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="rd-duration">{t("Durasi")}</label>
            {editable ? <select id="rd-duration" value={duration} onChange={e => setDuration(e.target.value)}>{["1 bulan", "3 bulan", "6 bulan", "12 bulan", "24 bulan"].map(o => <option key={o} value={o}>{v(o)}</option>)}</select>
              : <input id="rd-duration" value={v(reservation.durasi)} readOnly />}
          </div>
          <div className="form-field"><label>{t("Periode sewa")}</label><input value={reservation.periode ? v(reservation.periode) : "—"} readOnly /></div>
          <div className="form-field"><label htmlFor="rd-rent">{t("Sewa bulanan")}</label><div className="money-input"><span>Rp</span><input id="rd-rent" type="number" inputMode="numeric" min="0" step="1000" value={rent} readOnly={!editable} onChange={e => setRent(e.target.value)} /></div></div>
          <div className="form-field"><label htmlFor="rd-deposit">Deposit</label><div className="money-input"><span>Rp</span><input id="rd-deposit" type="number" inputMode="numeric" min="0" step="1000" value={deposit} readOnly={!editable} onChange={e => setDeposit(e.target.value)} /></div></div>
          <div className="form-field"><label>{t("Jadwal masuk")}</label><input value={reservation.jadwalMasuk ? v(reservation.jadwalMasuk) : "—"} readOnly /></div>
          <div className="form-field"><label>{t("Jadwal keluar")}</label><input value={reservation.jadwalKeluar ? v(reservation.jadwalKeluar) : "—"} readOnly /></div>
          <div className="form-field full"><label htmlFor="rd-notes">{t("Catatan")}</label><textarea id="rd-notes" rows={3} value={notes} readOnly={!editable} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        {editable && <div className="actions" style={{ marginTop: 18 }}><button className="button primary" onClick={saveDraft}><Check />{t("Simpan perubahan")}</button></div>}
      </section>

      <section className="panel tenant-card"><div className="tenant-card-head"><div className="card-head-title"><span className="section-icon"><CheckCircle2 /></span><h2>{t("Tahap reservasi")}</h2></div><Status>{reservation.status}</Status></div>

        {status === "Booking" && <div className="inline-empty"><span>{t("Reservasi dibuat. Buat draf kontrak untuk melanjutkan.")}</span><button className="button primary" onClick={toDraft}><FileType2 />{t("Buat draf kontrak")}</button></div>}

        {status === "Draf Kontrak" && <div className="inline-empty"><span>{t("Draf kontrak dibuat. Lengkapi dan tandatangani di modul Kontrak.")}</span><button className="button primary" onClick={() => onOpenContract(String(reservation._nomor))}><FileSignature />{t("Buka kontrak")}</button></div>}

        {status === "Kontrak Ditandatangani" && <div><p className="subtext" style={{ marginBottom: 14 }}>{t("Jadwal masuk")}: {v(reservation.jadwalMasuk)}</p>
          <label className="check-row"><input type="checkbox" checked={checklist.deposit} onChange={e => setChecklist(c => ({ ...c, deposit: e.target.checked }))} /><span><strong>{t("Deposit diterima")}</strong><small>{t("Transfer bank")} · {v(reservation.deposit)}</small></span></label>
          <label className="check-row"><input type="checkbox" checked={checklist.contract} onChange={e => setChecklist(c => ({ ...c, contract: e.target.checked }))} /><span><strong>{t("Kontrak ditandatangani")}</strong><small>{t("Dokumen lengkap")}</small></span></label>
          <label className="check-row"><input type="checkbox" checked={checklist.keys} onChange={e => setChecklist(c => ({ ...c, keys: e.target.checked }))} /><span><strong>{t("Kunci diserahkan")}</strong><small>{t("2 set kunci")}</small></span></label>
          <button className="button primary" style={{ marginTop: 16 }} disabled={!checklistDone} onClick={activate}><UserCheck />{t("Konfirmasi move-in")}</button></div>}

        {status === "Aktif" && <div className="inline-empty"><span>{t("Penyewa aktif menempati unit ini.")}</span><button className="button danger" onClick={endReservation}><CalendarClock />{t("Akhiri sewa / move-out")}</button></div>}

        {status === "Tidak Aktif" && <div className="inline-empty"><span>{t("Reservasi selesai.")} {reservation.jadwalKeluar ? `${t("Jadwal keluar")}: ${v(reservation.jadwalKeluar)}` : ""}</span></div>}
      </section>

      {rank >= 1 && <section className="panel tenant-card"><div className="tenant-card-head"><div className="card-head-title"><span className="section-icon"><FileText /></span><h2>{t("Kontrak sewa")}</h2></div><Status>{rank >= 2 ? "Ditandatangani" : "Draf"}</Status></div>
        <div className="actions"><button className="button primary" onClick={() => onOpenContract(String(reservation._nomor))}><FileSignature />{t("Buka kontrak")}</button></div>
      </section>}
    </div>
    {showTenantForm && <TenantDialog state={{ mode: "create", page: "tenants" }} onClose={() => setShowTenantForm(false)} onSave={(_, row) => { upsertRow(setTenants, row); setTenantId(String(row.id)); setShowTenantForm(false); notify(message(locale, "saved", { item: t("penyewa") })); }} />}
  </>;
}
