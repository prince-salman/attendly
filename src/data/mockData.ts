// Mock data for School Walk-Through Face Recognition Privacy Dashboard
import { Student, AttendanceLog, AuditLog, WhatsAppLog, RoleType } from '../types';

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_ATTENDANCE_LOGS: AttendanceLog[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_WHATSAPP_LOGS: WhatsAppLog[] = [];

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
    name: 'Administrator IT',
    roleTag: 'Full System Access',
    description: 'Akses penuh arsitektur sistem, pengelolaan perangkat Edge, kebijakan retensi data, dan audit trail.',
    canViewBiometrics: false,
    canConfigureRetention: true,
    canViewAudit: true,
    classScope: 'ALL'
  },
  wali_kelas: {
    id: 'wali_kelas',
    name: 'Wali Kelas (10-IPA-1)',
    roleTag: 'Class Scope Only',
    description: 'Khusus memantau kehadiran siswa kelas binaannya, rekap izin/sakit, dan status broadcast WA ke wali murid.',
    canViewBiometrics: false,
    canConfigureRetention: false,
    canViewAudit: false,
    classScope: '10-IPA-1'
  },
  guru_piket: {
    id: 'guru_piket',
    name: 'Guru Piket Gerbang',
    roleTag: 'Gate Monitor & Tardiness',
    description: 'Memantau gerbang masuk real-time, mendata siswa terlambat, memberikan izin masuk kelas, dan trigger WA keterlambatan.',
    canViewBiometrics: false,
    canConfigureRetention: false,
    canViewAudit: false,
    classScope: 'ALL'
  },
  kepala_sekolah: {
    id: 'kepala_sekolah',
    name: 'Kepala Sekolah',
    roleTag: 'Executive Overview',
    description: 'Dashboard eksekutif makro: statistik kehadiran seluruh sekolah %, grafik komparasi angkatan, dan laporan kepatuhan UU PDP.',
    canViewBiometrics: false,
    canConfigureRetention: false,
    canViewAudit: false,
    classScope: 'ALL'
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
