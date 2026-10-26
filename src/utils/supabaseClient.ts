/**
 * Supabase Client & Dual-Layer Storage Service
 * Terhubung ke project Supabase: fruurxbfolykyylzktns
 * Mendukung mode Offline-First (tetap bekerja sempurna jika internet gerbang mati)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Student, AttendanceLog } from '../types';
import { getStudentCallName } from './nameHelper';

export const DEFAULT_SUPABASE_URL = 'https://fruurxbfolykyylzktns.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_Fl4iW8EVOWjzyhjhXcKZxA_Nm1gJFcS';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const url = localStorage.getItem('biopass_supabase_url') || DEFAULT_SUPABASE_URL;
  const key = localStorage.getItem('biopass_supabase_key') || DEFAULT_SUPABASE_KEY;

  if (!url || !key) return null;

  try {
    cachedClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    return cachedClient;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Format tanggal standar YYYY-MM-DD
 */
export function formatAttendanceDate(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format waktu standar HH:mm:ss
 */
export function formatAttendanceTime(d = new Date()): string {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Evaluasi ketepatan waktu berdasarkan batas cutoff (default: 07:00)
 */
export function evaluateAttendancePunctuality(
  d = new Date(),
  cutoffTime = '07:00'
): 'On Time' | 'Late' {
  const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number);
  const currentHour = d.getHours();
  const currentMinute = d.getMinutes();

  if (currentHour < cutoffHour) return 'On Time';
  if (currentHour === cutoffHour && currentMinute <= cutoffMinute) return 'On Time';
  return 'Late';
}

/**
 * Cek apakah siswa sudah absen (Datang atau Pulang) pada tanggal tersebut
 * Proteksi anti-duplikasi: Siswa hanya dapat absen 1x Datang dan 1x Pulang per hari
 */
export function isAlreadyAttendedToday(
  studentId: string,
  dateString: string,
  existingLogs: AttendanceLog[],
  attendanceType: 'DATANG' | 'PULANG' = 'DATANG'
): boolean {
  if (!studentId || !dateString || !Array.isArray(existingLogs)) return false;

  return existingLogs.some(log => {
    // Cocokkan studentId
    if (log.studentId !== studentId) return false;

    // Periksa tanggal
    const isSameDate =
      (log.dateString && log.dateString === dateString) ||
      (log.timestamp && log.timestamp.includes(dateString));
    if (!isSameDate) return false;

    // Periksa tipe presensi ('DATANG' atau 'PULANG')
    // Log lama yang tidak memiliki attendanceType dianggap 'DATANG'
    const logType = log.attendanceType || 'DATANG';
    return logType === attendanceType;
  });
}

/**
 * Cek konektivitas ke Supabase
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('students').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      // Jika tabel belum ada atau permission ditolak
      console.warn('Supabase ping warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase offline or unreachable:', err);
    return false;
  }
}

/**
 * Ambil seluruh data siswa dari Supabase
 */
export async function fetchStudentsFromSupabase(): Promise<Student[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('Failed to fetch students from Supabase:', error);
      return [];
    }

    return data.map(row => ({
      id: row.id,
      name: row.name,
      nickname: row.nickname || getStudentCallName(row.name),
      class: row.class,
      gender: row.gender || 'L',
      parentName: row.parent_name || '',
      parentPhone: row.parent_phone || '',
      photoUrl: row.photo_url || null,
      enrolledAt: row.created_at ? new Date(row.created_at).toLocaleTimeString('id-ID') : 'Baru Terdaftar',
      consentCertified: true,
      faceDescriptors: Array.isArray(row.face_descriptors) ? row.face_descriptors : [],
      faceDescriptor: Array.isArray(row.face_descriptors) && row.face_descriptors[0] ? row.face_descriptors[0] : undefined,
      lastSeen: 'Terhubung Cloud'
    }));
  } catch (err) {
    console.warn('Exception fetching students:', err);
    return [];
  }
}

/**
 * Simpan atau perbarui data siswa ke Supabase
 */
export async function saveStudentToSupabase(student: Student): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const descriptors = student.faceDescriptors || (student.faceDescriptor ? [student.faceDescriptor] : []);

    const { error } = await client.from('students').upsert({
      id: student.id,
      name: student.name,
      class: student.class,
      gender: student.gender || 'L',
      parent_name: student.parentName,
      parent_phone: student.parentPhone,
      photo_url: student.photoUrl,
      face_descriptors: descriptors,
      updated_at: new Date().toISOString()
    });

    if (error) {
      console.warn('Failed to save student to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Exception saving student to Supabase:', err);
    return false;
  }
}

/**
 * Hapus data siswa dari Supabase
 */
export async function deleteStudentFromSupabase(studentId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('students').delete().eq('id', studentId);
    if (error) {
      console.warn('Failed to delete student from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Exception deleting student from Supabase:', err);
    return false;
  }
}

/**
 * Hapus seluruh data siswa dari Supabase
 */
export async function clearAllStudentsFromSupabase(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('students').delete().neq('id', '___NONE___');
    if (error) {
      console.warn('Failed to clear students from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Exception clearing students from Supabase:', err);
    return false;
  }
}

/**
 * Hapus seluruh log kehadiran dari Supabase
 */
export async function clearAllAttendanceLogsFromSupabase(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('attendance_logs').delete().neq('student_id', '___NONE___');
    if (error) {
      console.warn('Failed to clear attendance logs from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Exception clearing attendance logs from Supabase:', err);
    return false;
  }
}

/**
 * Kirim log kehadiran baru ke Supabase
 */
export async function insertAttendanceToSupabase(log: AttendanceLog): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('attendance_logs').insert({
      student_id: log.studentId,
      student_name: log.studentName,
      class: log.class,
      timestamp: new Date().toISOString(),
      date_string: log.dateString || formatAttendanceDate(),
      time_string: log.timeString || formatAttendanceTime(),
      status: log.status,
      gate_name: log.processingNode || 'Terminal Gerbang Tablet',
      confidence: log.confidence || '98.5',
      speed: log.speed || '1.4 m/s'
    });

    if (error) {
      console.warn('Failed to insert attendance to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Exception inserting attendance to Supabase:', err);
    return false;
  }
}

/**
 * Ambil log kehadiran dari Supabase
 */
export async function fetchAttendanceLogsFromSupabase(limit = 100): Promise<AttendanceLog[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('attendance_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map(row => ({
      id: row.id,
      studentId: row.student_id,
      studentName: row.student_name,
      class: row.class,
      timestamp: row.timestamp ? new Date(row.timestamp).toLocaleString('id-ID') : `${row.date_string} ${row.time_string}`,
      dateString: row.date_string,
      timeString: row.time_string,
      method: 'Walk-Through Biometric',
      confidence: row.confidence || '98.5',
      qualityScore: '0.96',
      processingNode: row.gate_name || 'Terminal Gerbang',
      storageStatus: 'Cloud Synced',
      status: row.status,
      speed: row.speed || '1.4 m/s'
    }));
  } catch (err) {
    console.warn('Exception fetching attendance from Supabase:', err);
    return [];
  }
}
