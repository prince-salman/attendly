import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  INITIAL_STUDENTS,
  INITIAL_ATTENDANCE_LOGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_WHATSAPP_LOGS,
  ROLE_CONFIGS,
  RETENTION_SETTINGS,
  REGISTERED_SCHOOLS,
  generateActivationCode
} from '../data/mockData';
import { Student, AttendanceLog, AuditLog, WhatsAppLog, RoleType, UserProfile, PRESET_USERS, SchoolTenant, AttendanceScanType, VerificationStatus } from '../types';
import {
  formatAttendanceDate,
  formatAttendanceTime,
  evaluateAttendancePunctuality,
  isAlreadyAttendedToday,
  checkSupabaseConnection,
  fetchStudentsFromSupabase,
  saveStudentToSupabase,
  deleteStudentFromSupabase,
  clearAllStudentsFromSupabase,
  clearAllAttendanceLogsFromSupabase,
  insertAttendanceToSupabase,
  fetchAttendanceLogsFromSupabase
} from '../utils/supabaseClient';
import { getStudentCallName } from '../utils/nameHelper';
import { clearAllStudentsInPython, fetchStudentsFromPython, deleteStudentFromPython } from '../utils/pythonBackendClient';

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
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  currentRole: RoleType;
  setCurrentRole: (role: RoleType) => void;
  staffUsers: UserProfile[];
  currentSchoolStaff: UserProfile[];
  createStaffAccount: (data: Omit<UserProfile, 'id'>) => UserProfile;
  updateStaffAccount: (id: string, updates: Partial<UserProfile>) => void;
  deleteStaffAccount: (id: string) => boolean;
  provisionQuickRole: (role: 'guru_bk' | 'kepala_sekolah' | 'pengawas') => UserProfile;
  canAccessTab: (tab: string) => boolean;
  userAssignedClass?: string;
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
  dispatchParentWhatsApp: (student: Student, timeStr: string, methodStr: string, isLate?: boolean, attendanceType?: AttendanceScanType) => void;
  processWalkThroughAttendance: (student: Student, speed?: string, forcedMode?: AttendanceScanType) => { recorded: boolean; alreadyAttended: boolean; attendanceType: AttendanceScanType; message?: string };
  // Check-In (Datang) vs Check-Out (Pulang) Gate Mode
  gateAttendanceMode: AttendanceScanType;
  setGateAttendanceMode: React.Dispatch<React.SetStateAction<AttendanceScanType>>;
  toggleGateAttendanceMode: () => void;
  resetAllStoredData: () => void;
  clearAttendanceLogs: () => void;
  supabaseConnected: boolean;
  cutoffTime: string;
  setCutoffTime: React.Dispatch<React.SetStateAction<string>>;
  saveStudent: (student: Student) => Promise<boolean>;
  deleteStudent: (studentId: string) => Promise<boolean>;
  deleteAllStudents: () => Promise<boolean>;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  // Multi-Tenant School System
  schools: SchoolTenant[];
  activeSchool: SchoolTenant;
  activateSchoolByCode: (code: string) => { success: boolean; message: string; school?: SchoolTenant };
  registerNewSchool: (schoolData: Omit<SchoolTenant, 'id' | 'activationCode' | 'registeredAt' | 'licenseStatus'>) => SchoolTenant;
  updateSchoolInfo: (schoolId: string, updates: Partial<SchoolTenant>) => void;
  // Reliability, Fail-Safe & Edge Case Protections:
  confidenceThreshold: number;
  setConfidenceThreshold: (val: number) => void;
  isOnline: boolean;
  offlineQueueCount: number;
  syncOfflineQueue: () => Promise<{ success: boolean; syncedCount: number }>;
  recordManualFallbackAttendance: (
    studentId: string,
    reason: string,
    mode?: AttendanceScanType
  ) => { recorded: boolean; message: string };
  verifyOrDisputeAttendance: (
    logId: string,
    action: 'VERIFY' | 'DISPUTE' | 'REASSIGN',
    reassignStudentId?: string,
    note?: string
  ) => Promise<{ success: boolean; message: string }>;
  resendWhatsAppNotification: (waLogId: string) => Promise<boolean>;
  dispatchCorrectionWhatsApp: (
    log: AttendanceLog,
    correctionNote: string
  ) => Promise<boolean>;
}

// Persist AppContext singleton instance across Vite HMR fast refresh reloads
const APP_CONTEXT_KEY = Symbol.for('attendly.app_context');
const getOrCreateAppContext = (): React.Context<AppContextType | undefined> => {
  const g = typeof window !== 'undefined' ? (window as any) : (globalThis as any);
  if (!g[APP_CONTEXT_KEY]) {
    g[APP_CONTEXT_KEY] = createContext<AppContextType | undefined>(undefined);
  }
  return g[APP_CONTEXT_KEY];
};

const AppContext = getOrCreateAppContext();

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Persistent Storage State - Respects Permanent Deletions
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      // If user explicitly purged all students, respect it!
      if (localStorage.getItem('attendly_all_students_cleared') === 'true') {
        return [];
      }
      const deletedIds = new Set<string>(
        JSON.parse(localStorage.getItem('biopass_deleted_student_ids') || '[]')
      );
      const saved = localStorage.getItem('biopass_students');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((s: Student) => !deletedIds.has(s.id));
        }
      }
      // First boot default
      const initial = INITIAL_STUDENTS.filter(s => !deletedIds.has(s.id));
      localStorage.setItem('biopass_students', JSON.stringify(initial));
      return initial;
    } catch (e) {
      return [];
    }
  });

  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>(() => {
    try {
      // If user explicitly cleared attendance logs, respect it!
      if (localStorage.getItem('attendly_attendance_cleared') === 'true') {
        return [];
      }
      const saved = localStorage.getItem('biopass_attendance');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      localStorage.setItem('biopass_attendance', JSON.stringify(INITIAL_ATTENDANCE_LOGS));
      return INITIAL_ATTENDANCE_LOGS;
    } catch (e) {
      return [];
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
      if (localStorage.getItem('attendly_whatsapp_cleared') === 'true') {
        return [];
      }
      const saved = localStorage.getItem('biopass_whatsapp');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      localStorage.setItem('biopass_whatsapp', JSON.stringify(INITIAL_WHATSAPP_LOGS));
      return INITIAL_WHATSAPP_LOGS;
    } catch (e) {
      return [];
    }
  });

  const [retentionSettings, setRetentionSettings] = useState(RETENTION_SETTINGS);

  // Light / Dark Theme Mode
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('attendly_theme');
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('attendly_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('bg-[#090d16]', 'text-slate-100');
        document.body.classList.remove('bg-[#f8fafc]', 'text-slate-900');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('bg-[#090d16]', 'text-slate-100');
        document.body.classList.add('bg-[#f8fafc]', 'text-slate-900');
      }
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Multi-Tenant School Registry & Active License State with auto-upgrade
  const SCHOOLS_VERSION_KEY = 'attendly_registry_v4_logos';

  const [schools, setSchools] = useState<SchoolTenant[]>(() => {
    try {
      const upgraded = localStorage.getItem(SCHOOLS_VERSION_KEY);
      if (!upgraded) {
        localStorage.setItem(SCHOOLS_VERSION_KEY, 'true');
        localStorage.setItem('attendly_schools_registry', JSON.stringify(REGISTERED_SCHOOLS));
        return REGISTERED_SCHOOLS;
      }
      const saved = localStorage.getItem('attendly_schools_registry');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, SchoolTenant>();
          REGISTERED_SCHOOLS.forEach(s => map.set(s.id, s));
          parsed.forEach((s: SchoolTenant) => {
            if (s && s.id) {
              const def = map.get(s.id);
              map.set(s.id, {
                ...def,
                ...s,
                institutionType: s.institutionType || def?.institutionType || 'SEKOLAH',
                logoUrl: s.logoUrl || def?.logoUrl
              });
            }
          });
          return Array.from(map.values());
        }
      }
    } catch (e) {
      console.warn('Failed to load schools registry:', e);
    }
    return REGISTERED_SCHOOLS;
  });

  const [activeSchool, setActiveSchool] = useState<SchoolTenant>(() => {
    try {
      const activeId = localStorage.getItem('attendly_active_school_id');
      const saved = localStorage.getItem('attendly_schools_registry');
      const list: SchoolTenant[] = saved ? JSON.parse(saved) : REGISTERED_SCHOOLS;
      if (activeId && Array.isArray(list)) {
        const found = list.find((s: SchoolTenant) => s?.id === activeId);
        if (found) return found;
      }
      return list?.[0] || REGISTERED_SCHOOLS[0];
    } catch (e) {
      return REGISTERED_SCHOOLS[0];
    }
  });

  // Staff Accounts Architecture (RBAC): 1 Admin per school initially; Admin creates Guru BK, Kepala Sekolah, Pengawas
  const STAFF_USERS_KEY = 'attendly_school_staff_v4';

  const [staffUsers, setStaffUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STAFF_USERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    // 1 Admin per registered school initially
    return REGISTERED_SCHOOLS.map(s => ({
      id: `admin-${s.id}`,
      schoolId: s.id,
      name: s.adminName || 'Rahmat Santoso, S.Kom',
      role: 'admin' as RoleType,
      title: 'Administrator Utama & IT Gate',
      nip: '19880315 201201 1 002',
      email: s.adminEmail || 'admin@harapan-nusantara.sch.id',
      phone: s.adminPhone || '0812-8899-7711',
      notes: 'Administrator Utama penanggung jawab operasional gerbang biometrik dan otorisasi staf.',
      createdAt: s.registeredAt || '01 Jan 2026'
    }));
  });

  useEffect(() => {
    try {
      localStorage.setItem(STAFF_USERS_KEY, JSON.stringify(staffUsers));
    } catch {}
  }, [staffUsers]);

  // Derived staff accounts strictly for activeSchool
  const currentSchoolStaff = React.useMemo(() => {
    const list = staffUsers.filter(u => !u.schoolId || u.schoolId === activeSchool.id);
    if (!list.some(u => u.role === 'admin')) {
      const fallbackAdmin: UserProfile = {
        id: `admin-${activeSchool.id}`,
        schoolId: activeSchool.id,
        name: activeSchool.adminName || 'Administrator Sekolah',
        role: 'admin',
        title: 'Administrator Utama & IT Gate',
        nip: '19880315 201201 1 002',
        email: activeSchool.adminEmail || 'admin@harapan-nusantara.sch.id',
        phone: activeSchool.adminPhone || '0812-8899-7711',
        notes: 'Administrator Utama sekolah.',
        createdAt: 'Sistem Terdaftar'
      };
      return [fallbackAdmin, ...list];
    }
    return list;
  }, [staffUsers, activeSchool]);

  // Current logged in user profile
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('biopass_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.role) return parsed;
      }
    } catch (e) {}
    return {
      id: `admin-${REGISTERED_SCHOOLS[0].id}`,
      schoolId: REGISTERED_SCHOOLS[0].id,
      name: REGISTERED_SCHOOLS[0].adminName || 'Rahmat Santoso, S.Kom',
      role: 'admin',
      title: 'Administrator Utama & IT Gate',
      nip: '19880315 201201 1 002',
      email: REGISTERED_SCHOOLS[0].adminEmail || 'admin@harapan-nusantara.sch.id',
      phone: REGISTERED_SCHOOLS[0].adminPhone || '0812-8899-7711'
    };
  });

  const currentRole = currentUser.role;
  const userAssignedClass = currentUser.assignedClass;

  // Edge status & navigation
  const [isEdgeOnly, setIsEdgeOnly] = useState(true);
  const [activeTab, setActiveTab] = useState('scanner');
  const [cameraMode, setCameraMode] = useState('live');
  const [lastDetectedStudent, setLastDetectedStudent] = useState<(Student & { log?: AttendanceLog }) | null>(null);
  const [lastWhatsAppMessage, setLastWhatsAppMessage] = useState<WhatsAppLog | null>(null);
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [waAutoSendEnabled, setWaAutoSendEnabled] = useState(true);

  // Set user with automatic tab redirection if current tab not allowed
  const handleSetCurrentUser = (user: UserProfile) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('biopass_user', JSON.stringify(user));
    } catch {}

    // Auto-redirect if tab is not permitted
    if (user.role === 'guru_bk' && !['attendance', 'whatsapp'].includes(activeTab)) {
      setActiveTab('attendance');
    } else if (user.role === 'kepala_sekolah' && !['scanner', 'attendance', 'whatsapp'].includes(activeTab)) {
      setActiveTab('scanner');
    } else if (user.role === 'pengawas' && !['attendance'].includes(activeTab)) {
      setActiveTab('attendance');
    } else if (user.role === 'wali_kelas' && !['attendance', 'whatsapp'].includes(activeTab)) {
      setActiveTab('attendance');
    }
  };

  const setCurrentRole = (role: RoleType) => {
    const match = currentSchoolStaff.find(u => u.role === role) || 
                  staffUsers.find(u => u.role === role) || 
                  currentSchoolStaff[0];
    if (match) {
      handleSetCurrentUser(match);
    }
  };

  const canAccessTab = (tab: string): boolean => {
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'guru_bk') {
      return ['attendance', 'whatsapp'].includes(tab);
    }
    if (currentUser.role === 'kepala_sekolah') {
      return ['scanner', 'attendance', 'whatsapp'].includes(tab);
    }
    if (currentUser.role === 'pengawas') {
      return ['attendance'].includes(tab);
    }
    if (currentUser.role === 'wali_kelas') {
      return ['attendance', 'whatsapp'].includes(tab);
    }
    return false;
  };

  const createStaffAccount = (data: Omit<UserProfile, 'id'>): UserProfile => {
    const newId = `user-${data.role}-${Date.now().toString(36)}`;
    const newAccount: UserProfile = {
      ...data,
      id: newId,
      schoolId: data.schoolId || activeSchool.id,
      createdAt: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    };
    setStaffUsers(prev => [...prev, newAccount]);
    logAudit(
      'STAFF_ACCOUNT_CREATED',
      `Akun staf baru (${newAccount.title} - ${newAccount.name}) diterbitkan oleh ${currentUser.name}.`,
      'admin'
    );
    notify(`Akun ${newAccount.title} untuk "${newAccount.name}" berhasil dibuat!`, 'success');
    return newAccount;
  };

  const updateStaffAccount = (id: string, updates: Partial<UserProfile>) => {
    setStaffUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    if (currentUser.id === id) {
      setCurrentUser(prev => ({ ...prev, ...updates }));
    }
    notify('Data akun staf berhasil diperbarui.', 'success');
  };

  const deleteStaffAccount = (id: string): boolean => {
    const target = staffUsers.find(u => u.id === id);
    if (!target) return false;
    if (target.role === 'admin') {
      const adminCount = staffUsers.filter(u => u.role === 'admin' && (u.schoolId === activeSchool.id || !u.schoolId)).length;
      if (adminCount <= 1) {
        notify('Tidak dapat menghapus Administrator Utama terakhir!', 'error');
        return false;
      }
    }
    setStaffUsers(prev => prev.filter(u => u.id !== id));
    if (currentUser.id === id) {
      const fallback = currentSchoolStaff.find(u => u.role === 'admin' && u.id !== id) || currentSchoolStaff[0];
      handleSetCurrentUser(fallback);
    }
    logAudit(
      'STAFF_ACCOUNT_DELETED',
      `Akun staf ${target.name} (${target.title}) dihapus oleh ${currentUser.name}.`,
      'admin'
    );
    notify(`Akun ${target.name} berhasil dihapus.`, 'info');
    return true;
  };

  const provisionQuickRole = (role: 'guru_bk' | 'kepala_sekolah' | 'pengawas'): UserProfile => {
    const domain = activeSchool.adminEmail ? activeSchool.adminEmail.split('@')[1] : 'sekolah.sch.id';
    let newAccountData: Omit<UserProfile, 'id'>;

    if (role === 'guru_bk') {
      newAccountData = {
        schoolId: activeSchool.id,
        name: 'Dra. Hj. Nurul Hidayati, M.Pd',
        role: 'guru_bk',
        title: 'Guru Bimbingan & Konseling (BK)',
        nip: '19750812 200003 2 001',
        email: `bk@${domain}`,
        phone: '0812-4455-6677',
        notes: 'Penanggung jawab pembinaan kedisiplinan dan konseling kehadiran siswa.'
      };
    } else if (role === 'kepala_sekolah') {
      const isUniv = activeSchool.institutionType === 'UNIVERSITAS';
      newAccountData = {
        schoolId: activeSchool.id,
        name: isUniv ? 'Prof. Dr. Ir. Mochamad Ashari, M.Eng' : 'Drs. H. Bambang Sudarsono, M.Pd',
        role: 'kepala_sekolah',
        title: isUniv ? 'Rektor Instansi' : 'Kepala Sekolah',
        nip: '19680512 199303 1 004',
        email: `kepsek@${domain}`,
        phone: '0811-2233-4455',
        notes: 'Pimpinan institusi berwenang monitoring eksekutif dan pengesahan resmi laporan kehadiran.'
      };
    } else {
      newAccountData = {
        schoolId: activeSchool.id,
        name: 'Dr. Ir. H. Achmad Syafi\'i, M.M',
        role: 'pengawas',
        title: 'Pengawas Pembina Sekolah (Dinas)',
        nip: '19650320 199002 1 003',
        email: 'pengawas@disdik.jakarta.go.id',
        phone: '0813-9988-7766',
        notes: 'Pengawas pembina satuan pendidikan untuk audit kepatuhan dan akreditasi.'
      };
    }

    return createStaffAccount(newAccountData);
  };

  // Check-In (Datang) vs Check-Out (Pulang) Gate Mode
  const [gateAttendanceMode, setGateAttendanceMode] = useState<AttendanceScanType>(() => {
    try {
      const saved = localStorage.getItem('attendly_gate_mode');
      if (saved === 'DATANG' || saved === 'PULANG') return saved;
    } catch {}
    return new Date().getHours() >= 12 ? 'PULANG' : 'DATANG';
  });

  const toggleGateAttendanceMode = () => {
    setGateAttendanceMode(prev => (prev === 'DATANG' ? 'PULANG' : 'DATANG'));
  };

  useEffect(() => {
    try {
      localStorage.setItem('attendly_gate_mode', gateAttendanceMode);
    } catch {}
  }, [gateAttendanceMode]);


  const activateSchoolByCode = (code: string): { success: boolean; message: string; school?: SchoolTenant } => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Kode aktivasi tidak boleh kosong.' };
    }

    const targetSchool = schools.find(
      s => s.activationCode.trim().toUpperCase() === cleanCode
    );

    if (targetSchool) {
      setActiveSchool(targetSchool);
      logAudit(
        'SCHOOL_LICENSE_ACTIVATED',
        `Terminal berhasil dihubungkan ke instansi ${targetSchool.name} via kode lisensi ${targetSchool.activationCode}.`,
        'admin',
        'SUCCESS'
      );
      notify(`Terminal berhasil diaktifkan untuk ${targetSchool.name}!`);
      return {
        success: true,
        message: `Lisensi aktif: ${targetSchool.name} (NPSN: ${targetSchool.npsn})`,
        school: targetSchool
      };
    } else {
      logAudit(
        'SCHOOL_LICENSE_ACTIVATION_FAILED',
        `Percobaan aktivasi gagal dengan kode: "${code}".`,
        'admin',
        'ALERT'
      );
      return {
        success: false,
        message: 'Kode aktivasi tidak terdaftar atau tidak valid. Pastikan format: ATND-XXXX-XXXX-XXXX'
      };
    }
  };

  const registerNewSchool = (
    schoolData: Omit<SchoolTenant, 'id' | 'activationCode' | 'registeredAt' | 'licenseStatus'>
  ): SchoolTenant => {
    const cleanAbbr = schoolData.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'SCH';
    const newActivationCode = generateActivationCode(cleanAbbr);
    const newId = `SCH-${Date.now().toString().slice(-4)}`;
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const newSchool: SchoolTenant = {
      ...schoolData,
      id: newId,
      activationCode: newActivationCode,
      licenseStatus: 'ACTIVE',
      registeredAt: todayStr
    };

    setSchools(prev => [newSchool, ...prev]);
    setActiveSchool(newSchool);

    logAudit(
      'NEW_SCHOOL_TENANT_REGISTERED',
      `Sekolah baru didaftarkan: ${newSchool.name} (Admin: ${newSchool.adminName}) dengan kode ${newSchool.activationCode}.`,
      'admin',
      'SUCCESS'
    );

    notify(`Sekolah ${newSchool.name} berhasil terdaftar & terminal aktif!`);
    return newSchool;
  };

  const updateSchoolInfo = (schoolId: string, updates: Partial<SchoolTenant>) => {
    setSchools(prev =>
      prev.map(s => (s.id === schoolId ? { ...s, ...updates } : s))
    );
    if (activeSchool.id === schoolId) {
      setActiveSchool(prev => ({ ...prev, ...updates }));
    }
    logAudit(
      'SCHOOL_TENANT_UPDATED',
      `Data sekolah ${schoolId} berhasil diperbarui oleh Administrator.`,
      'admin'
    );
    notify('Informasi instansi sekolah berhasil diperbarui.');
  };

  useEffect(() => {
    try {
      localStorage.setItem('biopass_user', JSON.stringify(currentUser));
    } catch (e) {}
  }, [currentUser]);

  // Otomatis arahkan tab jika role tidak memiliki izin pada tab aktif saat ini
  useEffect(() => {
    if (!canAccessTab(activeTab)) {
      setActiveTab('attendance');
    }
  }, [currentUser, activeTab]);

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
        // If user explicitly purged all students, respect and sync to cloud
        const isPurged = localStorage.getItem('attendly_all_students_cleared') === 'true';
        if (isPurged) {
          await clearAllStudentsFromSupabase();
        } else {
          // Fetch cloud students and filter out any permanently deleted IDs
          const cloudStudents = await fetchStudentsFromSupabase();
          if (isMounted) {
            const deletedIds = new Set(
              JSON.parse(localStorage.getItem('biopass_deleted_student_ids') || '[]')
            );
            const activeCloudStudents = cloudStudents.filter(s => !deletedIds.has(s.id));
            if (activeCloudStudents.length > 0) {
              setStudents(activeCloudStudents);
              localStorage.setItem('biopass_students', JSON.stringify(activeCloudStudents));
            }
          }
        }

        // Attendance logs sync
        const isAttPurged = localStorage.getItem('attendly_attendance_cleared') === 'true';
        if (isAttPurged) {
          await clearAllAttendanceLogsFromSupabase();
        } else {
          const cloudLogs = await fetchAttendanceLogsFromSupabase(100);
          if (isMounted && cloudLogs.length > 0) {
            setAttendanceLogs(cloudLogs);
            localStorage.setItem('biopass_attendance', JSON.stringify(cloudLogs));
          }
        }
      }
    }

    syncSupabase();

    // Python ArcFace Initial Sync on Mount
    async function syncPythonEngine() {
      try {
        const isPurged = localStorage.getItem('attendly_all_students_cleared') === 'true';
        if (isPurged) {
          await clearAllStudentsInPython();
        } else {
          const pyStudents = await fetchStudentsFromPython();
          if (isMounted && pyStudents.length > 0) {
            const deletedIds = new Set(
              JSON.parse(localStorage.getItem('biopass_deleted_student_ids') || '[]')
            );
            const activePyStudents = pyStudents.filter(s => !deletedIds.has(s.id));
            if (activePyStudents.length > 0) {
              setStudents(prev => {
                const map = new Map<string, Student>();
                prev.forEach(s => {
                  if (!deletedIds.has(s.id)) map.set(s.id, s);
                });
                activePyStudents.forEach(s => {
                  if (!deletedIds.has(s.id) && !map.has(s.id)) {
                    map.set(s.id, s);
                  }
                });
                return Array.from(map.values());
              });
            }
          }
        }
      } catch (err) {
        console.warn('Python sync on mount error:', err);
      }
    }

    syncPythonEngine();

    return () => {
      isMounted = false;
    };
  }, []);

  // Simpan siswa ke Local & Supabase
  const saveStudent = async (student: Student): Promise<boolean> => {
    // Unmark from cleared flags and deleted list
    try {
      localStorage.removeItem('attendly_all_students_cleared');
      const deletedIds: string[] = JSON.parse(
        localStorage.getItem('biopass_deleted_student_ids') || '[]'
      );
      const filtered = deletedIds.filter(id => id !== student.id);
      localStorage.setItem('biopass_deleted_student_ids', JSON.stringify(filtered));
    } catch (e) {}

    setStudents(prev => {
      const idx = prev.findIndex(s => s.id === student.id);
      let updated: Student[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = student;
      } else {
        updated = [student, ...prev];
      }
      try {
        localStorage.setItem('biopass_students', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    logAudit('STUDENT_ENROLLED', `Siswa ${student.name} (${student.id}) berhasil didaftarkan ke sistem.`);
    
    // Asynchronously push to Supabase
    saveStudentToSupabase(student).catch(err => {
      console.warn('Supabase student save background error:', err);
    });

    return true;
  };

  // Hapus siswa dari Local, Python ArcFace, & Supabase secara permanen
  const deleteStudent = async (studentId: string): Promise<boolean> => {
    // 1. Catat ke daftar deleted_ids agar tidak pernah di-restore kembali oleh sinkronisasi cloud atau mock
    try {
      const deletedIds: string[] = JSON.parse(
        localStorage.getItem('biopass_deleted_student_ids') || '[]'
      );
      if (!deletedIds.includes(studentId)) {
        deletedIds.push(studentId);
        localStorage.setItem('biopass_deleted_student_ids', JSON.stringify(deletedIds));
      }
    } catch (e) {}

    // 2. Hapus dari state lokal & local storage
    setStudents(prev => {
      const next = prev.filter(s => s.id !== studentId);
      try {
        localStorage.setItem('biopass_students', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    logAudit('STUDENT_DELETED', `Siswa (${studentId}) dihapus permanen dari sistem.`);
    
    // 3. Hapus langsung dari database Python ArcFace
    try {
      await deleteStudentFromPython(studentId);
    } catch (pyErr) {
      console.warn('Python student delete warning:', pyErr);
    }

    // 4. Hapus langsung dari database cloud Supabase
    try {
      await deleteStudentFromSupabase(studentId);
    } catch (err) {
      console.warn('Supabase student delete background error:', err);
    }

    notify(`Siswa (${studentId}) berhasil dihapus permanen.`, 'success');
    return true;
  };

  // Hapus seluruh siswa dari Local Storage, Python ArcFace, & Supabase secara permanen
  const deleteAllStudents = async (): Promise<boolean> => {
    try {
      const allIds = students.map(s => s.id);
      localStorage.setItem('biopass_deleted_student_ids', JSON.stringify(allIds));
      localStorage.setItem('attendly_all_students_cleared', 'true');
      localStorage.setItem('biopass_students', '[]');
    } catch (e) {}

    setStudents([]);
    logAudit('ALL_STUDENTS_PURGED', 'Seluruh data siswa dan biometrik dihapus permanen dari sistem.');

    try {
      await clearAllStudentsInPython();
    } catch (e) {
      console.warn('Python backend student purge warning:', e);
    }

    try {
      await clearAllStudentsFromSupabase();
    } catch (e) {
      console.warn('Supabase student purge warning:', e);
    }

    notify('Seluruh data siswa dan biometrik berhasil dihapus permanen.');
    return true;
  };

  // 🛡️ Reliability & Edge Case Protections:
  // 1. Confidence Threshold (Salah Mengenali Wajah)
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('attendly_confidence_threshold');
      if (saved) return Number(saved);
    } catch {}
    return 75; // 75% default
  });

  const handleSetConfidenceThreshold = (val: number) => {
    const clamped = Math.max(50, Math.min(98, Math.round(val)));
    setConfidenceThreshold(clamped);
    try {
      localStorage.setItem('attendly_confidence_threshold', String(clamped));
    } catch {}
    notify(`Ambang batas kecocokan (confidence threshold) diatur ke ${clamped}%.`);
  };

  // 2. Offline Mode & Network Listener (Internet atau Listrik Mati)
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Sync offline queue to Supabase cloud
  const syncOfflineQueue = async (): Promise<{ success: boolean; syncedCount: number }> => {
    const unsynced = attendanceLogs.filter(l => !l.syncedToCloud);
    if (unsynced.length === 0) {
      notify('Semua data presensi lokal sudah tersinkronisasi ke cloud.', 'info');
      return { success: true, syncedCount: 0 };
    }

    let synced = 0;
    for (const log of unsynced) {
      try {
        await insertAttendanceToSupabase(log);
        synced++;
      } catch (err) {
        console.warn('Failed syncing log to cloud:', log.id, err);
      }
    }

    if (synced > 0) {
      setAttendanceLogs(prev =>
        prev.map(l => (!l.syncedToCloud ? { ...l, syncedToCloud: true, storageStatus: 'Supabase Cloud Sync' } : l))
      );
      logAudit(
        'OFFLINE_QUEUE_SYNCED',
        `Berhasil menyinkronkan ${synced} data presensi lokal ke cloud Supabase setelah koneksi pulih.`,
        'System Worker',
        'SUCCESS'
      );
      notify(`Sinkronisasi berhasil! ${synced} data presensi telah dikirim ke cloud.`, 'success');
      return { success: true, syncedCount: synced };
    } else {
      notify('Gagal menyinkronkan antrean ke cloud. Silakan periksa koneksi internet Anda.', 'warning');
      return { success: false, syncedCount: 0 };
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      notify('Koneksi internet terhubung kembali. Memulai sinkronisasi otomatis antrean lokal...', 'info');
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      notify('Koneksi internet terputus. Sistem beralih ke Mode Pemrosesan Lokal (Edge Offline). Seluruh presensi tetap tercatat dan aman di penyimpanan lokal.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [attendanceLogs]);

  // Offline queue count (logs not yet synced to Supabase/Cloud)
  const offlineQueueCount = useMemo(() => {
    return attendanceLogs.filter(l => !l.syncedToCloud).length;
  }, [attendanceLogs]);

  // Dispatch automated WhatsApp notification to parent (Datang vs Pulang)
  // Dilengkapi VALIDASI STATUS KEHADIRAN & FORMAT KONTAK ORANG TUA
  const dispatchParentWhatsApp = (
    student: Student,
    timeStr: string,
    methodStr: string,
    isLate = false,
    attendanceType: AttendanceScanType = 'DATANG'
  ) => {
    if (!waAutoSendEnabled) return;

    const schoolTitle = (activeSchool?.name || 'Harapan Nusantara High School').toUpperCase();
    const isDatang = attendanceType === 'DATANG';

    // 🛡️ PRE-DISPATCH VALIDATION (Mencegah Notifikasi Salah / Format Keliru)
    const cleanPhone = (student.parentPhone || '').replace(/[^0-9]/g, '');
    const isPhoneValid = cleanPhone.length >= 10;
    const deliveryStatus = isPhoneValid ? 'DELIVERED' : 'FAILED';

    const messageContent = isDatang
      ? `🏫 *${schoolTitle}*\n_Sistem Presensi Biometrik Wajah (Attendly)_\n\nYth. Orang Tua/Wali dari *${student.parentName}*,\nKami menginformasikan bahwa ananda *${student.name}* (Kelas ${student.class}) telah *HADIR MASUK (DATANG)* di gerbang sekolah:\n\n⏰ Waktu Datang: *${timeStr}*\n📍 Lokasi: *Gate Terminal Utama*\n⚡ Status: *${isLate ? '⚠️ Terlambat Masuk' : 'Tepat Waktu ✅'}*\n🛡️ Metode: *${methodStr}*\n\n_Catatan: Data kehadiran telah tersimpan aman._`
      : `🏫 *${schoolTitle}*\n_Sistem Presensi Biometrik Wajah (Attendly)_\n\nYth. Orang Tua/Wali dari *${student.parentName}*,\nKami menginformasikan bahwa ananda *${student.name}* (Kelas ${student.class}) telah *SELESAI KBM & PULANG* dari sekolah:\n\n⏰ Waktu Pulang: *${timeStr}*\n📍 Lokasi: *Gate Terminal Utama*\n⚡ Status: *Selesai KBM / Pulang ✅*\n🛡️ Metode: *${methodStr}*\n\n_Catatan: Siswa telah tercatat keluar area gerbang sekolah._`;

    const newWa: WhatsAppLog = {
      id: `WA-${Date.now().toString().slice(-6)}`,
      studentId: student.id,
      studentName: student.name,
      photoUrl: student.photoUrl || null,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      messageType: isDatang ? (isLate ? 'Late' : 'On Time') : 'Pulang',
      timestamp: timeStr,
      status: isPhoneValid ? 'DELIVERED_READ' : 'GAGAL (Nomor Tidak Valid)',
      deliveryStatus,
      retryCount: 1,
      content: messageContent,
      attendanceType
    };

    setWhatsappLogs(prev => [newWa, ...prev]);
    setLastWhatsAppMessage(newWa);

    if (isPhoneValid) {
      logAudit(
        'WHATSAPP_NOTIFICATION_DISPATCHED',
        `Notifikasi WhatsApp (${attendanceType}) terkirim ke orang tua (${student.parentPhone} / ${student.parentName}) untuk ${student.name}.`,
        'System Worker'
      );
    } else {
      logAudit(
        'WHATSAPP_DISPATCH_VALIDATION_FAILED',
        `Pengiriman notifikasi tertahan: Nomor WhatsApp ${student.parentPhone} tidak valid untuk siswa ${student.name}.`,
        'System Worker',
        'WARNING'
      );
    }
  };

  // 🛡️ RE-SEND MECHANISM FOR WHATSAPP NOTIFICATION
  const resendWhatsAppNotification = async (waLogId: string): Promise<boolean> => {
    const waLog = whatsappLogs.find(w => w.id === waLogId);
    if (!waLog) {
      notify('Catatan notifikasi WhatsApp tidak ditemukan.', 'error');
      return false;
    }

    const newTimestamp = new Date().toLocaleTimeString('id-ID') + ' WIB';
    const newRetryCount = (waLog.retryCount || 1) + 1;

    setWhatsappLogs(prev =>
      prev.map(w =>
        w.id === waLogId
          ? {
              ...w,
              timestamp: newTimestamp,
              retryCount: newRetryCount,
              deliveryStatus: 'DELIVERED',
              status: `Terkirim Ulang (Percobaan ${newRetryCount})`
            }
          : w
      )
    );

    logAudit(
      'WHATSAPP_NOTIFICATION_RESENT',
      `Notifikasi WhatsApp untuk ${waLog.studentName} ke ${waLog.parentPhone} berhasil dikirim ulang (Percobaan ${newRetryCount}).`,
      currentRole,
      'SUCCESS'
    );

    notify(`✅ Notifikasi WhatsApp berhasil dikirim ulang ke ${waLog.parentName} (${waLog.parentPhone}).`, 'success');
    return true;
  };

  // 🛡️ NOTIFIKASI KOREKSI / REVISI KE ORANG TUA
  const dispatchCorrectionWhatsApp = async (
    log: AttendanceLog,
    correctionNote: string
  ): Promise<boolean> => {
    const student = students.find(s => s.id === log.studentId);
    if (!student) {
      notify('Siswa tidak ditemukan untuk pengiriman notifikasi koreksi.', 'error');
      return false;
    }

    const schoolTitle = (activeSchool?.name || 'SMA Harapan Nusantara').toUpperCase();
    const timeStr = new Date().toLocaleTimeString('id-ID') + ' WIB';

    const correctionContent = `🏫 *${schoolTitle}*\n_Pemberitahuan Resmi: Koreksi / Pembaharuan Presensi_\n\nYth. Orang Tua/Wali dari *${student.parentName}*,\nKami menginformasikan adanya *PEMBARUAN / KOREKSI DATA KEHADIRAN* untuk ananda *${student.name}* (Kelas ${student.class}):\n\n📌 Status Resmi: *${log.status}*\n⏰ Waktu Terverifikasi: *${log.timeString || log.timestamp}*\n🛡️ Metode: *${log.method}*\n📝 Catatan Koreksi: *${correctionNote}*\n👤 Diverifikasi Oleh: *${currentUser.name} (${currentUser.title})*\n\n_Mohon maaf atas kekeliruan sebelumnya. Sistem telah memperbarui data kehadiran ananda secara resmi._`;

    const newWa: WhatsAppLog = {
      id: `WA-CORR-${Date.now().toString().slice(-6)}`,
      studentId: student.id,
      studentName: student.name,
      photoUrl: student.photoUrl || null,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      messageType: 'Koreksi Presensi',
      timestamp: timeStr,
      status: 'DELIVERED_READ',
      content: correctionContent,
      attendanceType: log.attendanceType || 'DATANG',
      isCorrection: true,
      deliveryStatus: 'REVISED'
    };

    setWhatsappLogs(prev => [newWa, ...prev]);
    setLastWhatsAppMessage(newWa);

    logAudit(
      'WHATSAPP_CORRECTION_DISPATCHED',
      `Notifikasi koreksi kehadiran terkirim ke ${student.parentName} (${student.parentPhone}) untuk ${student.name}.`,
      currentRole,
      'SUCCESS'
    );

    notify(`✅ Pesan klarifikasi & koreksi presensi terkirim ke orang tua (${student.parentPhone}).`, 'success');
    return true;
  };

  // 🛡️ SOLUSI 2: METODE ABSENSI CADANGAN (Wajah Tidak Terdeteksi / Masker / Masalah Kamera)
  const recordManualFallbackAttendance = (
    studentId: string,
    reason: string,
    mode?: AttendanceScanType
  ): { recorded: boolean; message: string } => {
    const targetStudent = students.find(s => s.id === studentId);
    if (!targetStudent) {
      notify('Data siswa tidak ditemukan dalam direktori.', 'error');
      return { recorded: false, message: 'Siswa tidak ditemukan' };
    }

    const now = new Date();
    const todayDate = formatAttendanceDate(now);
    const timeStr = formatAttendanceTime(now);
    const fullTimeDisplay = `${timeStr} WIB`;
    const activeMode = mode || gateAttendanceMode;

    // Check duplicate
    const alreadyAttended = isAlreadyAttendedToday(targetStudent.id, todayDate, attendanceLogs, activeMode);
    if (alreadyAttended) {
      const msg = `${targetStudent.name} sudah tercatat absen ${activeMode === 'DATANG' ? 'Datang' : 'Pulang'} hari ini.`;
      notify(msg, 'warning');
      return { recorded: false, message: msg };
    }

    let statusText = 'Pulang';
    let isLate = false;
    if (activeMode === 'DATANG') {
      statusText = evaluateAttendancePunctuality(now, cutoffTime);
      isLate = statusText === 'Late';
    }

    const newLog: AttendanceLog = {
      id: `ATT-FB-${Date.now().toString().slice(-6)}`,
      studentId: targetStudent.id,
      studentName: targetStudent.name,
      photoUrl: targetStudent.photoUrl || null,
      class: targetStudent.class,
      timestamp: `${todayDate}, ${fullTimeDisplay}`,
      dateString: todayDate,
      timeString: timeStr,
      method: `Cadangan Manual (${reason})`,
      confidence: '100% (Verifikasi Manual)',
      confidenceScore: 1.0,
      qualityScore: 'Manual Override',
      processingNode: `${activeSchool?.name || 'Gate'} Terminal (Operator: ${currentUser.name})`,
      storageStatus: isOnline && supabaseConnected ? 'Supabase Cloud Sync' : 'Local Storage Sync (Queued)',
      status: activeMode === 'DATANG' ? statusText : 'Pulang',
      speed: 'Stationary Check-in',
      attendanceType: activeMode,
      verificationStatus: 'MANUALLY_VERIFIED',
      fallbackReason: reason,
      syncedToCloud: isOnline && supabaseConnected,
      manualVerifiedBy: currentUser.name
    };

    setAttendanceLogs(prev => [newLog, ...prev]);
    setLastDetectedStudent({ ...targetStudent, log: newLog });

    // Update lastSeen on student
    setStudents(prev =>
      prev.map(s => (s.id === targetStudent.id ? { ...s, lastSeen: `Cadangan (${activeMode}) ${fullTimeDisplay}` } : s))
    );

    // Audit log
    logAudit(
      'MANUAL_FALLBACK_ATTENDANCE',
      `Absensi cadangan dicatat untuk ${targetStudent.name} (${targetStudent.id}) karena: "${reason}" oleh ${currentUser.name}.`,
      currentRole,
      'SUCCESS'
    );

    // Push to Supabase if online
    if (isOnline) {
      insertAttendanceToSupabase(newLog).catch(err => {
        console.warn('Fallback attendance cloud sync error:', err);
      });
    }

    // Send WhatsApp notification
    dispatchParentWhatsApp(
      targetStudent,
      fullTimeDisplay,
      `Metode Cadangan Manual (${reason})`,
      isLate,
      activeMode
    );

    const successMsg = `✅ [Cadangan ${activeMode}] ${targetStudent.name} berhasil dicatat (${reason}). Data aman & WA terkirim.`;
    notify(successMsg, 'success');
    return { recorded: true, message: successMsg };
  };

  // 🛡️ SOLUSI 1: VERIFIKASI MANUAL & SENGKETA/KOREKSI LOG (Salah Mengenali Wajah)
  const verifyOrDisputeAttendance = async (
    logId: string,
    action: 'VERIFY' | 'DISPUTE' | 'REASSIGN',
    reassignStudentId?: string,
    note?: string
  ): Promise<{ success: boolean; message: string }> => {
    const existingLog = attendanceLogs.find(l => l.id === logId);
    if (!existingLog) {
      return { success: false, message: 'Catatan presensi tidak ditemukan.' };
    }

    if (action === 'VERIFY') {
      setAttendanceLogs(prev =>
        prev.map(l =>
          l.id === logId
            ? { ...l, verificationStatus: 'MANUALLY_VERIFIED', manualVerifiedBy: currentUser.name }
            : l
        )
      );
      logAudit(
        'ATTENDANCE_MANUALLY_VERIFIED',
        `Presensi ${existingLog.studentName} (${existingLog.id}) telah diverifikasi valid oleh ${currentUser.name}.`,
        currentRole,
        'SUCCESS'
      );
      notify(`Presensi ${existingLog.studentName} telah diverifikasi valid.`, 'success');
      return { success: true, message: 'Presensi diverifikasi' };
    }

    if (action === 'DISPUTE') {
      setAttendanceLogs(prev =>
        prev.map(l =>
          l.id === logId
            ? {
                ...l,
                verificationStatus: 'DISPUTED',
                disputeNote: note || 'Dibatalkan oleh operator karena salah kenali wajah.',
                manualVerifiedBy: currentUser.name
              }
            : l
        )
      );
      logAudit(
        'ATTENDANCE_DISPUTED',
        `Presensi ${existingLog.studentName} (${existingLog.id}) ditandai tidak valid (Dispute): ${note}`,
        currentRole,
        'WARNING'
      );
      notify(`Presensi ${existingLog.studentName} ditandai tidak valid (Dispute).`, 'warning');
      return { success: true, message: 'Presensi ditandai tidak valid' };
    }

    if (action === 'REASSIGN' && reassignStudentId) {
      const correctStudent = students.find(s => s.id === reassignStudentId);
      if (!correctStudent) {
        return { success: false, message: 'Siswa tujuan koreksi tidak ditemukan.' };
      }

      const prevStudentName = existingLog.studentName;
      setAttendanceLogs(prev =>
        prev.map(l =>
          l.id === logId
            ? {
                ...l,
                studentId: correctStudent.id,
                studentName: correctStudent.name,
                class: correctStudent.class,
                photoUrl: correctStudent.photoUrl || null,
                verificationStatus: 'MANUALLY_VERIFIED',
                manualVerifiedBy: currentUser.name,
                disputeNote: `Dikoreksi dari ${prevStudentName}. Catatan: ${note || 'Salah deteksi wajah awal.'}`
              }
            : l
        )
      );

      logAudit(
        'ATTENDANCE_REASSIGNED',
        `Koreksi salah wajah: Presensi log ${logId} dipindahkan dari ${prevStudentName} ke ${correctStudent.name} (${correctStudent.id}) oleh ${currentUser.name}.`,
        currentRole,
        'SUCCESS'
      );

      notify(`Data presensi berhasil dikoreksi ke: ${correctStudent.name} (${correctStudent.class}).`, 'success');
      return { success: true, message: 'Berhasil dikoreksi' };
    }

    return { success: false, message: 'Aksi tidak valid' };
  };

  // Handle Walk-Through Detection Event (Absen Datang vs Pulang & Anti-Duplikasi Ketat)
  const processWalkThroughAttendance = (
    student: Student,
    speed = '1.4 m/s',
    forcedMode?: AttendanceScanType
  ): { recorded: boolean; alreadyAttended: boolean; attendanceType: AttendanceScanType; message?: string } => {
    const now = new Date();
    const todayDate = formatAttendanceDate(now);
    const timeStr = formatAttendanceTime(now);
    const fullTimeDisplay = `${timeStr} WIB`;
    const activeMode = forcedMode || gateAttendanceMode;

    // Proteksi 1: Siswa tidak boleh 2x absen dalam tipe yang sama di hari yang sama
    const alreadyAttended = isAlreadyAttendedToday(student.id, todayDate, attendanceLogs, activeMode);
    if (alreadyAttended) {
      return {
        recorded: false,
        alreadyAttended: true,
        attendanceType: activeMode,
        message: `${student.name} sudah tercatat absen ${activeMode === 'DATANG' ? 'Datang' : 'Pulang'} hari ini.`
      };
    }

    // Evaluasi status ketepatan waktu hanya untuk DATANG
    let statusText = 'Pulang';
    let isLate = false;
    if (activeMode === 'DATANG') {
      statusText = evaluateAttendancePunctuality(now, cutoffTime);
      isLate = statusText === 'Late';
    }

    // 🛡️ AMBANG BATAS KECOCOKAN WAJAH (CONFIDENCE THRESHOLD)
    const simulatedConfidence = 96.5;
    const isBelowThreshold = simulatedConfidence < confidenceThreshold;
    const vStatus: VerificationStatus = isBelowThreshold ? 'NEEDS_MANUAL_REVIEW' : 'VERIFIED';

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
      confidence: `${simulatedConfidence}%${isBelowThreshold ? ' (Perlu Review)' : ''}`,
      confidenceScore: simulatedConfidence / 100,
      qualityScore: isBelowThreshold ? '0.72 (Borderline)' : '0.96 (Optimal)',
      processingNode: `${activeSchool?.name || 'Gate'} Tablet Terminal`,
      storageStatus: isOnline && supabaseConnected ? 'Supabase Cloud Sync' : 'Local Storage Sync (Queued)',
      status: activeMode === 'DATANG' ? statusText : 'Pulang',
      speed: `${speed} (Walking Pace)`,
      attendanceType: activeMode,
      verificationStatus: vStatus,
      syncedToCloud: isOnline && supabaseConnected
    };

    // Update local state
    setAttendanceLogs(prev => [newLog, ...prev]);
    setLastDetectedStudent({ ...student, log: newLog });

    // Update lastSeen on student profile
    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, lastSeen: `${activeMode === 'DATANG' ? 'Datang' : 'Pulang'} ${fullTimeDisplay}` } : s));

    // Audit log
    logAudit(
      `FACE_ATTENDANCE_${activeMode}`,
      `Presensi ${activeMode} untuk ${student.name} (${student.id}) berhasil diverifikasi: ${statusText} (Status: ${vStatus}).`
    );

    // Background push to Supabase if online
    if (isOnline) {
      insertAttendanceToSupabase(newLog).catch(err => {
        console.warn('Background Supabase attendance sync warning:', err);
      });
    }

    // Send WhatsApp alert to parents
    dispatchParentWhatsApp(student, fullTimeDisplay, 'Walk-Through Face Recognition', isLate, activeMode);

    if (isBelowThreshold) {
      notify(`⚠️ [${activeMode}] ${student.name} kecocokan di bawah ambang batas (${confidenceThreshold}%). Ditandai untuk verifikasi manual.`, 'warning');
    } else {
      notify(`✅ [${activeMode === 'DATANG' ? 'Datang' : 'Pulang'}] ${student.name} (${statusText}). Data tersimpan & notifikasi WA terkirim.`);
    }
    return { recorded: true, alreadyAttended: false, attendanceType: activeMode };
  };

  // Reset / Clear Data (Full Factory Reset)
  const resetAllStoredData = () => {
    setStudents([]);
    setAttendanceLogs([]);
    setWhatsappLogs([]);
    setAuditLogs([]);
    try {
      localStorage.setItem('biopass_students', '[]');
      localStorage.setItem('biopass_attendance', '[]');
      localStorage.setItem('biopass_whatsapp', '[]');
      localStorage.setItem('attendly_all_students_cleared', 'true');
      localStorage.setItem('attendly_attendance_cleared', 'true');
      localStorage.setItem('attendly_whatsapp_cleared', 'true');
    } catch (e) {}

    clearAllStudentsInPython().catch(() => {});
    clearAllStudentsFromSupabase().catch(() => {});
    clearAllAttendanceLogsFromSupabase().catch(() => {});

    notify('Seluruh data siswa dan rekaman presensi berhasil dibersihkan permanen.');
  };

  // Bersihkan HANYA catatan presensi log gerbang, profil siswa & biometrik tetap utuh
  const clearAttendanceLogs = () => {
    setAttendanceLogs([]);
    try {
      localStorage.setItem('biopass_attendance', '[]');
      localStorage.setItem('attendly_attendance_cleared', 'true');
    } catch (e) {}

    logAudit(
      'ATTENDANCE_LOGS_CLEARED',
      'Seluruh riwayat presensi log gerbang dibersihkan oleh Administrator. Profil siswa tetap aman.',
      'admin'
    );

    // Hapus permanen dari Supabase cloud agar tidak di-restore kembali saat cloud sync
    clearAllAttendanceLogsFromSupabase().catch(err => {
      console.warn('Supabase clear attendance logs background error:', err);
    });

    notify('Seluruh riwayat presensi berhasil dihapus permanen. Data profil siswa tetap aman.', 'success');
  };

  const contextValue: AppContextType = {
    students,
    setStudents,
    attendanceLogs,
    setAttendanceLogs,
    auditLogs,
    whatsappLogs,
    setWhatsappLogs,
    retentionSettings,
    setRetentionSettings,
    currentUser,
    setCurrentUser: handleSetCurrentUser,
    currentRole,
    setCurrentRole,
    staffUsers,
    currentSchoolStaff,
    createStaffAccount,
    updateStaffAccount,
    deleteStaffAccount,
    provisionQuickRole,
    canAccessTab,
    userAssignedClass,
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
    gateAttendanceMode,
    setGateAttendanceMode,
    toggleGateAttendanceMode,
    resetAllStoredData,
    clearAttendanceLogs,
    supabaseConnected,
    cutoffTime,
    setCutoffTime,
    saveStudent,
    deleteStudent,
    deleteAllStudents,
    theme,
    toggleTheme,
    setTheme,
    schools,
    activeSchool,
    activateSchoolByCode,
    registerNewSchool,
    updateSchoolInfo,
    confidenceThreshold,
    setConfidenceThreshold: handleSetConfidenceThreshold,
    isOnline,
    offlineQueueCount,
    syncOfflineQueue,
    recordManualFallbackAttendance,
    verifyOrDisputeAttendance,
    resendWhatsAppNotification,
    dispatchCorrectionWhatsApp
  };

  // Cache latest active context value for HMR resilience
  const APP_VALUE_KEY = Symbol.for('attendly.app_context_value');
  const g = typeof window !== 'undefined' ? (window as any) : (globalThis as any);
  g[APP_VALUE_KEY] = contextValue;

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    // If context is momentarily detached during HMR or fast reload, fallback to cached instance
    const APP_VALUE_KEY = Symbol.for('attendly.app_context_value');
    const g = typeof window !== 'undefined' ? (window as any) : (globalThis as any);
    const cached = g[APP_VALUE_KEY];
    if (cached) {
      return cached;
    }
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
