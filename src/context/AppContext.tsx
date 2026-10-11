import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  INITIAL_STUDENTS,
  INITIAL_ATTENDANCE_LOGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_WHATSAPP_LOGS,
  ROLE_CONFIGS,
  RETENTION_SETTINGS
} from '../data/mockData';
import { Student, AttendanceLog, AuditLog, WhatsAppLog, RoleType } from '../types';
import {
  formatAttendanceDate,
  formatAttendanceTime,
  evaluateAttendancePunctuality,
  isAlreadyAttendedToday,
  checkSupabaseConnection,
  fetchStudentsFromSupabase,
  saveStudentToSupabase,
  deleteStudentFromSupabase,
  insertAttendanceToSupabase,
  fetchAttendanceLogsFromSupabase
} from '../utils/supabaseClient';

export interface AppNotification {
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

export interface AppContextType {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  attendanceLogs: AttendanceLog[];
  setAttendanceLogs: React.Dispatch<React.SetStateAction<AttendanceLog[]>>;
  auditLogs: AuditLog[];
  whatsappLogs: WhatsAppLog[];
  setWhatsappLogs: React.Dispatch<React.SetStateAction<WhatsAppLog[]>>;
  retentionSettings: typeof RETENTION_SETTINGS;
  setRetentionSettings: React.Dispatch<React.SetStateAction<typeof RETENTION_SETTINGS>>;
  currentRole: RoleType;
  setCurrentRole: React.Dispatch<React.SetStateAction<RoleType>>;
  isEdgeOnly: boolean;
  setIsEdgeOnly: React.Dispatch<React.SetStateAction<boolean>>;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  cameraMode: string;
  setCameraMode: React.Dispatch<React.SetStateAction<string>>;
  lastDetectedStudent: (Student & { log?: AttendanceLog }) | null;
  lastWhatsAppMessage: WhatsAppLog | null;
  setLastWhatsAppMessage: React.Dispatch<React.SetStateAction<WhatsAppLog | null>>;
  notification: AppNotification | null;
  notify: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  logAudit: (action: string, details: string, actorRole?: RoleType | string, status?: 'SUCCESS' | 'WARNING' | 'ALERT') => void;
  waAutoSendEnabled: boolean;
  setWaAutoSendEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  dispatchParentWhatsApp: (student: Student, timeStr: string, methodStr: string, isLate?: boolean) => void;
  processWalkThroughAttendance: (student: Student, speed?: string) => { recorded: boolean; alreadyAttended: boolean };
  resetAllStoredData: () => void;
  supabaseConnected: boolean;
  cutoffTime: string;
  setCutoffTime: React.Dispatch<React.SetStateAction<string>>;
  saveStudent: (student: Student) => Promise<boolean>;
  deleteStudent: (studentId: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Persistent Storage via localStorage so data is NOT lost on refresh / not just in ephemeral RAM
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('biopass_students');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : INITIAL_STUDENTS;
    } catch (e) {
      return INITIAL_STUDENTS;
    }
  });

  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>(() => {
    try {
      const saved = localStorage.getItem('biopass_attendance');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : INITIAL_ATTENDANCE_LOGS;
    } catch (e) {
      return INITIAL_ATTENDANCE_LOGS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('biopass_audit');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : INITIAL_AUDIT_LOGS;
    } catch (e) {
      return INITIAL_AUDIT_LOGS;
    }
  });

  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppLog[]>(() => {
    try {
      const saved = localStorage.getItem('biopass_whatsapp');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : INITIAL_WHATSAPP_LOGS;
    } catch (e) {
      return INITIAL_WHATSAPP_LOGS;
    }
  });

  const [retentionSettings, setRetentionSettings] = useState(RETENTION_SETTINGS);
  
  // RBAC Roles: 'admin' | 'wali_kelas' | 'guru_piket' | 'kepala_sekolah'
  const [currentRole, setCurrentRole] = useState<RoleType>('admin');
  
  // Edge status & navigation
  const [isEdgeOnly, setIsEdgeOnly] = useState(true);
  const [activeTab, setActiveTab] = useState('scanner');
  const [cameraMode, setCameraMode] = useState('live');
  const [lastDetectedStudent, setLastDetectedStudent] = useState<(Student & { log?: AttendanceLog }) | null>(null);
  const [lastWhatsAppMessage, setLastWhatsAppMessage] = useState<WhatsAppLog | null>(null);
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [waAutoSendEnabled, setWaAutoSendEnabled] = useState(true);

  // Sync state to localStorage persistently
  useEffect(() => {
    try {
      localStorage.setItem('biopass_students', JSON.stringify(students));
    } catch (e) {
      console.warn('Storage quota warning for students:', e);
    }
  }, [students]);

  useEffect(() => {
    try {
      localStorage.setItem('biopass_attendance', JSON.stringify(attendanceLogs));
    } catch (e) {
      console.warn('Storage quota warning for attendance:', e);
    }
  }, [attendanceLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('biopass_whatsapp', JSON.stringify(whatsappLogs));
    } catch (e) {
      console.warn('Storage quota warning for whatsapp:', e);
    }
  }, [whatsappLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('biopass_audit', JSON.stringify(auditLogs));
    } catch (e) {
      console.warn('Storage quota warning for audit:', e);
    }
  }, [auditLogs]);

  // Helper to show flash notification
  const notify = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Helper to append audit log
  const logAudit = (
    action: string,
    details: string,
    actorRole: RoleType | string = currentRole,
    status: 'SUCCESS' | 'WARNING' | 'ALERT' = 'SUCCESS'
  ) => {
    const roleObj = ROLE_CONFIGS[actorRole as RoleType] || { name: 'Sistem' };
    const newAudit: AuditLog = {
      id: `AUD-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toLocaleTimeString('id-ID') + ' WIB',
      actor: roleObj.name,
      role: actorRole,
      action,
      details,
      status,
      ipAddress: '192.168.10.15 (Local Database)'
    };
    setAuditLogs(prev => [newAudit, ...prev]);
  };

  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);
  const [cutoffTime, setCutoffTime] = useState<string>('07:00');

  // Supabase Initial Sync on Mount
  useEffect(() => {
    let isMounted = true;

    async function syncSupabase() {
      const isOnline = await checkSupabaseConnection();
      if (!isMounted) return;
      setSupabaseConnected(isOnline);

      if (isOnline) {
        // Fetch cloud students
        const cloudStudents = await fetchStudentsFromSupabase();
        if (isMounted && cloudStudents.length > 0) {
          setStudents(prev => {
            // Gabungkan siswa cloud dengan lokal
            const map = new Map<string, Student>();
            prev.forEach(s => map.set(s.id, s));
            cloudStudents.forEach(s => map.set(s.id, s));
            return Array.from(map.values());
          });
        }

        // Fetch cloud attendance logs
        const cloudLogs = await fetchAttendanceLogsFromSupabase(100);
        if (isMounted && cloudLogs.length > 0) {
          setAttendanceLogs(prev => {
            const map = new Map<string, AttendanceLog>();
            prev.forEach(l => map.set(l.id, l));
            cloudLogs.forEach(l => map.set(l.id, l));
            return Array.from(map.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          });
        }
      }
    }

    syncSupabase();

    return () => {
      isMounted = false;
    };
  }, []);

  // Simpan siswa ke Local & Supabase
  const saveStudent = async (student: Student): Promise<boolean> => {
    setStudents(prev => {
      const idx = prev.findIndex(s => s.id === student.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = student;
        return updated;
      }
      return [student, ...prev];
    });

    logAudit('STUDENT_ENROLLED', `Siswa ${student.name} (${student.id}) berhasil didaftarkan ke sistem.`);
    
    // Asynchronously push to Supabase
    saveStudentToSupabase(student).catch(err => {
      console.warn('Supabase student save background error:', err);
    });

    return true;
  };

  // Hapus siswa dari Local & Supabase
  const deleteStudent = async (studentId: string): Promise<boolean> => {
    setStudents(prev => prev.filter(s => s.id !== studentId));
    logAudit('STUDENT_DELETED', `Siswa (${studentId}) dihapus dari database sekolah.`);
    
    deleteStudentFromSupabase(studentId).catch(err => {
      console.warn('Supabase student delete background error:', err);
    });

    return true;
  };

  // Dispatch automated WhatsApp notification to parent
  const dispatchParentWhatsApp = (student: Student, timeStr: string, methodStr: string, isLate = false) => {
    if (!waAutoSendEnabled) return;

    const messageContent = `🏫 *SMA HARAPAN NUSANTARA*\n_Sistem Informasi Presensi Siswa (BioPass Edge)_\n\nYth. Bapak/Ibu *${student.parentName}*,\nMemberitahukan bahwa ananda *${student.name}* (Kelas ${student.class}) telah tiba di sekolah:\n\n⏰ Waktu: *${timeStr}*\n📍 Lokasi: *Gerbang Masuk Siswa*\n⚡ Status: *${isLate ? '⚠️ Terlambat Masuk' : 'Hadir Tepat Waktu ✅'}*\n🛡️ Metode: *${methodStr}*\n\n_Catatan: Data kehadiran dan foto tersimpan di Database Sekolah._`;

    const newWa: WhatsAppLog = {
      id: `WA-${Date.now().toString().slice(-6)}`,
      studentId: student.id,
      studentName: student.name,
      photoUrl: student.photoUrl || null,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      messageType: isLate ? 'Terlambat' : 'Tepat Waktu',
      timestamp: timeStr,
      status: 'DELIVERED_READ',
      content: messageContent
    };

    setWhatsappLogs(prev => [newWa, ...prev]);
    setLastWhatsAppMessage(newWa);

    logAudit(
      'WHATSAPP_NOTIFICATION_DISPATCHED',
      `Notifikasi WhatsApp resmi terkirim ke orang tua (${student.parentPhone} / ${student.parentName}) untuk ${student.name}.`,
      'System Worker'
    );
  };

  // Handle Walk-Through Detection Event (Real Punctuality & 1x Daily Attendance Deduplication)
  const processWalkThroughAttendance = (
    student: Student,
    speed = '1.4 m/s'
  ): { recorded: boolean; alreadyAttended: boolean } => {
    const now = new Date();
    const todayDate = formatAttendanceDate(now);
    const timeStr = formatAttendanceTime(now);
    const fullTimeDisplay = `${timeStr} WIB`;

    // Proteksi 1x Absen Masuk per Hari
    const alreadyAttended = isAlreadyAttendedToday(student.id, todayDate, attendanceLogs);
    if (alreadyAttended) {
      // Siswa lewat lagi: hanya sapa ramah, tidak membuat log baru
      return { recorded: false, alreadyAttended: true };
    }

    // Evaluasi ketepatan waktu riil (Bukan simulasi acak)
    const statusText = evaluateAttendancePunctuality(now, cutoffTime);
    const isLate = statusText === 'Terlambat';

    const newLog: AttendanceLog = {
      id: `ATT-${Date.now().toString().slice(-6)}`,
      studentId: student.id,
      studentName: student.name,
      photoUrl: student.photoUrl || null,
      class: student.class,
      timestamp: `${todayDate}, ${fullTimeDisplay}`,
      dateString: todayDate,
      timeString: timeStr,
      method: 'Walk-Through Face Recognition',
      confidence: '98.5%',
      qualityScore: '0.96 (Optimal)',
      processingNode: 'Terminal Gerbang Tablet',
      storageStatus: supabaseConnected ? 'Tersimpan di Cloud Supabase' : 'Tersimpan Lokal (IndexedDB)',
      status: statusText,
      speed: `${speed} (Sambil Berjalan)`
    };

    // Update state lokal
    setAttendanceLogs(prev => [newLog, ...prev]);
    setLastDetectedStudent({ ...student, log: newLog });

    // Update lastSeen pada profil siswa
    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, lastSeen: fullTimeDisplay } : s));

    // Audit log
    logAudit(
      'FACE_ATTENDANCE_RECORDED',
      `Presensi ${student.name} (${student.id}) berhasil diverifikasi: ${statusText}.`
    );

    // Kirim ke Supabase di latar belakang
    insertAttendanceToSupabase(newLog).catch(err => {
      console.warn('Background Supabase attendance sync warning:', err);
    });

    // Kirim notifikasi WhatsApp ke orang tua
    dispatchParentWhatsApp(student, fullTimeDisplay, 'Walk-Through Face Recognition', isLate);

    notify(`✅ [Presensi Berhasil] ${student.name} (${statusText}) terverifikasi. Data tersimpan & WA diproses.`);
    return { recorded: true, alreadyAttended: false };
  };

  // Reset / Clear Data (Kembali ke 0 jika diperlukan)
  const resetAllStoredData = () => {
    setStudents([]);
    setAttendanceLogs([]);
    setWhatsappLogs([]);
    setAuditLogs([]);
    localStorage.removeItem('biopass_students');
    localStorage.removeItem('biopass_attendance');
    localStorage.removeItem('biopass_whatsapp');
    localStorage.removeItem('biopass_audit');
    notify('Seluruh data presensi dan siswa telah di-reset ke 0.');
  };

  return (
    <AppContext.Provider
      value={{
        students,
        setStudents,
        attendanceLogs,
        setAttendanceLogs,
        auditLogs,
        whatsappLogs,
        setWhatsappLogs,
        retentionSettings,
        setRetentionSettings,
        currentRole,
        setCurrentRole,
        isEdgeOnly,
        setIsEdgeOnly,
        activeTab,
        setActiveTab,
        cameraMode,
        setCameraMode,
        lastDetectedStudent,
        lastWhatsAppMessage,
        setLastWhatsAppMessage,
        notification,
        notify,
        logAudit,
        waAutoSendEnabled,
        setWaAutoSendEnabled,
        dispatchParentWhatsApp,
        processWalkThroughAttendance,
        resetAllStoredData,
        supabaseConnected,
        cutoffTime,
        setCutoffTime,
        saveStudent,
        deleteStudent
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
