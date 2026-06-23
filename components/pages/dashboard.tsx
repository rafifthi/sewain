"use client";

import { Fragment } from "react";
import { Check } from "lucide-react";
import { Row, properties as seedProperties, invoices as seedInvoices } from "@/lib/data";
import { useI18n, type I18nState } from "@/components/context";
import {
  PageHead, DataTable, isExpiringSoon, reservationEndDate, fmtShort, PageId,
} from "./_shared";

export function Dashboard({ go, reservations }: { go: (p: PageId) => void; reservations: Row[] }) {
  const { t, v } = useI18n();
  const upcoming: [string, string][] = [];
  reservations.filter(r => r.status === "Kontrak Ditandatangani" && r.jadwalMasuk).forEach(r => upcoming.push([`Move-in ${v(r.unit)}`, v(r.jadwalMasuk)]));
  reservations.filter(r => isExpiringSoon(r)).forEach(r => upcoming.push([`${t("Kontrak berakhir")} · ${v(r.unit)}`, v(reservationEndDate(r.periode) ? fmtShort(reservationEndDate(r.periode)!) : r.periode)]));
  const activity = [
    ["Pembayaran diterima", t("Dewi Lestari membayar Rp1.200.000"), "10.23"],
    ["Kontrak perlu ditandatangani", "M. Iqbal Maulana, Unit 104", "09.15"],
    ["Tiket baru", "Keran bocor di Unit 103", "Kemarin"],
  ];
  return <>
    <PageHead page="dashboard" />
    <div className="stats-strip">
      <div className="stat"><span>{t("Tingkat hunian")}</span><strong>75%</strong><small>{t("+4% bulan ini")}</small></div>
      <div className="stat"><span>{t("Tagihan diterima")}</span><strong>{v("Rp42,8 jt")}</strong><small>{t("89% tertagih")}</small></div>
      <div className="stat"><span>{t("Perlu ditagih")}</span><strong>{v("Rp8,4 jt")}</strong><small style={{ color: "var(--danger)" }}>{t("6 tagihan")}</small></div>
      <div className="stat"><span>{t("Tiket terbuka")}</span><strong>4</strong><small>{t("2 ditugaskan")}</small></div>
    </div>
    <div className="split dashboard-split">
      <div>
        <section className="panel"><div className="panel-head"><div><h2>{t("Portofolio properti")}</h2><p>{t("Hunian dan pendapatan bulan berjalan")}</p></div><button className="button" onClick={() => go("properties")}>{t("Lihat properti")}</button></div>
          <DataTable rows={seedProperties.slice(0, 4)} onEdit={() => go("properties")} onDelete={() => go("properties")} onSelect={() => go("properties")} />
        </section>
        <section className="panel"><div className="panel-head"><div><h2>{t("Tagihan perlu tindakan")}</h2><p>{t("Urut berdasarkan keterlambatan")}</p></div><button className="button primary" onClick={() => go("invoices")}>{t("Buka tagihan")}</button></div>
          <DataTable rows={seedInvoices.filter(r => r.status !== "Lunas").slice(0, 4)} onEdit={() => go("invoices")} onDelete={() => go("invoices")} />
        </section>
      </div>
      <aside className="detail-pane"><div className="panel-head"><div><h2>{t("Aktivitas terbaru")}</h2><p>{t("Hari ini")}</p></div></div><div className="detail-section">
        {activity.map(([title, desc, time]) => <div className="activity" key={title}><span className="activity-icon"><Check /></span><span><strong>{t(title)}</strong><span className="cell-sub">{t(desc)}</span></span><time>{t(time)}</time></div>)}
      </div><div className="detail-section"><div className="detail-title">{t("Jadwal mendatang")}<button className="text-button" style={{ marginLeft: "auto" }} onClick={() => go("reservations")}>{t("Reservasi")}</button></div>{upcoming.length ? <div className="detail-grid">{upcoming.map(([label, when], i) => <Fragment key={i}><span>{label}</span><span>{when}</span></Fragment>)}</div> : <div className="inline-empty">{t("Tidak ada jadwal mendatang.")}</div>}</div></aside>
    </div>
  </>;
}
