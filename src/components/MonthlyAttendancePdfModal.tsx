import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Printer,
  X,
  Calendar,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserCheck,
  ShieldCheck,
  Sparkles,
  School,
  GraduationCap,
  Clock,
  TrendingUp,
  Award
} from 'lucide-react';
import { Student, AttendanceLog, PRESET_USERS } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultClass?: string;
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

export const MonthlyAttendancePdfModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaultClass
}) => {
  const { students, attendanceLogs, currentUser, currentRole, currentSchoolStaff, userAssignedClass, activeSchool, theme } = useApp();

  const isDark = theme === 'dark';
  const now = new Date();
  const currentMonthIdx = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIdx);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // If role is wali_kelas, locked to userAssignedClass
  const initialClass =
    currentRole === 'wali_kelas' && userAssignedClass
      ? userAssignedClass
      : defaultClass && defaultClass !== 'ALL'
      ? defaultClass
      : '10-IPA-1';

  const [selectedClass, setSelectedClass] = useState<string>(initialClass);

  // List of all classes available in school
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    students.forEach(s => {
      if (s.class) classSet.add(s.class);
    });
    // Add default fallbacks if empty
    ['10-IPA-1', '10-IPA-2', '10-IPS-1', '11-IPA-1', '12-IPA-1'].forEach(c => classSet.add(c));
    return Array.from(classSet).sort();
  }, [students]);

  // Total days in selected month & year
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedMonth, selectedYear]);

  // Determine which days are Sundays (holidays)
  const dayDetails = useMemo(() => {
    const list: { day: number; isSunday: boolean; dayName: string }[] = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(selectedYear, selectedMonth, d);
      const dayOfWeek = dateObj.getDay();
      list.push({
        day: d,
        isSunday: dayOfWeek === 0, // Sunday
        dayName: dayNames[dayOfWeek]
      });
    }
    return list;
  }, [selectedYear, selectedMonth, daysInMonth]);

  // Students belonging to the selected class
  const classStudents = useMemo(() => {
    const list = students.filter(s => s.class === selectedClass);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedClass]);

  // Map attendance logs to student & day
  const attendanceMatrix = useMemo(() => {
    const map = new Map<string, { status: 'P' | 'L'; timestamp: string }>();

    attendanceLogs.forEach(log => {
      let logDate: Date | null = null;
      if (log.dateString) {
        logDate = new Date(log.dateString);
      } else if (log.timestamp) {
        logDate = new Date(log.timestamp);
      }

      if (logDate && !isNaN(logDate.getTime())) {
        if (logDate.getMonth() === selectedMonth && logDate.getFullYear() === selectedYear) {
          const dayNum = logDate.getDate();
          const key = `${log.studentId}_${dayNum}`;
          const isLate = log.status.toLowerCase().includes('late') || log.status.toLowerCase().includes('terlambat');
          map.set(key, {
            status: isLate ? 'L' : 'P',
            timestamp: log.timestamp
          });
        }
      }
    });

    return map;
  }, [attendanceLogs, selectedMonth, selectedYear]);

  // Dynamic statistics
  const isUniv = activeSchool?.institutionType === 'UNIVERSITAS';
  const totalClassStudents = classStudents.length;

  const kepalaSekolahInfo = useMemo(() => {
    const p = currentSchoolStaff?.find(u => u.role === 'kepala_sekolah') || PRESET_USERS.find(u => u.role === 'kepala_sekolah');
    return {
      name: p?.name || (isUniv ? 'Prof. Dr. Ir. Mochamad Ashari, M.Eng.' : 'Drs. H. Bambang Sudarsono, M.Pd'),
      nip: p?.nip || '19680512 199303 1 004',
      title: isUniv ? 'Rektor / Pimpinan Perguruan Tinggi' : 'Kepala Sekolah'
    };
  }, [currentSchoolStaff, isUniv]);

  const waliKelasInfo = useMemo(() => {
    const w = PRESET_USERS.find(u => u.role === 'wali_kelas' && u.assignedClass === selectedClass);
    return {
      name: w?.name || (isUniv ? 'Dr. Eng. Siti Nurhaliza, S.T., M.Sc.' : 'Siti Nurhaliza, S.Pd'),
      nip: w?.nip || '19850214 201001 2 018',
      title: isUniv ? `Dosen Wali (${selectedClass})` : `Wali Kelas (${selectedClass})`
    };
  }, [selectedClass, isUniv]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = () => {
    const printableElement = document.getElementById('printable-monthly-report');
    if (!printableElement) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Rekapitulasi_Presensi_${selectedClass}_${MONTH_NAMES[selectedMonth]}_${selectedYear}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #0f172a; background: #ffffff; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 15px; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 3px; text-align: center; }
    th { background: #f8fafc; font-weight: 700; color: #1e293b; }
    .sunday { background: #fef2f2; color: #e11d48; }
    .badge-p { background: #d1fae5; color: #065f46; font-weight: 700; border-radius: 4px; padding: 1px 3px; }
    .badge-l { background: #fef3c7; color: #92400e; font-weight: 700; border-radius: 4px; padding: 1px 3px; }
  </style>
</head>
<body>
  ${printableElement.innerHTML}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekapitulasi_Presensi_${selectedClass}_${MONTH_NAMES[selectedMonth]}_${selectedYear}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white animate-in fade-in duration-200">
      {/* Modal Container */}
      <div
        className={`rounded-3xl shadow-2xl max-w-6xl w-full border overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:border-none print:shadow-none print:rounded-none transition-all ${
          isDark ? 'bg-[#0b101b] border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Top Bar */}
        <div
          className={`px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b shrink-0 print:hidden ${
            isDark ? 'bg-slate-900/90 border-white/10' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#174384] text-white border border-blue-400/30 flex items-center justify-center font-bold shadow-md shrink-0">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight">
                  Laporan Rekapitulasi Presensi Bulanan
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Format Eksekutif Resmi
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {activeSchool?.name || 'Instansi Terdaftar'} • Periode {MONTH_NAMES[selectedMonth]} {selectedYear}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadHtml}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-white/10'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Unduh File HTML Mandiri"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor HTML</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF (A4 Landscape)</span>
            </button>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border-white/10'
                  : 'bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border-slate-200'
              }`}
              title="Tutup Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div
          className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4 text-xs shrink-0 print:hidden ${
            isDark ? 'bg-slate-950/40 border-white/5' : 'bg-slate-100/70 border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className={`font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isUniv ? 'KELAS / PROGRAM:' : 'KELAS:'}
              </span>
              {currentRole === 'wali_kelas' && userAssignedClass ? (
                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold rounded-lg">
                  {userAssignedClass} (KUNCI WALI KELAS)
                </span>
              ) : (
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className={`border rounded-xl px-3 py-1 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Bulan:</span>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className={`border rounded-xl px-3 py-1 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tahun:</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className={`border rounded-xl px-3 py-1 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>
          </div>

          <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Total Terdaftar di Kelas: <strong className="text-emerald-400 font-bold">{classStudents.length} Siswa</strong>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60 print:bg-white print:p-0 print:overflow-visible">
          <div
            id="printable-monthly-report"
            className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 mx-auto max-w-5xl print:max-w-none print:shadow-none print:border-none print:p-0 text-slate-900"
            style={{ width: '100%' }}
          >
            {/* Clean Executive Header */}
            <div className="border-b-2 border-slate-800 pb-5 mb-5">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center shrink-0 shadow-xs">
                    {activeSchool?.logoUrl ? (
                      <img
                        src={activeSchool.logoUrl}
                        alt="Logo"
                        className="w-full h-full object-contain"
                      />
                    ) : isUniv ? (
                      <GraduationCap className="w-8 h-8 text-sky-600" />
                    ) : (
                      <School className="w-8 h-8 text-emerald-600" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-900 text-white">
                        {activeSchool?.institutionType || 'SEKOLAH'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        LISENSI RESMI ATTENDLY
                      </span>
                    </div>

                    <h1 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight mt-1">
                      {activeSchool?.name || 'SMA HARAPAN NUSANTARA JAKARTA'}
                    </h1>

                    <p className="text-xs text-slate-600 mt-0.5">
                      {activeSchool?.address || 'Jl. Pemuda No. 45, Rawamangun, Jakarta Timur'} • Telp: {activeSchool?.phone || '(021) 4786-2200'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                    KODE LISENSI TERMINAL
                  </div>
                  <div className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 mt-1 inline-block">
                    {activeSchool?.activationCode || 'ATND-SMAN1-7892-K4F9'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">
                    {isUniv ? 'Kode PT' : 'NPSN'}: <strong>{activeSchool?.npsn || '20108921'}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Title & Meta Box */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
              <div>
                <h2 className="text-base font-extrabold uppercase tracking-tight text-slate-950">
                  Rekapitulasi Kehadiran Siswa & Audit Presensi Gerbang
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Periode: <strong>{MONTH_NAMES[selectedMonth]} {selectedYear}</strong> • Tahun Akademik 2026/2027
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
                <div>
                  <span className="text-slate-500">Kelas / Rombel:</span>{' '}
                  <strong className="text-slate-950 font-bold">{selectedClass}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Semester:</span>{' '}
                  <strong className="text-slate-950 font-bold">Ganjil</strong>
                </div>
                <div>
                  <span className="text-slate-500">Wali Kelas:</span>{' '}
                  <strong className="text-slate-950 font-bold">{waliKelasInfo.name}</strong>
                </div>
              </div>
            </div>

            {/* Attendance Matrix Table */}
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full border-collapse border border-slate-300 text-[10px] text-center">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th rowSpan={2} className="border border-slate-300 px-1.5 py-1.5 w-7">
                      No
                    </th>
                    <th rowSpan={2} className="border border-slate-300 px-2 py-1.5 w-20">
                      NISN / ID
                    </th>
                    <th rowSpan={2} className="border border-slate-300 px-3 py-1.5 text-left min-w-[150px]">
                      Nama Lengkap Siswa
                    </th>
                    <th rowSpan={2} className="border border-slate-300 px-1 py-1.5 w-7">
                      L/P
                    </th>
                    <th colSpan={daysInMonth} className="border border-slate-300 py-1">
                      Tanggal Kehadiran (1 s/d {daysInMonth} {MONTH_NAMES[selectedMonth]})
                    </th>
                    <th colSpan={5} className="border border-slate-300 py-1 w-24">
                      Rekap
                    </th>
                    <th rowSpan={2} className="border border-slate-300 px-1.5 py-1.5 w-12">
                      %
                    </th>
                  </tr>
                  <tr className="bg-slate-50 text-[9px] border-b border-slate-300">
                    {dayDetails.map(d => (
                      <th
                        key={d.day}
                        className={`border border-slate-300 px-0.5 py-1 w-5 ${
                          d.isSunday ? 'bg-rose-50 text-rose-600 font-bold' : 'text-slate-700'
                        }`}
                        title={`${d.dayName}, ${d.day} ${MONTH_NAMES[selectedMonth]}`}
                      >
                        {d.day}
                      </th>
                    ))}
                    <th className="border border-slate-300 px-0.5 py-1 w-5 text-emerald-800 font-bold bg-emerald-50" title="Tepat Waktu (On Time)">
                      H
                    </th>
                    <th className="border border-slate-300 px-0.5 py-1 w-5 text-amber-800 font-bold bg-amber-50" title="Terlambat (Late)">
                      T
                    </th>
                    <th className="border border-slate-300 px-0.5 py-1 w-5 text-sky-800 font-bold bg-sky-50" title="Sakit">
                      S
                    </th>
                    <th className="border border-slate-300 px-0.5 py-1 w-5 text-purple-800 font-bold bg-purple-50" title="Izin">
                      I
                    </th>
                    <th className="border border-slate-300 px-0.5 py-1 w-5 text-rose-800 font-bold bg-rose-50" title="Alpa / Tanpa Keterangan">
                      A
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {classStudents.length === 0 ? (
                    <tr>
                      <td colSpan={daysInMonth + 10} className="py-10 text-center">
                        <div className="max-w-md mx-auto space-y-2">
                          <p className="font-bold text-sm text-slate-700">
                            Belum Ada Data Siswa Terdaftar untuk Kelas {selectedClass}
                          </p>
                          <p className="text-xs text-slate-500">
                            Silakan daftarkan wajah siswa melalui menu <strong>Student Directory</strong> atau <strong>Face Enrollment Station</strong> agar muncul dalam rekapitulasi ini.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    classStudents.map((st: Student, idx: number) => {
                      let hadirCount = 0;
                      let terlambatCount = 0;
                      let sakitCount = 0;
                      let izinCount = 0;
                      let alpaCount = 0;

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/70">
                          <td className="border border-slate-300 px-1 py-1 font-mono text-[9px]">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-300 px-1 py-1 font-mono text-[9px] text-slate-600">
                            {st.id}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-left font-semibold text-slate-900 truncate max-w-[170px]">
                            {st.name}
                          </td>
                          <td className="border border-slate-300 px-1 py-1 font-bold text-slate-600">
                            {st.gender || 'L'}
                          </td>

                          {/* Day Columns */}
                          {dayDetails.map(d => {
                            if (d.isSunday) {
                              return (
                                <td key={d.day} className="border border-slate-300 bg-slate-100 text-slate-400 text-[8px]">
                                  -
                                </td>
                              );
                            }

                            const cellData = attendanceMatrix.get(`${st.id}_${d.day}`);
                            if (cellData) {
                              if (cellData.status === 'P') hadirCount++;
                              if (cellData.status === 'L') terlambatCount++;

                              const isLate = cellData.status === 'L';
                              return (
                                <td
                                  key={d.day}
                                  className={`border border-slate-300 font-bold ${
                                    isLate ? 'text-amber-800 bg-amber-50' : 'text-emerald-800 bg-emerald-50'
                                  }`}
                                >
                                  {isLate ? 'T' : 'H'}
                                </td>
                              );
                            }

                            return (
                              <td key={d.day} className="border border-slate-300 text-slate-300 text-[8px]">
                                •
                              </td>
                            );
                          })}

                          {/* Summary Columns */}
                          <td className="border border-slate-300 font-bold text-emerald-800 bg-emerald-50/40">
                            {hadirCount}
                          </td>
                          <td className="border border-slate-300 font-bold text-amber-800 bg-amber-50/40">
                            {terlambatCount}
                          </td>
                          <td className="border border-slate-300 text-slate-600">{sakitCount}</td>
                          <td className="border border-slate-300 text-slate-600">{izinCount}</td>
                          <td className="border border-slate-300 text-slate-600">{alpaCount}</td>

                          {/* Percentage % */}
                          <td className="border border-slate-300 font-bold font-mono text-[9px] text-slate-900">
                            {Math.round(((hadirCount + terlambatCount) / Math.max(1, (hadirCount + terlambatCount) || 1)) * 100)}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Legend & Verification Strip */}
            <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-600 mt-4 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-900">Keterangan:</span>
                <span><strong className="text-emerald-700">H</strong>: Hadir Tepat Waktu</span>
                <span><strong className="text-amber-700">T</strong>: Terlambat Masuk</span>
                <span><strong className="text-sky-700">S</strong>: Sakit</span>
                <span><strong className="text-purple-700">I</strong>: Izin</span>
                <span><strong className="text-rose-700">A</strong>: Alpa</span>
                <span><strong>-</strong>: Hari Libur</span>
              </div>

              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Attendly Edge Biometric Engine • Zero-Knowledge Compliance</span>
              </div>
            </div>

            {/* Digital Signatures */}
            <div className="mt-8 pt-4 flex items-start justify-between text-xs text-slate-900 print:mt-12 page-break-inside-avoid">
              <div className="text-center w-64">
                <div>Mengetahui,</div>
                <div className="font-bold text-slate-950 mt-0.5">{kepalaSekolahInfo.title}</div>
                <div className="h-16 flex items-center justify-center">
                  <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg font-mono">
                    ✓ Validated Digital Signature
                  </div>
                </div>
                <div className="font-bold text-slate-950 underline">{kepalaSekolahInfo.name}</div>
                <div className="text-[10px] text-slate-600 font-mono mt-0.5">NIP. {kepalaSekolahInfo.nip}</div>
              </div>

              <div className="text-center w-64">
                <div>Jakarta, {daysInMonth} {MONTH_NAMES[selectedMonth]} {selectedYear}</div>
                <div className="font-bold text-slate-950 mt-0.5">{waliKelasInfo.title}</div>
                <div className="h-16 flex items-center justify-center">
                  <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg font-mono">
                    ✓ Verified Biometric Ledger
                  </div>
                </div>
                <div className="font-bold text-slate-950 underline">{waliKelasInfo.name}</div>
                <div className="text-[10px] text-slate-600 font-mono mt-0.5">NIP. {waliKelasInfo.nip}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Controls */}
        <div
          className={`px-6 py-3.5 border-t flex items-center justify-between print:hidden shrink-0 ${
            isDark ? 'bg-slate-900/90 border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            💡 <em>Tips Cetak:</em> Pilih orientasi <strong>Landscape (Mendatar)</strong> dan ukuran kertas <strong>A4</strong> pada dialog cetak peramban.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF (A4 Landscape)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
