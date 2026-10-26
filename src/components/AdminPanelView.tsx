import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  Building2,
  KeyRound,
  SlidersHorizontal,
  Users,
  Copy,
  Check,
  PlusCircle,
  School,
  GraduationCap,
  Clock,
  Sparkles,
  Upload,
  Trash2,
  Camera,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Shield,
  RefreshCw,
  FileSpreadsheet,
  Lock,
  Layers,
  Settings,
  Wifi,
  WifiOff,
  AlertTriangle
} from 'lucide-react';
import { SchoolTenant, InstitutionType, UserProfile, RoleType, PRESET_USERS } from '../types';
import { REGISTERED_SCHOOLS } from '../data/mockData';

const PRESET_SAMPLE_LOGOS = [
  {
    name: 'ITS Surabaya',
    type: 'UNIVERSITAS' as InstitutionType,
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23013880"/><circle cx="50" cy="50" r="41" fill="none" stroke="%23FBBF24" stroke-width="4"/><polygon points="50,18 60,38 82,38 64,52 71,74 50,60 29,74 36,52 18,38 40,38" fill="%23FBBF24"/><text x="50" y="90" font-size="13" font-weight="900" fill="%23FFFFFF" text-anchor="middle" font-family="sans-serif">ITS</text></svg>'
  },
  {
    name: 'Universitas Indonesia',
    type: 'UNIVERSITAS' as InstitutionType,
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23F59E0B"/><circle cx="50" cy="50" r="41" fill="%230F172A"/><circle cx="50" cy="50" r="28" fill="%23FBBF24"/><text x="50" y="57" font-size="20" font-weight="900" fill="%230F172A" text-anchor="middle" font-family="sans-serif">UI</text><text x="50" y="86" font-size="8" font-weight="bold" fill="%23FBBF24" text-anchor="middle" font-family="sans-serif">VERITAS</text></svg>'
  },
  {
    name: 'UGM Yogyakarta',
    type: 'UNIVERSITAS' as InstitutionType,
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23047857"/><circle cx="50" cy="50" r="41" fill="%23064E3B"/><polygon points="50,20 62,36 82,38 68,52 72,72 50,62 28,72 32,52 18,38 38,36" fill="%23FBBF24"/><text x="50" y="88" font-size="12" font-weight="900" fill="%23FFFFFF" text-anchor="middle" font-family="sans-serif">UGM</text></svg>'
  },
  {
    name: 'Logo Sekolah Hijau',
    type: 'SEKOLAH' as InstitutionType,
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%2310B981"/><circle cx="50" cy="50" r="41" fill="%23064E3B"/><polygon points="50,22 72,40 72,66 50,82 28,66 28,40" fill="%2334D399"/><text x="50" y="58" font-size="16" font-weight="900" fill="%23022C22" text-anchor="middle" font-family="sans-serif">SCH</text></svg>'
  }
];

export interface AdminPanelViewProps {
  onHide?: () => void;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({ onHide }) => {
  const {
    activeSchool,
    schools,
    activateSchoolByCode,
    registerNewSchool,
    students,
    cutoffTime,
    setCutoffTime,
    currentUser,
    setCurrentUser,
    staffUsers,
    currentSchoolStaff,
    createStaffAccount,
    updateStaffAccount,
    deleteStaffAccount,
    provisionQuickRole,
    waAutoSendEnabled,
    setWaAutoSendEnabled,
    confidenceThreshold,
    setConfidenceThreshold,
    isOnline,
    offlineQueueCount,
    syncOfflineQueue,
    auditLogs,
    deleteAllStudents,
    resetAllStoredData,
    setActiveTab,
    theme,
    notify
  } = useApp();

  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

  const isDark = theme === 'dark';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Staff Account Provisioning State
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffRoleInput, setStaffRoleInput] = useState<RoleType>('guru_bk');
  const [staffNameInput, setStaffNameInput] = useState('');
  const [staffTitleInput, setStaffTitleInput] = useState('');
  const [staffNipInput, setStaffNipInput] = useState('');
  const [staffEmailInput, setStaffEmailInput] = useState('');
  const [staffPhoneInput, setStaffPhoneInput] = useState('');
  const [staffNotesInput, setStaffNotesInput] = useState('');

  const handleCreateStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffNameInput.trim()) {
      notify('Nama lengkap staf wajib diisi', 'error');
      return;
    }

    const defaultTitle = 
      staffRoleInput === 'guru_bk' ? 'Guru Bimbingan & Konseling (BK)' :
      staffRoleInput === 'kepala_sekolah' ? (activeSchool?.institutionType === 'UNIVERSITAS' ? 'Rektor Instansi' : 'Kepala Sekolah') :
      staffRoleInput === 'pengawas' ? 'Pengawas Pembina Sekolah (Dinas)' :
      staffRoleInput === 'wali_kelas' ? 'Wali Kelas' : 'Administrator Sistem';

    createStaffAccount({
      schoolId: activeSchool.id,
      name: staffNameInput.trim(),
      role: staffRoleInput,
      title: staffTitleInput.trim() || defaultTitle,
      nip: staffNipInput.trim() || undefined,
      email: staffEmailInput.trim() || undefined,
      phone: staffPhoneInput.trim() || undefined,
      notes: staffNotesInput.trim() || undefined
    });

    setStaffNameInput('');
    setStaffTitleInput('');
    setStaffNipInput('');
    setStaffEmailInput('');
    setStaffPhoneInput('');
    setStaffNotesInput('');
    setShowAddStaffModal(false);
  };

  // Sub-Navigation Tabs inside the dedicated Admin Panel
  const [adminTab, setAdminTab] = useState<'institutions' | 'activation' | 'config' | 'users' | 'security'>('institutions');

  // Activation & Form states
  const [activationInput, setActivationInput] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Institution Form State
  const [newInstitutionType, setNewInstitutionType] = useState<InstitutionType>('UNIVERSITAS');
  const [newName, setNewName] = useState('');
  const [newNpsn, setNewNpsn] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newMaxStudents, setNewMaxStudents] = useState<number>(10000);
  const [newLogoUrl, setNewLogoUrl] = useState<string>('');

  // Cutoff settings state
  const [tempCutoff, setTempCutoff] = useState<string>(cutoffTime);

  // Multi-angle face scanning threshold
  const [faceTolerance, setFaceTolerance] = useState<number>(0.50);
  const [multiAngleEnabled, setMultiAngleEnabled] = useState<boolean>(true);

  // Danger zone confirmation
  const [showPurgeModal, setShowPurgeModal] = useState<boolean>(false);
  const [isPurging, setIsPurging] = useState<boolean>(false);

  const currentSchool = activeSchool || schools?.[0] || REGISTERED_SCHOOLS[0];
  const isCurrentUniv = currentSchool?.institutionType === 'UNIVERSITAS';
  const enrolledCount = students.length;
  const maxStudentsCount = Number(currentSchool?.maxStudents) || 1000;
  const quotaPercent = Math.min(100, Math.round((enrolledCount / maxStudentsCount) * 100));

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    notify(`Kode lisensi "${code}" berhasil disalin ke clipboard!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'File harus berupa format gambar (PNG, JPG, SVG, WebP).' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Ukuran file logo maksimal 2 MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      setNewLogoUrl(result);
      setFeedback({ type: 'success', message: `Logo "${file.name}" berhasil diunggah.` });
    };
    reader.readAsDataURL(file);
  };

  const handleActivateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const result = activateSchoolByCode(activationInput);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setActivationInput('');
      notify(result.message, 'success');
      setTimeout(() => {
        setAdminTab('institutions');
        setFeedback(null);
      }, 1500);
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const handleQuickActivate = (code: string) => {
    const result = activateSchoolByCode(code);
    if (result.success) {
      notify(result.message, 'success');
      setFeedback({ type: 'success', message: result.message });
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newNpsn.trim() || !newAdminName.trim()) {
      setFeedback({
        type: 'error',
        message: `Mohon lengkapi Nama ${newInstitutionType === 'UNIVERSITAS' ? 'Universitas' : 'Sekolah'}, Kode/NPSN, dan Nama Administrator.`
      });
      return;
    }

    let finalLogo = newLogoUrl.trim();
    if (!finalLogo) {
      const initial = newName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'UNV';
      const bgColor = newInstitutionType === 'UNIVERSITAS' ? '%230284C7' : '%2310B981';
      finalLogo = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="${bgColor}"/><circle cx="50" cy="50" r="41" fill="%230F172A"/><text x="50" y="58" font-size="18" font-weight="900" fill="%23FFFFFF" text-anchor="middle" font-family="sans-serif">${initial}</text></svg>`;
    }

    const isUniv = newInstitutionType === 'UNIVERSITAS';

    const created = registerNewSchool({
      name: newName.trim(),
      institutionType: newInstitutionType,
      logoUrl: finalLogo,
      npsn: newNpsn.trim(),
      address: newAddress.trim() || (isUniv ? 'Kampus Terpadu Belum Diatur' : 'Alamat Sekolah Belum Diatur'),
      phone: newPhone.trim() || '021-0000000',
      adminName: newAdminName.trim(),
      adminEmail: newAdminEmail.trim() || (isUniv ? 'admin@univ.ac.id' : 'admin@sekolah.sch.id'),
      adminPhone: newAdminPhone.trim() || '0812-0000-0000',
      licenseType: isUniv ? 'ENTERPRISE_CAMPUS' : 'ENTERPRISE_SCHOOL',
      validUntil: '31 Desember 2028',
      maxStudents: Number(newMaxStudents) || (isUniv ? 20000 : 1500),
      gateCorridors: isUniv
        ? ['Gate Utama Kampus', 'Gate Rektorat & Gedung Kuliah Bersama']
        : ['Gate Corridor Utama (Auto)']
    });

    notify(`${isUniv ? 'Universitas' : 'Sekolah'} "${created.name}" berhasil didaftarkan! Kode: ${created.activationCode}`, 'success');
    setFeedback({
      type: 'success',
      message: `${isUniv ? 'Universitas' : 'Sekolah'} "${created.name}" berhasil didaftarkan! Kode Lisensi: ${created.activationCode}`
    });

    // Reset Form
    setNewName('');
    setNewNpsn('');
    setNewAddress('');
    setNewPhone('');
    setNewAdminName('');
    setNewAdminEmail('');
    setNewAdminPhone('');
    setNewLogoUrl('');

    setTimeout(() => {
      setAdminTab('institutions');
      setFeedback(null);
    }, 2000);
  };

  const handleSaveCutoff = () => {
    setCutoffTime(tempCutoff);
    notify(`Batas waktu presensi (cutoff) diperbarui ke pukul ${tempCutoff} WIB`, 'success');
  };

  const handlePurgeAllStudents = async () => {
    setIsPurging(true);
    try {
      await deleteAllStudents();
      notify('Seluruh data siswa berhasil dibersihkan dari memori dan database!', 'success');
      setShowPurgeModal(false);
    } catch {
      notify('Gagal membersihkan data siswa', 'error');
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Top Banner / Portal Header */}
      <div
        className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden backdrop-blur-xl ${
          isDark
            ? 'bg-[#0a1222] border-blue-900/40 shadow-[0_10px_30px_rgba(0,0,0,0.5)]'
            : 'bg-white border-slate-200 shadow-md'
        }`}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#174384] text-white border border-blue-400/30 flex items-center justify-center font-bold shadow-lg shrink-0">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  Panel Administrasi Instansi & Sistem
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Dedicated Admin Console
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-white/10">
                  1 Instansi = 1 Kode
                </span>
              </div>
              <p className={`text-xs sm:text-sm mt-1 max-w-3xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Portal terpusat untuk mengelola profil sekolah/universitas, pendaftaran kode lisensi unik, batas waktu presensi gerbang, hak akses pengguna, serta tata kelola privasi data biometrik.
              </p>
            </div>
          </div>

          {/* Quick Return & Active School Pill */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div
              className={`flex items-center gap-3 px-4 py-2 rounded-2xl border ${
                isDark ? 'bg-slate-950/60 border-white/10' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/10 p-1 flex items-center justify-center overflow-hidden">
                {currentSchool?.logoUrl ? (
                  <img src={currentSchool.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <School className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <div className="text-left text-xs leading-tight">
                <div className="font-bold truncate max-w-[150px]">{currentSchool?.name}</div>
                <div className="text-[10px] font-mono text-emerald-500 font-semibold">{currentSchool?.activationCode}</div>
              </div>
            </div>

            <button
              onClick={() => {
                if (onHide) {
                  onHide();
                } else {
                  setActiveTab('scanner');
                }
              }}
              className="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali & Sembunyikan Panel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div
        className={`flex items-center gap-2 p-1.5 rounded-2xl border overflow-x-auto ${
          isDark ? 'bg-slate-900/80 border-white/10' : 'bg-slate-100 border-slate-200'
        }`}
      >
        <button
          onClick={() => {
            setAdminTab('institutions');
            setFeedback(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            adminTab === 'institutions'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
              : isDark
              ? 'text-slate-400 hover:text-white hover:bg-white/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Instansi & Lisensi</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              adminTab === 'institutions' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {schools?.length || REGISTERED_SCHOOLS.length}
          </span>
        </button>

        <button
          onClick={() => {
            setAdminTab('activation');
            setFeedback(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            adminTab === 'activation'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
              : isDark
              ? 'text-slate-400 hover:text-white hover:bg-white/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Aktivasi Kode Terminal</span>
        </button>

        <button
          onClick={() => {
            setAdminTab('config');
            setFeedback(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            adminTab === 'config'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
              : isDark
              ? 'text-slate-400 hover:text-white hover:bg-white/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Konfigurasi Gerbang & Presensi</span>
        </button>

        <button
          onClick={() => {
            setAdminTab('users');
            setFeedback(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            adminTab === 'users'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
              : isDark
              ? 'text-slate-400 hover:text-white hover:bg-white/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Hak Akses & Pengguna (RBAC)</span>
        </button>

        <button
          onClick={() => {
            setAdminTab('security');
            setFeedback(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            adminTab === 'security'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
              : isDark
              ? 'text-slate-400 hover:text-white hover:bg-white/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Keamanan & Privasi Data</span>
        </button>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-semibold animate-in fade-in duration-150 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 1: INSTANSI & LISENSI                                            */}
      {/* ========================================================================= */}
      {adminTab === 'institutions' && (
        <div className="space-y-6">
          {/* Active Institution Card */}
          <div
            className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden ${
              isDark
                ? 'bg-[#0b101b] border-white/10 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
              <div className="flex items-center gap-4">
                <div
                  className={`w-18 h-18 rounded-2xl border p-2 flex items-center justify-center shrink-0 shadow-inner ${
                    isDark ? 'bg-slate-950 border-white/15' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  {currentSchool?.logoUrl ? (
                    <img
                      src={currentSchool.logoUrl}
                      alt={currentSchool.name}
                      className="w-full h-full object-contain"
                    />
                  ) : isCurrentUniv ? (
                    <GraduationCap className="w-8 h-8 text-sky-400" />
                  ) : (
                    <School className="w-8 h-8 text-emerald-400" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                        isCurrentUniv
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {currentSchool?.institutionType || 'SEKOLAH'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LISENSI AKTIF
                    </span>
                  </div>

                  <h2 className="text-xl font-black tracking-tight mt-1">{currentSchool?.name}</h2>
                  <p className={`text-xs flex items-center gap-2 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{currentSchool?.address}</span>
                  </p>
                </div>
              </div>

              {/* Unique Activation Code Pill with Copy */}
              <div
                className={`p-4 rounded-2xl border flex flex-col gap-2 min-w-[280px] ${
                  isDark ? 'bg-slate-950/70 border-emerald-500/30' : 'bg-emerald-50/60 border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-500 font-bold">
                    KODE AKTIVASI TUNGGAL
                  </span>
                  <button
                    onClick={() => handleCopyCode(currentSchool?.activationCode || '')}
                    className="text-[11px] font-semibold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode === currentSchool?.activationCode ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Kode</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="font-mono text-base font-extrabold text-white bg-slate-900 px-3 py-1.5 rounded-xl border border-white/10 tracking-widest text-center select-all">
                  {currentSchool?.activationCode}
                </div>
                <span className={`text-[10px] text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  1 instansi hanya memerlukan 1 kode ini untuk sinkronisasi seluruh gate
                </span>
              </div>
            </div>

            {/* Institutional Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>NPSN / Kode Dikti</div>
                <div className="font-mono font-bold text-sm mt-0.5">{currentSchool?.npsn}</div>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>PIC Administrator</div>
                <div className="font-bold text-sm mt-0.5 truncate">{currentSchool?.adminName}</div>
                <div className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{currentSchool?.adminEmail}</div>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Masa Berlaku Lisensi</div>
                <div className="font-bold text-sm mt-0.5 text-emerald-500">{currentSchool?.validUntil}</div>
                <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{currentSchool?.licenseType}</div>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Kuota Siswa/Mahasiswa</span>
                  <span className="font-mono font-bold text-emerald-500">{quotaPercent}%</span>
                </div>
                <div className="font-bold text-sm mt-0.5">
                  {enrolledCount.toLocaleString()} / {maxStudentsCount.toLocaleString()}
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${quotaPercent}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Registered Schools and Universities Multi-Tenant List */}
          <div
            className={`p-6 rounded-3xl border shadow-xl ${
              isDark ? 'bg-[#0b101b] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold tracking-tight">Daftar Instansi Terdaftar di Sistem</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Pilih instansi untuk beralih profil aktif atau salin kode aktivasi masing-masing instansi.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-3 py-1 rounded-xl bg-slate-800 text-slate-300 border border-white/10">
                  Total: {schools?.length || REGISTERED_SCHOOLS.length} Instansi
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(schools || REGISTERED_SCHOOLS).map((school: SchoolTenant) => {
                const isActive = school.id === currentSchool?.id;
                const isUniv = school.institutionType === 'UNIVERSITAS';

                return (
                  <div
                    key={school.id}
                    className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${
                      isActive
                        ? isDark
                          ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                          : 'bg-emerald-50/70 border-emerald-300 shadow-md'
                        : isDark
                        ? 'bg-slate-950/40 border-white/5 hover:border-white/20'
                        : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-11 h-11 rounded-xl border p-1.5 flex items-center justify-center shrink-0 ${
                              isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
                            }`}
                          >
                            {school.logoUrl ? (
                              <img src={school.logoUrl} alt={school.name} className="w-full h-full object-contain" />
                            ) : isUniv ? (
                              <GraduationCap className="w-5 h-5 text-sky-400" />
                            ) : (
                              <School className="w-5 h-5 text-emerald-400" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                  isUniv ? 'bg-sky-500/20 text-sky-400' : 'bg-emerald-500/20 text-emerald-400'
                                }`}
                              >
                                {isUniv ? 'KAMPUS' : 'SEKOLAH'}
                              </span>
                              {isActive && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950">
                                  AKTIF
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-xs sm:text-sm mt-1 leading-tight line-clamp-1">
                              {school.name}
                            </h4>
                            <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {isUniv ? 'Kode PT' : 'NPSN'}: {school.npsn}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Kode Aktivasi:</span>
                          <span className="font-mono font-bold text-emerald-500 text-[10px]">
                            {school.activationCode}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Kapasitas:</span>
                          <span className="font-semibold text-[11px]">
                            {(Number(school.maxStudents) || 1000).toLocaleString()} Kuota
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.06]">
                      <button
                        onClick={() => handleCopyCode(school.activationCode)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                          isDark
                            ? 'bg-slate-900 hover:bg-slate-800 border-white/10 text-slate-300'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                        title="Salin Kode Aktivasi"
                      >
                        {copiedCode === school.activationCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Kode</span>
                          </>
                        )}
                      </button>

                      {!isActive && (
                        <button
                          onClick={() => handleQuickActivate(school.activationCode)}
                          className="py-1.5 px-3 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all cursor-pointer shadow-sm"
                        >
                          Aktifkan
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Registration Form: New School or University */}
          <div
            className={`p-6 rounded-3xl border shadow-xl ${
              isDark ? 'bg-[#0b101b] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">Daftarkan Sekolah atau Universitas Baru</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Sistem akan otomatis menerbitkan 1 Kode Aktivasi Unik terenkripsi untuk instansi ini.
                </p>
              </div>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-5">
              {/* Type Switcher: Universitas vs Sekolah */}
              <div>
                <label className={`block text-xs font-mono uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Jenis Institusi Pendidikan
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <button
                    type="button"
                    onClick={() => {
                      setNewInstitutionType('UNIVERSITAS');
                      if (newMaxStudents < 5000) setNewMaxStudents(20000);
                    }}
                    className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                      newInstitutionType === 'UNIVERSITAS'
                        ? 'bg-sky-500/15 border-sky-500/50 text-white shadow-sm'
                        : isDark
                        ? 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <GraduationCap
                      className={`w-5 h-5 ${newInstitutionType === 'UNIVERSITAS' ? 'text-sky-400' : 'opacity-60'}`}
                    />
                    <div className="text-left">
                      <div className="font-bold text-xs">Universitas / Kampus</div>
                      <div className="text-[10px] opacity-70">Kode PT Dikti & Rektorat</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewInstitutionType('SEKOLAH');
                      if (newMaxStudents > 5000) setNewMaxStudents(1500);
                    }}
                    className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                      newInstitutionType === 'SEKOLAH'
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-sm'
                        : isDark
                        ? 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <School
                      className={`w-5 h-5 ${newInstitutionType === 'SEKOLAH' ? 'text-emerald-400' : 'opacity-60'}`}
                    />
                    <div className="text-left">
                      <div className="font-bold text-xs">Sekolah Menengah/Dasar</div>
                      <div className="text-[10px] opacity-70">NPSN Kemendikbudristek</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Institution Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-mono uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Nama {newInstitutionType === 'UNIVERSITAS' ? 'Universitas / Institut' : 'Sekolah'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={newInstitutionType === 'UNIVERSITAS' ? 'Contoh: Institut Teknologi Sepuluh Nopember' : 'Contoh: SMA Negeri 1 Surabaya'}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-mono uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {newInstitutionType === 'UNIVERSITAS' ? 'Kode PT / PDDIKTI' : 'NPSN Sekolah'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={newInstitutionType === 'UNIVERSITAS' ? 'Contoh: 001001 (6 Digit)' : 'Contoh: 20532145 (8 Digit)'}
                    value={newNpsn}
                    onChange={e => setNewNpsn(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Address and Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-mono uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Alamat Lengkap Kampus / Sekolah
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kampus ITS Sukolilo, Surabaya 60111"
                    value={newAddress}
                    onChange={e => setNewAddress(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-mono uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Kuota Maksimal Mahasiswa/Siswa
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="500"
                    value={newMaxStudents}
                    onChange={e => setNewMaxStudents(Number(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Administrator Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-white/[0.06]">
                <div>
                  <label className={`block text-xs font-mono uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Nama Administrator / PIC *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Rahmat Santoso, S.Kom"
                    value={newAdminName}
                    onChange={e => setNewAdminName(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-mono uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Email Resmi Admin
                  </label>
                  <input
                    type="email"
                    placeholder="admin@its.ac.id"
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-mono uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    No. WhatsApp PIC Gerbang
                  </label>
                  <input
                    type="text"
                    placeholder="0812-3456-7890"
                    value={newAdminPhone}
                    onChange={e => setNewAdminPhone(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Logo Management: File Upload & Presets */}
              <div className="pt-2 border-t border-white/[0.06]">
                <label className={`block text-xs font-mono uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Logo Resmi Institusi
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* File Upload Box */}
                  <div
                    className={`p-4 rounded-2xl border border-dashed flex items-center gap-4 ${
                      isDark ? 'bg-slate-950/60 border-white/15' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoFileChange}
                      accept="image/*"
                      className="hidden"
                    />

                    <div
                      className={`w-14 h-14 rounded-xl border flex items-center justify-center shrink-0 overflow-hidden ${
                        isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
                      }`}
                    >
                      {newLogoUrl ? (
                        <img src={newLogoUrl} alt="Preview" className="w-full h-full object-contain p-1" />
                      ) : (
                        <Upload className="w-6 h-6 text-slate-500" />
                      )}
                    </div>

                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-sm"
                      >
                        Pilih File Logo (PNG, JPG, SVG)
                      </button>
                      <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Maksimal ukuran file 2 MB. Otomatis dikonversi ke vektor base64.
                      </p>
                    </div>

                    {newLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setNewLogoUrl('')}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        title="Hapus Logo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Preset Logos Selector */}
                  <div
                    className={`p-4 rounded-2xl border flex flex-col justify-between ${
                      isDark ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className={`text-[11px] font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Atau pilih logo preset institusi:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {PRESET_SAMPLE_LOGOS.map(sample => (
                        <button
                          key={sample.name}
                          type="button"
                          onClick={() => setNewLogoUrl(sample.url)}
                          className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                            newLogoUrl === sample.url
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                              : isDark
                              ? 'bg-slate-900 border-white/10 text-slate-300 hover:bg-slate-800'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <img src={sample.url} alt="" className="w-4 h-4 object-contain" />
                          <span>{sample.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Daftarkan & Terbitkan Kode Lisensi Unik</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: AKTIVASI KODE TERMINAL                                         */}
      {/* ========================================================================= */}
      {adminTab === 'activation' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div
            className={`p-8 rounded-3xl border shadow-xl ${
              isDark ? 'bg-[#0b101b] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold mb-4 shadow-inner">
              <KeyRound className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-black tracking-tight">Aktivasi Instansi dengan Kode Lisensi</h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Masukkan kode lisensi unik yang telah diterbitkan (format: <code className="text-emerald-500 font-mono">ATND-XXXX-YYYY-ZZZZ</code>). Setiap instansi diisolasi dengan 1 kode unik untuk menjamin kedaulatan data siswa/mahasiswa.
            </p>

            <form onSubmit={handleActivateSubmit} className="mt-6 space-y-4">
              <div>
                <label className={`block text-xs font-mono uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Input Kode Aktivasi
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: ATND-ITS-2026-X7K2"
                    value={activationInput}
                    onChange={e => setActivationInput(e.target.value.toUpperCase())}
                    className={`w-full px-4 py-3.5 rounded-2xl border text-sm font-mono font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark
                        ? 'bg-slate-950 border-white/10 text-white placeholder-slate-600'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <div className="absolute right-3 top-3.5">
                    <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      1 INSTANSI : 1 KODE
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Verifikasi & Aktifkan Lisensi Instansi</span>
              </button>
            </form>

            {/* Quick Demo Selector */}
            <div className="mt-8 pt-6 border-t border-white/[0.08]">
              <span className={`text-xs font-mono font-semibold block mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Kode Cepat untuk Uji Coba Multi-Tenant:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(schools || REGISTERED_SCHOOLS).slice(0, 4).map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActivationInput(s.activationCode);
                      handleQuickActivate(s.activationCode);
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                      isDark
                        ? 'bg-slate-950/60 hover:bg-slate-900 border-white/5 text-slate-300'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-bold truncate">{s.name}</div>
                      <div className="font-mono text-[10px] text-emerald-500">{s.activationCode}</div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-500 shrink-0">Gunakan →</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: KONFIGURASI GERBANG & PRESENSI                                  */}
      {/* ========================================================================= */}
      {adminTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Punctuality Cutoff Config */}
          <div
            className={`p-6 rounded-3xl border shadow-xl space-y-5 ${
              isDark ? 'bg-[#0b101b] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">Ambang Batas Waktu Masuk (Gate Cutoff)</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Menentukan klasifikasi presensi "Tepat Waktu" vs "Terlambat".
                </p>
              </div>
            </div>

            <div>
              <label className={`block text-xs font-mono uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Jam Batas Masuk Pagi (WIB)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={tempCutoff}
                  onChange={e => setTempCutoff(e.target.value)}
                  className={`px-4 py-3 rounded-2xl border text-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  onClick={handleSaveCutoff}
                  className="px-5 py-3 rounded-2xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md cursor-pointer transition-all"
                >
                  Simpan Batas Waktu
                </button>
              </div>
              <p className={`text-[11px] mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Siswa yang terdeteksi sebelum pukul <strong>{cutoffTime} WIB</strong> otomatis berstatus <strong>On Time (Tepat Waktu)</strong>. Siswa yang memindai setelahnya ditandai <strong>Late (Terlambat)</strong> dan dikirimkan notifikasi WhatsApp khusus ke orang tua/wali.
              </p>
            </div>

            {/* WhatsApp Auto Send Toggle */}
            <div className="pt-4 border-t border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs">Otomatisasi Notifikasi WhatsApp Orang Tua</div>
                  <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Kirim pesan konfirmasi kehadiran ke nomor wali saat wajah berhasil dipindai.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setWaAutoSendEnabled(!waAutoSendEnabled);
                    notify(`Notifikasi WhatsApp otomatis: ${!waAutoSendEnabled ? 'AKTIF' : 'NONAKTIF'}`);
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    waAutoSendEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      waAutoSendEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* AI Face Recognition & Multi-Angle Settings */}
          <div
            className={`p-6 rounded-3xl border shadow-xl space-y-5 ${
              isDark ? 'bg-[#0b101b] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">Pengaturan Deteksi Multi-Sudut & AI</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Mendukung deteksi wajah dari samping (yaw), atas (pitch), dan bawah tanpa harus menatap lurus.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Sensitivitas Ambang Jarak Euclidean:</span>
                  <span className="font-mono text-emerald-500 font-bold">{faceTolerance}</span>
                </div>
                <input
                  type="range"
                  min="0.40"
                  max="0.65"
                  step="0.01"
                  value={faceTolerance}
                  onChange={e => setFaceTolerance(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>0.40 (Ketat / Minimal False Positive)</span>
                  <span>0.65 (Fleksibel / Cepat)</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs">Pindai Multi-Pose (Samping, Atas & Bawah)</div>
                  <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Aktifkan ekstraksi embedding multi-pose frontal, yaw ±45°, dan pitch.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMultiAngleEnabled(!multiAngleEnabled);
                    notify(`Multi-angle detection: ${!multiAngleEnabled ? 'AKTIF' : 'NONAKTIF'}`);
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    multiAngleEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      multiAngleEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className={`p-3.5 rounded-2xl border text-xs space-y-1 ${isDark ? 'bg-slate-950/40 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                <div className="font-bold text-emerald-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Multi-Zone Contrast & Liveness Verifier
                </div>
                <div>Model inferensi berjalan secara real-time pada hardware lokal (Edge inference latency: ~12-25ms).</div>
              </div>
            </div>
          </div>

          {/* 🛡️ SOLUSI 1: Ambang Batas Kecocokan Wajah (Confidence Threshold) */}
          <div
            className={`p-6 rounded-3xl border shadow-xl space-y-5 ${
              isDark ? 'bg-[#0b101b] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">Ambang Batas Kecocokan (Confidence Threshold)</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Mencegah kekeliruan absensi dengan mewajibkan verifikasi manual pada kecocokan meragukan.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Tingkat Keyakinan Minimal AI:</span>
                  <span className="font-mono text-emerald-500 font-extrabold text-sm">{confidenceThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="1"
                  value={confidenceThreshold}
                  onChange={e => setConfidenceThreshold(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>50% (Toleran)</span>
                  <span className="font-bold text-emerald-500">Rekomendasi: 75%</span>
                  <span>95% (Super Ketat)</span>
                </div>
              </div>

              <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${isDark ? 'bg-slate-950/40 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Mekanisme Perlindungan Anti-Salah Wajah:
                </div>
                <p className="text-[11px] leading-relaxed">
                  • <strong>Skor &ge; {confidenceThreshold}%:</strong> Terverifikasi otomatis oleh AI (<span className="text-emerald-500 font-mono">VERIFIED</span>).<br/>
                  • <strong>Skor &lt; {confidenceThreshold}%:</strong> Masuk antrean verifikasi manual operator (<span className="text-amber-500 font-mono">NEEDS_MANUAL_REVIEW</span>). Operator dapat mengesahkan atau merevisi siswa yang bersangkutan.
                </p>
              </div>
            </div>
          </div>

          {/* 🌐 SOLUSI 3: Toleransi Pemadaman Listrik & Internet Mati (Edge-First Resilience) */}
          <div
            className={`p-6 rounded-3xl border shadow-xl space-y-5 ${
              isDark ? 'bg-[#0b101b] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                {isOnline ? <Wifi className="w-5 h-5 text-emerald-500" /> : <WifiOff className="w-5 h-5 text-amber-500" />}
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">Ketahanan Edge Lokal & Toleransi Daya/Internet</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Pemrosesan inferensi lokal mandiri tanpa ketergantungan koneksi internet aktif.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span>Status Koneksi Jaringan:</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {isOnline ? 'Cloud Hub Terhubung Normal' : 'Mode Edge Lokal Aktif (Offline)'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs font-bold text-emerald-500">
                    {offlineQueueCount} Antrean Lokal
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Buffer Edge Terjamin
                  </div>
                </div>
              </div>

              <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${isDark ? 'bg-slate-950/40 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  SOP Pemadaman Listrik & Gangguan Jaringan:
                </div>
                <p className="text-[11px] leading-relaxed">
                  Terminal gerbang beroperasi pada Mini PC/NUC berdaya rendah dengan cadangan UPS baterai (daya tahan 4-8 jam). Presensi tetap berjalan 100% lokal. Begitu jaringan atau listrik pulih, seluruh antrean presensi otomatis disinkronkan tanpa ada data yang hilang.
                </p>
              </div>

              {offlineQueueCount > 0 && isOnline && (
                <button
                  type="button"
                  onClick={async () => {
                    setIsSyncingOffline(true);
                    await syncOfflineQueue();
                    setIsSyncingOffline(false);
                  }}
                  disabled={isSyncingOffline}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingOffline ? 'animate-spin' : ''}`} />
                  <span>{isSyncingOffline ? 'Menyinkronkan ke Cloud...' : `Sinkronkan ${offlineQueueCount} Data Antrean Sekarang`}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: HAK AKSES & PENGGUNA (RBAC)                                    */}
      {/* ========================================================================= */}
      {adminTab === 'users' && (
        <div className="space-y-6">
          <div
            className={`p-6 rounded-3xl border shadow-xl ${
              isDark ? 'bg-[#0b101b] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-bold tracking-tight">Manajemen Akun Staf & Hak Akses Instansi (RBAC)</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {activeSchool?.name}
                  </span>
                </div>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Administrator Utama menerbitkan dan mengelola akun resmi untuk <strong>Guru BK</strong>, <strong>Kepala Sekolah</strong>, dan <strong>Pengawas Sekolah</strong>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-white/10 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Akun Aktif: <strong className="text-white">{currentUser.name}</strong>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase font-mono font-bold">
                    {currentUser.role}
                  </span>
                </span>
                <button
                  onClick={() => setShowAddStaffModal(true)}
                  className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-[#174384] hover:bg-[#13376d] text-white shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Tambah Akun Staf</span>
                </button>
              </div>
            </div>

            {/* Quick Provisioning Action Bar */}
            <div className="mb-6 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              <div className="text-xs font-semibold mb-2.5 flex items-center justify-between">
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                  ⚡ Penerbitan Cepat Akun Wajib Sekolah ({activeSchool.name}):
                </span>
                <span className="text-[11px] font-mono text-slate-500">1-Click Auto Provisioning</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  onClick={() => provisionQuickRole('guru_bk')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                    isDark
                      ? 'bg-emerald-950/20 hover:bg-emerald-900/40 border-emerald-500/30 text-emerald-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      + Akun Guru BK
                    </div>
                    <div className="text-[10px] opacity-75 mt-0.5">Bimbingan & Kedisiplinan</div>
                  </div>
                  <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">Terbitkan →</span>
                </button>

                <button
                  onClick={() => provisionQuickRole('kepala_sekolah')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                    isDark
                      ? 'bg-[#0f274a]/40 hover:bg-[#0f274a]/70 border-blue-500/30 text-blue-200'
                      : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-900'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      + Akun Kepala Sekolah
                    </div>
                    <div className="text-[10px] opacity-75 mt-0.5">Monitoring & Pengesahan PDF</div>
                  </div>
                  <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">Terbitkan →</span>
                </button>

                <button
                  onClick={() => provisionQuickRole('pengawas')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                    isDark
                      ? 'bg-slate-900/50 hover:bg-slate-800/60 border-slate-600/30 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-900'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      + Akun Pengawas
                    </div>
                    <div className="text-[10px] opacity-75 mt-0.5">Audit Standar Akreditasi</div>
                  </div>
                  <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">Terbitkan →</span>
                </button>
              </div>
            </div>

            {/* Staff Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentSchoolStaff.map((user: UserProfile) => {
                const isSelected = currentUser.id === user.id;
                const isMasterAdmin = user.role === 'admin';

                const badgeBg = 
                  user.role === 'admin' ? 'bg-[#174384] text-white border border-blue-400/40' :
                  user.role === 'guru_bk' ? 'bg-emerald-600 text-white border border-emerald-400/40' :
                  user.role === 'kepala_sekolah' ? 'bg-[#0f274a] text-blue-200 border border-blue-500/40' :
                  user.role === 'pengawas' ? 'bg-slate-700 text-white border border-slate-500/40' :
                  'bg-slate-800 text-slate-200 border border-slate-600/40';

                const roleBadgeText = 
                  user.role === 'admin' ? 'AD' :
                  user.role === 'guru_bk' ? 'BK' :
                  user.role === 'kepala_sekolah' ? 'KS' :
                  user.role === 'pengawas' ? 'PW' : 'WK';

                return (
                  <div
                    key={user.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? isDark
                          ? 'bg-blue-950/20 border-emerald-500/50 shadow-lg ring-1 ring-emerald-500/30'
                          : 'bg-emerald-50/80 border-emerald-400 shadow-sm ring-1 ring-emerald-400/40'
                        : isDark
                        ? 'bg-slate-950/40 border-white/5 hover:border-white/15'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-md ${badgeBg}`}
                          >
                            {roleBadgeText}
                          </div>

                          <div className="min-w-0">
                            <div className="font-bold text-xs truncate max-w-[150px]">{user.name}</div>
                            <div className="text-[10px] font-mono text-emerald-400 font-semibold truncate max-w-[160px]">{user.title}</div>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500 text-slate-950 shrink-0">
                            AKTIF
                          </span>
                        ) : !isMasterAdmin ? (
                          <button
                            onClick={() => {
                              if (confirm(`Yakin ingin menonaktifkan akun ${user.name}?`)) {
                                deleteStaffAccount(user.id);
                              }
                            }}
                            className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Hapus Akun Staf Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-3 pt-3 border-t border-white/[0.06] text-[11px] space-y-1.5">
                        <div className="flex justify-between">
                          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>NIP / ID:</span>
                          <span className="font-mono text-slate-300">{user.nip || '-'}</span>
                        </div>
                        {user.email && (
                          <div className="flex justify-between truncate">
                            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Email:</span>
                            <span className="font-mono text-[10px] truncate max-w-[150px] text-slate-300">{user.email}</span>
                          </div>
                        )}
                        {user.phone && (
                          <div className="flex justify-between">
                            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>WhatsApp:</span>
                            <span className="font-mono text-[10px] text-slate-300">{user.phone}</span>
                          </div>
                        )}
                        {user.notes && (
                          <div className="pt-1 text-[10px] text-slate-400 italic">
                            "{user.notes}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2">
                      <button
                        onClick={() => {
                          setCurrentUser(user);
                          notify(`Beralih ke profil: ${user.name} (${user.title})`);
                        }}
                        disabled={isSelected}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 opacity-60 cursor-default'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm'
                        }`}
                      >
                        {isSelected ? 'Profil Aktif' : 'Gunakan Akun Ini'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Permission Matrix Table */}
            <div className="mt-8 pt-6 border-t border-white/[0.08]">
              <h4 className="font-bold text-xs mb-3 uppercase tracking-wider text-slate-400 font-mono">
                Matriks Hak Akses Sistem Multi-Peran (RBAC)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                      <th className="py-2.5 px-3">Role / Peran</th>
                      <th className="py-2.5 px-3">Live Gate</th>
                      <th className="py-2.5 px-3">Direktori Siswa</th>
                      <th className="py-2.5 px-3">Ledger Presensi</th>
                      <th className="py-2.5 px-3">WhatsApp Alerts</th>
                      <th className="py-2.5 px-3">Panel Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-emerald-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Administrator Sistem
                      </td>
                      <td className="py-2.5 px-3"><Check className="w-4 h-4 text-emerald-500" /></td>
                      <td className="py-2.5 px-3"><Check className="w-4 h-4 text-emerald-500" /></td>
                      <td className="py-2.5 px-3"><Check className="w-4 h-4 text-emerald-500" /></td>
                      <td className="py-2.5 px-3"><Check className="w-4 h-4 text-emerald-500" /></td>
                      <td className="py-2.5 px-3"><Check className="w-4 h-4 text-emerald-500" /></td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-emerald-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Guru Bimbingan Konseling (BK)
                      </td>
                      <td className="py-2.5 px-3 opacity-30">-</td>
                      <td className="py-2.5 px-3 opacity-30">-</td>
                      <td className="py-2.5 px-3"><Check className="w-4 h-4 text-emerald-500" /></td>
                      <td className="py-2.5 px-3"><Check className="w-4 h-4 text-emerald-500" /></td>
                      <td className="py-2.5 px-3 opacity-30">-</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-blue-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        Kepala Sekolah / Rektor
                      </td>
                      <td className="py-2.5 px-3"><Check className="w-4 h-4 text-emerald-500" /></td>
                      <td className="py-2.5 px-3 opacity-30">-</td>
                      <td className="py-2.5 px-3"><Check className="w-4 h-4 text-emerald-500" /></td>
                      <td className="py-2.5 px-3"><Check className="w-4 h-4 text-emerald-500" /></td>
                      <td className="py-2.5 px-3 opacity-30">-</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-slate-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        Pengawas Sekolah / Dinas
                      </td>
                      <td className="py-2.5 px-3 opacity-30">-</td>
                      <td className="py-2.5 px-3 opacity-30">-</td>
                      <td className="py-2.5 px-3"><Check className="w-4 h-4 text-emerald-500" /></td>
                      <td className="py-2.5 px-3 opacity-30">-</td>
                      <td className="py-2.5 px-3 opacity-30">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Modal Tambah Akun Staf */}
          {showAddStaffModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
              <div
                className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl relative ${
                  isDark ? 'bg-[#0c121e] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
                  <div>
                    <h3 className="font-bold text-base">Terbitkan Akun Staf Sekolah Baru</h3>
                    <p className="text-xs text-slate-400">Instansi: {activeSchool.name}</p>
                  </div>
                  <button
                    onClick={() => setShowAddStaffModal(false)}
                    className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateStaffSubmit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold mb-1">Peran / Jabatan Pegawai:</label>
                    <select
                      value={staffRoleInput}
                      onChange={e => setStaffRoleInput(e.target.value as RoleType)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold ${
                        isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="guru_bk">Guru Bimbingan Konseling (BK)</option>
                      <option value="kepala_sekolah">Kepala Sekolah / Rektor</option>
                      <option value="pengawas">Pengawas Pembina Sekolah / Dinas</option>
                      <option value="admin">Administrator IT Tambahan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Nama Lengkap & Gelar:</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Dra. Hj. Siti Rahmawati, M.Pd"
                      value={staffNameInput}
                      onChange={e => setStaffNameInput(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">NIP / Nomor Pegawai:</label>
                      <input
                        type="text"
                        placeholder="Contoh: 19780512 200201 2 003"
                        value={staffNipInput}
                        onChange={e => setStaffNipInput(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono ${
                          isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Judul / Title Jabatan:</label>
                      <input
                        type="text"
                        placeholder="Opsional (Otomatis sesuai peran)"
                        value={staffTitleInput}
                        onChange={e => setStaffTitleInput(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Email Resmi Dinas:</label>
                      <input
                        type="email"
                        placeholder="staf@sekolah.sch.id"
                        value={staffEmailInput}
                        onChange={e => setStaffEmailInput(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Nomor WhatsApp / HP:</label>
                      <input
                        type="text"
                        placeholder="0812-3456-7890"
                        value={staffPhoneInput}
                        onChange={e => setStaffPhoneInput(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono ${
                          isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Catatan Tugas Khusus:</label>
                    <input
                      type="text"
                      placeholder="Contoh: Koordinator BK Kelas 10, Pengawas Wilayah 01"
                      value={staffNotesInput}
                      onChange={e => setStaffNotesInput(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddStaffModal(false)}
                      className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 font-semibold cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#174384] hover:bg-[#13376d] text-white font-bold shadow-md cursor-pointer transition-all"
                    >
                      Simpan & Terbitkan Akun
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: KEAMANAN & PRIVASI DATA                                        */}
      {/* ========================================================================= */}
      {adminTab === 'security' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-5 rounded-3xl border shadow-lg ${isDark ? 'bg-[#0b101b] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold mb-3">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm">Zero-Knowledge Architecture</h4>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Foto wajah tidak pernah diunggah atau disimpan di server cloud. Seluruh pencocokan dilakukan via representasi vektor matematis terenkripsi.
              </p>
            </div>

            <div className={`p-5 rounded-3xl border shadow-lg ${isDark ? 'bg-[#0b101b] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold mb-3">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm">Ephemeral RAM Purge</h4>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Buffer frame video kamera langsung dibersihkan dari RAM dalam waktu &lt;50ms setelah proses inferensi wajah selesai dilakukan.
              </p>
            </div>

            <div className={`p-5 rounded-3xl border shadow-lg ${isDark ? 'bg-[#0b101b] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm">Data Sovereign & Tenant Isolation</h4>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Setiap sekolah atau kampus diisolasi menggunakan 1 Kode Aktivasi Unik sehingga basis data tidak saling tumpang tindih.
              </p>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div
            className={`p-6 rounded-3xl border shadow-xl ${
              isDark ? 'bg-[#0b101b] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold tracking-tight">Audit Trail Aktivitas Sistem</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Riwayat tindakan administratif dan keamanan sistem terkini.
                </p>
              </div>

              <span className="text-xs font-mono px-3 py-1 rounded-xl bg-slate-800 text-slate-300 border border-white/10">
                {auditLogs.length} Catatan
              </span>
            </div>

            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className={`sticky top-0 ${isDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                  <tr>
                    <th className="py-2.5 px-3">Waktu</th>
                    <th className="py-2.5 px-3">Aktor</th>
                    <th className="py-2.5 px-3">Peran</th>
                    <th className="py-2.5 px-3">Aksi</th>
                    <th className="py-2.5 px-3">Detail</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {auditLogs.slice(0, 15).map(log => (
                    <tr key={log.id} className={isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{log.timestamp}</td>
                      <td className="py-2.5 px-3 font-semibold">{log.actor}</td>
                      <td className="py-2.5 px-3 font-mono text-[10px] uppercase text-emerald-400">{log.role}</td>
                      <td className="py-2.5 px-3 font-bold">{log.action}</td>
                      <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">{log.details}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Danger Zone: Purge & Reset */}
          <div className="p-6 rounded-3xl border border-rose-500/30 bg-rose-950/20 text-rose-200 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center font-bold">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-rose-300">Tindakan Kritis (Danger Zone)</h3>
                <p className="text-xs text-rose-300/70">
                  Tindakan berikut akan berdampak permanen pada basis data siswa dan konfigurasi terminal.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => setShowPurgeModal(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Semua Data Siswa Terdaftar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin mengatur ulang data log ke bawaan sistem?')) {
                    resetAllStoredData();
                    notify('Data berhasil diatur ulang ke kondisi default', 'warning');
                  }
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-rose-500/40 hover:bg-rose-500/20 text-rose-200 transition-all cursor-pointer flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset Cache & Riwayat Log</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Purge All Students */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-[#0f172a] border border-rose-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-base text-rose-300">Konfirmasi Pembersihan Data Siswa</h3>
              <p className="text-xs text-slate-400 mt-2">
                Apakah Anda benar-benar yakin ingin menghapus <strong>seluruh {students.length} data siswa</strong> dari sistem lokal dan Supabase? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setShowPurgeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/10 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handlePurgeAllStudents}
                disabled={isPurging}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-lg shadow-rose-600/25 flex items-center gap-2"
              >
                {isPurging ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Semua</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
