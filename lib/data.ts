export type Row = { id: string; [key: string]: string | number };

export const properties: Row[] = [
  { id: "p1", nama: "Kos Melati Residence", tipe: "Kos", lokasi: "Depok, Jawa Barat", unit: 24, terisi: 18, pendapatan: "Rp28.250.000", status: "Aktif", image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80", imageName: "kos-melati.jpg" },
  { id: "p2", nama: "Paviliun Cempaka", tipe: "Kontrakan", lokasi: "Jakarta Selatan", unit: 8, terisi: 7, pendapatan: "Rp21.000.000", status: "Aktif", image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80", imageName: "paviliun-cempaka.jpg" },
  { id: "p3", nama: "Ruko Wijaya", tipe: "Ruko", lokasi: "Bandung, Jawa Barat", unit: 12, terisi: 9, pendapatan: "Rp54.000.000", status: "Aktif", image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80", imageName: "ruko-wijaya.jpg" },
  { id: "p4", nama: "Apartemen Arunika", tipe: "Apartemen", lokasi: "Tangerang Selatan", unit: 16, terisi: 11, pendapatan: "Rp66.000.000", status: "Perlu perhatian", image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80", imageName: "apartemen-arunika.jpg" },
  { id: "p5", nama: "Ruko Dharmawangsa", tipe: "Ruko, Komersial", lokasi: "Jl. Dharmawangsa Raya No. 18, Jakarta Selatan", unit: 1, terisi: 1, pendapatan: "Rp18.000.000", status: "Aktif", alamat: "Jl. Dharmawangsa Raya No. 18, Jakarta Selatan", kontak: "Rendra Wijaya · 0812 5500 1840", contactName: "Rendra Wijaya", contactPhone: "0812 5500 1840", labels: "Ruko|Komersial", unitType: "Single unit", unitQty: 1, generatedUnits: "1", defaultPrice: 18000000, defaultDeposit: 36000000, billingCycle: "Bulanan", image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80", imageName: "ruko-dharmawangsa.jpg" },
  { id: "p6", nama: "Rumah Kontrakan Kenanga", tipe: "Kontrakan, Rumah", lokasi: "Jl. Kenanga Asri No. 8, Tangerang Selatan", unit: 1, terisi: 0, pendapatan: "Rp0", status: "Aktif", alamat: "Jl. Kenanga Asri No. 8, Tangerang Selatan", kontak: "Maya Prameswari · 0813 8872 4106", contactName: "Maya Prameswari", contactPhone: "0813 8872 4106", labels: "Kontrakan|Rumah", unitType: "Single unit", unitQty: 1, generatedUnits: "1", defaultPrice: 4500000, defaultDeposit: 4500000, billingCycle: "Bulanan", image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80", imageName: "kontrakan-kenanga.jpg" },
];

export const units: Row[] = [
  { id: "u101", unit: "101", tipe: "Standar", lantai: "1", penyewa: "Ahmad Fauzi", status: "Dihuni", sewa: "Rp1.200.000", deposit: "Rp1.200.000", tunggakan: "Rp0", meter: "5412 8801 1100", _propertiId: "p1" },
  { id: "u102", unit: "102", tipe: "Standar", lantai: "1", penyewa: "Siti Nurhaliza", status: "Dihuni", sewa: "Rp1.200.000", deposit: "Rp1.200.000", tunggakan: "Rp0", meter: "5412 9901 2255", _propertiId: "p1" },
  { id: "u103", unit: "103", tipe: "Deluxe", lantai: "1", penyewa: "Rizky Pratama", status: "Dihuni", sewa: "Rp1.500.000", deposit: "Rp1.500.000", tunggakan: "Rp350.000", meter: "5412 8821 7740", _propertiId: "p1" },
  { id: "u104", unit: "104", tipe: "Standar", lantai: "1", penyewa: "M. Iqbal Maulana", status: "Dipesan", sewa: "Rp1.200.000", deposit: "Rp1.200.000", tunggakan: "Rp0", meter: "5412 7733 0044", _propertiId: "p1" },
  { id: "u201", unit: "201", tipe: "Standar", lantai: "2", penyewa: "Nadia Putri", status: "Akan kosong", sewa: "Rp1.200.000", deposit: "Rp1.200.000", tunggakan: "Rp0", meter: "5412 6612 8899", _propertiId: "p1" },
  { id: "u202", unit: "202", tipe: "Deluxe", lantai: "2", penyewa: "Belum ada", status: "Perawatan", sewa: "Rp1.500.000", deposit: "Rp1.500.000", tunggakan: "Rp0", meter: "5412 5500 3311", _propertiId: "p1" },
  { id: "u203", unit: "203", tipe: "Standar", lantai: "2", penyewa: "Dewi Lestari", status: "Dihuni", sewa: "Rp1.200.000", deposit: "Rp1.200.000", tunggakan: "Rp0", meter: "5412 4422 1166", _propertiId: "p1" },
];

export const moduleData: Record<string, Row[]> = {
  tenants: [
    { id: "t1", nama: "Ahmad Fauzi", telepon: "0812 3456 7890", email: "ahmad.fauzi@email.com", nomorIdentitas: "3273011203950007", gambarIdentitas: "/ktp-placeholder.svg", kontakDarurat: "Nur Aisyah", teleponDarurat: "0812 9911 2200", unit: "Melati 101", sejak: "1 Mar 2025", periodeSewa: "1 Mar 2025 - 28 Feb 2026", status: "Aktif" },
    { id: "t2", nama: "Siti Nurhaliza", telepon: "0813 7721 4410", email: "siti.nurhaliza@email.com", nomorIdentitas: "3276025002960004", gambarIdentitas: "/ktp-placeholder.svg", kontakDarurat: "Budi Hermawan", teleponDarurat: "0813 2244 8801", unit: "Melati 102", sejak: "10 Feb 2025", periodeSewa: "10 Feb 2025 - 9 Feb 2026", status: "Aktif" },
    { id: "t3", nama: "M. Iqbal Maulana", telepon: "0819 8802 3104", email: "iqbal.maulana@email.com", nomorIdentitas: "3273052707980003", gambarIdentitas: "/ktp-placeholder.svg", kontakDarurat: "Hendra Maulana", teleponDarurat: "0819 1102 3304", unit: "Melati 104", sejak: "", periodeSewa: "", status: "Dipesan" },
    { id: "t4", nama: "Rani Oktaviani", telepon: "0812 7704 1189", email: "rani.oktaviani@email.com", nomorIdentitas: "3276015504000008", gambarIdentitas: "/ktp-placeholder.svg", kontakDarurat: "Dedi Oktavian", teleponDarurat: "0812 3340 9921", status: "Belum ada sewa" },
  ],
  reservations: [
    { id: "r1", kode: "RSV-2025-001", penyewa: "Ahmad Fauzi", properti: "Kos Melati Residence", unit: "Melati 101", durasi: "12 bulan", sewa: "Rp1.200.000", deposit: "Rp1.200.000", jadwalMasuk: "1 Jul 2025", periode: "Jul 2025 - Jun 2026", jadwalKeluar: "", status: "Aktif" },
    { id: "r2", kode: "RSV-2026-014", penyewa: "M. Iqbal Maulana", properti: "Kos Melati Residence", unit: "Melati 104", durasi: "12 bulan", sewa: "Rp1.200.000", deposit: "Rp1.200.000", jadwalMasuk: "", periode: "", jadwalKeluar: "", status: "Booking" },
    { id: "r3", kode: "RSV-2024-009", penyewa: "Nadia Putri", properti: "Kos Melati Residence", unit: "Melati 201", durasi: "12 bulan", sewa: "Rp1.200.000", deposit: "Rp1.200.000", jadwalMasuk: "1 Jul 2024", periode: "Jul 2024 - Jun 2025", jadwalKeluar: "30 Jun 2025", status: "Tidak Aktif" },
  ],
  tokens: [
    { id: "pln1", pelanggan: "Siti Nurhaliza", unit: "102", meter: "5412 9901 2255", nominal: "Rp100.000", biaya: "Rp3.000", status: "Token Siap", _unitId: "u102" },
    { id: "pln2", pelanggan: "Rizky Pratama", unit: "103", meter: "5412 8821 7740", nominal: "Rp50.000", biaya: "Rp3.000", status: "Dikonfirmasi", _unitId: "u103" },
  ],
  contracts: [
    { id: "k1", nomor: "KTR-2025-031", penyewa: "Ahmad Fauzi", unit: "Melati 101", dibuat: "25 Feb 2025", status: "Ditandatangani" },
    { id: "k2", nomor: "KTR-2025-044", penyewa: "M. Iqbal Maulana", unit: "Melati 104", dibuat: "20 Jun 2025", status: "Draf" },
  ],
  tickets: [
    { id: "x1", tiket: "TKT-0182", judul: "AC kamar tidak dingin", properti: "Kos Melati Residence", unit: "202", penyewa: "Siti Nurhaliza", telepon: "0813 7721 4410", masalah: "AC menyala tetapi **tidak mengeluarkan udara dingin** sejak semalam.\n\n- Suara unit outdoor lebih keras\n- Sudah mencoba mematikan listrik selama 10 menit", bukti: "", vendor: "CV Sejuk Abadi", status: "Ditugaskan", createdAt: "2026-06-18T08:35:00+07:00", assignedAt: "2026-06-18T10:10:00+07:00" },
    { id: "x2", tiket: "TKT-0181", judul: "Keran wastafel terus bocor", properti: "Kos Melati Residence", unit: "103", penyewa: "Rizky Pratama", telepon: "0812 9012 4431", masalah: "Air menetes terus dari sambungan bawah wastafel dan mulai membasahi kabinet.", bukti: "", vendor: "Belum ditugaskan", status: "Baru", createdAt: "2026-06-22T09:15:00+07:00", assignedAt: "" },
    { id: "x3", tiket: "TKT-0179", judul: "Pintu kamar mandi sulit ditutup", properti: "Paviliun Cempaka", unit: "A-03", penyewa: "Nadia Putri", telepon: "0812 5540 7788", masalah: "Daun pintu memuai dan bergesekan dengan kusen bagian bawah.", bukti: "", vendor: "Bengkel Kayu Maju", status: "Dikerjakan", createdAt: "2026-06-16T14:20:00+07:00", assignedAt: "2026-06-17T08:40:00+07:00" },
    { id: "x4", tiket: "TKT-0178", judul: "Lampu koridor mati", properti: "Kos Melati Residence", unit: "Lantai 2", penyewa: "Area bersama", telepon: "-", masalah: "Tiga lampu koridor tidak menyala. Teknisi sudah mengganti driver dan menguji seluruh titik.", bukti: "", vendor: "Teknik Jaya", status: "Selesai", createdAt: "2026-06-12T11:05:00+07:00", assignedAt: "2026-06-12T13:30:00+07:00" },
  ],
  documents: [
    { id: "d1", nama: "Kontrak Ahmad Fauzi.pdf", kategori: "Kontrak", terkait: "Ahmad Fauzi", diperbarui: "25 Feb 2025", status: "Terverifikasi" },
    { id: "d2", nama: "KTP Siti Nurhaliza.jpg", kategori: "Identitas", terkait: "Siti Nurhaliza", diperbarui: "10 Feb 2025", status: "Privat" },
  ],
};

export const invoices: Row[] = [
  { id: "INV-0625-0078", penyewa: "Rizky Pratama", unit: "Melati 103", periode: "Juni 2025", jatuhTempo: "5 Jun 2025", total: "Rp1.550.000", sisa: "Rp350.000", status: "Terlambat" },
  { id: "INV-0625-0075", penyewa: "Nadia Putri", unit: "Melati 201", periode: "Juni 2025", jatuhTempo: "7 Jun 2025", total: "Rp1.200.000", sisa: "Rp1.200.000", status: "Terlambat" },
  { id: "INV-0625-0090", penyewa: "Ahmad Fauzi", unit: "Melati 101", periode: "Juli 2025", jatuhTempo: "5 Jul 2025", total: "Rp1.200.000", sisa: "Rp1.200.000", status: "Jatuh tempo" },
  { id: "INV-0625-0091", penyewa: "Siti Nurhaliza", unit: "Melati 102", periode: "Juli 2025", jatuhTempo: "5 Jul 2025", total: "Rp1.200.000", sisa: "Rp1.200.000", status: "Belum dibayar" },
  { id: "INV-0525-0062", penyewa: "Dewi Lestari", unit: "Melati 203", periode: "Mei 2025", jatuhTempo: "5 Mei 2025", total: "Rp1.200.000", sisa: "Rp0", status: "Lunas" },
];
