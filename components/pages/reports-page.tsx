"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown, ArrowUp, Download, FileText, TrendingUp,
} from "lucide-react";
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { useI18n } from "@/components/context";
import { moduleData, type Row } from "@/lib/data";
import { formatRp } from "@/lib/utility-token-config";
import { SkeletonTable } from "@/components/skeleton";
import { idMonthsShort } from "@/components/pages/shared";

const rupiah = (value: unknown) => Number(String(value ?? "0").replace(/[^\d]/g, "")) || 0;

const MONTHS_SHORT = idMonthsShort;

function parseRp(value: unknown): number {
  return rupiah(value);
}

function monthIndex(tanggal: string): number {
  const m = tanggal.match(/(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)/);
  if (!m) return -1;
  return MONTHS_SHORT.indexOf(m[1]);
}

function yearFromTanggal(tanggal: string): number {
  const m = tanggal.match(/(\d{4})$/);
  return m ? Number(m[1]) : new Date().getFullYear();
}

function monthKey(tanggal: string): string {
  const mi = monthIndex(tanggal);
  if (mi < 0) return "";
  return `${MONTHS_SHORT[mi]} ${yearFromTanggal(tanggal)}`;
}

function getMonthDate(tanggal: string): Date {
  const mi = monthIndex(tanggal);
  const yr = yearFromTanggal(tanggal);
  if (mi < 0) return new Date();
  return new Date(yr, mi, 1);
}

export function ReportsPage({ properties, invoices }: { properties: Row[]; invoices: Row[] }) {
  const { locale, t, v } = useI18n();
  const [period, setPeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [propertyFilter, setPropertyFilter] = useState("Semua");

  // Expenses data
  const expenses = (moduleData.expenses || []) as Row[];

  // Compute revenue per invoice (total - sisa = paid)
  const invoicesByProperty = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inv of invoices) {
      const paid = parseRp(inv.total) - parseRp(inv.sisa);
      if (paid <= 0) continue;
      // Find property name from invoice's unit field
      let propName = "";
      for (const p of properties) {
        const tag = String(p.nama).replace(/^(Kos|Kontrakan|Ruko|Apartemen|Rumah|Paviliun)\s+/i, "").split(/[\s,]+/)[0];
        if (String(inv.unit).startsWith(tag) || String(inv.unit) === String(p.nama)) {
          propName = String(p.nama);
          break;
        }
      }
      if (!propName && properties.length > 0) propName = String(properties[0].nama);
      map[propName] = (map[propName] || 0) + paid;
    }
    return map;
  }, [invoices, properties]);

  // Compute expenses per property (all time for now)
  const expensesByProperty = useMemo(() => {
    const map: Record<string, number> = {};
    for (const exp of expenses) {
      const prop = properties.find(p => String(p.id) === String(exp.propertiId));
      const propName = prop ? String(prop.nama) : "Lainnya";
      map[propName] = (map[propName] || 0) + parseRp(exp.jumlah);
    }
    return map;
  }, [expenses, properties]);

  // Filtered property list
  const filteredProperties = propertyFilter === "Semua"
    ? properties
    : properties.filter(p => p.id === propertyFilter || String(p.nama) === propertyFilter);

  // Filtered expenses by property
  const filteredExpenses = propertyFilter === "Semua"
    ? expenses
    : expenses.filter(e => String(e.propertiId) === propertyFilter);

  // Filtered invoices by property
  const filteredInvoices = propertyFilter === "Semua"
    ? invoices
    : invoices.filter(inv => {
      for (const p of properties) {
        if (p.id === propertyFilter) {
          const tag = String(p.nama).replace(/^(Kos|Kontrakan|Ruko|Apartemen|Rumah|Paviliun)\s+/i, "").split(/[\s,]+/)[0];
          return String(inv.unit).startsWith(tag) || String(inv.unit) === String(p.nama);
        }
      }
      return false;
    });

  // Summary calculations
  const totalRevenue = Object.values(invoicesByProperty).reduce((a, b) => a + b, 0);
  const totalCost = Object.values(expensesByProperty).reduce((a, b) => a + b, 0);
  const netProfit = totalRevenue - totalCost;

  // P&L per property
  const pnlRows = useMemo(() => {
    return properties.map(prop => {
      const propName = String(prop.nama);
      const revenue = invoicesByProperty[propName] || 0;
      const cost = expensesByProperty[propName] || 0;
      const profit = revenue - cost;
      const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
      return { propName, revenue, cost, profit, margin };
    });
  }, [properties, invoicesByProperty, expensesByProperty]);

  // Trend chart data: 12 months
  const chartData = useMemo(() => {
    const now = new Date();
    const data: { month: string; revenue: number; expenses: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
      const mk = `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;

      // Revenue for this month
      let rev = 0;
      for (const inv of filteredInvoices) {
        const invPeriode = String(inv.periode || "");
        if (invPeriode.includes(mk) || invPeriode.includes(monthLabel)) {
          rev += (parseRp(inv.total) - parseRp(inv.sisa));
        }
      }

      // Expenses for this month
      let cost = 0;
      for (const exp of filteredExpenses) {
        const expMk = monthKey(String(exp.tanggal));
        if (expMk === mk) {
          cost += parseRp(exp.jumlah);
        }
      }

      data.push({ month: monthLabel, revenue: rev, expenses: cost });
    }
    return data;
  }, [filteredInvoices, filteredExpenses]);

  // Period filter logic for P&L table
  const periodFilteredExpenses = useMemo(() => {
    const now = new Date();
    return filteredExpenses.filter(exp => {
      const expDate = getMonthDate(String(exp.tanggal));
      const expM = expDate.getMonth();
      const expY = expDate.getFullYear();
      if (period === "monthly") return expM === selectedMonth && expY === selectedYear;
      if (period === "quarterly") {
        const q = Math.floor(selectedMonth / 3) * 3;
        return expM >= q && expM < q + 3 && expY === selectedYear;
      }
      return expY === selectedYear;
    });
  }, [filteredExpenses, period, selectedMonth, selectedYear]);

  const periodFilteredInvoices = useMemo(() => {
    const now = new Date();
    return filteredInvoices.filter(inv => {
      // Parse invoice period (e.g., "Juni 2025")
      const invPeriode = String(inv.periode || "");
      const match = invPeriode.match(/^([A-Za-z]+)\s+(\d{4})$/);
      if (!match) return false;
      const invM = MONTHS_SHORT.indexOf(match[1]);
      const invY = Number(match[2]);
      if (Number.isNaN(invM) || invM < 0) return false;
      if (period === "monthly") return invM === selectedMonth && invY === selectedYear;
      if (period === "quarterly") {
        const q = Math.floor(selectedMonth / 3) * 3;
        return invM >= q && invM < q + 3 && invY === selectedYear;
      }
      return invY === selectedYear;
    });
  }, [filteredInvoices, period, selectedMonth, selectedYear]);

  const periodRevenue = periodFilteredInvoices.reduce((sum, inv) => sum + (parseRp(inv.total) - parseRp(inv.sisa)), 0);
  const periodCost = periodFilteredExpenses.reduce((sum, exp) => sum + parseRp(exp.jumlah), 0);
  const periodProfit = periodRevenue - periodCost;

  // CSV export
  const exportCSV = () => {
    const rows = [["Properti", "Pendapatan", "Biaya", "Laba Bersih", "Margin %"]];
    for (const row of pnlRows) {
      rows.push([
        row.propName,
        String(row.revenue),
        String(row.cost),
        String(row.profit),
        `${row.margin}%`,
      ]);
    }
    rows.push([
      "TOTAL",
      String(totalRevenue),
      String(totalCost),
      String(netProfit),
      totalRevenue > 0 ? `${Math.round((netProfit / totalRevenue) * 100)}%` : "0%",
    ]);
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-keuangan-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const monthOptions = MONTHS_SHORT.map((m, i) => (
    <option key={i} value={i}>{m}</option>
  ));

  const years = Array.from({ length: 5 }, (_, i) => selectedYear - 2 + i);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t("Laporan Keuangan")}</h1>
          <p className="subtext">{locale === "en" ? "Financial overview, P&L, and trends." : "Ringkasan keuangan, laba-rugi, dan tren."}</p>
        </div>
      </div>

      {/* Period & Property Filters */}
      <section className="panel">
        <div className="toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
          <div className="tabs" role="tablist" style={{ margin: 0 }}>
            {(["monthly", "quarterly", "yearly"] as const).map(p => (
              <button key={p} role="tab" aria-selected={period === p}
                className={`tab ${period === p ? "active" : ""}`}
                onClick={() => setPeriod(p)}>
                {p === "monthly" ? (locale === "en" ? "Monthly" : "Bulanan") :
                 p === "quarterly" ? (locale === "en" ? "Quarterly" : "Triwulan") :
                 (locale === "en" ? "Yearly" : "Tahunan")}
              </button>
            ))}
          </div>
          {period !== "yearly" && (
            <select aria-label={t("Bulan")} value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}>
              {monthOptions}
            </select>
          )}
          <select aria-label={t("Tahun")} value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select aria-label={t("Properti")} value={propertyFilter}
            onChange={e => setPropertyFilter(e.target.value)}>
            <option value="Semua">{t("Semua properti")}</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{v(p.nama)}</option>
            ))}
          </select>
          <button className="button" onClick={exportCSV} aria-label={locale === "en" ? "Download CSV" : "Unduh CSV"}>
            <Download /> CSV
          </button>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="stats-strip">
        <div className="stat" style={{ borderLeft: "3px solid #10b981" }}>
          <span>{t("Pendapatan")} <ArrowUp size={14} style={{ color: "#10b981" }} /></span>
          <strong style={{ color: "#10b981" }}>{formatRp(periodRevenue)}</strong>
          <small>{period === "monthly" ? t("Bulan ini") : period === "quarterly" ? t("Triwulan ini") : t("Tahun ini")}</small>
        </div>
        <div className="stat" style={{ borderLeft: "3px solid #ef4444" }}>
          <span>{t("Biaya")} <ArrowDown size={14} style={{ color: "#ef4444" }} /></span>
          <strong style={{ color: "#ef4444" }}>{formatRp(periodCost)}</strong>
          <small>{locale === "en" ? "Total expenses" : "Total biaya"}</small>
        </div>
        <div className="stat" style={{ borderLeft: "3px solid #3b82f6" }}>
          <span>{t("Laba Bersih")} <TrendingUp size={14} style={{ color: "#3b82f6" }} /></span>
          <strong style={{ color: "#3b82f6" }}>{formatRp(periodProfit)}</strong>
          <small>{periodRevenue > 0 ? `${Math.round((periodProfit / periodRevenue) * 100)}% ${locale === "en" ? "margin" : "margin"}` : "-"}</small>
        </div>
      </section>

      {/* P&L Table */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{locale === "en" ? "Profit & Loss by Property" : "Laba Rugi per Properti"}</h2>
            <p>{locale === "en" ? "Revenue, expenses, and margin per property." : "Pendapatan, biaya, dan margin per properti."}</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("Nama properti")}</th>
                <th>{t("Pendapatan")}</th>
                <th>{t("Biaya")}</th>
                <th>{t("Laba Bersih")}</th>
                <th>{t("Margin")}</th>
              </tr>
            </thead>
            <tbody>
              {pnlRows.map(row => (
                <tr key={row.propName}>
                  <td><span className="cell-main">{row.propName}</span></td>
                  <td style={{ color: "var(--success, #10b981)" }}>{formatRp(row.revenue)}</td>
                  <td style={{ color: "var(--danger, #ef4444)" }}>{formatRp(row.cost)}</td>
                  <td className={row.profit >= 0 ? "" : "money-danger"}>
                    <strong>{formatRp(row.profit)}</strong>
                  </td>
                  <td>
                    <span className={`badge ${row.margin >= 0 ? "success" : "danger"}`}>
                      {row.margin}%
                    </span>
                  </td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700, borderTop: "2px solid var(--border)" }}>
                <td>{locale === "en" ? "TOTAL" : "TOTAL"}</td>
                <td style={{ color: "var(--success, #10b981)" }}>{formatRp(totalRevenue)}</td>
                <td style={{ color: "var(--danger, #ef4444)" }}>{formatRp(totalCost)}</td>
                <td className={netProfit >= 0 ? "" : "money-danger"}>
                  <strong>{formatRp(netProfit)}</strong>
                </td>
                <td>
                  <span className={`badge ${netProfit >= 0 ? "success" : "danger"}`}>
                    {totalRevenue > 0 ? `${Math.round((netProfit / totalRevenue) * 100)}%` : "0%"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Trend Chart */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{locale === "en" ? "Revenue & Expense Trend" : "Tren Pendapatan & Biaya"}</h2>
            <p>{locale === "en" ? "12-month trend of revenue vs expenses." : "Tren 12 bulan pendapatan vs biaya."}</p>
          </div>
        </div>
        <div style={{ padding: "0 0 16px" }}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }}
                tickFormatter={(val) => val.split(" ")[0]} />
              <YAxis tick={{ fontSize: 12 }}
                tickFormatter={(val: unknown) => { const n = Number(val); return n >= 1000000 ? `${(n / 1000000).toFixed(1)}jt` : n >= 1000 ? `${(n / 1000).toFixed(0)}rb` : String(n); }} />
              <Tooltip formatter={(value: unknown) => formatRp(Number(value) || 0)} />
              <Legend />
              <Line type="monotone" dataKey="revenue"
                stroke="#10b981" strokeWidth={2} dot={{ r: 3 }}
                name={locale === "en" ? "Revenue" : "Pendapatan"} />
              <Line type="monotone" dataKey="expenses"
                stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }}
                name={locale === "en" ? "Expenses" : "Biaya"} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}
