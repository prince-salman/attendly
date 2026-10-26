// Mock data for School Walk-Through Face Recognition Privacy Dashboard
import { Student, AttendanceLog, AuditLog, WhatsAppLog, RoleType, SchoolTenant } from '../types';

export const REGISTERED_SCHOOLS: SchoolTenant[] = [
  {
    id: 'SCH-001',
    name: 'SMA Harapan Nusantara Jakarta',
    institutionType: 'SEKOLAH',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%2310B981"/><circle cx="50" cy="50" r="41" fill="%23064E3B"/><polygon points="50,22 72,40 72,66 50,82 28,66 28,40" fill="%2334D399"/><text x="50" y="58" font-size="16" font-weight="900" fill="%23022C22" text-anchor="middle" font-family="sans-serif">HN</text></svg>',
    npsn: '20108842',
    address: 'Jl. Merdeka Selatan No. 45, Gambir, Jakarta Pusat',
    phone: '021-3849102',
    activationCode: 'ATND-SMAN1-7892-K4F9',
    adminName: 'Rahmat Santoso, S.Kom',
    adminEmail: 'admin@harapan-nusantara.sch.id',
    adminPhone: '0812-8899-7711',
    licenseStatus: 'ACTIVE',
    licenseType: 'ENTERPRISE_SCHOOL',
    validUntil: '31 Desember 2026',
    maxStudents: 1500,
    registeredAt: '01 Januari 2026',
    gateCorridors: ['Gate Corridor 01 (Utama)', 'Gate Corridor 02 (Timur)']
  },
  {
    id: 'UNIV-001',
    name: 'Institut Teknologi Sepuluh Nopember (ITS)',
    institutionType: 'UNIVERSITAS',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23013880"/><circle cx="50" cy="50" r="41" fill="none" stroke="%23FBBF24" stroke-width="4"/><polygon points="50,18 60,38 82,38 64,52 71,74 50,60 29,74 36,52 18,38 40,38" fill="%23FBBF24"/><text x="50" y="90" font-size="13" font-weight="900" fill="%23FFFFFF" text-anchor="middle" font-family="sans-serif">ITS</text></svg>',
    npsn: '001004',
    address: 'Kampus ITS Sukolilo, Keputih, Kec. Sukolilo, Surabaya 60111',
    phone: '031-5994251',
    activationCode: 'ATND-ITS-1960-X7K2',
    adminName: 'Prof. Dr. Ir. Mochamad Ashari, M.Eng',
    adminEmail: 'rektorat@its.ac.id',
    adminPhone: '0811-3200-1960',
    licenseStatus: 'ACTIVE',
    licenseType: 'ENTERPRISE_CAMPUS',
    validUntil: '31 Desember 2028',
    maxStudents: 25000,
    registeredAt: '10 November 2025',
    gateCorridors: ['Gate Rektorat ITS', 'Gate Teknik Informatika', 'Gate Bundaran Utama']
  },
  {
    id: 'UNIV-002',
    name: 'Universitas Indonesia (UI)',
    institutionType: 'UNIVERSITAS',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23F59E0B"/><circle cx="50" cy="50" r="41" fill="%230F172A"/><circle cx="50" cy="50" r="28" fill="%23FBBF24"/><text x="50" y="57" font-size="20" font-weight="900" fill="%230F172A" text-anchor="middle" font-family="sans-serif">UI</text><text x="50" y="86" font-size="8" font-weight="bold" fill="%23FBBF24" text-anchor="middle" font-family="sans-serif">VERITAS</text></svg>',
    npsn: '001002',
    address: 'Jl. Margonda Raya, Pondok Cina, Kota Depok, Jawa Barat 16424',
    phone: '021-7867222',
    activationCode: 'ATND-UNIV-1849-V9A1',
    adminName: 'Dr. Ir. Hendri D.S. Budiono, M.Eng',
    adminEmail: 'it-center@ui.ac.id',
    adminPhone: '0812-1849-0001',
    licenseStatus: 'ACTIVE',
    licenseType: 'ENTERPRISE_CAMPUS',
    validUntil: '31 Desember 2028',
    maxStudents: 35000,
    registeredAt: '02 Februari 2026',
    gateCorridors: ['Gate Balairung UI', 'Gate Fakultas Teknik', 'Gate Stasiun UI']
  },
  {
    id: 'SCH-002',
    name: 'SMA Negeri 5 Surabaya',
    institutionType: 'SEKOLAH',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%232563EB"/><circle cx="50" cy="50" r="41" fill="%231E3A8A"/><polygon points="50,22 72,40 72,66 50,82 28,66 28,40" fill="%2360A5FA"/><text x="50" y="58" font-size="16" font-weight="900" fill="%230F172A" text-anchor="middle" font-family="sans-serif">S5</text></svg>',
    npsn: '20532210',
    address: 'Jl. Kusuma Bangsa No. 21, Genteng, Surabaya',
    phone: '031-5345152',
    activationCode: 'ATND-SMAN5-3312-M7Q1',
    adminName: 'Drs. Budi Setiawan, M.T',
    adminEmail: 'admin@sman5surabaya.sch.id',
    adminPhone: '0813-3344-5566',
    licenseStatus: 'ACTIVE',
    licenseType: 'ENTERPRISE_SCHOOL',
    validUntil: '31 Desember 2026',
    maxStudents: 1200,
    registeredAt: '15 Januari 2026',
    gateCorridors: ['Gate Gerbang Depan', 'Gate Lapangan Barat']
  },
  {
    id: 'SCH-003',
    name: 'SMK Telkom Malang',
    institutionType: 'SEKOLAH',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23DC2626"/><circle cx="50" cy="50" r="41" fill="%237F1D1D"/><circle cx="50" cy="50" r="26" fill="%23FCA5A5"/><text x="50" y="58" font-size="16" font-weight="900" fill="%23450A0A" text-anchor="middle" font-family="sans-serif">TS</text></svg>',
    npsn: '20533814',
    address: 'Jl. Danau Ranau, Sawojajar, Kota Malang',
    phone: '0341-712500',
    activationCode: 'ATND-TELK-9041-W2Z8',
    adminName: 'Farhan Maulana, S.T',
    adminEmail: 'it.admin@smktelkom-mlg.sch.id',
    adminPhone: '0811-3652-9901',
    licenseStatus: 'ACTIVE',
    licenseType: 'ENTERPRISE_SCHOOL',
    validUntil: '31 Desember 2026',
    maxStudents: 1800,
    registeredAt: '01 Februari 2026',
    gateCorridors: ['Gate Gerbang Utama', 'Gate Gedung Kejuruan']
  }
];

export function generateActivationCode(schoolAbbr = 'SCH'): string {
  const cleanAbbr = schoolAbbr.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) || 'SCH';
  const numPart = Math.floor(1000 + Math.random() * 9000);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randSuffix = '';
  for (let i = 0; i < 4; i++) {
    randSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ATND-${cleanAbbr}-${numPart}-${randSuffix}`;
}

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'NIS-2024701',
    name: 'valen',
    nickname: 'valen',
    class: '10-IPA-1',
    gender: 'L',
    parentName: 'edderjh',
    parentPhone: '0812-58888',
    enrolledAt: '19 Okt 2026, 06:30 WIB',
    consentCertified: true
  },
  {
    id: 'NIS-2024152',
    name: 'Tegar Pratama',
    nickname: 'Tegar',
    class: '10-IPA-1',
    gender: 'L',
    parentName: 'Bpk. Tegar Santoso',
    parentPhone: '0813-7722-1144',
    enrolledAt: '19 Okt 2026, 06:32 WIB',
    consentCertified: true
  },
  {
    id: 'NIS-2024103',
    name: 'Ahmad Fauzi',
    nickname: 'Fauzi',
    class: '10-IPA-1',
    gender: 'L',
    parentName: 'Bpk. Hendra Fauzi',
    parentPhone: '0812-3344-5566',
    enrolledAt: '19 Okt 2026, 06:35 WIB',
    consentCertified: true
  },
  {
    id: 'NIS-2024104',
    name: 'Siti Rahmania',
    nickname: 'Rahma',
    class: '10-IPA-2',
    gender: 'P',
    parentName: 'Ibu Marlina Rahma',
    parentPhone: '0813-9988-7711',
    enrolledAt: '19 Okt 2026, 06:38 WIB',
    consentCertified: true
  },
  {
    id: 'NIS-2024105',
    name: 'Budi Pratama',
    nickname: 'Budi',
    class: '10-IPA-2',
    gender: 'L',
    parentName: 'Bpk. Agus Pratama',
    parentPhone: '0811-2233-4455',
    enrolledAt: '19 Okt 2026, 06:40 WIB',
    consentCertified: true
  },
  {
    id: 'NIS-2024106',
    name: 'Nadia Putri',
    nickname: 'Nadia',
    class: '10-IPS-1',
    gender: 'P',
    parentName: 'Ibu Ratna Dewi',
    parentPhone: '0812-6677-8899',
    enrolledAt: '19 Okt 2026, 06:42 WIB',
    consentCertified: true
  },
  {
    id: 'NIS-2024107',
    name: 'Dimas Wahyu',
    nickname: 'Dimas',
    class: '10-IPS-1',
    gender: 'L',
    parentName: 'Bpk. Bambang Wahyu',
    parentPhone: '0813-4455-6677',
    enrolledAt: '19 Okt 2026, 06:45 WIB',
    consentCertified: true
  },
  {
    id: 'NIS-2024108',
    name: 'Dewi Anggraini',
    nickname: 'Dewi',
    class: '11-IPA-1',
    gender: 'P',
    parentName: 'Ibu Endang Sri',
    parentPhone: '0812-1122-3344',
    enrolledAt: '19 Okt 2026, 06:48 WIB',
    consentCertified: true
  },
  {
    id: 'NIS-2024109',
    name: 'Rizky Ramadhan',
    nickname: 'Rizky',
    class: '12-IPA-1',
    gender: 'L',
    parentName: 'Bpk. Iwan Setiawan',
    parentPhone: '0813-5566-7788',
    enrolledAt: '19 Okt 2026, 06:50 WIB',
    consentCertified: true
  }
];

export const INITIAL_ATTENDANCE_LOGS: AttendanceLog[] = [
  {
    id: 'ATT-2024109-01',
    studentId: 'NIS-2024109',
    studentName: 'Rizky Ramadhan',
    class: '12-IPA-1',
    timestamp: '20/10/2026, 06.35.12',
    dateString: '2026-10-20',
    status: 'On Time (Tepat Waktu)',
    method: 'Walk-Through (1.3 m/s)',
    confidence: '98.8%',
    confidenceScore: 98.8,
    verificationStatus: 'VERIFIED',
    speed: '1.3 m/s',
    attendanceType: 'DATANG',
    syncedToCloud: true,
    storageStatus: 'Supabase Cloud Sync'
  },
  {
    id: 'ATT-2024104-01',
    studentId: 'NIS-2024104',
    studentName: 'Siti Rahmania',
    class: '10-IPA-2',
    timestamp: '20/10/2026, 06.42.05',
    dateString: '2026-10-20',
    status: 'On Time (Tepat Waktu)',
    method: 'Walk-Through (1.2 m/s)',
    confidence: '99.1%',
    confidenceScore: 99.1,
    verificationStatus: 'VERIFIED',
    speed: '1.2 m/s',
    attendanceType: 'DATANG',
    syncedToCloud: true,
    storageStatus: 'Supabase Cloud Sync'
  },
  {
    id: 'ATT-2024701-01',
    studentId: 'NIS-2024701',
    studentName: 'valen',
    class: '10-IPA-1',
    timestamp: '20/10/2026, 06.45.18',
    dateString: '2026-10-20',
    status: 'On Time (Tepat Waktu)',
    method: 'Walk-Through (1.3 m/s)',
    confidence: '97.4%',
    confidenceScore: 97.4,
    verificationStatus: 'VERIFIED',
    speed: '1.3 m/s',
    attendanceType: 'DATANG',
    syncedToCloud: true,
    storageStatus: 'Supabase Cloud Sync'
  },
  {
    id: 'ATT-2024106-01',
    studentId: 'NIS-2024106',
    studentName: 'Nadia Putri',
    class: '10-IPS-1',
    timestamp: '20/10/2026, 06.50.40',
    dateString: '2026-10-20',
    status: 'On Time (Tepat Waktu)',
    method: 'Walk-Through (1.4 m/s)',
    confidence: '98.5%',
    confidenceScore: 98.5,
    verificationStatus: 'VERIFIED',
    speed: '1.4 m/s',
    attendanceType: 'DATANG',
    syncedToCloud: true,
    storageStatus: 'Supabase Cloud Sync'
  },
  {
    id: 'ATT-2024103-01',
    studentId: 'NIS-2024103',
    studentName: 'Ahmad Fauzi',
    class: '10-IPA-1',
    timestamp: '20/10/2026, 06.54.22',
    dateString: '2026-10-20',
    status: 'On Time (Tepat Waktu)',
    method: 'Walk-Through (1.3 m/s)',
    confidence: '96.2%',
    confidenceScore: 96.2,
    verificationStatus: 'VERIFIED',
    speed: '1.3 m/s',
    attendanceType: 'DATANG',
    syncedToCloud: true,
    storageStatus: 'Supabase Cloud Sync'
  },
  {
    id: 'ATT-2024152-01',
    studentId: 'NIS-2024152',
    studentName: 'Tegar Pratama',
    class: '10-IPA-1',
    timestamp: '20/10/2026, 07.06.15',
    dateString: '2026-10-20',
    status: 'Late (Terlambat)',
    method: 'Walk-Through (1.1 m/s)',
    confidence: '95.6%',
    confidenceScore: 95.6,
    verificationStatus: 'VERIFIED',
    speed: '1.1 m/s',
    attendanceType: 'DATANG',
    syncedToCloud: true,
    storageStatus: 'Supabase Cloud Sync'
  },
  {
    id: 'ATT-2024107-01',
    studentId: 'NIS-2024107',
    studentName: 'Dimas Wahyu',
    class: '10-IPS-1',
    timestamp: '20/10/2026, 07.12.30',
    dateString: '2026-10-20',
    status: 'Late (Terlambat)',
    method: 'MANUAL_FALLBACK',
    fallbackReason: 'Wajah Tertutup Masker / Aksesori',
    confidence: '100% (Manual)',
    confidenceScore: 100,
    verificationStatus: 'MANUALLY_VERIFIED',
    manualVerifiedBy: 'Rahmat Santoso, S.Kom',
    speed: 'Manual Kiosk',
    attendanceType: 'DATANG',
    syncedToCloud: true,
    storageStatus: 'Supabase Cloud Sync'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'AUD-89101',
    timestamp: '20/10/2026, 06.30 WIB',
    actor: 'IT & System Administrator',
    role: 'admin',
    action: 'GATE_TERMINAL_ONLINE',
    details: 'Terminal gerbang biometrik 01 (Utama) aktif dan terhubung ke edge InsightFace.',
    status: 'SUCCESS',
    ipAddress: '192.168.10.15 (Edge Terminal)'
  }
];

export const INITIAL_WHATSAPP_LOGS: WhatsAppLog[] = [
  {
    id: 'WA-2024104-01',
    studentId: 'NIS-2024104',
    studentName: 'Siti Rahmania',
    parentName: 'Ibu Marlina Rahma',
    parentPhone: '0813-9988-7711',
    timestamp: '20/10/2026, 06.42.06',
    messageType: 'On Time (Datang)',
    deliveryStatus: 'DELIVERED',
    content: '🏛️ *SMA HARAPAN NUSANTARA JAKARTA*\n_Sistem Presensi Biometrik Wajah (Attendly)_\n\nYth. Orang Tua/Wali dari *Ibu Marlina Rahma*,\nKami menginformasikan bahwa ananda *Siti Rahmania* (Kelas 10-IPA-2) telah *HADIR MASUK (DATANG)* di gerbang sekolah.\n\n⏰ Waktu Datang: *06.42 WIB*\n📍 Lokasi: *Gate Terminal Utama*\n⚡ Status: *Tepat Waktu*\n_Catatan: Data kehadiran telah tersimpan aman._'
  },
  {
    id: 'WA-2024701-01',
    studentId: 'NIS-2024701',
    studentName: 'valen',
    parentName: 'edderjh',
    parentPhone: '0812-58888',
    timestamp: '20/10/2026, 06.45.19',
    messageType: 'On Time (Datang)',
    deliveryStatus: 'DELIVERED',
    content: '🏛️ *SMA HARAPAN NUSANTARA JAKARTA*\n_Sistem Presensi Biometrik Wajah (Attendly)_\n\nYth. Orang Tua/Wali dari *edderjh*,\nKami menginformasikan bahwa ananda *valen* (Kelas 10-IPA-1) telah *HADIR MASUK (DATANG)* di gerbang sekolah.\n\n⏰ Waktu Datang: *06.45 WIB*\n📍 Lokasi: *Gate Terminal Utama*\n⚡ Status: *Tepat Waktu*\n_Catatan: Data kehadiran telah tersimpan aman._'
  },
  {
    id: 'WA-2024106-01',
    studentId: 'NIS-2024106',
    studentName: 'Nadia Putri',
    parentName: 'Ibu Ratna Dewi',
    parentPhone: '0812-6677-8899',
    timestamp: '20/10/2026, 06.50.41',
    messageType: 'On Time (Datang)',
    deliveryStatus: 'DELIVERED',
    content: '🏛️ *SMA HARAPAN NUSANTARA JAKARTA*\n_Sistem Presensi Biometrik Wajah (Attendly)_\n\nYth. Orang Tua/Wali dari *Ibu Ratna Dewi*,\nKami menginformasikan bahwa ananda *Nadia Putri* (Kelas 10-IPS-1) telah *HADIR MASUK (DATANG)* di gerbang sekolah.\n\n⏰ Waktu Datang: *06.50 WIB*\n📍 Lokasi: *Gate Terminal Utama*\n⚡ Status: *Tepat Waktu*\n_Catatan: Data kehadiran telah tersimpan aman._'
  },
  {
    id: 'WA-2024152-01',
    studentId: 'NIS-2024152',
    studentName: 'Tegar Pratama',
    parentName: 'Bpk. Tegar Santoso',
    parentPhone: '0813-7722-1144',
    timestamp: '20/10/2026, 07.06.16',
    messageType: 'Late (Terlambat)',
    deliveryStatus: 'DELIVERED',
    content: '🏛️ *SMA HARAPAN NUSANTARA JAKARTA*\n_Sistem Presensi Biometrik Wajah (Attendly)_\n\nYth. Orang Tua/Wali dari *Bpk. Tegar Santoso*,\nKami menginformasikan bahwa ananda *Tegar Pratama* (Kelas 10-IPA-1) telah *HADIR MASUK (DATANG)* di gerbang sekolah.\n\n⏰ Waktu Datang: *07.06 WIB*\n📍 Lokasi: *Gate Terminal Utama*\n⚡ Status: *Terlambat (Melewati batas 07:00 WIB)*\n_Catatan: Data kehadiran telah diteruskan ke Guru BK._'
  }
];

export interface RoleConfigItem {
  id: RoleType;
  name: string;
  roleTag: string;
  description: string;
  canViewBiometrics: boolean;
  canConfigureRetention: boolean;
  canViewAudit: boolean;
  classScope: string;
}

export const ROLE_CONFIGS: Record<RoleType, RoleConfigItem> = {
  admin: {
    id: 'admin',
    name: 'IT & System Administrator',
    roleTag: 'Full System Access',
    description: 'Akses administratif penuh: Terminal gerbang, perekaman biometrik wajah siswa, rekapitulasi presensi, otomasi WhatsApp, serta manajemen akun staf sekolah.',
    canViewBiometrics: true,
    canConfigureRetention: true,
    canViewAudit: true,
    classScope: 'ALL'
  },
  guru_bk: {
    id: 'guru_bk',
    name: 'Guru Bimbingan Konseling (BK)',
    roleTag: 'Konseling & Kedisiplinan',
    description: 'Akses bimbingan konseling: Pemantauan siswa terlambat dan alpa, pembuatan tindak lanjut konseling, serta koordinasi komunikasi dengan orang tua/wali murid.',
    canViewBiometrics: false,
    canConfigureRetention: false,
    canViewAudit: false,
    classScope: 'ALL'
  },
  kepala_sekolah: {
    id: 'kepala_sekolah',
    name: 'Kepala Sekolah / Rektor',
    roleTag: 'Executive & Pengesahan',
    description: 'Dashboard eksekutif: Monitoring kehadiran sekolah real-time, evaluasi persentase per kelas, dan pengesahan resmi laporan kehadiran bulanan (PDF).',
    canViewBiometrics: false,
    canConfigureRetention: false,
    canViewAudit: true,
    classScope: 'ALL'
  },
  pengawas: {
    id: 'pengawas',
    name: 'Pengawas Sekolah / Dinas',
    roleTag: 'Audit & Standar Akreditasi',
    description: 'Akses audit pengawas: Evaluasi kepatuhan standar nasional pendidikan, inspeksi tingkat kehadiran makro sekolah, dan verifikasi integritas data akreditasi.',
    canViewBiometrics: false,
    canConfigureRetention: false,
    canViewAudit: true,
    classScope: 'ALL'
  },
  wali_kelas: {
    id: 'wali_kelas',
    name: 'Wali Kelas',
    roleTag: 'Kelas Binaan',
    description: 'Akses kelas binaan: Memantau kehadiran siswa di kelas yang diampu, ekspor laporan rekap kehadiran kelas, dan melihat status notifikasi orang tua.',
    canViewBiometrics: false,
    canConfigureRetention: false,
    canViewAudit: false,
    classScope: 'ASSIGNED'
  }
};

export const RETENTION_SETTINGS = {
  logRetentionDays: 180,
  autoPurgeAlumniVectors: true,
  instantPurgeOnRevoke: true,
  zeroDiskWriteEnforced: true,
  lastAutoCleanup: "10 Okt 2026, 00:00 WIB",
  nextScheduledCleanup: "17 Okt 2026, 00:00 WIB",
  diskUsageForImages: "0 KB (Zero Image Storage Policy Active)",
  ramEphemeralCacheTimeMs: 15
};
