import { Row } from "@/lib/data";

// A contract template is a reusable body of clauses with {{placeholder}} tokens
// that get filled from a contract's snapshot fields when rendered.
export type ContractTemplate = {
  id: string;
  nama: string;
  body: string;
  // System templates ship with the app and cannot be deleted (only edited).
  system?: boolean;
};

// Tokens available in the template editor. The token is what goes inside
// {{ ... }}; the label/labelEn drive the inserter chips and help text.
export type ContractPlaceholder = { token: string; label: string; labelEn: string };

export const CONTRACT_PLACEHOLDERS: ContractPlaceholder[] = [
  { token: "nomor", label: "Nomor kontrak", labelEn: "Contract number" },
  { token: "tanggal", label: "Tanggal dibuat", labelEn: "Date created" },
  { token: "penyewa", label: "Nama penyewa", labelEn: "Tenant name" },
  { token: "kontak", label: "Kontak penyewa", labelEn: "Tenant contact" },
  { token: "properti", label: "Properti", labelEn: "Property" },
  { token: "unit", label: "Unit", labelEn: "Unit" },
  { token: "durasi", label: "Durasi", labelEn: "Duration" },
  { token: "periode", label: "Periode sewa", labelEn: "Lease period" },
  { token: "sewa", label: "Sewa bulanan", labelEn: "Monthly rent" },
  { token: "deposit", label: "Deposit", labelEn: "Deposit" },
  { token: "jadwalMasuk", label: "Jadwal masuk", labelEn: "Move-in date" },
  { token: "pemilik", label: "Nama pemilik", labelEn: "Owner name" },
  { token: "organisasi", label: "Nama organisasi", labelEn: "Organization" },
];

// Organisation-level defaults used when building the placeholder value map.
export const CONTRACT_ORG = { pemilik: "Andi Triono", organisasi: "PT Makmur" } as const;

const STANDARD_BODY = `PERJANJIAN SEWA-MENYEWA
Nomor: {{nomor}}

Pada hari ini, {{tanggal}}, yang bertanda tangan di bawah ini:

1. {{pemilik}}, dalam hal ini bertindak untuk dan atas nama {{organisasi}}, selanjutnya disebut sebagai PIHAK PERTAMA (Pemilik).
2. {{penyewa}} ({{kontak}}), selanjutnya disebut sebagai PIHAK KEDUA (Penyewa).

Kedua belah pihak sepakat untuk mengikatkan diri dalam perjanjian sewa-menyewa dengan ketentuan sebagai berikut:

PASAL 1 — OBJEK SEWA
Pihak Pertama menyewakan kepada Pihak Kedua sebuah unit hunian di {{properti}}, unit {{unit}}.

PASAL 2 — JANGKA WAKTU
Sewa berlaku selama {{durasi}} terhitung sejak {{jadwalMasuk}}, yaitu periode {{periode}}.

PASAL 3 — BIAYA SEWA DAN DEPOSIT
Biaya sewa sebesar {{sewa}} per bulan. Pihak Kedua menyerahkan deposit sebesar {{deposit}} yang dikembalikan pada akhir masa sewa setelah dikurangi kewajiban yang belum diselesaikan.

PASAL 4 — KEWAJIBAN PENYEWA
Pihak Kedua wajib menjaga kebersihan dan keutuhan unit, membayar sewa tepat waktu, serta menaati tata tertib yang berlaku.

PASAL 5 — PENUTUP
Perjanjian ini dibuat dalam keadaan sadar tanpa paksaan dari pihak manapun dan berlaku sejak ditandatangani kedua belah pihak.`;

const SHORTTERM_BODY = `PERJANJIAN SEWA UNIT (JANGKA PENDEK)
Nomor: {{nomor}} · {{tanggal}}

PIHAK PERTAMA : {{pemilik}} ({{organisasi}})
PIHAK KEDUA   : {{penyewa}} — {{kontak}}

1. Objek sewa: {{properti}}, unit {{unit}}.
2. Jangka waktu: {{durasi}} ({{periode}}), mulai {{jadwalMasuk}}.
3. Biaya sewa: {{sewa}} / bulan. Deposit: {{deposit}}.
4. Pembayaran dilakukan di muka setiap periode. Keterlambatan dikenakan ketentuan yang berlaku.
5. Unit dikembalikan dalam kondisi baik pada akhir masa sewa.

Demikian perjanjian ini disepakati dan ditandatangani kedua belah pihak.`;

export const SEED_CONTRACT_TEMPLATES: ContractTemplate[] = [
  { id: "ctpl-standard", nama: "Kontrak Sewa Standar", body: STANDARD_BODY, system: true },
  { id: "ctpl-shortterm", nama: "Kontrak Jangka Pendek", body: SHORTTERM_BODY, system: true },
];

export const DEFAULT_CONTRACT_TEMPLATE_ID = SEED_CONTRACT_TEMPLATES[0].id;

// Build the {{placeholder}} -> value map for a contract row, with sensible
// fallbacks so older/thin rows still render. `tanggal` defaults to today when
// the row has no creation date.
export function contractValues(row: Row): Record<string, string> {
  const today = new Date();
  const tanggal = String(row.dibuat || `${today.getDate()} ${["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][today.getMonth()]} ${today.getFullYear()}`);
  return {
    nomor: String(row.nomor || "-"),
    tanggal,
    penyewa: String(row.penyewa || "-"),
    kontak: String(row.kontak || "-"),
    properti: String(row.properti || "-"),
    unit: String(row.unit || "-"),
    durasi: String(row.durasi || "-"),
    periode: String(row.periode || "-"),
    sewa: String(row.sewa || "-"),
    deposit: String(row.deposit || "-"),
    jadwalMasuk: String(row.jadwalMasuk || "-"),
    pemilik: CONTRACT_ORG.pemilik,
    organisasi: CONTRACT_ORG.organisasi,
  };
}

export function findContractTemplate(templates: ContractTemplate[], id: unknown): ContractTemplate | undefined {
  return templates.find(t => t.id === id) ?? templates.find(t => t.id === DEFAULT_CONTRACT_TEMPLATE_ID) ?? templates[0];
}
