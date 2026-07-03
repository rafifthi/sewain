"use client";

import { useMemo, useState } from "react";
import { CalendarClock, CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, FileType2, UserCheck, Wrench } from "lucide-react";
import { useI18n } from "@/components/context";
import type { Row } from "@/lib/data";
import type { PageId } from "./shared";

type CalendarEventKind = "payment" | "maintenance" | "contract" | "move";
type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  titleEn: string;
  detail: string;
  kind: CalendarEventKind;
  target: PageId;
  status: "ongoing" | "upcoming";
  time?: string;
};

const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6,
  agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11,
};

/** Parses ISO strings and Indonesian display dates ("5 Jun 2025") to yyyy-mm-dd. */
function toDateKey(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const match = raw.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!match) return null;
  const monthKey = match[2].slice(0, 3).toLowerCase();
  const month = MONTH_INDEX[monthKey];
  if (month === undefined) return null;
  return `${match[3]}-${String(month + 1).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`;
}

/** Derives calendar events from the org's live data — nothing fabricated. */
function buildCalendarEvents(invoices: Row[], reservations: Row[], tickets: Row[], todayKey: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const status = (date: string): "ongoing" | "upcoming" => (date === todayKey ? "ongoing" : "upcoming");

  invoices.filter(r => r.status !== "Lunas").forEach(r => {
    const date = toDateKey(r.jatuhTempo);
    if (!date) return;
    events.push({ id: `inv-${r.id}`, date, title: "Tagihan jatuh tempo", titleEn: "Invoice due", detail: `${r.penyewa ?? ""} · ${r.unit ?? ""} · ${r.sisa ?? ""}`, kind: "payment", target: "invoices", status: status(date) });
  });

  reservations.forEach(r => {
    const moveIn = toDateKey(r.jadwalMasuk);
    if (moveIn) events.push({ id: `resv-in-${r.id}`, date: moveIn, title: "Jadwal masuk", titleEn: "Move-in", detail: `${r.penyewa ?? ""} · ${r.unit ?? ""}`, kind: "move", target: "reservations", status: status(moveIn) });
    const moveOut = toDateKey(r.jadwalKeluar);
    if (moveOut) events.push({ id: `resv-out-${r.id}`, date: moveOut, title: "Jadwal keluar", titleEn: "Move-out", detail: `${r.penyewa ?? ""} · ${r.unit ?? ""}`, kind: "move", target: "reservations", status: status(moveOut) });
    const periodEnd = toDateKey(String(r.periode ?? "").split("-").pop());
    if (periodEnd && r.status === "Aktif") events.push({ id: `resv-end-${r.id}`, date: periodEnd, title: "Kontrak berakhir", titleEn: "Contract expires", detail: `${r.penyewa ?? ""} · ${r.unit ?? ""}`, kind: "contract", target: "contracts", status: status(periodEnd) });
  });

  tickets.filter(r => r.status !== "Selesai").forEach(r => {
    const date = toDateKey(r.createdAt);
    if (!date) return;
    events.push({ id: `tkt-${r.id}`, date, title: String(r.judul ?? "Tiket pemeliharaan"), titleEn: String(r.judul ?? "Maintenance ticket"), detail: `${r.properti ?? ""} · ${r.unit ?? ""}`, kind: "maintenance", target: "tickets", status: status(date) });
  });

  return events;
}

const calendarKindMeta: Record<CalendarEventKind, { label: string; labelEn: string; icon: typeof CalendarDays }> = {
  payment: { label: "Pembayaran", labelEn: "Payment", icon: CircleDollarSign },
  maintenance: { label: "Pemeliharaan", labelEn: "Maintenance", icon: Wrench },
  contract: { label: "Kontrak", labelEn: "Contract", icon: FileType2 },
  move: { label: "Masuk / keluar", labelEn: "Move in / out", icon: UserCheck },
};

const calendarDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function CalendarAgendaItem({ event, onOpen }: { event: CalendarEvent; onOpen: () => void }) {
  const { locale } = useI18n();
  const meta = calendarKindMeta[event.kind];
  const Icon = meta.icon;
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short" }).format(new Date(`${event.date}T12:00:00`));
  return <button type="button" className={`agenda-item ${event.status === "ongoing" ? "is-ongoing" : ""}`} onClick={onOpen} aria-label={`${locale === "en" ? "Open" : "Buka"} ${locale === "en" ? event.titleEn : event.title}`}>
    <span className={`agenda-icon ${event.kind}`}><Icon /></span>
    <span className="agenda-copy"><strong>{locale === "en" ? event.titleEn : event.title}</strong><span>{event.detail}</span><small>{date}{event.time ? ` · ${event.time}` : ""}</small></span>
    <ChevronRight className="agenda-open-icon" />
  </button>;
}

export function CalendarPage({ onOpenEvent, invoices, reservations, tickets }: { onOpenEvent: (event: CalendarEvent) => void; invoices: Row[]; reservations: Row[]; tickets: Row[] }) {
  const { locale } = useI18n();
  const L = (id: string, en: string) => locale === "en" ? en : id;
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [selectedDate, setSelectedDate] = useState(() => calendarDateKey(new Date()));
  const monthName = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", { month: "long", year: "numeric" }).format(month);
  const selectedLabel = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${selectedDate}T12:00:00`));
  const firstDayOffset = (month.getDay() + 6) % 7;
  const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - firstDayOffset);
  const days = Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index));
  const calendarEvents = useMemo(() => buildCalendarEvents(invoices, reservations, tickets, calendarDateKey(new Date())), [invoices, reservations, tickets]);
  const eventsByDate = useMemo(() => calendarEvents.reduce<Record<string, CalendarEvent[]>>((result, event) => {
    (result[event.date] ||= []).push(event);
    return result;
  }, {}), [calendarEvents]);
  const selectedEvents = eventsByDate[selectedDate] || [];
  const ongoing = selectedEvents.filter(event => event.status === "ongoing");
  const upcoming = selectedEvents.filter(event => event.status === "upcoming");
  const todayKey = calendarDateKey(new Date());
  const upcomingEnd = new Date(`${todayKey}T12:00:00`);
  upcomingEnd.setDate(upcomingEnd.getDate() + 7);
  const upcomingEndKey = calendarDateKey(upcomingEnd);
  const nextSevenDays = calendarEvents.filter(event => event.status === "upcoming" && event.date > todayKey && event.date <= upcomingEndKey);
  const moveMonth = (amount: number) => setMonth(current => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  const goToday = () => {
    const today = new Date();
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(calendarDateKey(today));
  };

  return <div className="calendar-page">
    <div className="page-head calendar-page-head">
      <div><span className="eyebrow">{L("Operasional", "Operations")}</span><h1>{L("Kalender", "Calendar")}</h1><p className="subtext">{L("Pantau jadwal pembayaran, kontrak, dan pekerjaan lapangan.", "Track payments, contracts, and field work in one place.")}</p></div>
      <button className="button" onClick={goToday}><CalendarDays />{L("Hari ini", "Today")}</button>
    </div>

    <div className="calendar-layout">
      <section className="calendar-panel" aria-label={L("Kalender operasional", "Operations calendar")}>
        <div className="calendar-toolbar">
          <div className="calendar-month-controls"><button className="icon-button calendar-arrow" onClick={() => moveMonth(-1)} aria-label={L("Bulan sebelumnya", "Previous month")}><ChevronLeft /></button><h2>{monthName}</h2><button className="icon-button calendar-arrow" onClick={() => moveMonth(1)} aria-label={L("Bulan berikutnya", "Next month")}><ChevronRight /></button></div>
          <div className="calendar-legend">{Object.entries(calendarKindMeta).map(([kind, meta]) => <span key={kind}><i className={`calendar-dot ${kind}`} />{locale === "en" ? meta.labelEn : meta.label}</span>)}</div>
        </div>
        <div className="calendar-scroll">
          <div className="calendar-grid calendar-weekdays">{(locale === "en" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]).map(day => <span key={day}>{day}</span>)}</div>
          <div className="calendar-grid calendar-days">{days.map(date => {
            const key = calendarDateKey(date);
            const dayEvents = eventsByDate[key] || [];
            const outside = date.getMonth() !== month.getMonth();
            const selected = selectedDate === key;
            const dateLabel = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "long", year: "numeric" }).format(date);
            return <button key={key} className={`calendar-day ${outside ? "outside" : ""} ${selected ? "selected" : ""}`} onClick={() => setSelectedDate(key)} aria-pressed={selected} aria-label={dateLabel}>
              <span className="calendar-day-number">{date.getDate()}</span>
              <span className="calendar-day-events">{dayEvents.slice(0, 2).map(event => <span className={`calendar-chip ${event.kind}`} key={event.id}><i />{locale === "en" ? event.titleEn : event.title}</span>)}{dayEvents.length > 2 && <span className="calendar-more">+{dayEvents.length - 2} {L("lainnya", "more")}</span>}</span>
            </button>;
          })}</div>
        </div>
      </section>

      <aside className="calendar-agenda">
        <section className="agenda-card">
          <div className="agenda-heading"><div><span className="eyebrow">{L("Agenda terpilih", "Selected agenda")}</span><h2>{selectedLabel}</h2></div><span className="agenda-count">{selectedEvents.length}</span></div>
          {selectedEvents.length ? <>
            {ongoing.length > 0 && <div className="agenda-section"><div className="agenda-section-title"><span>{L("Sedang berlangsung", "Ongoing")}</span><i className="live-dot" /></div><div className="agenda-list">{ongoing.map(event => <CalendarAgendaItem event={event} key={event.id} onOpen={() => onOpenEvent(event)} />)}</div></div>}
            {upcoming.length > 0 && <div className="agenda-section"><div className="agenda-section-title"><span>{L("Terjadwal", "Scheduled")}</span></div><div className="agenda-list">{upcoming.map(event => <CalendarAgendaItem event={event} key={event.id} onOpen={() => onOpenEvent(event)} />)}</div></div>}
          </> : <div className="agenda-empty"><span className="agenda-empty-icon"><CalendarDays /></span><strong>{L("Tidak ada agenda", "No events scheduled")}</strong><span>{L("Belum ada pembayaran, kontrak, atau pekerjaan yang dijadwalkan pada hari ini.", "No payments, contracts, or field work are scheduled for this day.")}</span></div>}
        </section>

        <section className="agenda-card upcoming-card">
          <div className="agenda-heading"><div><span className="eyebrow">{L("Mendatang", "Upcoming")}</span><h2>{L("7 hari ke depan", "Next 7 days")}</h2></div><span className="agenda-count">{nextSevenDays.length}</span></div>
          {nextSevenDays.length ? <div className="agenda-section"><div className="agenda-list">{nextSevenDays.map(event => <CalendarAgendaItem event={event} key={event.id} onOpen={() => onOpenEvent(event)} />)}</div></div> : <div className="agenda-empty compact"><span className="agenda-empty-icon"><CalendarClock /></span><strong>{L("Tidak ada agenda mendatang", "No upcoming events")}</strong><span>{L("Tidak ada event lain dalam tujuh hari berikutnya.", "There are no other events in the next seven days.")}</span></div>}
        </section>
      </aside>
    </div>
  </div>;
}
