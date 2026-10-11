import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  Download,
  Filter,
  Zap,
  FileSpreadsheet,
  Database,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { AttendanceLog } from '../types';

export const AttendanceLogView: React.FC = () => {
  const { attendanceLogs, supabaseConnected, resetAllStoredData, notify } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Hadir Tepat Waktu' | 'Terlambat'>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');

  const filteredLogs = attendanceLogs.filter((log: AttendanceLog) => {
    const matchesSearch =
      log.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'ALL' || log.class === selectedClass;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'Hadir Tepat Waktu' && log.status.includes('Tepat Waktu')) ||
      (statusFilter === 'Terlambat' && log.status.includes('Terlambat'));
    const matchesDate = !dateFilter || (log.dateString && log.dateString === dateFilter) || (log.timestamp && log.timestamp.includes(dateFilter));

    return matchesSearch && matchesClass && matchesStatus && matchesDate;
  });

  // Export CSV dengan UTF-8 BOM untuk kompatibilitas penuh Microsoft Excel
  const exportCSV = () => {
    if (filteredLogs.length === 0) {
      notify('Belum ada data kehadiran yang sesuai filter untuk diekspor.', 'warning');
      return;
    }

    const headers = [
      'No',
      'ID Log',
      'NIS Siswa',
      'Nama Lengkap',
      'Kelas',
      'Waktu Masuk',
      'Status Kehadiran',
      'Metode Presensi',
      'Tingkat Akurasi',
      'Kecepatan Jalan',
      'Status Penyimpanan'
    ];

    const rows = filteredLogs.map((l: AttendanceLog, idx: number) => [
      idx + 1,
      l.id,
      l.studentId,
      `"${l.studentName.replace(/"/g, '""')}"`,
      l.class,
      `"${l.timestamp}"`,
      `"${l.status}"`,
      `"${l.method}"`,
      `"${l.confidence}"`,
      `"${l.speed || '1.3 m/s'}"`,
      `"${l.storageStatus || (supabaseConnected ? 'Supabase PostgreSQL' : 'IndexedDB Lokal')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Rekap_Presensi_Sekolah_${selectedClass}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify('📄 File rekap absensi CSV (kompatibel Excel) berhasil diunduh.');
  };

  const handleResetData = () => {
    if (window.confirm('Apakah Anda yakin ingin me-reset seluruh data riwayat presensi lokal yang tersimpan?')) {
      resetAllStoredData();
    }
  };

  // Metrics
  const totalHadir = filteredLogs.length;
  const tepatWaktuCount = filteredLogs.filter(l => l.status.includes('Tepat Waktu')).length;
  const terlambatCount = filteredLogs.filter(l => l.status.includes('Terlambat')).length;

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Rekap Presensi Siswa Walk-Through Real-Time
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${
              supabaseConnected
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}>
              <Database className="w-3.5 h-3.5" />
              {supabaseConnected ? 'Tersimpan di Supabase Cloud' : 'Tersimpan di IndexedDB Lokal'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Data kehadiran otomatis tercatat saat siswa melangkah di depan kamera gerbang tablet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {attendanceLogs.length > 0 && (
            <button
              onClick={handleResetData}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-rose-200 cursor-pointer"
              title="Reset data presensi lokal"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Log
            </button>
          )}

          <button
            onClick={exportCSV}
            disabled={filteredLogs.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Rekap Excel / CSV
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Hadir</div>
            <div className="text-xl font-bold text-slate-900 font-mono">{totalHadir} Siswa</div>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Tepat Waktu</div>
            <div className="text-xl font-bold text-teal-700 font-mono">{tepatWaktuCount} Siswa</div>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Terlambat Masuk</div>
            <div className="text-xl font-bold text-amber-700 font-mono">{terlambatCount} Siswa</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama atau NIS siswa..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Semua Kelas</option>
              <option value="10-IPA-1">Kelas 10-IPA-1</option>
              <option value="10-IPA-2">Kelas 10-IPA-2</option>
              <option value="10-IPS-1">Kelas 10-IPS-1</option>
              <option value="11-IPA-1">Kelas 11-IPA-1</option>
              <option value="12-IPA-1">Kelas 12-IPA-1</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="Hadir Tepat Waktu">Tepat Waktu</option>
              <option value="Terlambat">Terlambat</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Menampilkan <span className="text-emerald-700 font-bold">{filteredLogs.length}</span> entri kehadiran
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Foto &amp; Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Metode Absensi</th>
                <th className="py-3 px-4">Penyimpanan</th>
                <th className="py-3 px-4">Tingkat Akurasi</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="max-w-xs mx-auto space-y-2 text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-slate-700 text-sm">
                        Belum Ada Data Presensi
                      </div>
                      <p className="text-xs text-slate-500">
                        Data kehadiran akan otomatis muncul di sini begitu siswa melangkah melintasi Terminal Gerbang.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log: AttendanceLog) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {log.photoUrl ? (
                          <img
                            src={log.photoUrl}
                            alt={log.studentName}
                            className="w-9 h-9 rounded-lg object-cover border border-emerald-500 shadow-2xs shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center border border-emerald-300 shrink-0 text-xs">
                            {log.studentName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900">{log.studentName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{log.studentId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{log.class}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <Zap className="w-3.5 h-3.5 text-emerald-600" />
                        Walk-Through ({log.speed || '1.3 m/s'})
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <span className="text-emerald-700 flex items-center gap-1.5 font-medium">
                        <Database className="w-3.5 h-3.5 text-emerald-600" />
                        {log.storageStatus || (supabaseConnected ? 'Supabase Cloud' : 'IndexedDB Lokal')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      <div>{log.confidence}</div>
                      <div className="text-[10px] text-slate-400">{log.qualityScore}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          log.status.includes('Terlambat')
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
