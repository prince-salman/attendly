export type RoleType = 'admin' | 'wali_kelas' | 'guru_piket' | 'kepala_sekolah';

export interface Student {
  id: string;
  name: string;
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
  studentClass: string | null;
  isVerified: boolean;
  isAnonymous: boolean;
  confidence: string;
  framesMatched: number;
  missingFrames: number;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

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
  qualityScore: string;
  processingNode: string;
  storageStatus: string;
  status: string;
  speed: string;
}

export interface WhatsAppLog {
  id: string;
  studentId: string;
  studentName: string;
  photoUrl?: string | null;
  parentName: string;
  parentPhone: string;
  messageType: 'Tepat Waktu' | 'Terlambat';
  timestamp: string;
  status: string;
  content: string;
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
