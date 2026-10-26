import React, { useState, useEffect, useRef } from 'react';
import { useApp } from './context/AppContext';
import { WalkThroughScanner } from './components/WalkThroughScanner';
import { FaceEnrollmentStation } from './components/FaceEnrollmentStation';
import { AttendanceLogView } from './components/AttendanceLogView';
import { WhatsAppHubView } from './components/WhatsAppHubView';
import { WhatsAppLivePopup } from './components/WhatsAppLivePopup';
import { SchoolAdminModal } from './components/SchoolAdminModal';
import { AdminPanelView } from './components/AdminPanelView';
import {
  Camera,
  FileSpreadsheet,
  MessageSquare,
  Clock,
  ChevronDown,
  Check,
  SlidersHorizontal,
  X,
  Zap,
  Activity,
  Sun,
  Moon,
  Users,
  School,
  GraduationCap,
  KeyRound,
  ShieldCheck,
  EyeOff,
  Lock,
  PlusCircle
} from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PRESET_USERS, UserProfile } from './types';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    notification,
    cutoffTime,
    setCutoffTime,
    currentUser,
    setCurrentUser,
    currentRole,
    currentSchoolStaff,
    canAccessTab,
    notify,
    theme,
    toggleTheme,
    activeSchool,
    supabaseConnected
  } = useApp();

  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showSchoolAdminModal, setShowSchoolAdminModal] = useState<boolean>(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState<boolean>(false);
  const [tempCutoff, setTempCutoff] = useState<string>(cutoffTime);

  // 🔒 Admin Panel Toggle (Dapat dibuka via Tombol Shield, Ctrl+Shift+A, Role Switcher, atau 3x klik logo)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('biopass_admin_unlocked');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });
  const logoClickCountRef = useRef<number>(0);
  const logoClickTimerRef = useRef<any>(null);

  const toggleAdminUnlocked = (forceState?: boolean) => {
    setIsAdminUnlocked(prev => {
      const next = forceState !== undefined ? forceState : !prev;
      try {
        localStorage.setItem('biopass_admin_unlocked', String(next));
      } catch {}
      if (next) {
        setActiveTab('admin');
        notify('Panel Admin dibuka (Tekan Ctrl+Shift+A untuk menyembunyikan)', 'info');
      } else {
        if (activeTab === 'admin') setActiveTab('scanner');
        notify('Panel Admin telah disembunyikan', 'info');
      }
      return next;
    });
  };

  // Global Keyboard Shortcut: Ctrl + Shift + A atau Alt + A untuk Toggle Panel Admin
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isHotkey =
        (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) ||
        (e.altKey && (e.key === 'A' || e.key === 'a'));

      if (isHotkey) {
        e.preventDefault();
        toggleAdminUnlocked();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab, notify, activeTab]);

  // Secret Tap pada Logo (Klik 3x cepat)
  const handleLogoSecretTap = () => {
    logoClickCountRef.current += 1;
    if (logoClickTimerRef.current) clearTimeout(logoClickTimerRef.current);

    if (logoClickCountRef.current >= 3) {
      logoClickCountRef.current = 0;
      toggleAdminUnlocked();
      return;
    }

    logoClickTimerRef.current = setTimeout(() => {
      logoClickCountRef.current = 0;
    }, 600);
  };

  const handleSaveCutoff = () => {
    setCutoffTime(tempCutoff);
    setShowSettingsModal(false);
    notify(`Gate cutoff time updated to ${tempCutoff}`);
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen flex flex-col antialiased transition-colors duration-200 ${
        isDark
          ? 'bg-[#090d16] text-slate-100 selection:bg-emerald-500 selection:text-slate-950'
          : 'bg-[#f8fafc] text-slate-900 selection:bg-slate-900 selection:text-white'
      }`}
    >
      {/* Top Clean Professional Header Bar */}
      <header
        className={`sticky top-0 z-40 transition-colors duration-200 ${
          isDark
            ? 'bg-[#090d16]/90 backdrop-blur-xl border-b border-white/[0.08]'
            : 'bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Logo & School System Brand (3x tap logo untuk buka/tutup Admin) */}
            <div className="flex items-center gap-3">
              <div
                className="relative group cursor-pointer"
                onClick={handleLogoSecretTap}
                title="Attendly System (Secret: 3x klik untuk akses Admin)"
              >
                <div
                  className={`w-9 h-9 rounded-xl border p-1 flex items-center justify-center transition-all ${
                    isDark
                      ? 'bg-slate-900 border-white/10 shadow-xs'
                      : 'bg-slate-50 border-slate-200 shadow-xs'
                  }`}
                >
                  <img
                    src="/attendly-logo.jpg"
                    alt="Attendly Logo"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-lg font-black tracking-tight leading-none ${
                      isDark ? 'text-blue-400' : 'text-[#174384]'
                    }`}
                  >
                    attend<span className="text-emerald-500">ly</span>
                  </span>
                </div>
                <span
                  className={`text-[11px] font-medium mt-0.5 hidden sm:block ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  School Gate Attendance & Access
                </span>
              </div>

              {/* School / University Tenant Badge */}
              <div
                className={`hidden xl:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all ml-1 ${
                  isDark
                    ? 'bg-white/[0.03] border-white/[0.08] text-white'
                    : 'bg-slate-100/80 border-slate-200 text-slate-800'
                }`}
              >
                <div className="w-5 h-5 rounded-md overflow-hidden shrink-0 flex items-center justify-center">
                  {activeSchool?.logoUrl ? (
                    <img src={activeSchool.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <School className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                </div>
                <span className="text-xs font-semibold truncate max-w-[220px]">
                  {activeSchool?.name || 'SMA Harapan Nusantara'}
                </span>
              </div>
            </div>

            {/* Clean Segmented Navigation Bar */}
            <nav
              className={`hidden md:inline-flex items-center p-1 rounded-xl border text-xs gap-1 transition-all ${
                isDark
                  ? 'bg-slate-900/90 border-white/10'
                  : 'bg-slate-100/90 border-slate-200/80'
              }`}
            >
              {canAccessTab('scanner') && (
                <button
                  onClick={() => setActiveTab('scanner')}
                  className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-all duration-150 cursor-pointer ${
                    activeTab === 'scanner'
                      ? 'bg-[#174384] text-white font-bold shadow-md shadow-blue-950/40 border border-blue-400/30'
                      : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Live Gate</span>
                </button>
              )}

              {canAccessTab('enrollment') && (
                <button
                  onClick={() => setActiveTab('enrollment')}
                  className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-all duration-150 cursor-pointer ${
                    activeTab === 'enrollment'
                      ? 'bg-[#174384] text-white font-bold shadow-md shadow-blue-950/40 border border-blue-400/30'
                      : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Student Directory</span>
                </button>
              )}

              {canAccessTab('attendance') && (
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-all duration-150 cursor-pointer ${
                    activeTab === 'attendance'
                      ? 'bg-[#174384] text-white font-bold shadow-md shadow-blue-950/40 border border-blue-400/30'
                      : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Attendance Ledger</span>
                </button>
              )}

              {canAccessTab('whatsapp') && (
                <button
                  onClick={() => setActiveTab('whatsapp')}
                  className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-all duration-150 cursor-pointer ${
                    activeTab === 'whatsapp'
                      ? 'bg-[#174384] text-white font-bold shadow-md shadow-blue-950/40 border border-blue-400/30'
                      : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp Alerts</span>
                </button>
              )}

              {isAdminUnlocked && canAccessTab('admin') && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-all duration-150 cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-[#174384] text-white font-bold shadow-md shadow-blue-950/40 border border-emerald-500/40'
                      : isDark
                      ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                      : 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Panel Admin</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </button>
              )}
            </nav>

            {/* Right Controls: Theme Switcher, Role, Settings */}
            <div className="flex items-center gap-2">
              {/* Cloud Database Status Pill */}
              <div
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono transition-all shadow-sm ${
                  supabaseConnected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
                title={supabaseConnected ? 'Database Supabase Cloud Terhubung & Aktif' : 'Menghubungkan ke Supabase Cloud...'}
              >
                <span className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400 animate-ping'}`} />
                <span className="font-semibold">{supabaseConnected ? 'Supabase Cloud: Terhubung' : 'Cloud DB: Menghubungkan...'}</span>
              </div>

              {/* Light / Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-xl transition-all cursor-pointer shadow-md border ${
                  isDark
                    ? 'bg-slate-900/90 hover:bg-slate-800 text-amber-400 border-white/10 hover:border-amber-400/40'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle Theme"
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-700 animate-in spin-in-180 duration-200" />
                )}
              </button>

              {/* Role Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer shadow-md group ${
                    isDark
                      ? 'bg-slate-900/90 hover:bg-slate-800 border-white/10 text-white'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  title="Switch Active Access Role"
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-[10px] tracking-tight shadow-md ${
                    currentRole === 'admin'
                      ? 'bg-[#174384] text-white border border-blue-400/40'
                      : currentRole === 'guru_bk'
                      ? 'bg-emerald-600 text-white border border-emerald-400/40'
                      : currentRole === 'kepala_sekolah'
                      ? 'bg-[#0f274a] text-blue-200 border border-blue-500/40'
                      : currentRole === 'pengawas'
                      ? 'bg-slate-700 text-white border border-slate-500/40'
                      : 'bg-slate-800 text-slate-200 border border-slate-600/40'
                  }`}>
                    {currentRole === 'admin' ? 'AD' : currentRole === 'guru_bk' ? 'BK' : currentRole === 'kepala_sekolah' ? 'KS' : currentRole === 'pengawas' ? 'PW' : 'WK'}
                  </div>
                  <div className="text-left hidden lg:block leading-tight">
                    <div
                      className={`text-xs font-bold truncate max-w-[130px] ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {currentUser.name.split(',')[0]}
                    </div>
                    <div className="text-[9px] font-mono text-emerald-400 font-semibold">
                      {currentRole === 'admin'
                        ? 'Admin Access'
                        : currentRole === 'guru_bk'
                        ? 'Guru BK'
                        : currentRole === 'kepala_sekolah'
                        ? 'Kepala Sekolah'
                        : currentRole === 'pengawas'
                        ? 'Pengawas Dinas'
                        : `Wali Kelas (${currentUser.assignedClass})`}
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-colors ${
                      isDark ? 'text-slate-400 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-800'
                    }`}
                  />
                </button>

                {/* Role Switcher Menu */}
                {showRoleDropdown && (
                  <div
                    className={`absolute right-0 mt-2 w-80 border rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-2xl ${
                      isDark
                        ? 'bg-[#0a1222]/95 border-white/10 text-slate-200'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <div
                      className={`px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest font-semibold border-b flex items-center justify-between ${
                        isDark ? 'text-slate-400 border-white/[0.08]' : 'text-slate-500 border-slate-100'
                      }`}
                    >
                      <span>Akun Staf & Hak Akses</span>
                      <span className="text-emerald-400 font-bold">{activeSchool?.name?.split(' ')[0] || 'Sekolah'}</span>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-1 pr-0.5">
                      {(currentSchoolStaff && currentSchoolStaff.length > 0 ? currentSchoolStaff : PRESET_USERS).map((user: UserProfile) => {
                        const isSelected = currentUser.id === user.id;
                        const roleColor =
                          user.role === 'admin' ? 'bg-[#174384] text-white border border-blue-400/40' :
                          user.role === 'guru_bk' ? 'bg-emerald-600 text-white border border-emerald-400/40' :
                          user.role === 'kepala_sekolah' ? 'bg-[#0f274a] text-blue-200 border border-blue-500/40' :
                          user.role === 'pengawas' ? 'bg-slate-700 text-white border border-slate-500/40' :
                          'bg-slate-800 text-slate-200 border border-slate-600/40';

                        const roleLetters =
                          user.role === 'admin' ? 'AD' :
                          user.role === 'guru_bk' ? 'BK' :
                          user.role === 'kepala_sekolah' ? 'KS' :
                          user.role === 'pengawas' ? 'PW' : 'WK';

                        return (
                          <button
                            key={user.id}
                            onClick={() => {
                              setCurrentUser(user);
                              setShowRoleDropdown(false);
                              notify(`Beralih ke akun: ${user.name} (${user.title})`);
                            }}
                            className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                              isSelected
                                ? isDark
                                  ? 'bg-blue-950/40 text-white border border-emerald-500/40 shadow-xs'
                                  : 'bg-emerald-50 text-emerald-950 border border-emerald-300 font-medium'
                                : isDark
                                ? 'hover:bg-white/[0.06] text-slate-300'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-xs ${roleColor}`}
                            >
                              {roleLetters}
                            </div>
                            <div className="min-w-0 flex-1 leading-tight">
                              <div className="font-semibold text-xs truncate">
                                {user.name}
                              </div>
                              <div
                                className={`text-[10px] truncate mt-0.5 ${
                                  isSelected ? 'text-emerald-400 font-semibold' : 'opacity-70'
                                }`}
                              >
                                {user.title}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick Link to Staff Management */}
                    <div className={`pt-1.5 mt-1 border-t space-y-1 ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
                      <button
                        onClick={() => {
                          setShowRoleDropdown(false);
                          setActiveTab('admin');
                        }}
                        className="w-full text-left p-2 rounded-xl text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>+ Kelola Akun Staf (BK / Kepsek / Pengawas)</span>
                      </button>

                      {currentRole === 'admin' && (
                        <button
                          onClick={() => {
                            setShowRoleDropdown(false);
                            toggleAdminUnlocked();
                          }}
                          className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                            isAdminUnlocked
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : isDark
                              ? 'hover:bg-white/[0.06] text-slate-400 hover:text-white'
                              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{isAdminUnlocked ? 'Sembunyikan Panel Admin' : 'Buka Panel Admin'}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">Ctrl+Shift+A</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Quick Toggle Button (Selalu ada untuk role Admin) */}
              {currentRole === 'admin' && (
                <button
                  onClick={() => toggleAdminUnlocked()}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer shadow-md ${
                    isAdminUnlocked
                      ? isDark
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : isDark
                      ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border-white/10'
                      : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-emerald-600 border-slate-200'
                  }`}
                  title={isAdminUnlocked ? 'Sembunyikan Panel Admin (Ctrl+Shift+A)' : 'Buka Panel Admin (Ctrl+Shift+A)'}
                  aria-label="Toggle Panel Admin"
                >
                  {isAdminUnlocked ? <EyeOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                </button>
              )}

              {/* Cutoff Settings Button (Admin Only) */}
              {currentRole === 'admin' && (
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer shadow-md ${
                    isDark
                      ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border-white/10'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title="Cutoff Time Configuration"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Tab Control */}
          <div
            className={`flex md:hidden items-center justify-around py-2 border-t text-xs gap-1.5 overflow-x-auto ${
              isDark ? 'border-white/[0.08]' : 'border-slate-200'
            }`}
          >
            {canAccessTab('scanner') && (
              <button
                onClick={() => setActiveTab('scanner')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                  activeTab === 'scanner'
                    ? 'bg-[#174384] text-white font-bold'
                    : isDark
                    ? 'text-slate-400 hover:bg-white/5'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Gate
              </button>
            )}
            {canAccessTab('enrollment') && (
              <button
                onClick={() => setActiveTab('enrollment')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                  activeTab === 'enrollment'
                    ? 'bg-[#174384] text-white font-bold'
                    : isDark
                    ? 'text-slate-400 hover:bg-white/5'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Enroll
              </button>
            )}
            {canAccessTab('attendance') && (
              <button
                onClick={() => setActiveTab('attendance')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                  activeTab === 'attendance'
                    ? 'bg-[#174384] text-white font-bold'
                    : isDark
                    ? 'text-slate-400 hover:bg-white/5'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Logs
              </button>
            )}
            {canAccessTab('whatsapp') && (
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                  activeTab === 'whatsapp'
                    ? 'bg-[#174384] text-white font-bold'
                    : isDark
                    ? 'text-slate-400 hover:bg-white/5'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Alerts
              </button>
            )}
            {isAdminUnlocked && canAccessTab('admin') && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-[#174384] text-white font-bold'
                    : isDark
                    ? 'text-emerald-400 hover:bg-white/5'
                    : 'text-emerald-600 hover:bg-slate-100'
                }`}
              >
                Admin
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className={`border p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-5 ${
              isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div
              className={`flex items-center justify-between border-b pb-3 ${
                isDark ? 'border-white/10' : 'border-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
                    isDark
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Gate Attendance Cutoff</h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Threshold for on-time verification
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label
                className={`block text-xs font-mono uppercase tracking-wider mb-2 ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Morning Punctuality Cutoff (WIB)
              </label>
              <input
                type="time"
                value={tempCutoff}
                onChange={e => setTempCutoff(e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-xl text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isDark
                    ? 'bg-slate-950 border-white/10 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
              <p className={`text-[11px] mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Check-ins before this cutoff are classified as <strong>On Time</strong>. Later scans are marked as <strong>Late</strong>.
              </p>
            </div>

            <div className={`flex items-center justify-end gap-2 pt-2 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
              <button
                onClick={() => setShowSettingsModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCutoff}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                Save Cutoff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 relative z-10">
        <ErrorBoundary>
          {activeTab === 'scanner' && <WalkThroughScanner />}
          {activeTab === 'enrollment' && <FaceEnrollmentStation />}
          {activeTab === 'attendance' && <AttendanceLogView />}
          {activeTab === 'whatsapp' && <WhatsAppHubView />}
          {activeTab === 'admin' && (
            <AdminPanelView
              onHide={() => toggleAdminUnlocked(false)}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Real-Time WhatsApp Notification Popup */}
      <WhatsAppLivePopup />

      {/* School Admin & Activation Portal Modal */}
      {showSchoolAdminModal && (
        <SchoolAdminModal
          isOpen={showSchoolAdminModal}
          onClose={() => setShowSchoolAdminModal(false)}
        />
      )}

      {/* Global Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-3 backdrop-blur-2xl ${
              notification.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-500/30'
                : notification.type === 'warning'
                ? 'bg-amber-950/90 text-amber-200 border-amber-500/30'
                : isDark
                ? 'bg-slate-900/95 text-white border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                : 'bg-white text-slate-900 border-slate-200 shadow-xl'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <MainLayout />
    </ErrorBoundary>
  );
};

export default App;
