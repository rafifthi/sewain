import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import QRCode from "qrcode";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Row } from "@/lib/data";

export type OrgInfo = { namaOrganisasi: string; alamat: string; logo?: string };

const DEFAULT_ORG: OrgInfo = {
  namaOrganisasi: "PT Makmur Sejahtera",
  alamat: "Jl. Melati No. 45, Depok, Jawa Barat",
};

const rupiahNumber = (value: unknown) => Number(String(value ?? "0").replace(/[^\d]/g, "")) || 0;

const formatRp = (value: unknown) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(rupiahNumber(value));

const formatToday = () => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

const textValue = (value: unknown, fallback = "-") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const badgeColor = (status: string): [number, number, number] => {
  if (/lunas/i.test(status)) return [22, 163, 74];
  if (/terlambat/i.test(status)) return [220, 38, 38];
  if (/jatuh|belum/i.test(status)) return [217, 119, 6];
  return [71, 85, 105];
};

async function createInvoicePDF(invoice: Row, orgInfo?: OrgInfo) {
  const org = { ...DEFAULT_ORG, ...orgInfo };
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const invoiceId = textValue(invoice.id);
  const status = textValue(invoice.status, "Belum dibayar");
  const subtotal = Math.max(rupiahNumber(invoice.total) - rupiahNumber(invoice.lateFeeTotal || invoice.late_fee_total), 0);
  const paymentUrl = `sewain.id/bayar/${invoiceId}`;
  const qr = await QRCode.toDataURL(paymentUrl, { margin: 1, width: 180 });

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("SEWAIN", 16, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(org.namaOrganisasi, 16, 27);
  doc.text(org.alamat, 16, 33);

  if (org.logo) {
    try {
      doc.addImage(org.logo, "PNG", pageWidth - 34, 12, 18, 18);
    } catch {}
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(invoiceId, 16, 58);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Diterbitkan ${formatToday()}`, 16, 65);

  const color = badgeColor(status);
  doc.setFillColor(...color);
  doc.roundedRect(pageWidth - 54, 52, 38, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(status, pageWidth - 35, 58.5, { align: "center" });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text("Ditagihkan kepada", 16, 82);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(textValue(invoice.penyewa), 16, 90);
  doc.text(`Unit ${textValue(invoice.unit)}`, 16, 96);
  doc.text(`Periode ${textValue(invoice.periode)}`, 16, 102);
  doc.text(`Jatuh tempo ${textValue(invoice.jatuhTempo)}`, 16, 108);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Tautan pembayaran", pageWidth - 64, 82);
  doc.addImage(qr, "PNG", pageWidth - 64, 87, 34, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(paymentUrl, pageWidth - 47, 126, { align: "center" });

  autoTable(doc, {
    startY: 138,
    head: [["Rincian", "Jumlah"]],
    body: [
      ["Subtotal sewa", formatRp(subtotal)],
      ["Late fee total", formatRp(invoice.lateFeeTotal || invoice.late_fee_total)],
      ["Outstanding balance", formatRp(invoice.sisa)],
      ["Total tagihan", formatRp(invoice.total)],
    ],
    theme: "grid",
    styles: { font: "helvetica", fontSize: 10, cellPadding: 4, lineColor: [226, 232, 240], lineWidth: 0.2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    bodyStyles: { textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const bankY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 178;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(16, bankY + 12, pageWidth - 32, 24, 3, 3, "F");
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Informasi pembayaran", 22, bankY + 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("BCA 1234567890 a/n PT Makmur Sejahtera", 22, bankY + 30);

  doc.setDrawColor(226, 232, 240);
  doc.line(16, 282, pageWidth - 16, 282);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text("Terima kasih telah menggunakan Sewain", pageWidth / 2, 290, { align: "center" });

  return doc;
}

export async function downloadInvoicePDF(invoice: Row, orgInfo?: OrgInfo) {
  const doc = await createInvoicePDF(invoice, orgInfo);
  doc.save(`${textValue(invoice.id)}.pdf`);
}

export async function downloadBatchPDF(invoices: Row[], orgInfo?: OrgInfo) {
  const zip = new JSZip();
  for (const invoice of invoices) {
    const doc = await createInvoicePDF(invoice, orgInfo);
    zip.file(`${textValue(invoice.id)}.pdf`, doc.output("blob"));
  }
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `sewain-invoices-${new Date().toISOString().slice(0, 10)}.zip`);
}
