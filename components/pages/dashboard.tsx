"use client";

import { Fragment } from "react";
import { Check } from "lucide-react";
import { Row, properties as seedProperties, invoices as seedInvoices } from "@/lib/data";
import { useI18n, type I18nState } from "@/components/context";
import { SkeletonStats } from "@/components/skeleton";
import { useDbRows } from "@/lib/client-data";
import {
  PageHead, DataTable, isExpiringSoon, reservationEndDate, fmtShort, PageId,
} from "./shared";

type Activity = { title: string; desc: string; time: string; ts: number };

export function Dashboard({ go, reservations, loading = false }: { go: (p: PageId) => void; reservations: Row[]; loading?: boolean }) {
  const { t, v } = useI18n();
  const [tickets, , ticketsLoading] = useDbRows("tickets");
  const [invoices, , invoicesLoading] = useDbRows("invoices");

  const upcoming: [string, string][] = [];
  reservations.filter(r => r.status === "Kontrak Ditandatangani" && r.jadwalMasuk).forEach(r => upcoming.push([`Move-in ${v(r.unit)}`, v(r.jadwalMasuk)]));
  reservations.filter(r => isExpiringSoon(r)).forEach(r => upcoming.push([`${t("Kontrak berakhir")} · ${v(r.unit)}`, v(reservationEndDate(r.periode) ? fmtShort(reservationEndDate(r.periode)!) : r.periode)]));

  // Derived "Aktivitas terbaru" feed from real module data (replaces hardcoded rows).
  const activity: Activity[] = [];
  tickets.filter(x => x.status === "Baru").forEach(x => pushActivity(activity, {
    title: "Tiket baru",
    desc: `${v(cleanText(x.judul || x.masalah))} · ${v(x.unit)}`,
    raw: String(x.createdAt || ""),
    hasTime: true,
  }));
  invoices.filter(inv => inv.status !== "Lunas").forEach(inv => pushActivity(activity, {
    title: inv.status === "Terlambat" ? "Tunggakan" : "Tagihan jatuh tempo",
    desc: `${v(inv.penyewa)} · ${v(inv.sisa)}`,
    raw: String(inv.jatuhTempo || ""),
    hasTime: false,
  }));
  reservations.filter(r => r.status === "Kontrak Ditandatangani").forEach(r => pushActivity(activity, {
    title: "Kontrak perlu ditandatangani",
    desc: `${v(r.penyewa)} · ${v(r.unit)}`,
  }));
  invoices.filter(inv => inv.status === "Lunas").forEach(inv => pushActivity(activity, {
    title: "Pembayaran diterima",
    desc: `${v(inv.penyewa)} · ${v(inv.total)}`,
    raw: String(inv.jatuhTempo || ""),
    hasTime: false,
  }));
  activity.sort((a, b) => b.ts - a.ts);
  const activityRows = activity.slice(0, 6);

  const showLoading = loading || ticketsLoading || invoicesLoading;
  return <><PageHead page="dashboard" />
      {loading ? <div className="skeleton-transition"><SkeletonStats /></div> : <div className="stats-strip">
        <div className="stat"><span>{t("Tingkat hunian")}</span><strong>75%</strong><small>{t("+4% bulan ini")}</small></div>
        <div className="stat"><span>{t("Tagihan diterima")}</span><strong>{v("Rp42,8 jt")}</strong><small>{t("89% tertagih")}</small></div>
        <div className="stat"><span>{t("Perlu ditagih")}</span><strong>{v("Rp8,4 jt")}</strong><small style={{ color: "var(--danger)" }}>{t("6 tagihan")}</small></div>
        <div className="stat"><span>{t("Tiket terbuka")}</span><strong>4</strong><small>{t("2 ditugaskan")}</small></div>
      </div>}
      <div className="split dashboard-split">
        <div>
          <section className="panel"><div className="panel-head"><div><h2>{t("Portofolio properti")}</h2><p>{t("Hunian dan pendapatan bulan berjalan")}</p></div><button className="button" onClick={() => go("properties")}>{t("Lihat properti")}</button></div>
            <DataTable rows={seedProperties.slice(0, 4)} loading={loading} onEdit={() => go("properties")} onDelete={() => go("properties")} onSelect={() => go("properties")} />
          </section>
          <section className="panel"><div className="panel-head"><div><h2>{t("Tagihan perlu tindakan")}</h2><p>{t("Urut berdasarkan keterlambatan")}</p></div><button className="button primary" onClick={() => go("invoices")}>{t("Buka tagihan")}</button></div>
            <DataTable rows={seedInvoices.filter(r => r.status !== "Lunas").slice(0, 4)} loading={loading} onEdit={() => go("invoices")} onDelete={() => go("invoices")} />
          </section>
      </div>
      <aside className="detail-pane"><div className="panel-head"><div><h2>{t("Aktivitas terbaru")}</h2><p>{t("Hari ini")}</p></div></div><div className="detail-section">
        {showLoading
          ? null
          : activityRows.length
            ? activityRows.map((a, i) => <div className="activity" key={`${a.title}-${i}`}><span className="activity-icon"><Check /></span><span><strong>{t(a.title)}</strong><span className="cell-sub">{a.desc}</span></span><time>{t(a.time)}</time></div>)
            : <div className="inline-empty">{t("Belum ada aktivitas terbaru.")}</div>}
      </div><div className="detail-section"><div className="detail-title">{t("Jadwal mendatang")}<button className="text-button" style={{ marginLeft: "auto" }} onClick={() => go("reservations")}>{t("Reservasi")}</button></div>{upcoming.length ? <div className="detail-grid">{upcoming.map(([label, when], i) => <Fragment key={i}><span>{label}</span><span>{when}</span></Fragment>)}</div> : <div className="inline-empty">{t("Tidak ada jadwal mendatang.")}</div>}</div></aside>
    </div>
  </>;
}

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/[*#_`>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pushActivity(list: Activity[], item: { title: string; desc: string; raw?: string; hasTime?: boolean }) {
  const date = item.raw ? toActivityDate(item.raw) : null;
  list.push({
    title: item.title,
    desc: item.desc,
    time: date ? formatActivityTime(date, item.hasTime ?? false) : "Baru",
    ts: date ? date.getTime() : 0,
  });
}

function toActivityDate(value: string): Date | null {
  if (/[-T:]/.test(value)) {
    const iso = new Date(value);
    if (!Number.isNaN(iso.getTime())) return iso;
  }
  const m = value.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{4})$/);
  if (m) {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const mo = months.findIndex(mm => mm.toLowerCase() === m[2].toLowerCase());
    if (mo >= 0) return new Date(Date.UTC(Number(m[3]), mo, Number(m[1])));
  }
  return null;
}

function formatActivityTime(date: Date, hasTime: boolean): string {
  const opts: Intl.DateTimeFormatOptions = hasTime
    ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short" };
  return new Intl.DateTimeFormat("id-ID", opts).format(date);
}
