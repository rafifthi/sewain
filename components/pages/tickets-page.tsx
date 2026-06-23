"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock, CalendarPlus, Check, ChevronLeft, ClipboardList, Eye, FileText, GripVertical, MapPin, MoreHorizontal, Pencil, Phone, Plus, Search, Tag, TicketCheck, Trash2, UserCheck, UserRound, Wrench, X } from "lucide-react";
import { moduleData, Row } from "@/lib/data";
import { useI18n, useAccess } from "@/components/context";
import { message } from "@/lib/i18n";
import { PageHead, Status, type PageId } from "./shared";

const ticketStages = ["Baru", "Ditugaskan", "Dikerjakan", "Selesai"] as const;
const ticketAssignees = ["Belum ditugaskan", "Andi Triono", "Rina Novita"];
const ticketLabels = ["Mendesak", "Plumbing", "Listrik", "HVAC"];
const vendorDirectory: Row[] = [
  { id: "v1", nama: "CV Sejuk Abadi", kontak: "Budi Santoso", telepon: "0812 8800 1422", labels: "AC|HVAC", kota: "Depok", status: "Aktif" },
  { id: "v2", nama: "Teknik Jaya", kontak: "Dimas Prakoso", telepon: "0813 7712 9031", labels: "Listrik|Elektronik", kota: "Jakarta", status: "Aktif" },
  { id: "v3", nama: "Bengkel Kayu Maju", kontak: "Wawan Setiawan", telepon: "0819 2255 1780", labels: "Pintu|Furnitur", kota: "Jakarta Selatan", status: "Aktif" },
  { id: "v4", nama: "Mitra Pipa Bersih", kontak: "Rian Hidayat", telepon: "0857 1033 4812", labels: "Plumbing|Sanitasi", kota: "Depok", status: "Aktif" },
];

type TicketMenuState = { row: Row; x: number; y: number } | null;
type VendorAssignmentState = { ticketId: string; ticketNumber: string } | null;
type TicketDragPreviewState = { row: Row; x: number; y: number; width: number; height: number; offsetX: number; offsetY: number } | null;

function slug(value: unknown) {
  return String(value).toLowerCase().replace(/\s+/g, "-");
}

function useStoredRows(key: string, initial: Row[]): [Row[], React.Dispatch<React.SetStateAction<Row[]>>] {
  const [rows, setRows] = useState<Row[]>(initial);
  useEffect(() => {
    const saved = localStorage.getItem(`sewain:${key}`);
    if (!saved) return;
    const parsed = JSON.parse(saved) as Row[];
    setRows(parsed);
  }, [key]);
  useEffect(() => { localStorage.setItem(`sewain:${key}`, JSON.stringify(rows)); }, [key, rows]);
  return [rows, setRows];
}

function TicketTimestamps({ row }: { row: Row }) {
  const { locale } = useI18n();
  const entries = [
    { key: "created", label: locale === "en" ? "Created" : "Dibuat", value: row.createdAt, icon: CalendarPlus },
    { key: "assigned", label: locale === "en" ? "Assigned" : "Ditugaskan", value: row.assignedAt, icon: UserCheck },
  ].filter(entry => entry.value);

  if (!entries.length) return <div className="ticket-timestamps empty-timestamps"><CalendarClock /><span>{locale === "en" ? "Time not recorded" : "Waktu belum tercatat"}</span></div>;

  return <div className="ticket-timestamps">{entries.map(entry => {
    const date = new Date(String(entry.value));
    if (Number.isNaN(date.getTime())) return null;
    const compact = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
    const full = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", { dateStyle: "long", timeStyle: "short" }).format(date);
    return <span key={entry.key} title={`${entry.label}: ${full}`}><entry.icon /><span><small>{entry.label}</small><time dateTime={date.toISOString()}>{compact}</time></span></span>;
  })}</div>;
}

function TicketDragPreview({ preview }: { preview: Exclude<TicketDragPreviewState, null> }) {
  const { locale, v } = useI18n();
  const row = preview.row;
  const labels = String(row.labels || "").split("|").filter(Boolean);
  return <div className="ticket-drag-preview" aria-hidden="true" style={{ width: preview.width, minHeight: preview.height, transform: `translate3d(${preview.x}px, ${preview.y}px, 0) rotate(.6deg) scale(1.02)` }}>
    <div className="ticket-card-top"><span className="ticket-id"><GripVertical />{row.tiket}</span><span className="drag-status">{locale === "en" ? "Moving" : "Memindahkan"}</span></div>
    <div className="ticket-title">{v(row.judul || row.masalah)}</div>
    <div className="ticket-location"><MapPin /><span>{v(row.properti || "Kos Melati Residence")} · {v(row.unit)}</span></div>
    <p className="ticket-issue">{String(v(row.masalah)).replace(/[*#_`>-]/g, "").replace(/\n+/g, " ")}</p>
    <div className="ticket-person"><span className="avatar small">{String(row.penyewa || "NA").split(" ").map(part => part[0]).slice(0, 2).join("")}</span><span><strong>{v(row.penyewa || "Belum ada")}</strong><small>{v(row.telepon || "-")}</small></span></div>
    {labels.length > 0 && <div className="ticket-labels">{labels.map(label => <span key={label}>{v(label)}</span>)}</div>}
    <TicketTimestamps row={row} />
    <div className="ticket-footer"><span className={`vendor-chip ${row.vendor === "Belum ditugaskan" ? "unassigned" : ""}`}><Wrench />{v(row.vendor)}</span>{row.dueDate && <span className="ticket-due"><CalendarClock />{v(row.dueDate)}</span>}</div>
  </div>;
}

function VendorDetail({ vendor, tickets, onBack }: { vendor: Row; tickets: Row[]; onBack: () => void }) {
  const { locale, v } = useI18n();
  const labels = String(vendor.labels || "").split("|").filter(Boolean);
  const activeTickets = tickets.filter(ticket => ticket.status !== "Selesai");
  return <><button className="button vendor-detail-back" onClick={onBack}><ChevronLeft />{locale === "en" ? "Back to vendors" : "Kembali ke vendor"}</button><div className="vendor-detail-layout"><main className="panel vendor-detail-main"><div className="vendor-detail-head"><span className="vendor-avatar large"><Wrench /></span><div><span className="eyebrow">Vendor</span><h2>{vendor.nama}</h2><div className="vendor-labels">{labels.map(label => <span key={label}>{v(label)}</span>)}</div></div><Status>{vendor.status}</Status></div><div className="vendor-detail-section"><h3>{locale === "en" ? "Assigned tickets" : "Tiket yang ditugaskan"}</h3>{tickets.length ? <div className="vendor-ticket-list">{tickets.map(ticket => <div key={ticket.id}><span><strong>{ticket.tiket}</strong><small>{v(ticket.judul)} · {v(ticket.properti)} {v(ticket.unit)}</small></span><Status>{ticket.status}</Status></div>)}</div> : <div className="inline-empty">{locale === "en" ? "No tickets have been assigned to this vendor." : "Belum ada tiket yang ditugaskan ke vendor ini."}</div>}</div></main><aside className="panel vendor-contact-card"><div className="panel-head"><div><h2>{locale === "en" ? "Vendor information" : "Informasi vendor"}</h2><p>{activeTickets.length} {locale === "en" ? "open tickets" : "tiket aktif"}</p></div></div><div className="contact-list"><div><UserRound /><span><small>{locale === "en" ? "Contact person" : "Nama kontak"}</small><strong>{v(vendor.kontak)}</strong></span></div><div><Phone /><span><small>{locale === "en" ? "Contact number" : "Nomor kontak"}</small><a href={`https://wa.me/62${String(vendor.telepon).replace(/\D/g, "").replace(/^0/, "")}`} target="_blank" rel="noreferrer">{v(vendor.telepon)}</a></span></div><div><MapPin /><span><small>{locale === "en" ? "City" : "Kota"}</small><strong>{v(vendor.kota)}</strong></span></div></div></aside></div></>;
}

export function MaintenancePage({ rows, setRows, openDialog, notify }: { rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>>; openDialog: (d: null | { mode: "create" | "edit"; page: string; row?: Row }) => void; notify: (s: string) => void }) {
  const { locale, t, v } = useI18n();
  const [vendors, setVendors] = useStoredRows("vendors", vendorDirectory);
  const [tab, setTab] = useState<"board" | "vendors">("board");
  const [search, setSearch] = useState("");
  const [dragged, setDragged] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<TicketDragPreviewState>(null);
  const [dropStage, setDropStage] = useState<string | null>(null);
  const [menu, setMenu] = useState<TicketMenuState>(null);
  const [vendorAssignment, setVendorAssignment] = useState<VendorAssignmentState>(null);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [vendorDetail, setVendorDetail] = useState<Row | null>(null);
  const [vendorDialog, setVendorDialog] = useState(false);
  const [vendorForm, setVendorForm] = useState({ nama: "", kontak: "", telepon: "", kota: "" });
  const [vendorLabels, setVendorLabels] = useState<string[]>([]);
  const [vendorLabelInput, setVendorLabelInput] = useState("");
  const holdTimer = useRef<number | null>(null);
  const heldRef = useRef(false);
  const pressRef = useRef<{ startX: number; startY: number; currentX: number; currentY: number; card: HTMLElement; pointerId: number; pointerType: string; row: Row; offsetX: number; offsetY: number } | null>(null);
  const movedBeforeHoldRef = useRef(false);
  const dropStageRef = useRef<string | null>(null);
  const filtered = rows.filter(row => Object.values(row).some(value => v(value).toLowerCase().includes(search.toLowerCase())));
  useEffect(() => {
    const seedTickets = moduleData.tickets;
    setRows(current => {
      let changed = false;
      const next = current.map(row => {
        const seed = seedTickets.find(ticket => ticket.id === row.id);
        if (!seed) return row;
        const createdAt = row.createdAt || seed.createdAt;
        const assignedAt = row.assignedAt || seed.assignedAt;
        if (createdAt === row.createdAt && assignedAt === row.assignedAt) return row;
        changed = true;
        return { ...row, createdAt, assignedAt };
      });
      return changed ? next : current;
    });
  }, [setRows]);
  const updateTicket = (id: string, patch: Record<string, string | number>) => setRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  const move = (id: string, status: string) => {
    const ticket = rows.find(row => row.id === id);
    if (ticket?.status === "Baru" && status === "Ditugaskan") {
      setVendorAssignment({ ticketId: id, ticketNumber: String(ticket.tiket) });
      setSelectedVendor(ticket.vendor === "Belum ditugaskan" ? "" : String(ticket.vendor || ""));
      setDragged(null);
      setDragPreview(null);
      setDropStage(null);
      dropStageRef.current = null;
      setMenu(null);
      return;
    }
    updateTicket(id, { status, ...(status === "Ditugaskan" && !ticket?.assignedAt ? { assignedAt: new Date().toISOString() } : {}) });
    notify(locale === "en" ? `Ticket moved to ${t(status)}.` : `Tiket dipindahkan ke ${status}.`);
    setDragged(null);
    setDragPreview(null);
    setDropStage(null);
    dropStageRef.current = null;
    setMenu(null);
  };
  const assignVendor = () => {
    if (!vendorAssignment || !selectedVendor) return;
    const ticket = rows.find(row => row.id === vendorAssignment.ticketId);
    updateTicket(vendorAssignment.ticketId, { status: "Ditugaskan", vendor: selectedVendor, assignedAt: ticket?.assignedAt || new Date().toISOString() });
    notify(locale === "en" ? `${vendorAssignment.ticketNumber} assigned to ${selectedVendor}.` : `${vendorAssignment.ticketNumber} ditugaskan ke ${selectedVendor}.`);
    setVendorAssignment(null);
    setSelectedVendor("");
  };
  const openVendorForm = () => {
    setVendorForm({ nama: "", kontak: "", telepon: "", kota: "" });
    setVendorLabels([]);
    setVendorLabelInput("");
    setVendorDialog(true);
  };
  const addVendorLabel = (raw = vendorLabelInput) => {
    const label = raw.trim();
    if (!label || vendorLabels.some(item => item.toLowerCase() === label.toLowerCase())) return setVendorLabelInput("");
    setVendorLabels(current => [...current, label]);
    setVendorLabelInput("");
  };
  const saveVendor = (event: React.FormEvent) => {
    event.preventDefault();
    const vendor: Row = { id: `vendor-${Date.now()}`, ...vendorForm, labels: vendorLabels.join("|"), status: "Aktif" };
    setVendors(current => [vendor, ...current]);
    setVendorDialog(false);
    notify(locale === "en" ? `${vendorForm.nama} added to the vendor directory.` : `${vendorForm.nama} ditambahkan ke daftar vendor.`);
  };
  const cancelHold = () => { if (holdTimer.current) window.clearTimeout(holdTimer.current); holdTimer.current = null; };
  const activateDrag = (press: NonNullable<typeof pressRef.current>) => {
    if (heldRef.current || !press.card.isConnected) return;
    cancelHold();
    const rect = press.card.getBoundingClientRect();
    heldRef.current = true;
    setDragged(press.row.id);
    setDragPreview({ row: press.row, x: press.currentX - press.offsetX, y: press.currentY - press.offsetY, width: rect.width, height: rect.height, offsetX: press.offsetX, offsetY: press.offsetY });
  };
  const beginHold = (event: React.PointerEvent, row: Row) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, select, input")) return;
    const card = event.currentTarget as HTMLElement;
    const pointerId = event.pointerId;
    const rect = card.getBoundingClientRect();
    pressRef.current = { startX: event.clientX, startY: event.clientY, currentX: event.clientX, currentY: event.clientY, card, pointerId, pointerType: event.pointerType, row, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    heldRef.current = false;
    movedBeforeHoldRef.current = false;
    cancelHold();
    card.setPointerCapture(pointerId);
    if (event.pointerType !== "mouse") holdTimer.current = window.setTimeout(() => {
      const press = pressRef.current;
      if (press) activateDrag(press);
    }, 300);
  };
  const trackHold = (event: React.PointerEvent) => {
    const press = pressRef.current;
    if (press) {
      press.currentX = event.clientX;
      press.currentY = event.clientY;
    }
    if (!heldRef.current) {
      const deltaX = press ? Math.abs(event.clientX - press.startX) : 0;
      const deltaY = press ? Math.abs(event.clientY - press.startY) : 0;
      if (press?.pointerType === "mouse" && Math.hypot(deltaX, deltaY) > 4) {
        activateDrag(press);
        return;
      }
      if (press?.pointerType !== "mouse" && deltaY > 18 && deltaY > deltaX * 1.25) {
        movedBeforeHoldRef.current = true;
        cancelHold();
      }
      return;
    }
    setDragPreview(current => current ? { ...current, x: event.clientX - current.offsetX, y: event.clientY - current.offsetY } : current);
    const column = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-ticket-stage]");
    const nextStage = column?.dataset.ticketStage || null;
    dropStageRef.current = nextStage;
    setDropStage(nextStage);
  };
  const endHold = (event: React.PointerEvent, row: Row) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, select, input")) return;
    cancelHold();
    const press = pressRef.current;
    if (press?.card.hasPointerCapture(press.pointerId)) press.card.releasePointerCapture(press.pointerId);
    pressRef.current = null;
    if (heldRef.current) {
      if (dropStageRef.current && dropStageRef.current !== row.status) move(row.id, dropStageRef.current);
      else { setDragged(null); setDragPreview(null); setDropStage(null); dropStageRef.current = null; }
      window.setTimeout(() => { heldRef.current = false; }, 0);
      return;
    }
    if (movedBeforeHoldRef.current) return;
    openDialog({ mode: "edit", page: "tickets", row });
  };
  const toggleLabel = (row: Row, label: string) => {
    const labels = String(row.labels || "").split("|").filter(Boolean);
    updateTicket(row.id, { labels: labels.includes(label) ? labels.filter(item => item !== label).join("|") : [...labels, label].join("|") });
    setMenu(current => current ? { ...current, row: { ...current.row, labels: labels.includes(label) ? labels.filter(item => item !== label).join("|") : [...labels, label].join("|") } } : null);
  };
  const removeTicket = (row: Row) => {
    if (!window.confirm(locale === "en" ? `Delete ${row.tiket}?` : `Hapus ${row.tiket}?`)) return;
    setRows(current => current.filter(item => item.id !== row.id));
    setMenu(null);
    notify(locale === "en" ? "Ticket deleted." : "Tiket dihapus.");
  };
  return <><PageHead page="tickets" action={tab === "board" ? () => openDialog({ mode: "create", page: "tickets" }) : undefined} />
    <div className="maintenance-tabs" role="tablist" aria-label={locale === "en" ? "Maintenance views" : "Tampilan pemeliharaan"}><button role="tab" aria-selected={tab === "board"} className={tab === "board" ? "active" : ""} onClick={() => { setTab("board"); setVendorDetail(null); }}><TicketCheck />{locale === "en" ? "Ticket board" : "Papan tiket"}<span>{rows.length}</span></button><button role="tab" aria-selected={tab === "vendors"} className={tab === "vendors" ? "active" : ""} onClick={() => setTab("vendors")}><Wrench />Vendor<span>{vendors.length}</span></button></div>
    {tab === "board" && <><div className="kanban-toolbar"><div className="field-inline"><Search /><input type="search" enterKeyHint="search" aria-label={t("Cari data")} value={search} onChange={event => setSearch(event.target.value)} placeholder={locale === "en" ? "Search title, tenant, unit, or vendor..." : "Cari judul, penyewa, unit, atau vendor..."} /></div><span>{filtered.length} {t("tiket")}</span></div>
    <div className="kanban" aria-label={locale === "en" ? "Maintenance ticket board" : "Papan tiket pemeliharaan"}>
      {ticketStages.map(stage => {
        const stageRows = filtered.filter(row => row.status === stage);
        return <section className={`kanban-column ${dragged ? "drag-active" : ""} ${dropStage === stage ? "drop-target" : ""}`} data-ticket-stage={stage} key={stage}>
          <header className={`kanban-column-head ${slug(stage)}`}><span className={`stage-indicator ${slug(stage)}`} /><h2>{t(stage)}</h2><span className="kanban-count">{stageRows.length}</span></header>
          <div className="kanban-stack">
            {stageRows.map(row => {
              const proofs = String(row.bukti || "").split("|").filter(Boolean);
              const labels = String(row.labels || "").split("|").filter(Boolean);
              return <article className={`ticket-card ${dragged === row.id ? "drag-source" : ""}`} key={row.id} role="button" tabIndex={0} aria-label={`${row.tiket}: ${v(row.judul || row.masalah)}`} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDialog({ mode: "edit", page: "tickets", row }); } }} onPointerDown={event => beginHold(event, row)} onPointerMove={trackHold} onPointerUp={event => endHold(event, row)} onPointerCancel={() => { cancelHold(); heldRef.current = false; movedBeforeHoldRef.current = false; setDragged(null); setDragPreview(null); setDropStage(null); pressRef.current = null; dropStageRef.current = null; }} onContextMenu={event => { event.preventDefault(); cancelHold(); pressRef.current = null; setMenu({ row, x: Math.max(8, Math.min(event.clientX, window.innerWidth - 276)), y: Math.max(12, Math.min(event.clientY, window.innerHeight - 460)) }); }}>
                <div className="ticket-card-top"><span className="ticket-id"><GripVertical />{row.tiket}</span><button className="icon-button" aria-label={`${locale === "en" ? "Actions for" : "Aksi untuk"} ${row.tiket}`} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); setMenu({ row, x: Math.max(8, Math.min(rect.right, window.innerWidth - 276)), y: Math.max(12, Math.min(rect.bottom + 4, window.innerHeight - 460)) }); }}><MoreHorizontal /></button></div>
                <div className="ticket-title">{v(row.judul || row.masalah)}</div>
                <div className="ticket-location"><MapPin /> <span>{v(row.properti || "Kos Melati Residence")} · {v(row.unit)}</span></div>
                <p className="ticket-issue">{String(v(row.masalah)).replace(/[*#_`>-]/g, "").replace(/\n+/g, " ")}</p>
                {proofs.length > 0 && <div className="proof-strip">{proofs.slice(0, 3).map((src, index) => <img key={index} src={src} alt={`${locale === "en" ? "Issue proof" : "Bukti masalah"} ${index + 1}`} />)}{proofs.length > 3 && <span>+{proofs.length - 3}</span>}</div>}
                <div className="ticket-person"><span className="avatar small">{String(row.penyewa || "NA").split(" ").map(part => part[0]).slice(0, 2).join("")}</span><span><strong>{v(row.penyewa || "Belum ada")}</strong><small>{v(row.telepon || "-")}</small></span></div>
                {labels.length > 0 && <div className="ticket-labels">{labels.map(label => <span key={label}>{v(label)}</span>)}</div>}
                <TicketTimestamps row={row} />
                <div className="ticket-footer"><span className={`vendor-chip ${row.vendor === "Belum ditugaskan" ? "unassigned" : ""}`}><Wrench />{v(row.vendor)}</span>{row.dueDate && <span className="ticket-due"><CalendarClock />{v(row.dueDate)}</span>}</div>
              </article>;
            })}
            {!stageRows.length && <div className="kanban-empty">{locale === "en" ? "Drop a ticket here" : "Taruh tiket di sini"}</div>}
          </div>
        </section>;
      })}
    </div>{dragPreview && <TicketDragPreview preview={dragPreview} />}</>}
    {tab === "vendors" && !vendorDetail && <section className="panel vendor-directory"><div className="panel-head"><div><h2>{locale === "en" ? "Vendor directory" : "Daftar vendor"}</h2><p>{locale === "en" ? "Maintenance partners available for ticket assignment" : "Mitra pemeliharaan yang dapat ditugaskan ke tiket"}</p></div><div className="actions"><span className="vendor-total">{vendors.length} vendor</span><button className="button primary" onClick={openVendorForm}><Plus />{locale === "en" ? "Add vendor" : "Tambah vendor"}</button></div></div><div className="table-wrap"><table><thead><tr><th>{locale === "en" ? "Vendor" : "Nama vendor"}</th><th>{locale === "en" ? "Contact person" : "Kontak"}</th><th>Label</th><th>{locale === "en" ? "City" : "Kota"}</th><th>{t("Nomor WhatsApp")}</th><th>{locale === "en" ? "Open tickets" : "Tiket aktif"}</th><th>{t("Status")}</th></tr></thead><tbody>{vendors.map(vendor => { const activeTickets = rows.filter(row => row.vendor === vendor.nama && row.status !== "Selesai").length; const labels = String(vendor.labels || "").split("|").filter(Boolean); return <tr className="vendor-row" key={vendor.id} tabIndex={0} onClick={() => setVendorDetail(vendor)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setVendorDetail(vendor); } }}><td><span className="vendor-name"><span className="vendor-avatar"><Wrench /></span><strong>{vendor.nama}</strong></span></td><td>{v(vendor.kontak)}</td><td><div className="vendor-labels">{labels.map(label => <span key={label}>{v(label)}</span>)}</div></td><td>{v(vendor.kota)}</td><td><a className="link" href={`https://wa.me/62${String(vendor.telepon).replace(/\D/g, "").replace(/^0/, "")}`} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()}>{vendor.telepon}</a></td><td>{activeTickets}</td><td><Status>{vendor.status}</Status></td></tr>; })}</tbody></table></div></section>}
    {tab === "vendors" && vendorDetail && <VendorDetail vendor={vendorDetail} tickets={rows.filter(row => row.vendor === vendorDetail.nama)} onBack={() => setVendorDetail(null)} />}
    {menu && <><button className="context-dismiss" aria-label={locale === "en" ? "Close ticket actions" : "Tutup aksi tiket"} onClick={() => setMenu(null)} onContextMenu={event => { event.preventDefault(); setMenu(null); }} /><div className="ticket-context" role="menu" aria-label={`${locale === "en" ? "Actions for" : "Aksi untuk"} ${menu.row.tiket}`} style={{ left: menu.x, top: menu.y }} onPointerDown={event => event.stopPropagation()}>
      <div className="context-heading"><strong>{menu.row.tiket}</strong><span>{v(menu.row.judul)}</span></div>
      <label className="context-field"><span><CheckCircle2 />{locale === "en" ? "Move status" : "Pindah status"}</span><select value={String(menu.row.status)} onChange={event => move(menu.row.id, event.target.value)}>{ticketStages.map(stage => <option key={stage} value={stage}>{t(stage)}</option>)}</select></label>
      <label className="context-field"><span><UserCheck />{locale === "en" ? "Assignee" : "Penanggung jawab"}</span><select value={String(menu.row.assignee || "Belum ditugaskan")} onChange={event => { updateTicket(menu.row.id, { assignee: event.target.value }); setMenu(current => current ? { ...current, row: { ...current.row, assignee: event.target.value } } : null); }}>{ticketAssignees.map(name => <option key={name} value={name}>{v(name)}</option>)}</select></label>
      <div className="context-field"><span><Tag />Label</span><div className="context-labels">{ticketLabels.map(label => <button type="button" className={String(menu.row.labels || "").split("|").includes(label) ? "selected" : ""} key={label} onClick={() => toggleLabel(menu.row, label)}>{v(label)}</button>)}</div></div>
      <label className="context-field"><span><CalendarClock />{locale === "en" ? "Due date" : "Tenggat"}</span><input type="date" value={String(menu.row.dueDate || "")} onChange={event => { updateTicket(menu.row.id, { dueDate: event.target.value }); setMenu(current => current ? { ...current, row: { ...current.row, dueDate: event.target.value } } : null); }} /></label>
      <button className="context-delete" role="menuitem" onClick={() => removeTicket(menu.row)}><Trash2 />{t("Hapus")}</button>
    </div></>}
    {vendorAssignment && <div className="backdrop vendor-assignment-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setVendorAssignment(null)}><div className="dialog vendor-assignment-dialog" role="dialog" aria-modal="true" aria-labelledby="vendor-assignment-title"><div className="dialog-head"><div><span className="eyebrow">{vendorAssignment.ticketNumber}</span><h2 id="vendor-assignment-title">{locale === "en" ? "Assign a vendor" : "Pilih vendor"}</h2><p>{locale === "en" ? "A vendor is required before moving this ticket to Assigned." : "Vendor wajib dipilih sebelum tiket dipindahkan ke Ditugaskan."}</p></div><button className="icon-button" aria-label={t("Tutup")} onClick={() => setVendorAssignment(null)}><X /></button></div><div className="dialog-body"><div className="vendor-options" role="radiogroup" aria-label={locale === "en" ? "Available vendors" : "Vendor tersedia"}>{vendors.map(vendor => <label className={selectedVendor === vendor.nama ? "selected" : ""} key={vendor.id}><input type="radio" name="vendor" value={String(vendor.nama)} checked={selectedVendor === vendor.nama} onChange={() => setSelectedVendor(String(vendor.nama))} /><span className="vendor-avatar"><Wrench /></span><span><strong>{vendor.nama}</strong><small>{String(vendor.labels || "").split("|").join(", ")} · {v(vendor.kota)}</small></span><Check /></label>)}</div></div><div className="dialog-actions"><button className="button" onClick={() => setVendorAssignment(null)}>{t("Batal")}</button><button className="button primary" disabled={!selectedVendor} onClick={assignVendor}>{locale === "en" ? "Assign and move" : "Tugaskan dan pindahkan"}</button></div></div></div>}
    {vendorDialog && <div className="backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setVendorDialog(false)}><form className="dialog vendor-form-dialog" role="dialog" aria-modal="true" aria-labelledby="vendor-form-title" onSubmit={saveVendor}><div className="dialog-head"><div><h2 id="vendor-form-title">{locale === "en" ? "Add vendor" : "Tambah vendor"}</h2><p>{locale === "en" ? "Add the vendor's business and primary contact details." : "Tambahkan informasi usaha dan kontak utama vendor."}</p></div><button type="button" className="icon-button" aria-label={t("Tutup")} onClick={() => setVendorDialog(false)}><X /></button></div><div className="dialog-body"><div className="form-grid"><div className="form-field full"><label htmlFor="vendor-name">{locale === "en" ? "Vendor name" : "Nama vendor"}</label><input id="vendor-name" autoComplete="organization" value={vendorForm.nama} onChange={event => setVendorForm(current => ({ ...current, nama: event.target.value }))} required /></div><div className="form-field"><label htmlFor="vendor-contact">{locale === "en" ? "Contact person" : "Nama kontak"}</label><input id="vendor-contact" autoComplete="name" value={vendorForm.kontak} onChange={event => setVendorForm(current => ({ ...current, kontak: event.target.value }))} required /></div><div className="form-field"><label htmlFor="vendor-phone">{locale === "en" ? "Contact number" : "Nomor kontak"}</label><input id="vendor-phone" type="tel" inputMode="tel" autoComplete="tel" pattern="[0-9+()\s-]{8,20}" value={vendorForm.telepon} onChange={event => setVendorForm(current => ({ ...current, telepon: event.target.value }))} required /></div><div className="form-field full"><label htmlFor="vendor-label">Label</label><div className="tag-input">{vendorLabels.map(label => <span className="property-tag" key={label}>{label}<button type="button" aria-label={`${t("Hapus")} ${label}`} onClick={() => setVendorLabels(current => current.filter(item => item !== label))}><X /></button></span>)}<input id="vendor-label" value={vendorLabelInput} onChange={event => setVendorLabelInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addVendorLabel(); } }} onBlur={() => addVendorLabel()} placeholder={locale === "en" ? "Add label..." : "Tambah label..."} /></div></div><div className="form-field full"><label htmlFor="vendor-city">{locale === "en" ? "City" : "Kota"}</label><input id="vendor-city" value={vendorForm.kota} onChange={event => setVendorForm(current => ({ ...current, kota: event.target.value }))} /></div></div></div><div className="dialog-actions"><button type="button" className="button" onClick={() => setVendorDialog(false)}>{t("Batal")}</button><button type="submit" className="button primary">{locale === "en" ? "Add vendor" : "Tambah vendor"}</button></div></form></div>}
  </>;
}
