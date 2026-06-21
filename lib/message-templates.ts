import { Locale } from "@/lib/i18n";

export type VariableDef = { token: string; label: string; labelEn: string; example: string };

export type MessageEvent = {
  id: string;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  timing: string;
  timingEn: string;
  variables: VariableDef[];
};

export type TemplateOption = { label: string; reply: string };

export type MessageTemplate = {
  id: string;
  eventId: string;
  active: boolean;
  body: string;
  interactive?: {
    question: string;
    options: TemplateOption[];
    branches: Record<string, string>;
  };
};

// Organization-level constants — resolvable for every template regardless of event.
export const ORG_CONSTANTS: VariableDef[] = [
  { token: "org_name", label: "Nama organisasi", labelEn: "Organization name", example: "PT Makmur" },
  { token: "owner_name", label: "Nama pemilik", labelEn: "Owner name", example: "Andi Triono" },
  { token: "payment_note", label: "Catatan pembayaran", labelEn: "Payment note", example: "Transfer ke BCA 1234567890 a.n. PT Makmur" },
];

// Variables shared by most billing events.
const tenant: VariableDef = { token: "tenant_name", label: "Nama penyewa", labelEn: "Tenant name", example: "Ahmad Fauzi" };
const unit: VariableDef = { token: "unit", label: "Unit", labelEn: "Unit", example: "Melati 101" };
const amount: VariableDef = { token: "amount", label: "Nominal", labelEn: "Amount", example: "Rp1.200.000" };
const dueDate: VariableDef = { token: "due_date", label: "Jatuh tempo", labelEn: "Due date", example: "5 Jul 2025" };
const paymentUrl: VariableDef = { token: "payment_url", label: "Tautan pembayaran", labelEn: "Payment link", example: "sewain.id/bayar/INV-0078" };

export const MESSAGE_EVENTS: MessageEvent[] = [
  {
    id: "rent_reminder",
    label: "Pengingat sewa",
    labelEn: "Rent reminder",
    description: "Dikirim sebelum tagihan jatuh tempo.",
    descriptionEn: "Sent before the invoice is due.",
    timing: "H-3, 09.00",
    timingEn: "3 days before, 09:00",
    variables: [tenant, unit, amount, dueDate, paymentUrl],
  },
  {
    id: "due_today",
    label: "Jatuh tempo hari ini",
    labelEn: "Due today",
    description: "Dikirim pada hari jatuh tempo.",
    descriptionEn: "Sent on the due date.",
    timing: "H, 08.00",
    timingEn: "On the due date, 08:00",
    variables: [tenant, unit, amount, dueDate, paymentUrl],
  },
  {
    id: "overdue",
    label: "Tagihan terlambat",
    labelEn: "Overdue invoice",
    description: "Dikirim berulang selama tagihan belum dibayar.",
    descriptionEn: "Sent repeatedly while the invoice is unpaid.",
    timing: "Setiap 3 hari setelah jatuh tempo",
    timingEn: "Every 3 days after the due date",
    variables: [
      tenant, unit, amount, dueDate, paymentUrl,
      { token: "days_overdue", label: "Hari keterlambatan", labelEn: "Days overdue", example: "5" },
      { token: "late_fee", label: "Denda", labelEn: "Late fee", example: "Rp50.000" },
    ],
  },
  {
    id: "payment_confirmed",
    label: "Pembayaran diterima",
    labelEn: "Payment received",
    description: "Dikirim setelah pembayaran terkonfirmasi.",
    descriptionEn: "Sent once a payment is confirmed.",
    timing: "Langsung",
    timingEn: "Immediately",
    variables: [
      tenant, unit, amount,
      { token: "paid_date", label: "Tanggal bayar", labelEn: "Paid date", example: "3 Jul 2025" },
      { token: "receipt_url", label: "Tautan kuitansi", labelEn: "Receipt link", example: "sewain.id/kuitansi/INV-0078" },
    ],
  },
  {
    id: "deposit_refunded",
    label: "Deposit dikembalikan",
    labelEn: "Deposit refunded",
    description: "Dikirim saat deposit dikembalikan ke penyewa.",
    descriptionEn: "Sent when a deposit is returned to the tenant.",
    timing: "Langsung",
    timingEn: "Immediately",
    variables: [
      tenant, unit, amount,
      { token: "refund_date", label: "Tanggal refund", labelEn: "Refund date", example: "1 Jul 2025" },
    ],
  },
  {
    id: "ticket_update",
    label: "Update pemeliharaan",
    labelEn: "Maintenance update",
    description: "Dikirim saat status tiket pemeliharaan berubah.",
    descriptionEn: "Sent when a maintenance ticket status changes.",
    timing: "Langsung",
    timingEn: "Immediately",
    variables: [
      tenant, unit,
      { token: "ticket_no", label: "Nomor tiket", labelEn: "Ticket number", example: "TKT-0182" },
      { token: "ticket_status", label: "Status tiket", labelEn: "Ticket status", example: "Ditugaskan" },
      { token: "visit_date", label: "Jadwal kunjungan", labelEn: "Visit date", example: "6 Jul 2025, 10.00" },
    ],
  },
  {
    id: "token_ready",
    label: "Token PLN siap",
    labelEn: "PLN token ready",
    description: "Dikirim setelah token listrik diterbitkan.",
    descriptionEn: "Sent once an electricity token is issued.",
    timing: "Langsung",
    timingEn: "Immediately",
    variables: [
      tenant, amount,
      { token: "token", label: "Nomor token", labelEn: "Token number", example: "1234 5678 9012 3456 7890" },
      { token: "meter_no", label: "Nomor meter", labelEn: "Meter number", example: "5412 9901 2255" },
    ],
  },
  {
    id: "contract_ready",
    label: "Kontrak siap ditandatangani",
    labelEn: "Contract ready to sign",
    description: "Dikirim saat kontrak siap untuk ditandatangani.",
    descriptionEn: "Sent when a contract is ready to sign.",
    timing: "Langsung",
    timingEn: "Immediately",
    variables: [
      tenant, unit,
      { token: "contract_no", label: "Nomor kontrak", labelEn: "Contract number", example: "KTR-2025-031" },
      { token: "sign_url", label: "Tautan tanda tangan", labelEn: "Signing link", example: "sewain.id/ttd/KTR-2025-031" },
    ],
  },
];

export function findEvent(eventId: string): MessageEvent | undefined {
  return MESSAGE_EVENTS.find(event => event.id === eventId);
}

export function eventLabel(event: MessageEvent, locale: Locale): string {
  return locale === "en" ? event.labelEn : event.label;
}

export function eventTiming(event: MessageEvent, locale: Locale): string {
  return locale === "en" ? event.timingEn : event.timing;
}

export function eventDescription(event: MessageEvent, locale: Locale): string {
  return locale === "en" ? event.descriptionEn : event.description;
}

export function variableLabel(variable: VariableDef, locale: Locale): string {
  return locale === "en" ? variable.labelEn : variable.label;
}

// Sample values keyed by token, used by the WhatsApp preview to substitute variables.
export function sampleValues(event: MessageEvent | undefined): Record<string, string> {
  const values: Record<string, string> = {};
  for (const variable of ORG_CONSTANTS) values[variable.token] = variable.example;
  for (const variable of event?.variables ?? []) values[variable.token] = variable.example;
  return values;
}

export const SEED_TEMPLATES: MessageTemplate[] = [
  {
    id: "rent_reminder",
    eventId: "rent_reminder",
    active: true,
    body: "Halo {{tenant_name}}, ini pengingat dari *{{org_name}}*.\n\nSewa unit {{unit}} sebesar *{{amount}}* akan jatuh tempo pada {{due_date}}.\n\nBayar lebih awal di sini: {{payment_url}}\n\nTerima kasih.",
  },
  {
    id: "due_today",
    eventId: "due_today",
    active: true,
    body: "Halo {{tenant_name}}, sewa unit {{unit}} sebesar *{{amount}}* jatuh tempo *hari ini* ({{due_date}}).\n\nSilakan selesaikan pembayaran: {{payment_url}}\n\n{{payment_note}}",
  },
  {
    id: "payment_confirmed",
    eventId: "payment_confirmed",
    active: true,
    body: "Terima kasih {{tenant_name}}! Pembayaran *{{amount}}* untuk unit {{unit}} sudah kami terima pada {{paid_date}}.\n\nKuitansi: {{receipt_url}}",
  },
  {
    id: "overdue",
    eventId: "overdue",
    active: false,
    body: "Halo {{tenant_name}}, tagihan unit {{unit}} sebesar *{{amount}}* sudah terlambat *{{days_overdue}} hari* (jatuh tempo {{due_date}}).\n\nDenda berjalan: {{late_fee}}\nBayar sekarang: {{payment_url}}",
  },
  {
    id: "ticket_update",
    eventId: "ticket_update",
    active: true,
    body: "Halo {{tenant_name}}, kami menjadwalkan kunjungan teknisi untuk tiket {{ticket_no}} di unit {{unit}} pada {{visit_date}}.\n\nApakah unit bisa diakses pada jadwal tersebut?",
    interactive: {
      question: "Apakah unit bisa diakses pada jadwal tersebut?",
      options: [
        { label: "Tersedia", reply: "Tersedia" },
        { label: "Tidak tersedia", reply: "Tidak tersedia" },
      ],
      branches: {
        "Tersedia": "Terima kasih {{tenant_name}}! Teknisi akan datang pada {{visit_date}}. Mohon pastikan ada yang membukakan akses ke unit {{unit}}.",
        "Tidak tersedia": "Baik {{tenant_name}}, kami akan menghubungi Anda untuk menjadwalkan ulang kunjungan tiket {{ticket_no}}. Mohon balas waktu yang Anda inginkan.",
      },
    },
  },
];

// Replaces {{token}} with provided values. Unknown tokens are left as {{token}}
// so the renderer can highlight them as unresolved chips.
export function renderPreview(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (whole, token: string) => {
    const value = values[token];
    return value !== undefined ? value : whole;
  });
}
