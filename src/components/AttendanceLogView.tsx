import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  Download,
  Filter,
  Trash2,
  Calendar,
  FileText,
  ShieldCheck,
  Zap,
  Inbox,
  Check,
  AlertTriangle,
  RefreshCw,
  Send,
  CheckCircle2,
  X,
  Wifi,
  WifiOff,
  Edit3,
  MessageSquare
} from 'lucide-react';
import { AttendanceLog } from '../types';
import { MonthlyAttendancePdfModal } from './MonthlyAttendancePdfModal';

export const AttendanceLogView: React.FC = () => {
  const {
    attendanceLogs,
    clearAttendanceLogs,
    notify,
    currentRole,
    userAssignedClass,
    activeSchool,
    students,
    verifyOrDisputeAttendance,
    dispatchCorrectionWhatsApp,
    resendWhatsAppNotification,
    isOnline,
    offlineQueueCount,
    syncOfflineQueue,
    currentUser
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState(() => {
    return currentRole === 'wali_kelas' && userAssignedClass ? userAssignedClass : 'ALL';
  });
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'On Time' | 'Late'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DATANG' | 'PULANG'>('ALL');
  const [verificationFilter, setVerificationFilter] = useState<'ALL' | 'NEEDS_MANUAL_REVIEW' | 'MANUALLY_VERIFIED' | 'DISPUTED'>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [showMonthlyPdfModal, setShowMonthlyPdfModal] = useState<boolean>(false);

  // 🛡️ SOLUSI 1 & 4: Modal Koreksi Salah Wajah & Kirim Ulang Notifikasi
  const [showCorrectionModal, setShowCorrectionModal] = useState<boolean>(false);
  const [selectedLogForCorrection, setSelectedLogForCorrection] = useState<AttendanceLog | null>(null);
  const [correctTargetStudentId, setCorrectTargetStudentId] = useState<string>('');
  const [correctionNote, setCorrectionNote] = useState<string>('');
  const [sendCorrectionWa, setSendCorrectionWa] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Auto-sync class when role or userAssignedClass changes
  useEffect(() => {
    if (currentRole === 'wali_kelas' && userAssignedClass) {
      setSelectedClass(userAssignedClass);
    }
  }, [currentRole, userAssignedClass]);

  const filteredLogs = attendanceLogs.filter((log: AttendanceLog) => {
    const matchesSearch =
      log.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'ALL' || log.class === selectedClass;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'On Time' && (log.status.toLowerCase().includes('time') || log.status.toLowerCase().includes('tepat'))) ||
      (statusFilter === 'Late' && (log.status.toLowerCase().includes('late') || log.status.toLowerCase().includes('terlambat')));
    const matchesDate = !dateFilter || (log.dateString && log.dateString === dateFilter) || (log.timestamp && log.timestamp.includes(dateFilter));
    const logType = log.attendanceType || 'DATANG';
    const matchesType = typeFilter === 'ALL' || logType === typeFilter;
    const vStatus = log.verificationStatus || 'VERIFIED';
    const matchesVerification =
      verificationFilter === 'ALL' || vStatus === verificationFilter;

    return matchesSearch && matchesClass && matchesStatus && matchesDate && matchesType && matchesVerification;
  });

  // Export CSV with UTF-8 BOM for Microsoft Excel compatibility
  const exportCSV = () => {
    if (filteredLogs.length === 0) {
      notify('No attendance records match the selected filter to export.', 'warning');
      return;
    }

    const headers = [
      'No',
      'Log ID',
      'Student ID',
      'Full Name',
      'Class',
      'Tipe Absen',
      'Waktu Presensi',
      'Status Presensi',
      'Method',
      'Accuracy Score',
      'Walk Speed'
    ];

    const rows = filteredLogs.map((l: AttendanceLog, idx: number) => {
      const isLate = l.status.toLowerCase().includes('late') || l.status.toLowerCase().includes('terlambat');
      const typeLabel = l.attendanceType === 'PULANG' ? 'PULANG' : 'DATANG';
      return [
        idx + 1,
        l.id,
        l.studentId,
        `"${l.studentName.replace(/"/g, '""')}"`,
        l.class,
        `"${typeLabel}"`,
        `"${l.timestamp}"`,
        `"${isLate ? 'Late' : 'On Time'}"`,
        `"${l.method}"`,
        `"${l.confidence}"`,
        `"${l.speed || '1.3 m/s'}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const safeSchool = activeSchool?.name ? activeSchool.name.replace(/[^a-zA-Z0-9]/g, '_') : 'School';
    link.setAttribute(
      'download',
      `Attendance_${safeSchool}_${selectedClass}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify('Attendance CSV report downloaded successfully.');
  };

  const handleResetData = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus seluruh rekaman presensi log gerbang? (Data siswa terdaftar akan tetap aman)')) {
      clearAttendanceLogs();
    }
  };

  // Metrics
  const totalPresent = filteredLogs.length;
  const datangCount = filteredLogs.filter(l => (l.attendanceType || 'DATANG') === 'DATANG').length;
  const pulangCount = filteredLogs.filter(l => l.attendanceType === 'PULANG').length;
  const onTimeCount = filteredLogs.filter(l => (l.attendanceType || 'DATANG') === 'DATANG' && (l.status.toLowerCase().includes('time') || l.status.toLowerCase().includes('tepat'))).length;
  const lateCount = filteredLogs.filter(l => (l.attendanceType || 'DATANG') === 'DATANG' && (l.status.toLowerCase().includes('late') || l.status.toLowerCase().includes('terlambat'))).length;
  const needsReviewCount = filteredLogs.filter(l => l.verificationStatus === 'NEEDS_MANUAL_REVIEW').length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Attendance Verification Records
            </h2>
            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800/90 rounded-md border border-slate-200 dark:border-white/10">
              {filteredLogs.length} LOGGED
            </span>
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-md border border-emerald-200 dark:border-emerald-500/30">
              {activeSchool?.activationCode}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Instansi: <strong className="text-slate-700 dark:text-slate-200">{activeSchool?.name}</strong> • Walk-through biometrik gate.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Print Monthly Attendance PDF Button */}
          <button
            onClick={() => setShowMonthlyPdfModal(true)}
            className="px-3.5 py-2 bg-[#174384] hover:bg-[#13376e] text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md cursor-pointer active:scale-98 border border-blue-400/25"
            title="Generate Official Monthly Attendance Ledger (PDF)"
          >
            <FileText className="w-3.5 h-3.5 text-white" />
            <span>Monthly Ledger (PDF)</span>
          </button>

          <button
            onClick={exportCSV}
            disabled={filteredLogs.length === 0}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-white/10 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs cursor-pointer active:scale-98"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Export CSV</span>
          </button>

          {attendanceLogs.length > 0 && currentRole === 'admin' && (
            <button
              onClick={handleResetData}
              className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-800"
              title="Hapus riwayat presensi (Data siswa tetap aman)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Role Contextual Banners for Guru BK, Kepala Sekolah, and Pengawas (Elegan Navy & Emerald) */}
      {currentRole === 'guru_bk' && (
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#174384] text-white flex items-center justify-center font-bold text-xs shadow-md border border-blue-400/20">
              BK
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">Mode Guru Bimbingan & Konseling (BK)</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Pemantauan siswa terlambat dan alpa untuk tindak lanjut konseling & pemanggilan orang tua.</div>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter(statusFilter === 'Late' ? 'ALL' : 'Late')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer text-xs ${
              statusFilter === 'Late'
                ? 'bg-[#174384] text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {statusFilter === 'Late' ? '✓ Menampilkan Siswa Terlambat' : 'Filter Siswa Terlambat (Perlu BK)'}
          </button>
        </div>
      )}

      {currentRole === 'kepala_sekolah' && (
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
              KS
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">Mode Kepala Sekolah / Rektor (Executive Oversight)</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Tinjauan tingkat kehadiran institusi secara menyeluruh dan pengesahan resmi laporan kehadiran bulanan.</div>
            </div>
          </div>
          <button
            onClick={() => setShowMonthlyPdfModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md cursor-pointer text-xs flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Pengesahan Laporan PDF Bulanan →</span>
          </button>
        </div>
      )}

      {currentRole === 'pengawas' && (
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#174384] text-white flex items-center justify-center font-bold text-xs shadow-md border border-blue-400/20">
              PW
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">Mode Pengawas Sekolah / Pembina Dinas Pendidikan</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Audit kepatuhan kehadiran institusi terhadap Standar Nasional Pendidikan (Permendikbud Ristek).</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold border border-slate-200 dark:border-slate-700">
              AUDIT KEPATUHAN: VALID
            </span>
            <button
              onClick={() => setShowMonthlyPdfModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#174384] hover:bg-[#13376e] text-white font-bold transition-all shadow-xs cursor-pointer text-xs border border-blue-400/20"
            >
              Unduh Berkas Akreditasi
            </button>
          </div>
        </div>
      )}

      {/* 🌐 SOLUSI 3: Toleransi Internet / Listrik Mati (Edge Local Storage Sync Banner - Navy Theme) */}
      {(!isOnline || offlineQueueCount > 0) && (
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#174384] text-white flex items-center justify-center font-bold text-xs shadow-md border border-blue-400/20 shrink-0">
              {isOnline ? <RefreshCw className="w-5 h-5 text-white" /> : <WifiOff className="w-5 h-5 text-white" />}
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <span>{isOnline ? 'Tersedia Data Antrean Offline' : 'Mode Edge Lokal (Jaringan Offline)'}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25 font-bold">
                  {offlineQueueCount} Catatan Tertahan
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isOnline
                  ? 'Koneksi kembali normal. Data presensi yang dicatat offline siap disinkronkan ke server pusat.'
                  : 'Sistem presensi tetap aktif beroperasi 100% lokal. Data disimpan aman di memori gerbang lokal.'}
              </div>
            </div>
          </div>
          {isOnline && offlineQueueCount > 0 && (
            <button
              onClick={async () => {
                setIsSyncing(true);
                await syncOfflineQueue();
                setIsSyncing(false);
              }}
              disabled={isSyncing}
              className="px-4 py-2 bg-[#174384] hover:bg-[#13376e] text-white rounded-xl font-bold font-mono text-xs flex items-center gap-2 cursor-pointer shadow-md active:scale-98 transition-all disabled:opacity-50 shrink-0 border border-blue-400/25"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : `Sinkronkan ${offlineQueueCount} Data`}</span>
            </button>
          )}
        </div>
      )}

      {/* Monolithic Stat Deck */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xs dark:shadow-xl grid grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-white/5 overflow-hidden backdrop-blur-xl">
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold">
            TOTAL EVENT PRESENSI
          </div>
          <div className="text-2xl sm:text-3xl font-light tracking-tight font-mono text-slate-900 dark:text-white mt-2">
            {totalPresent}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Total log tercatat
          </div>
        </div>

        <div className="p-4 sm:p-5 flex flex-col justify-between border-t sm:border-t-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>HADIR MASUK (DATANG)</span>
          </div>
          <div className="text-2xl sm:text-3xl font-light tracking-tight font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {datangCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {onTimeCount} tepat waktu • {lateCount} terlambat
          </div>
        </div>

        <div className="p-4 sm:p-5 flex flex-col justify-between border-t lg:border-t-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span>SELESAI KBM (PULANG)</span>
          </div>
          <div className="text-2xl sm:text-3xl font-light tracking-tight font-mono text-blue-600 dark:text-blue-400 mt-2">
            {pulangCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Siswa tercatat pulang gerbang
          </div>
        </div>

        <div className="p-4 sm:p-5 flex flex-col justify-between border-t lg:border-t-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">
            KETEPATAN WAKTU
          </div>
          <div className="text-2xl sm:text-3xl font-light tracking-tight font-mono text-slate-900 dark:text-white mt-2">
            {datangCount > 0 ? `${Math.round((onTimeCount / datangCount) * 100)}%` : '100%'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Rasio on-time presensi pagi
          </div>
        </div>

        {/* 🛡️ Stat Review Manual */}
        <div className="p-4 sm:p-5 flex flex-col justify-between border-t lg:border-t-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
            <span>TINJAUAN MANUAL</span>
          </div>
          <div className="text-2xl sm:text-3xl font-light tracking-tight font-mono text-slate-900 dark:text-white mt-2">
            {needsReviewCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {needsReviewCount > 0 ? '⚠️ Butuh validasi operator' : '✓ Semua terverifikasi'}
          </div>
        </div>
      </div>

      {/* Filter and Search Ribbon */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs dark:shadow-lg backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student or ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-900"
            />
          </div>

          {/* Tipe Presensi Filter (Datang vs Pulang) */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Sesi (Datang & Pulang)</option>
            <option value="DATANG">☀️ Hanya Absen Datang</option>
            <option value="PULANG">🌙 Hanya Absen Pulang</option>
          </select>

          {/* 🛡️ Status Verifikasi Filter (Solusi 1) */}
          <select
            value={verificationFilter}
            onChange={e => setVerificationFilter(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Status Verifikasi</option>
            <option value="NEEDS_MANUAL_REVIEW">⚠️ Butuh Review Manual ({attendanceLogs.filter(l => l.verificationStatus === 'NEEDS_MANUAL_REVIEW').length})</option>
            <option value="MANUALLY_VERIFIED">✓ Diverifikasi Manual</option>
            <option value="DISPUTED">🔁 Dikoreksi / Sengketa</option>
          </select>

          {currentRole === 'wali_kelas' && userAssignedClass ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-mono font-medium text-slate-800 dark:text-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>CLASS {userAssignedClass} (HOMEROOM LOCK)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-slate-400" />
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Classes</option>
                <option value="10-IPA-1">Class 10-IPA-1</option>
                <option value="10-IPA-2">Class 10-IPA-2</option>
                <option value="10-IPS-1">Class 10-IPS-1</option>
                <option value="11-IPA-1">Class 11-IPA-1</option>
                <option value="12-IPA-1">Class 12-IPA-1</option>
              </select>
            </div>
          )}

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="On Time">On Time</option>
            <option value="Late">Late</option>
          </select>

          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="text-xs text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none"
            />
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
          FILTERED: <span className="text-slate-900 dark:text-emerald-400 font-bold">{filteredLogs.length}</span> ROWS
        </div>
      </div>

      {/* High-Density Linear Table */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-2xs dark:shadow-xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-white/10 text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">TIMESTAMP</th>
                <th className="py-3 px-4">TIPE SESI</th>
                <th className="py-3 px-4">STUDENT</th>
                <th className="py-3 px-4">CLASS</th>
                <th className="py-3 px-4">METODE & DETEKSI</th>
                <th className="py-3 px-4">AKURASI & STATUS AI</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-right">TINDAKAN / KOREKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="max-w-xs mx-auto space-y-2 text-slate-400">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
                        <Inbox className="w-5 h-5" />
                      </div>
                      <div className="font-semibold text-slate-700 dark:text-slate-200 text-xs">
                        No Attendance Records Found
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Scanned entries will populate automatically when students walk through the gate terminal.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log: AttendanceLog) => {
                  const isLate = log.status.toLowerCase().includes('late') || log.status.toLowerCase().includes('terlambat');
                  const isPulang = log.attendanceType === 'PULANG';
                  const isFallback = log.method === 'MANUAL_FALLBACK';
                  const isNeedsReview = log.verificationStatus === 'NEEDS_MANUAL_REVIEW';

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-white/[0.03] transition-colors ${
                        isNeedsReview ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{log.timestamp}</span>
                          {log.syncedToCloud === false && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 font-bold"
                              title="Tersimpan di edge lokal gerbang, menunggu sinkronisasi internet"
                            >
                              Lokal
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide ${
                            isPulang
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {isPulang ? '🌙 PULANG' : '☀️ DATANG'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {log.photoUrl ? (
                            <img
                              src={log.photoUrl}
                              alt={log.studentName}
                              className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-900/10 dark:ring-white/10 shadow-2xs shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-semibold flex items-center justify-center border border-slate-200 dark:border-white/10 shrink-0 text-xs">
                              {log.studentName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white text-xs">{log.studentName}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{log.studentId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">{log.class}</td>
                      <td className="py-3 px-4">
                        {isFallback ? (
                          <span className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-mono text-[11px] bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 font-bold">
                            <ShieldCheck className="w-3 h-3 text-blue-500" />
                            Cadangan: {log.fallbackReason || 'Barcode/NIS'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                            <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            Walk-Through ({log.speed || '1.3 m/s'})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <span>Skor:</span>
                            <strong className="text-slate-900 dark:text-slate-200 font-bold">
                              {log.confidenceScore ? `${log.confidenceScore}%` : log.confidence}
                            </strong>
                          </div>
                          <div>
                            {log.verificationStatus === 'NEEDS_MANUAL_REVIEW' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                Review Manual
                              </span>
                            )}
                            {log.verificationStatus === 'MANUALLY_VERIFIED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                                <CheckCircle2 className="w-3 h-3 text-blue-500" />
                                Valid ({log.manualVerifiedBy || 'Operator'})
                              </span>
                            )}
                            {log.verificationStatus === 'DISPUTED' && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                                title={log.disputeNote}
                              >
                                <RefreshCw className="w-3 h-3 text-blue-500" />
                                Dikoreksi
                              </span>
                            )}
                            {(!log.verificationStatus || log.verificationStatus === 'VERIFIED') && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <Check className="w-3 h-3 text-emerald-500" />
                                Lolos AI
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wide ${
                            isPulang
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200/80 dark:border-blue-700/50'
                              : isLate
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-700/50'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-700/50'
                          }`}
                        >
                          {isPulang ? 'PULANG' : isLate ? 'LATE' : 'ON TIME'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {log.verificationStatus === 'NEEDS_MANUAL_REVIEW' && (
                            <button
                              onClick={() => {
                                verifyOrDisputeAttendance(log.id, 'VERIFY');
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold font-mono flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
                              title="Verifikasi validitas wajah siswa ini"
                            >
                              <Check className="w-3 h-3" />
                              <span>Sahkan</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedLogForCorrection(log);
                              setCorrectTargetStudentId('');
                              setCorrectionNote('');
                              setShowCorrectionModal(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold font-mono flex items-center gap-1 border border-slate-200 dark:border-white/10 cursor-pointer active:scale-95 transition-all"
                            title="Koreksi identitas siswa jika salah deteksi wajah"
                          >
                            <Edit3 className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                            <span>Koreksi</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🛡️ SOLUSI 1 & 4: Modal Koreksi Salah Mengenali Wajah & Notifikasi Revisi WhatsApp */}
      {showCorrectionModal && selectedLogForCorrection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Koreksi Salah Wajah (Manual Review)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Perbaiki identifikasi siswa dan perbarui data presensi resmi.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCorrectionModal(false);
                  setSelectedLogForCorrection(null);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Record Info */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 text-xs space-y-2">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                DATA PRESENSI SEMULA (TERDETEKSI AI)
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedLogForCorrection.studentName}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    NIS: {selectedLogForCorrection.studentId} • Kelas: {selectedLogForCorrection.class}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    Skor: {selectedLogForCorrection.confidenceScore ? `${selectedLogForCorrection.confidenceScore}%` : selectedLogForCorrection.confidence}
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {selectedLogForCorrection.timestamp}
                  </div>
                </div>
              </div>
            </div>

            {/* Correction Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tetapkan ke Siswa Sebenarnya (Reassign):
                </label>
                <select
                  value={correctTargetStudentId}
                  onChange={e => setCorrectTargetStudentId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Siswa yang Sebenarnya Masuk/Pulang --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id}) - Kelas {s.class}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Alasan Koreksi / Catatan Operator:
                </label>
                <input
                  type="text"
                  placeholder="Misal: Kemiripan wajah saudara, masker/topi, backlight..."
                  value={correctionNote}
                  onChange={e => setCorrectionNote(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 🛡️ Solusi 4: Notifikasi Revisi WhatsApp ke Orang Tua */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="sendCorrectionWa"
                  checked={sendCorrectionWa}
                  onChange={e => setSendCorrectionWa(e.target.checked)}
                  className="mt-0.5 accent-emerald-500 cursor-pointer"
                />
                <label htmlFor="sendCorrectionWa" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  <strong className="text-emerald-600 dark:text-emerald-400 block font-semibold">
                    Kirim Notifikasi Revisi Resmi WhatsApp ke Orang Tua
                  </strong>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block mt-0.5">
                    Mencegah kepanikan atau informasi keliru ke orang tua siswa. Sistem akan otomatis mengirimkan pesan konfirmasi pembetulan kehadiran ke nomor WhatsApp wali murid.
                  </span>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('Tandai log ini sebagai Sengketa / Batal (Dispute)? Data presensi tidak akan dihitung sebagai kehadiran.')) {
                    await verifyOrDisputeAttendance(selectedLogForCorrection.id, 'DISPUTE', undefined, correctionNote || 'Dibatalkan oleh operator');
                    setShowCorrectionModal(false);
                    setSelectedLogForCorrection(null);
                  }
                }}
                className="px-3.5 py-2 text-xs font-mono font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
              >
                Batalkan Presensi (Dispute)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCorrectionModal(false);
                    setSelectedLogForCorrection(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={!correctTargetStudentId}
                  onClick={async () => {
                    const result = await verifyOrDisputeAttendance(
                      selectedLogForCorrection.id,
                      'REASSIGN',
                      correctTargetStudentId,
                      correctionNote || 'Koreksi wajah oleh operator'
                    );
                    if (result.success && sendCorrectionWa) {
                      const updatedLog = {
                        ...selectedLogForCorrection,
                        studentId: correctTargetStudentId
                      };
                      await dispatchCorrectionWhatsApp(updatedLog, correctionNote || 'Koreksi presensi gerbang');
                    }
                    setShowCorrectionModal(false);
                    setSelectedLogForCorrection(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Terapkan Koreksi & Sahkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Attendance PDF Modal */}
      <MonthlyAttendancePdfModal
        isOpen={showMonthlyPdfModal}
        onClose={() => setShowMonthlyPdfModal(false)}
        defaultClass={selectedClass}
      />
    </div>
  );
};
