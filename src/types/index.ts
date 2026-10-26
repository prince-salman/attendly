export type RoleType = 'admin' | 'guru_bk' | 'kepala_sekolah' | 'pengawas' | 'wali_kelas';

export type InstitutionType = 'SEKOLAH' | 'UNIVERSITAS';

export interface SchoolTenant {
  id: string;
  name: string;
  institutionType?: InstitutionType;
  logoUrl?: string;
  npsn: string; // NPSN for school or Kode PT for university
  address: string;
  phone: string;
  activationCode: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  licenseStatus: 'ACTIVE' | 'PENDING' | 'EXPIRED';
  licenseType: 'ENTERPRISE_SCHOOL' | 'PILOT_PROGRAM' | 'ENTERPRISE_CAMPUS';
  validUntil: string;
  maxStudents: number;
  registeredAt: string;
  gateCorridors: string[];
}

export interface UserProfile {
  id: string;
  schoolId?: string;
  name: string;
  role: RoleType;
  title: string;
  assignedClass?: string;
  nip?: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt?: string;
}

export const DEFAULT_ADMIN_USER: UserProfile = {
  id: 'user-admin',
  name: 'Rahmat Santoso, S.Kom',
  role: 'admin',
  title: 'Administrator Utama & IT Gate',
  nip: '19880315 201201 1 002',
  email: 'admin@harapan-nusantara.sch.id',
  phone: '0812-8899-7711'
};

export const PRESET_USERS: UserProfile[] = [
  DEFAULT_ADMIN_USER,
  {
    id: 'user-bk-default',
    name: 'Dra. Hj. Nurul Hidayati, M.Pd',
    role: 'guru_bk',
    title: 'Guru Bimbingan & Konseling (BK)',
    nip: '19750812 200003 2 001',
    email: 'bk@harapan-nusantara.sch.id',
    phone: '0812-4455-6677'
  },
  {
    id: 'user-kepsek-default',
    name: 'Drs. H. Bambang Sudarsono, M.Pd',
    role: 'kepala_sekolah',
    title: 'Kepala Sekolah',
    nip: '19680512 199303 1 004',
    email: 'kepsek@harapan-nusantara.sch.id',
    phone: '0811-2233-4455'
  },
  {
    id: 'user-pengawas-default',
    name: 'Dr. Ir. H. Achmad Syafi\'i, M.M',
    role: 'pengawas',
    title: 'Pengawas Pembina Sekolah (Dinas)',
    nip: '19650320 199002 1 003',
    email: 'pengawas@disdik.jakarta.go.id',
    phone: '0813-9988-7766'
  },
  {
    id: 'user-wali-10ipa1',
    name: 'Siti Nurhaliza, S.Pd',
    role: 'wali_kelas',
    title: 'Wali Kelas (10-IPA-1)',
    assignedClass: '10-IPA-1',
    nip: '19850214 201001 2 018',
    email: 'wali.10ipa1@harapan-nusantara.sch.id',
    phone: '0812-7788-9900'
  }
];

export interface Student {
  id: string;
  name: string;
  nickname?: string;
  class: string;
  gender: 'L' | 'P';
  parentName: string;
  parentPhone: string;
  photoUrl?: string | null;
  enrolledAt: string;
  consentCertified: boolean;
  consentDocId?: string;
  rfidCardId?: string;
  vectorPreview?: number[];
  faceDescriptor?: number[];
  faceDescriptors?: number[][]; // Multi-angle descriptors: frontal, left, right, downward
  lastSeen?: string;
}

export interface ActiveTrack {
  id: string;
  box: { x: number; y: number; w: number; h: number };
  lastSeen: number;
  studentId: string | null;
  studentName: string | null;
  studentNickname?: string | null;
  studentClass: string | null;
  isVerified: boolean;
  isAnonymous: boolean;
  confidence: string;
  framesMatched: number;
  missingFrames: number;
  matchStreak?: number;
  candidateStudentId?: string | null;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

export type AttendanceScanType = 'DATANG' | 'PULANG';

export type VerificationStatus = 'VERIFIED' | 'NEEDS_MANUAL_REVIEW' | 'MANUALLY_VERIFIED' | 'DISPUTED';

export interface AttendanceLog {
  id: string;
  studentId: string;
  studentName: string;
  photoUrl?: string | null;
  class: string;
  timestamp: string;
  dateString?: string;
  timeString?: string;
  method: string;
  confidence: string;
  confidenceScore?: number; // e.g. 0.85
  qualityScore?: string;
  processingNode?: string;
  storageStatus?: string;
  status: string;
  speed?: string;
  attendanceType?: AttendanceScanType; // 'DATANG' (Check-in/Masuk) or 'PULANG' (Check-out/Pulang)
  verificationStatus?: VerificationStatus;
  fallbackReason?: string;
  syncedToCloud?: boolean;
  manualVerifiedBy?: string;
  disputeNote?: string;
}

export interface WhatsAppLog {
  id: string;
  studentId: string;
  studentName: string;
  photoUrl?: string | null;
  parentName: string;
  parentPhone: string;
  messageType: 'Tepat Waktu' | 'Terlambat' | 'On Time' | 'Late' | 'Pulang' | 'Datang' | 'Koreksi Presensi' | 'On Time (Datang)' | 'Late (Terlambat)';
  timestamp: string;
  status?: string;
  content: string;
  attendanceType?: AttendanceScanType;
  isCorrection?: boolean;
  retryCount?: number;
  deliveryStatus?: 'DELIVERED' | 'PENDING' | 'FAILED' | 'REVISED';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'ALERT';
  ipAddress: string;
}

export interface RetentionSettings {
  autoPurgeDays: number;
  ephemeralRamTimeoutMs: number;
  auditTrailRetentionDays: number;
  lastRetentionSweep: string;
  storageEngine: string;
  anonymizedVectorEncryption: string;
}

export interface MatchResult {
  isMatch: boolean;
  isEnrolled: boolean;
  student: Student | null;
  confidence: number;
  status: 'MATCHED' | 'STRANGER' | 'LOW_QUALITY';
  message: string;
}

export interface FaceDetectionResult {
  isFace: boolean;
  score: number;
  box: { x: number; y: number; w: number; h: number };
  method: 'Native-FaceDetector' | 'Multi-Zone-Contrast' | 'None';
  metrics?: {
    eyeCavityContrast: number;
    noseBridgeHighlight: number;
    bilateralSymmetry: number;
    textureStdDev: number;
  };
}
