"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check, ChevronLeft, Eraser, Eye, FileSignature, FileText, FileType2, ImagePlus, LayoutTemplate,
  MessageSquareText, PenLine, Pencil, Plus, Printer, Trash2, Upload, WalletCards, X,
} from "lucide-react";
import { Row } from "@/lib/data";
import { message } from "@/lib/i18n";
import { formatRp } from "@/lib/utility-token-config";
import {
  CONTRACT_ORG, CONTRACT_PLACEHOLDERS, ContractTemplate, contractValues,
  DEFAULT_CONTRACT_TEMPLATE_ID, findContractTemplate,
} from "@/lib/contracts";
import { renderPreview } from "@/lib/message-templates";
import { useI18n, useAccess } from "@/components/context";
import {
  Status, Toolbar, DataTable, fmtShort, rupiah, parseInput, toDateInputValue, whatsappUrl, statusRank,
  upsertRow, bodySnippet,
} from "@/components/sewain-app";
import {
  getDepositStatus, setDepositStatus, getDeductions, addDeduction, removeDeduction,
  formatDepositStatus, type DepositStatus, type DeductionEntry,
} from "@/lib/deposit";

type ContractsPageProps = {
  contracts: Row[]; setContracts: React.Dispatch<React.SetStateAction<Row[]>>;
  templates: ContractTemplate[]; setTemplates: (value: ContractTemplate[]) => void;
  reservations: Row[]; setReservations: React.Dispatch<React.SetStateAction<Row[]>>;
  tenants: Row[]; notify: (s: string) => void;
  focusId: string; onClearFocus: () => void;
  loading?: boolean;
};

export function ContractsPage({ contracts, setContracts, templates, setTemplates, reservations, setReservations, tenants, notify, focusId, onClearFocus, loading = false }: ContractsPageProps) {
  const { locale, t, v } = useI18n();
  const { can } = useAccess();
  const L = (id: string, en: string) => (locale === "en" ? en : id);
  const [view, setView] = useState<"list" | "template">("list");
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => { if (focusId) { setSelectedId(focusId); setView("list"); onClearFocus(); } }, [focusId]);

  const selected = contracts.find(c => c.id === selectedId || c.nomor === selectedId);

  if (view === "template") return <ContractTemplateManager templates={templates} setTemplates={setTemplates} notify={notify} onBack={() => setView("list")} />;

  if (selected) return <ContractDetail contract={selected} setContracts={setContracts} templates={templates} reservations={reservations} setReservations={setReservations} notify={notify} onBack={() => setSelectedId("")} />;

  const createContract = () => {
    const nomor = `KTR-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
    const row: Row = { id: `contract-${Date.now()}`, nomor, penyewa: "", unit: "", properti: "", kontak: "", durasi: "12 bulan", periode: "", sewa: "Rp0", deposit: "Rp0", jadwalMasuk: "", dibuat: fmtShort(new Date()), status: "Draf", templateId: DEFAULT_CONTRACT_TEMPLATE_ID };
    upsertRow(setContracts, row);
    setSelectedId(row.id);
    notify(message(locale, "draftCreated", { number: nomor }));
  };
  const remove = (row: Row) => { setContracts(old => old.filter(c => c.id !== row.id)); notify(message(locale, "removed", { item: t("kontrak") })); };

  const listCols = contracts.map(c => ({ id: c.id, nomor: c.nomor, penyewa: c.penyewa, unit: c.unit, dibuat: c.dibuat, status: c.status } as Row));
  const filtered = listCols.filter(row => Object.values(row).some(value => v(value).toLowerCase().includes(search.toLowerCase())));
  return <>
    <div className="page-head">
      <div><h1>{t("Kontrak")}</h1><p className="subtext">{t("Template dan kontrak sewa yang sudah dibuat.")}</p></div>
      <div className="actions">
        <button className="button" onClick={() => setView("template")}><LayoutTemplate />{L("Kelola template", "Manage templates")}</button>
        {can("contracts", "create") && <button className="button primary" onClick={createContract}><Plus />{L("Buat kontrak", "New contract")}</button>}
      </div>
    </div>
    <section className="panel"><Toolbar search={search} setSearch={setSearch} />
      {loading ? <DataTable rows={filtered} module="contracts" loading onEdit={row => setSelectedId(String(row.id))} onDelete={remove} onSelect={row => setSelectedId(String(row.id))} selected={selectedId} /> : filtered.length ? <DataTable rows={filtered} module="contracts" onEdit={row => setSelectedId(String(row.id))} onDelete={remove} onSelect={row => setSelectedId(String(row.id))} selected={selectedId} /> : <div className="empty"><FileText /><div><strong>{L("Belum ada kontrak", "No contracts yet")}</strong>{L("Buat kontrak baru atau tandatangani draf dari reservasi.", "Create a new contract or sign a draft from reservation.")}</div></div>}
    </section>
  </>;
}

function ContractDetail({ contract, setContracts, templates, reservations, setReservations, notify, onBack }: { contract: Row; setContracts: React.Dispatch<React.SetStateAction<Row[]>>; templates: ContractTemplate[]; reservations: Row[]; setReservations: React.Dispatch<React.SetStateAction<Row[]>>; notify: (s: string) => void; onBack: () => void }) {
  const { locale, t, v } = useI18n();
  const L = (id: string, en: string) => (locale === "en" ? en : id);
  const [signParty, setSignParty] = useState<null | "tenant" | "owner">(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const openSign = (party: "tenant" | "owner") => { setPreviewOpen(false); setSignParty(party); };

  const editable = String(contract.status) !== "Ditandatangani";
  const [depositStatus, setLocalDepositStatus] = useState<DepositStatus>(getDepositStatus(contract.id));
  const [deductions, setLocalDeductions] = useState<DeductionEntry[]>(getDeductions(contract.id));
  const [showDeductionForm, setShowDeductionForm] = useState(false);
  const [deductionAmount, setDeductionAmount] = useState("");
  const [deductionReason, setDeductionReason] = useState("");
  const refreshDeposit = () => { setLocalDepositStatus(getDepositStatus(contract.id)); setLocalDeductions(getDeductions(contract.id)); };
  const handleDepositStatus = (status: DepositStatus) => { setDepositStatus(contract.id, status, rupiah(contract.deposit)); refreshDeposit(); notify(L(`Deposit status diubah ke ${formatDepositStatus(status)}`, `Deposit status changed to ${formatDepositStatus(status)}`)); };
  const handleAddDeduction = () => {
    if (!deductionAmount || !deductionReason) return;
    const amount = rupiah(deductionAmount);
    if (!amount) return;
    addDeduction(contract.id, { amount, reason: deductionReason, date: fmtShort(new Date()) });
    refreshDeposit();
    setShowDeductionForm(false);
    notify(L("Pemotongan deposit dicatat.", "Deposit deduction recorded."));
  };
  const [form, setForm] = useState({
    templateId: String(contract.templateId || DEFAULT_CONTRACT_TEMPLATE_ID),
    penyewa: String(contract.penyewa || ""), kontak: String(contract.kontak || ""),
    properti: String(contract.properti || ""), unit: String(contract.unit || ""),
    durasi: String(contract.durasi || "12 bulan"), periode: String(contract.periode || ""),
    sewa: String(rupiah(contract.sewa)), deposit: String(rupiah(contract.deposit)),
    jadwalMasuk: toDateInputValue(String(contract.jadwalMasuk || "")),
  });
  const setField = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }));

  const template = findContractTemplate(templates, contract.templateId);
  const values = contractValues(contract);
  const body = renderPreview(template?.body || "", values);

  const update = (patch: Record<string, string>) => setContracts(old => old.map(c => c.id === contract.id ? { ...c, ...patch } : c));

  const saveDraft = () => {
    update({
      templateId: form.templateId, penyewa: form.penyewa, kontak: form.kontak, properti: form.properti, unit: form.unit,
      durasi: form.durasi, periode: form.periode,
      sewa: form.sewa ? formatRp(rupiah(form.sewa)) : "Rp0", deposit: form.deposit ? formatRp(rupiah(form.deposit)) : "Rp0",
      jadwalMasuk: form.jadwalMasuk ? fmtShort(parseInput(form.jadwalMasuk)) : "",
    });
    notify(message(locale, "saved", { item: t("kontrak") }));
  };

  const completeSign = (party: "tenant" | "owner", signature: string, name: string) => {
    const at = new Date().toISOString();
    const patch: Record<string, string> = party === "tenant"
      ? { tenantSignature: signature, signedTenant: name, signedTenantAt: at }
      : { ownerSignature: signature, signedOwner: name, signedOwnerAt: at };
    const tenantDone = party === "tenant" ? true : Boolean(contract.signedTenant);
    const ownerDone = party === "owner" ? true : Boolean(contract.signedOwner);
    const fullySigned = tenantDone && ownerDone;
    patch.status = fullySigned ? "Ditandatangani" : "Menunggu tanda tangan";
    update(patch);
    setSignParty(null);
    if (fullySigned && contract._reservationId) {
      setReservations(old => old.map(r => r.id === contract._reservationId && statusRank(String(r.status)) < 2
        ? { ...r, status: "Kontrak Ditandatangani", _nomor: String(contract.nomor), jadwalMasuk: String(contract.jadwalMasuk || r.jadwalMasuk || ""), periode: String(contract.periode || r.periode || "") }
        : r));
    }
    notify(L("Kontrak ditandatangani oleh ", "Signed by ") + name + ".");
  };

  const shareContract = () => {
    const phone = contract.kontak;
    const msg = L(`Halo ${v(contract.penyewa)}, berikut kontrak sewa untuk ${v(contract.unit)}. Nomor: ${v(contract.nomor)}.`, `Hi ${v(contract.penyewa)}, here is the rental contract for ${v(contract.unit)}. No: ${v(contract.nomor)}.`);
    window.open(`${whatsappUrl(phone)}?text=${encodeURIComponent(msg)}`, "_blank");
    notify(message(locale, "contractShared", { name: String(contract.penyewa) }));
  };
  const signatureCard = (party: "tenant" | "owner") => {
    const isTenant = party === "tenant";
    const sig = isTenant ? contract.tenantSignature : contract.ownerSignature;
    const name = isTenant ? contract.signedTenant : contract.signedOwner;
    const at = isTenant ? contract.signedTenantAt : contract.signedOwnerAt;
    const role = isTenant ? L("Pihak Kedua (Penyewa)", "Second Party (Tenant)") : L("Pihak Pertama (Pemilik)", "First Party (Owner)");
    const fallbackName = isTenant ? String(contract.penyewa || "—") : CONTRACT_ORG.pemilik;
    return <div className="signature-card">
      <span className="signature-role">{role}</span>
      <div className="signature-slot">
        {sig ? <img src={String(sig)} alt={`${L("Tanda tangan", "Signature")} ${v(String(name))}`} />
          : name ? <span className="signature-typed">{v(String(name))}</span>
            : <span className="signature-empty">{L("Belum ditandatangani", "Not signed yet")}</span>}
      </div>
      <strong className="signature-name">{name ? v(String(name)) : v(fallbackName)}</strong>
      {at ? <small>{L("Ditandatangani", "Signed")} · {new Date(String(at)).toLocaleString(locale === "en" ? "en-GB" : "id-ID", { dateStyle: "medium", timeStyle: "short" })}</small>
        : <button className="button signature-btn" onClick={() => setSignParty(party)}><PenLine />{L("Tandatangani", "Sign")}</button>}
    </div>;
  };

  return <>
    <button className="button tenant-back no-print" onClick={onBack}><ChevronLeft />{L("Semua kontrak", "All contracts")}</button>
    <div className="page-head no-print">
      <div><div className="property-title"><h1>{v(contract.nomor)}</h1><Status>{contract.status}</Status></div><p className="subtext">{contract.penyewa ? v(contract.penyewa) : L("Tanpa penyewa", "No tenant")}{contract.unit ? ` · ${v(contract.unit)}` : ""}</p></div>
      <div className="actions">
        <button className={`button${!editable ? " primary" : ""}`} onClick={() => setPreviewOpen(true)}><Eye />{L("Pratinjau", "Preview")}</button>
        {editable && <button className="button primary" onClick={() => openSign("tenant")}><FileSignature />{L("Tandatangani", "Sign")}</button>}
      </div>
    </div>

    {editable && <section className="panel tenant-card no-print"><div className="tenant-card-head"><div className="card-head-title"><span className="section-icon"><WalletCards /></span><h2>{L("Data kontrak", "Contract details")}</h2></div><button className="button" onClick={saveDraft}><Check />{t("Simpan perubahan")}</button></div>
      <div className="form-grid">
        <div className="form-field full"><label htmlFor="cd-template">{L("Template", "Template")}</label><select id="cd-template" value={form.templateId} onChange={e => setField("templateId", e.target.value)}>{templates.map(tpl => <option key={tpl.id} value={tpl.id}>{v(tpl.nama)}</option>)}</select></div>
        <div className="form-field"><label htmlFor="cd-penyewa">{t("Penyewa")}</label><input id="cd-penyewa" value={form.penyewa} onChange={e => setField("penyewa", e.target.value)} /></div>
        <div className="form-field"><label htmlFor="cd-kontak">{L("Kontak", "Contact")}</label><input id="cd-kontak" value={form.kontak} onChange={e => setField("kontak", e.target.value)} /></div>
        <div className="form-field"><label htmlFor="cd-properti">{t("Properti")}</label><input id="cd-properti" value={form.properti} onChange={e => setField("properti", e.target.value)} /></div>
        <div className="form-field"><label htmlFor="cd-unit">{t("Unit")}</label><input id="cd-unit" value={form.unit} onChange={e => setField("unit", e.target.value)} /></div>
        <div className="form-field"><label htmlFor="cd-durasi">{t("Durasi")}</label><select id="cd-durasi" value={form.durasi} onChange={e => setField("durasi", e.target.value)}>{["1 bulan", "3 bulan", "6 bulan", "12 bulan", "24 bulan"].map(o => <option key={o} value={o}>{v(o)}</option>)}</select></div>
        <div className="form-field"><label htmlFor="cd-periode">{t("Periode sewa")}</label><input id="cd-periode" value={form.periode} onChange={e => setField("periode", e.target.value)} placeholder="Mar 2025 - Feb 2026" /></div>
        <div className="form-field"><label htmlFor="cd-sewa">{t("Sewa bulanan")}</label><div className="money-input"><span>Rp</span><input id="cd-sewa" type="number" inputMode="numeric" min="0" step="1000" value={form.sewa} onChange={e => setField("sewa", e.target.value)} /></div></div>
        <div className="form-field"><label htmlFor="cd-deposit">Deposit</label><div className="money-input"><span>Rp</span><input id="cd-deposit" type="number" inputMode="numeric" min="0" step="1000" value={form.deposit} onChange={e => setField("deposit", e.target.value)} /></div></div>
        <div className="form-field"><label htmlFor="cd-masuk">{t("Jadwal masuk")}</label><input id="cd-masuk" type="date" value={form.jadwalMasuk} onChange={e => setField("jadwalMasuk", e.target.value)} /></div>
      </div>
    </section>}

    {/* Deposit Management */}
    <section className="panel tenant-card no-print">
      <div className="tenant-card-head"><div className="card-head-title"><span className="section-icon"><WalletCards /></span><h2>{L("Deposit (Jaminan)", "Security Deposit")}</h2></div>
        <Status>{formatDepositStatus(depositStatus)}</Status>
      </div>
      <div className="detail-grid" style={{ marginBottom: 16 }}>
        <span>{L("Nilai deposit", "Deposit amount")}</span><span><strong>{v(contract.deposit || "Rp0")}</strong></span>
        <span>{L("Status", "Status")}</span><span><Status>{formatDepositStatus(depositStatus)}</Status></span>
      </div>
      <div className="deposit-status-actions actions" style={{ marginBottom: 16 }}>
        {(depositStatus === "active" || depositStatus === "partially_returned") && (
          <>
            <button className="button" onClick={() => { setShowDeductionForm(true); setDeductionAmount(""); setDeductionReason(""); }}><Plus />{L("Catat pemotongan", "Record deduction")}</button>
            <button className="button primary" onClick={() => handleDepositStatus("fully_returned")}><Check />{L("Tandai dikembalikan semua", "Mark fully returned")}</button>
          </>
        )}
        {depositStatus === "active" && (
          <button className="button danger" onClick={() => handleDepositStatus("deducted")}><Trash2 />{L("Potong semua", "Deduct all")}</button>
        )}
      </div>
      {deductions.length > 0 && (
        <div className="deduction-list">
          <strong className="cell-sub" style={{ display: "block", marginBottom: 8 }}>{L("Riwayat pemotongan", "Deduction history")}</strong>
          {deductions.map((d, i) => (
            <div className="activity" key={i}>
              <span className="activity-icon"><Trash2 /></span>
              <span><strong>{formatRp(d.amount)}</strong><span className="cell-sub">{d.reason} · {d.date}</span></span>
              <button className="icon-button" aria-label={L("Hapus pemotongan", "Remove deduction")} onClick={() => { removeDeduction(contract.id, i); refreshDeposit(); }}><X /></button>
            </div>
          ))}
        </div>
      )}
      {showDeductionForm && (
        <div className="form-grid" style={{ marginTop: 8 }}>
          <div className="form-field">
            <label htmlFor="deduction-amount">{L("Jumlah pemotongan", "Deduction amount")}</label>
            <div className="money-input"><span>Rp</span><input id="deduction-amount" type="number" inputMode="numeric" min="0" step="1000" value={deductionAmount} onChange={e => setDeductionAmount(e.target.value)} /></div>
          </div>
          <div className="form-field full">
            <label htmlFor="deduction-reason">{L("Alasan pemotongan", "Deduction reason")}</label>
            <input id="deduction-reason" value={deductionReason} onChange={e => setDeductionReason(e.target.value)} placeholder={L("mis. Kerusakan AC, kunci hilang", "e.g. AC damage, lost keys")} />
          </div>
          <div className="actions" style={{ gridColumn: "1 / -1" }}>
            <button className="button" onClick={() => setShowDeductionForm(false)}>{L("Batal", "Cancel")}</button>
            <button className="button primary" disabled={!deductionAmount || !deductionReason} onClick={handleAddDeduction}><Plus />{L("Simpan pemotongan", "Save deduction")}</button>
          </div>
        </div>
      )}
    </section>

    <section className="panel contract-paper print-only" aria-hidden="true">
      <article className="contract-document">
        <div className="contract-body">{body}</div>
        <div className="contract-signatures">{signatureCard("owner")}{signatureCard("tenant")}</div>
        <p className="contract-disclaimer">{t("Dokumen ini dihasilkan oleh Sewain (mode simulasi).")}</p>
      </article>
    </section>

    {previewOpen && <ContractPreviewDialog
      contract={contract} body={body}
      onExport={() => window.print()}
      onShare={shareContract}
      onClose={() => setPreviewOpen(false)}
      onSign={editable ? openSign : undefined} />}

    {signParty && <ContractSignDialog
      party={signParty}
      defaultName={signParty === "tenant" ? String(contract.penyewa || "") : CONTRACT_ORG.pemilik}
      onClose={() => setSignParty(null)}
      onSign={(sig, name) => completeSign(signParty, sig, name)} />}
  </>;
}

function ContractSignDialog({ party, defaultName, onClose, onSign }: { party: "tenant" | "owner"; defaultName: string; onClose: () => void; onSign: (signature: string, name: string) => void }) {
  const { locale, t } = useI18n();
  const L = (id: string, en: string) => (locale === "en" ? en : id);
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [name, setName] = useState(defaultName);
  const [agreed, setAgreed] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [uploaded, setUploaded] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1f2937";
  }, [mode]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return;
    drawing.current = true; canvasRef.current?.setPointerCapture(e.pointerId);
    const { x, y } = pos(e); ctx.beginPath(); ctx.moveTo(x, y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return;
    const { x, y } = pos(e); ctx.lineTo(x, y); ctx.stroke(); setHasDrawn(true);
  };
  const end = () => { drawing.current = false; };
  const clearCanvas = () => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUploaded(String(reader.result));
    reader.readAsDataURL(file);
  };

  const ready = name.trim() && agreed && (mode === "draw" ? hasDrawn : Boolean(uploaded));
  const submit = () => {
    if (!ready) return;
    const signature = mode === "draw" ? (canvasRef.current?.toDataURL("image/png") || "") : uploaded;
    onSign(signature, name.trim());
  };
  const roleLabel = party === "tenant" ? L("Penyewa", "Tenant") : L("Pemilik", "Owner");

  return <div className="backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="sign-title">
      <div className="dialog-head"><div><h2 id="sign-title">{L("Tanda tangan elektronik", "Electronic signature")}</h2><p>{roleLabel}</p></div><button className="icon-button" aria-label={t("Tutup")} onClick={onClose}><X /></button></div>
      <div className="dialog-body">
        <div className="sign-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "draw"} className={`sign-tab ${mode === "draw" ? "active" : ""}`} onClick={() => setMode("draw")}><PenLine />{L("Gambar", "Draw")}</button>
          <button type="button" role="tab" aria-selected={mode === "upload"} className={`sign-tab ${mode === "upload" ? "active" : ""}`} onClick={() => setMode("upload")}><Upload />{L("Unggah gambar", "Upload image")}</button>
        </div>
        {mode === "draw" ? <div className="signature-pad-wrap">
          <canvas ref={canvasRef} width={520} height={180} className="signature-pad" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} />
          <button type="button" className="button signature-clear" onClick={clearCanvas}><Eraser />{L("Bersihkan", "Clear")}</button>
        </div> : <div className="signature-upload">
          {uploaded ? <div className="signature-upload-preview"><img src={uploaded} alt={L("Pratinjau tanda tangan", "Signature preview")} /><button type="button" className="button" onClick={() => setUploaded("")}><Trash2 />{L("Hapus", "Remove")}</button></div>
            : <label className="signature-dropzone"><ImagePlus /><span>{L("Pilih gambar tanda tangan (PNG/JPG)", "Choose a signature image (PNG/JPG)")}</span><input type="file" accept="image/*" onChange={onFile} hidden /></label>}
        </div>}
        <div className="form-field full" style={{ marginTop: 16 }}><label htmlFor="sign-name">{L("Nama lengkap penandatangan", "Signatory full name")}</label><input id="sign-name" value={name} onChange={e => setName(e.target.value)} /></div>
        <label className="check-row sign-agree"><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} /><span><strong>{L("Saya menyetujui isi kontrak", "I agree to the contract terms")}</strong><small>{L("Tanda tangan ini sah secara elektronik.", "This signature is electronically valid.")}</small></span></label>
      </div>
      <div className="dialog-actions"><button type="button" className="button" onClick={onClose}>{t("Batal")}</button><button type="button" className="button primary" disabled={!ready} onClick={submit}><PenLine />{L("Tandatangani", "Sign")}</button></div>
    </div>
  </div>;
}

function ContractPreviewDialog({ contract, body, onExport, onShare, onClose, onSign }: { contract: Row; body: string; onExport: () => void; onShare: () => void; onClose: () => void; onSign?: (party: "tenant" | "owner") => void }) {
  const { locale, t, v } = useI18n();
  const L = (id: string, en: string) => (locale === "en" ? en : id);

  const sigCard = (party: "tenant" | "owner") => {
    const isTenant = party === "tenant";
    const sig = isTenant ? contract.tenantSignature : contract.ownerSignature;
    const name = isTenant ? contract.signedTenant : contract.signedOwner;
    const at = isTenant ? contract.signedTenantAt : contract.signedOwnerAt;
    const role = isTenant ? L("Pihak Kedua (Penyewa)", "Second Party (Tenant)") : L("Pihak Pertama (Pemilik)", "First Party (Owner)");
    const fallbackName = isTenant ? String(contract.penyewa || "—") : CONTRACT_ORG.pemilik;
    return <div className="signature-card">
      <span className="signature-role">{role}</span>
      <div className="signature-slot">
        {sig ? <img src={String(sig)} alt={`${L("Tanda tangan", "Signature")} ${v(String(name))}`} />
          : name ? <span className="signature-typed">{v(String(name))}</span>
            : <span className="signature-empty">{L("Belum ditandatangani", "Not signed yet")}</span>}
      </div>
      <strong className="signature-name">{name ? v(String(name)) : v(fallbackName)}</strong>
      {at ? <small>{L("Ditandatangani", "Signed")} · {new Date(String(at)).toLocaleString(locale === "en" ? "en-GB" : "id-ID", { dateStyle: "medium", timeStyle: "short" })}</small>
        : onSign ? <button className="button signature-btn" onClick={() => onSign(party)}><PenLine />{L("Tandatangani", "Sign")}</button> : null}
    </div>;
  };

  return <div className="backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="dialog contract-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="preview-title">
      <div className="dialog-head">
        <div><h2 id="preview-title">{v(contract.nomor)}</h2><p className="subtext-inline"><Status>{contract.status}</Status></p></div>
        <button type="button" className="icon-button" aria-label={t("Tutup")} onClick={onClose}><X /></button>
      </div>
      <div className="contract-preview-body">
        <section className="panel contract-paper"><article className="contract-document">
          <div className="contract-body">{body}</div>
          <div className="contract-signatures">{sigCard("owner")}{sigCard("tenant")}</div>
          <p className="contract-disclaimer">{t("Dokumen ini dihasilkan oleh Sewain (mode simulasi).")}</p>
        </article></section>
      </div>
      <div className="dialog-actions">
        <button type="button" className="button" onClick={onClose}>{t("Tutup")}</button>
        <span className="dialog-spacer" />
        <button type="button" className="button" onClick={onShare}><MessageSquareText />{L("Bagikan ke penyewa", "Share with tenant")}</button>
        <button type="button" className="button primary" onClick={onExport}><Printer />{L("Export PDF", "Export PDF")}</button>
      </div>
    </div>
  </div>;
}

function ContractTemplateManager({ templates, setTemplates, notify, onBack }: { templates: ContractTemplate[]; setTemplates: (value: ContractTemplate[]) => void; notify: (s: string) => void; onBack: () => void }) {
  const { locale, t, v } = useI18n();
  const L = (id: string, en: string) => (locale === "en" ? en : id);
  const [editing, setEditing] = useState<ContractTemplate | null>(null);

  if (editing) return <ContractTemplateEditor template={editing} onBack={() => setEditing(null)} onSave={updated => {
    setTemplates(templates.some(tpl => tpl.id === updated.id) ? templates.map(tpl => tpl.id === updated.id ? updated : tpl) : [updated, ...templates]);
    setEditing(null);
    notify(L("Template kontrak disimpan.", "Contract template saved."));
  }} onDelete={editing.system ? undefined : () => {
    setTemplates(templates.filter(tpl => tpl.id !== editing.id));
    setEditing(null);
    notify(L("Template dihapus.", "Template deleted."));
  }} />;

  const createTemplate = () => setEditing({ id: `ctpl-${Date.now()}`, nama: "", body: "" });
  return <>
    <button className="button tenant-back" onClick={onBack}><ChevronLeft />{L("Semua kontrak", "All contracts")}</button>
    <div className="page-head"><div><h1>{L("Template kontrak", "Contract templates")}</h1><p className="subtext">{L("Kelola klausa kontrak dengan placeholder yang terisi otomatis.", "Manage contract clauses with auto-filled placeholders.")}</p></div><div className="actions"><button className="button primary" onClick={createTemplate}><Plus />{L("Template baru", "New template")}</button></div></div>
    <section className="panel template-list-panel"><div className="template-list">
      {templates.map(tpl => <article className="template-row" key={tpl.id}>
        <button type="button" className="template-row-main" onClick={() => setEditing(tpl)}>
          <span className="template-row-icon"><FileText /></span>
          <span className="template-row-copy">
            <span className="template-row-title"><strong>{v(tpl.nama) || L("Template tanpa nama", "Untitled template")}</strong>{tpl.system && <span className="template-badge">{L("Sistem", "System")}</span>}</span>
            <span className="template-row-snippet">{bodySnippet(tpl.body)}</span>
          </span>
        </button>
        <div className="template-row-actions"><button type="button" className="button template-edit-button" onClick={() => setEditing(tpl)}><Pencil />{L("Ubah", "Edit")}</button></div>
      </article>)}
    </div></section>
  </>;
}

function ContractTemplateEditor({ template, onBack, onSave, onDelete }: { template: ContractTemplate; onBack: () => void; onSave: (template: ContractTemplate) => void; onDelete?: () => void }) {
  const { locale, t, v } = useI18n();
  const L = (id: string, en: string) => (locale === "en" ? en : id);
  const [nama, setNama] = useState(template.nama);
  const [body, setBody] = useState(template.body);

  const sample: Record<string, string> = { nomor: "KTR-2025-031", tanggal: "25 Feb 2025", penyewa: "Ahmad Fauzi", kontak: "0812 3456 7890", properti: "Kos Melati Residence", unit: "Melati 101", durasi: "12 bulan", periode: "Mar 2025 - Feb 2026", sewa: "Rp1.200.000", deposit: "Rp1.200.000", jadwalMasuk: "1 Mar 2025", pemilik: CONTRACT_ORG.pemilik, organisasi: CONTRACT_ORG.organisasi };
  const preview = renderPreview(body, sample);

  const insertToken = (token: string) => {
    const area = document.getElementById("contract-template-body") as HTMLTextAreaElement | null;
    const snippet = `{{${token}}}`;
    if (!area) { setBody(current => current + snippet); return; }
    const startPos = area.selectionStart; const endPos = area.selectionEnd;
    setBody(current => `${current.slice(0, startPos)}${snippet}${current.slice(endPos)}`);
    requestAnimationFrame(() => { area.focus(); const caret = startPos + snippet.length; area.setSelectionRange(caret, caret); });
  };

  return <>
    <button className="button tenant-back" onClick={onBack}><ChevronLeft />{L("Kembali ke template", "Back to templates")}</button>
    <div className="page-head"><div><h1>{template.nama ? v(template.nama) : L("Template baru", "New template")}</h1><p className="subtext">{L("Sisipkan placeholder agar data kontrak terisi otomatis.", "Insert placeholders so contract data fills automatically.")}</p></div>
      <div className="actions">{onDelete && <button className="button danger" onClick={onDelete}><Trash2 />{L("Hapus", "Delete")}</button>}<button className="button primary" disabled={!nama.trim()} onClick={() => onSave({ ...template, nama: nama.trim(), body })}><Check />{t("Simpan")}</button></div>
    </div>
    <div className="template-editor-grid">
      <section className="panel tenant-card">
        <div className="form-field full"><label htmlFor="ctpl-name">{L("Nama template", "Template name")}</label><input id="ctpl-name" value={nama} onChange={e => setNama(e.target.value)} placeholder={L("mis. Kontrak Sewa Standar", "e.g. Standard Rental Contract")} /></div>
        <div className="placeholder-chips"><span className="placeholder-chips-label">{L("Sisipkan placeholder", "Insert placeholder")}</span>{CONTRACT_PLACEHOLDERS.map(p => <button type="button" key={p.token} className="placeholder-chip" onClick={() => insertToken(p.token)}>{locale === "en" ? p.labelEn : p.label}</button>)}</div>
        <div className="form-field full"><label htmlFor="contract-template-body">{L("Isi kontrak", "Contract body")}</label><textarea id="contract-template-body" className="contract-template-body" rows={18} value={body} onChange={e => setBody(e.target.value)} /></div>
      </section>
      <section className="panel contract-paper"><span className="preview-label">{L("Pratinjau", "Preview")}</span><article className="contract-document"><div className="contract-body">{preview}</div></article></section>
    </div>
  </>;
}
