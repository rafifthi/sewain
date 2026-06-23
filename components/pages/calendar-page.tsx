"use client";

import { useMemo, useState } from "react";
import { CalendarClock, CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, FileType2, UserCheck, Wrench, Check } from "lucide-react";
import { useI18n } from "@/components/context";
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

const calendarEvents: CalendarEvent[] = [
  { id: "cal-1", date: "2026-06-22", title: "Perbaikan pipa bocor", titleEn: "Leaking pipe repair", detail: "Kost Menteng Indah · Unit 109", kind: "maintenance", target: "tickets", status: "ongoing", time: "09.00–12.00" },
  { id: "cal-2", date: "2026-06-22", title: "8 tagihan jatuh tempo", titleEn: "8 invoices due", detail: "3 properti · Rp9.600.000", kind: "payment", target: "invoices", status: "ongoing", time: "Hari ini" },
  { id: "cal-3", date: "2026-06-24", title: "Kunjungan teknisi AC", titleEn: "AC technician visit", detail: "Villa Bintaro Residence · Unit 204", kind: "maintenance", target: "tickets", status: "upcoming", time: "10.30" },
  { id: "cal-4", date: "2026-06-25", title: "Pengingat pembayaran", titleEn: "Payment reminder", detail: "12 penyewa belum membayar", kind: "payment", target: "invoices", status: "upcoming", time: "08.00" },
  { id: "cal-5", date: "2026-06-26", title: "Serah terima unit", titleEn: "Unit handover", detail: "Apartemen Setiabudi · Unit A-18", kind: "move", target: "reservations", status: "upcoming", time: "14.00" },
  { id: "cal-6", date: "2026-06-28", title: "3 kontrak berakhir", titleEn: "3 contracts expire", detail: "Perlu keputusan perpanjangan", kind: "contract", target: "contracts", status: "upcoming" },
  { id: "cal-7", date: "2026-07-01", title: "Tagihan sewa diterbitkan", titleEn: "Rent invoices issued", detail: "Seluruh penyewa aktif", kind: "payment", target: "invoices", status: "upcoming", time: "Otomatis" },
  { id: "cal-8", date: "2026-07-03", title: "Inspeksi unit keluar", titleEn: "Move-out inspection", detail: "Kos Melati · Unit 104", kind: "move", target: "reservations", status: "upcoming", time: "13.00" },
];

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

export function CalendarPage({ onOpenEvent }: { onOpenEvent: (event: CalendarEvent) => void }) {
  const { locale } = useI18n();
  const L = (id: string, en: string) => locale === "en" ? en : id;
  const [month, setMonth] = useState(() => new Date(2026, 5, 1));
  const [selectedDate, setSelectedDate] = useState("2026-06-22");
  const monthName = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", { month: "long", year: "numeric" }).format(month);
  const selectedLabel = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${selectedDate}T12:00:00`));
  const firstDayOffset = (month.getDay() + 6) % 7;
  const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - firstDayOffset);
  const days = Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index));
  const eventsByDate = useMemo(() => calendarEvents.reduce<Record<string, CalendarEvent[]>>((result, event) => {
    (result[event.date] ||= []).push(event);
    return result;
  }, {}), []);
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
