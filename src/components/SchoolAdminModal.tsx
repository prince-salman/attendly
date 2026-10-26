import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  Building2,
  KeyRound,
  Copy,
  Check,
  PlusCircle,
  School,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  X,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Trash2
} from 'lucide-react';
import { SchoolTenant, InstitutionType } from '../types';
import { REGISTERED_SCHOOLS } from '../data/mockData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_SAMPLE_LOGOS = [
  {
    name: 'ITS Surabaya',
    type: 'UNIVERSITAS',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23013880"/><circle cx="50" cy="50" r="41" fill="none" stroke="%23FBBF24" stroke-width="4"/><polygon points="50,18 60,38 82,38 64,52 71,74 50,60 29,74 36,52 18,38 40,38" fill="%23FBBF24"/><text x="50" y="90" font-size="13" font-weight="900" fill="%23FFFFFF" text-anchor="middle" font-family="sans-serif">ITS</text></svg>'
  },
  {
    name: 'Universitas Indonesia',
    type: 'UNIVERSITAS',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23F59E0B"/><circle cx="50" cy="50" r="41" fill="%230F172A"/><circle cx="50" cy="50" r="28" fill="%23FBBF24"/><text x="50" y="57" font-size="20" font-weight="900" fill="%230F172A" text-anchor="middle" font-family="sans-serif">UI</text><text x="50" y="86" font-size="8" font-weight="bold" fill="%23FBBF24" text-anchor="middle" font-family="sans-serif">VERITAS</text></svg>'
  },
  {
    name: 'UGM Yogyakarta',
    type: 'UNIVERSITAS',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23047857"/><circle cx="50" cy="50" r="41" fill="%23064E3B"/><polygon points="50,20 62,36 82,38 68,52 72,72 50,62 28,72 32,52 18,38 38,36" fill="%23FBBF24"/><text x="50" y="88" font-size="12" font-weight="900" fill="%23FFFFFF" text-anchor="middle" font-family="sans-serif">UGM</text></svg>'
  },
  {
    name: 'Logo Sekolah Hijau',
    type: 'SEKOLAH',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%2310B981"/><circle cx="50" cy="50" r="41" fill="%23064E3B"/><polygon points="50,22 72,40 72,66 50,82 28,66 28,40" fill="%2334D399"/><text x="50" y="58" font-size="16" font-weight="900" fill="%23022C22" text-anchor="middle" font-family="sans-serif">SCH</text></svg>'
  }
];

export const SchoolAdminModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    activeSchool,
    schools,
    activateSchoolByCode,
    registerNewSchool,
    students,
    theme,
    notify
  } = useApp();

  const isDark = theme === 'dark';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeSubTab, setActiveSubTab] = useState<'current' | 'activate' | 'register'>('current');
  const [activationInput, setActivationInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
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

  if (!isOpen) return null;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    notify('Kode aktivasi berhasil disalin ke clipboard!');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'File harus berupa gambar (PNG, JPG, SVG, WebP).' });
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
      setTimeout(() => {
        setActiveSubTab('current');
        setFeedback(null);
      }, 1500);
    } else {
      setFeedback({ type: 'error', message: result.message });
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

    // Default logo if not provided
    let finalLogo = newLogoUrl.trim();
    if (!finalLogo) {
      const initial = newName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'UNV';
      const bgColor = newInstitutionType === 'UNIVERSITAS' ? '%230284C7' : '%2310B981';
      finalLogo = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="${bgColor}"/><circle cx="50" cy="50" r="41" fill="%230F172A"/><text x="50" y="58" font-size="18" font-weight="900" fill="%23FFFFFF" text-anchor="middle" font-family="sans-serif">${initial}</text></svg>`;
    }

    const isUniv = newInstitutionType === 'UNIVERSITAS';
    const cleanAbbr = newName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || (isUniv ? 'UNIV' : 'SCH');

    const created = registerNewSchool({
      name: newName.trim(),
      institutionType: newInstitutionType,
      logoUrl: finalLogo,
      npsn: newNpsn.trim(),
      address: newAddress.trim() || (isUniv ? 'Kampus Terpadu Belum Diatur' : 'Alamat Kampus Belum Diatur'),
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
      setActiveSubTab('current');
      setFeedback(null);
    }, 2000);
  };

  const currentSchool = activeSchool || schools?.[0] || REGISTERED_SCHOOLS[0];
  const isCurrentUniv = currentSchool?.institutionType === 'UNIVERSITAS';
  const enrolledCount = students.length;
  const maxStudentsCount = Number(currentSchool?.maxStudents) || 1000;
  const quotaPercent = Math.min(100, Math.round((enrolledCount / maxStudentsCount) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-3xl rounded-3xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-all duration-200 ${
          isDark
            ? 'bg-[#0c121e] border-white/10 text-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]'
            : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-5 border-b shrink-0 ${
            isDark ? 'border-white/[0.08] bg-slate-900/40' : 'border-slate-100 bg-slate-50/70'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#174384] text-emerald-400 border border-blue-400/30 flex items-center justify-center font-bold shadow-lg shrink-0">
              {isCurrentUniv ? (
                <GraduationCap className="w-5 h-5 text-emerald-400" />
              ) : (
                <School className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">
                  Manajemen Instansi & Lisensi {isCurrentUniv ? 'Universitas' : 'Sekolah'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  1 Instansi : 1 Kode
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Mendukung pendaftaran Universitas, Institut, dan Sekolah Menengah lengkap dengan logo resmi institusi.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border-white/10'
                : 'bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border-slate-200'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-Tabs Navigation */}
        <div
          className={`flex items-center px-6 pt-3 border-b gap-2 shrink-0 ${
            isDark ? 'border-white/[0.08] bg-slate-950/30' : 'border-slate-100 bg-slate-50/50'
          }`}
        >
          <button
            onClick={() => {
              setActiveSubTab('current');
              setFeedback(null);
            }}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'current'
                ? 'border-emerald-500 text-emerald-500 font-bold'
                : isDark
                ? 'border-transparent text-slate-400 hover:text-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Lisensi Aktif ({(currentSchool?.name || 'Instansi').split(' ')[0]})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('activate');
              setFeedback(null);
            }}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'activate'
                ? 'border-emerald-500 text-emerald-500 font-bold'
                : isDark
                ? 'border-transparent text-slate-400 hover:text-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Aktivasi Kode Terminal</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('register');
              setFeedback(null);
            }}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'register'
                ? 'border-emerald-500 text-emerald-500 font-bold'
                : isDark
                ? 'border-transparent text-slate-400 hover:text-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Daftar Universitas / Sekolah Baru</span>
          </button>
        </div>

        {/* Feedback Alert if any */}
        {feedback && (
          <div className="px-6 pt-4">
            <div
              className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center gap-3 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              )}
              <span>{feedback.message}</span>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: CURRENT ACTIVE INSTANCE */}
          {activeSubTab === 'current' && (
            <div className="space-y-6">
              {/* Primary Active License Card */}
              <div
                className={`p-6 rounded-2xl border relative overflow-hidden transition-all ${
                  isDark
                    ? 'bg-gradient-to-br from-slate-900/90 to-slate-900/40 border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.08)]'
                    : 'bg-gradient-to-br from-white to-slate-50 border-emerald-200 shadow-md'
                }`}
              >
                {/* Glow accent */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 relative z-10">
                  <div className="flex items-start gap-4">
                    {/* Institution Logo */}
                    <div className="w-16 h-16 rounded-2xl border p-1 flex items-center justify-center shrink-0 bg-slate-950/40 border-white/10 shadow-md overflow-hidden">
                      {currentSchool?.logoUrl ? (
                        <img
                          src={currentSchool.logoUrl}
                          alt={currentSchool?.name || ''}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <School className="w-8 h-8 text-emerald-500" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 font-bold">
                          TERMINAL ACTIVE & VERIFIED
                        </span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">
                          {isCurrentUniv ? '🎓 UNIVERSITAS' : '🏫 SEKOLAH'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-300 font-semibold border border-white/10">
                          {currentSchool?.licenseType || 'ENTERPRISE'}
                        </span>
                      </div>
                      <h4 className="text-lg sm:text-xl font-bold tracking-tight text-white dark:text-white">
                        {currentSchool?.name || 'SMA Harapan Nusantara'}
                      </h4>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {isCurrentUniv ? 'Kode PT Dikti' : 'NPSN'}: <span className="font-mono font-semibold text-emerald-400">{currentSchool?.npsn}</span> • Terdaftar sejak {currentSchool?.registeredAt || '2026'}
                      </p>
                    </div>
                  </div>

                  {/* Activation Code Pill & Copy Button */}
                  <div className="shrink-0 flex flex-col items-start sm:items-end gap-1.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400">Kode Lisensi Resmi:</span>
                    <div className="flex items-center gap-1.5">
                      <div className="px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold tracking-wider bg-slate-950/80 border border-emerald-500/40 text-emerald-400 shadow-inner">
                        {currentSchool?.activationCode}
                      </div>
                      <button
                        onClick={() => handleCopyCode(currentSchool?.activationCode || '')}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          copiedCode
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : isDark
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-white/10'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title="Salin Kode Aktivasi"
                      >
                        {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div
                  className={`mt-6 pt-5 border-t grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs ${
                    isDark ? 'border-white/[0.08]' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1.5 font-medium">
                      <Users className="w-3.5 h-3.5 text-emerald-500" />
                      {isCurrentUniv ? 'Rektorat / Admin Kampus' : 'Admin Penanggung Jawab'}
                    </span>
                    <p className="font-semibold text-slate-200">{currentSchool?.adminName || '-'}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{currentSchool?.adminEmail || '-'}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{currentSchool?.adminPhone || '-'}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Lokasi Kampus & Kontak
                    </span>
                    <p className="font-medium text-slate-300 leading-snug">{currentSchool?.address || '-'}</p>
                    <p className="text-[11px] text-slate-400 font-mono">Telp: {currentSchool?.phone || '-'}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                      {isCurrentUniv ? 'Kapasitas Mahasiswa' : 'Kuota Siswa'} & Masa Aktif
                    </span>
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span>Terdaftar: {enrolledCount} {isCurrentUniv ? 'Mahasiswa' : 'Siswa'}</span>
                      <span className="text-emerald-400 font-bold">{quotaPercent}%</span>
                    </div>
                    {/* Capacity bar */}
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${quotaPercent}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Maksimal: {maxStudentsCount.toLocaleString()} {isCurrentUniv ? 'Mahasiswa' : 'Siswa'} • Berlaku s/d {currentSchool?.validUntil || '2028'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Switch Registered Schools & Universities */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Daftar Universitas & Sekolah Terdaftar ({schools.length})
                  </h5>
                  <span className="text-[11px] text-slate-500">
                    Klik instansi untuk beralih terminal secara instan
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {schools.map(school => {
                    const isCurrent = school.id === activeSchool.id;
                    const isUniv = school.institutionType === 'UNIVERSITAS';
                    return (
                      <div
                        key={school.id}
                        onClick={() => activateSchoolByCode(school.activationCode)}
                        className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all duration-150 relative ${
                          isCurrent
                            ? isDark
                              ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                              : 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400'
                            : isDark
                            ? 'bg-slate-900/60 hover:bg-slate-800/70 border-white/[0.06] hover:border-white/15'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Logo Thumbnail */}
                          <div className="w-9 h-9 rounded-xl border p-0.5 flex items-center justify-center shrink-0 bg-slate-950/30 border-white/10 overflow-hidden">
                            {school.logoUrl ? (
                              <img
                                src={school.logoUrl}
                                alt={school.name}
                                className="w-full h-full object-contain"
                              />
                            ) : isUniv ? (
                              <GraduationCap className="w-5 h-5 text-sky-400" />
                            ) : (
                              <School className="w-5 h-5 text-emerald-400" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[8px] font-mono uppercase font-bold px-1.5 py-0.2 rounded ${
                                  isUniv ? 'bg-sky-500/20 text-sky-400' : 'bg-emerald-500/20 text-emerald-400'
                                }`}
                              >
                                {isUniv ? 'KAMPUS' : 'SEKOLAH'}
                              </span>
                              {isCurrent && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              )}
                            </div>
                            <h6 className="font-bold truncate text-slate-100 mt-0.5">
                              {school.name}
                            </h6>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {isUniv ? 'Kode PT' : 'NPSN'}: {school.npsn}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span className="truncate max-w-[120px]">{school.adminName}</span>
                          <span className="text-emerald-400 font-semibold">{school.activationCode.slice(0, 10)}...</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVATE EXISTING CODE */}
          {activeSubTab === 'activate' && (
            <div className="space-y-6">
              <div
                className={`p-5 rounded-2xl border ${
                  isDark ? 'bg-slate-900/50 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-100">
                      Masukkan Kode Aktivasi Institusi
                    </h5>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Setiap instansi universitas maupun sekolah memiliki 1 kode aktivasi unik resmi (contoh: <code className="font-mono text-emerald-400 font-bold">ATND-ITS-1960-X7K2</code>).
                      Memasukkan kode ini akan mengikat terminal gerbang ini ke database kampus/sekolah terkait.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleActivateSubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Kode Aktivasi (Activation Code):
                    </label>
                    <input
                      type="text"
                      value={activationInput}
                      onChange={e => setActivationInput(e.target.value.toUpperCase())}
                      placeholder="Contoh: ATND-ITS-1960-X7K2 atau ATND-SMAN1-7892-K4F9"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-mono tracking-wider font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                        isDark
                          ? 'bg-slate-950 border-white/15 text-white placeholder-slate-600'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-500">
                      *Format lisensi case-insensitive dan diverifikasi secara kriptografis
                    </span>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Verifikasi & Aktifkan Lisensi</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Quick Preset Selector for Demo testing */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400">Kode Lisensi Demo Tersedia:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {schools.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActivationInput(s.activationCode)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-mono transition-colors cursor-pointer flex items-center gap-2.5 ${
                        isDark
                          ? 'bg-slate-900/80 hover:bg-slate-800 border-white/10 text-slate-300'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 bg-slate-950/50 p-0.5 border border-white/10 flex items-center justify-center">
                        {s.logoUrl ? (
                          <img src={s.logoUrl} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <School className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-emerald-400 truncate">{s.activationCode}</div>
                        <div className="text-[10px] text-slate-400 truncate font-sans">{s.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REGISTER NEW UNIVERSITY / SCHOOL */}
          {activeSubTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div
                className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
                  isDark ? 'bg-slate-900/40 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
                <p>
                  Pendaftaran instansi baru otomatis menerbitkan <strong>1 Kode Aktivasi Lisensi Resmi</strong> khusus untuk universitas atau sekolah tersebut, lengkap dengan logo dan data administrator.
                </p>
              </div>

              {/* Institution Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tipe Institusi Pendidikan *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setNewInstitutionType('UNIVERSITAS');
                      setNewMaxStudents(25000);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      newInstitutionType === 'UNIVERSITAS'
                        ? 'bg-sky-500/15 border-sky-500 text-white shadow-md'
                        : isDark
                        ? 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">Universitas / Kampus</div>
                      <div className="text-[10px] text-slate-400">Institut, Politeknik, PTN / PTS</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewInstitutionType('SEKOLAH');
                      setNewMaxStudents(1500);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      newInstitutionType === 'SEKOLAH'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md'
                        : isDark
                        ? 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      <School className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">Sekolah Menengah</div>
                      <div className="text-[10px] text-slate-400">SMA, SMK, MA, atau SMP</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Logo Upload & Preview Section */}
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-slate-900/40 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                    Logo Resmi {newInstitutionType === 'UNIVERSITAS' ? 'Universitas' : 'Sekolah'}
                  </label>
                  {newLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setNewLogoUrl('')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus Logo
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* Logo Preview */}
                  <div className="w-20 h-20 rounded-2xl border p-1 bg-slate-950/60 border-white/15 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                    {newLogoUrl ? (
                      <img src={newLogoUrl} alt="Preview Logo" className="w-full h-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500 text-center p-1">
                        <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                        <span className="text-[9px]">Belum ada logo</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Pilih Gambar Logo dari Laptop (PNG/JPG/SVG)</span>
                      </button>
                    </div>

                    {/* Quick Preset Logos */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-400">Pilihan cepat:</span>
                      {PRESET_SAMPLE_LOGOS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNewLogoUrl(preset.url)}
                          className="px-2 py-0.5 rounded-lg border border-white/10 text-[10px] text-slate-300 hover:bg-white/10 cursor-pointer"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Information Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Resmi {newInstitutionType === 'UNIVERSITAS' ? 'Universitas / Institut' : 'Sekolah'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      newInstitutionType === 'UNIVERSITAS'
                        ? 'Contoh: Universitas Gadjah Mada (UGM)'
                        : 'Contoh: SMA Negeri 1 Denpasar'
                    }
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-950 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {newInstitutionType === 'UNIVERSITAS' ? 'Kode PT (PDDikti) / NPSN *' : 'NPSN *'}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder={newInstitutionType === 'UNIVERSITAS' ? 'Contoh: 001001' : 'Contoh: 20108842'}
                    value={newNpsn}
                    onChange={e => setNewNpsn(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-950 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Alamat Lengkap Kampus / Sekolah
                  </label>
                  <input
                    type="text"
                    placeholder={
                      newInstitutionType === 'UNIVERSITAS'
                        ? 'Contoh: Bulaksumur, Caturtunggal, Sleman, D.I. Yogyakarta'
                        : 'Contoh: Jl. Kamboja No. 12, Denpasar Utara, Bali'
                    }
                    value={newAddress}
                    onChange={e => setNewAddress(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-950 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama {newInstitutionType === 'UNIVERSITAS' ? 'Rektorat / Administrator Kampus *' : 'Admin Penanggung Jawab *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      newInstitutionType === 'UNIVERSITAS'
                        ? 'Contoh: Prof. dr. Ova Emilia, M.Med.Ed., Ph.D'
                        : 'Contoh: I Putu Arya, S.Kom'
                    }
                    value={newAdminName}
                    onChange={e => setNewAdminName(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-950 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Resmi Institusi
                  </label>
                  <input
                    type="email"
                    placeholder={
                      newInstitutionType === 'UNIVERSITAS' ? 'Contoh: rektorat@ugm.ac.id' : 'Contoh: admin@sekolah.sch.id'
                    }
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-950 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    No. WhatsApp / Telepon Penanggung Jawab
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 0812-3456-7890"
                    value={newAdminPhone}
                    onChange={e => setNewAdminPhone(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-950 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kapasitas Maksimal {newInstitutionType === 'UNIVERSITAS' ? 'Mahasiswa' : 'Siswa'}
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={100000}
                    value={newMaxStudents}
                    onChange={e => setNewMaxStudents(Number(e.target.value))}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-950 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('current')}
                  className={`px-4 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Daftarkan & Terbitkan Kode Aktivasi</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
