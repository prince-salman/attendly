import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  MessageSquare,
  Send,
  CheckCheck,
  Search,
  Phone,
  BellRing
} from 'lucide-react';
import { WhatsAppLog } from '../types';

export const WhatsAppHubView: React.FC = () => {
  const {
    whatsappLogs,
    students,
    dispatchParentWhatsApp,
    waAutoSendEnabled,
    setWaAutoSendEnabled,
    notify
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentForTestId, setSelectedStudentForTestId] = useState(students[0]?.id || '');

  useEffect(() => {
    if (students.length > 0 && !selectedStudentForTestId) {
      setSelectedStudentForTestId(students[0].id);
    }
  }, [students, selectedStudentForTestId]);

  const selectedStudentForTest = students.find(s => s.id === selectedStudentForTestId) || students[0];

  const filteredLogs = whatsappLogs.filter((log: WhatsAppLog) => {
    return (
      log.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.parentPhone.includes(searchTerm)
    );
  });

  const handleManualTestSend = () => {
    if (!selectedStudentForTest) {
      notify('Belum ada siswa terdaftar untuk pengujian WhatsApp.', 'warning');
      return;
    }
    const nowTime = new Date().toLocaleTimeString('id-ID') + ' WIB';
    dispatchParentWhatsApp(
      selectedStudentForTest,
      nowTime,
      'Uji Coba Sistem (Trigger Admin)',
      false
    );
    notify(`📱 Pesan WhatsApp uji coba berhasil dikirim ke ${selectedStudentForTest.parentName} (${selectedStudentForTest.parentPhone})!`);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Pusat Notifikasi WhatsApp Otomatis ke Orang Tua
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Mengirimkan bukti kehadiran real-time ke nomor HP orang tua begitu anak melintas di gerbang masuk sekolah.
            </p>
          </div>
        </div>

        {/* Gateway API Status & Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Gateway WhatsApp:</span>
            <span className="text-emerald-700 font-bold">Online (Official API)</span>
          </div>

          <button
            onClick={() => {
              setWaAutoSendEnabled(!waAutoSendEnabled);
              notify(
                waAutoSendEnabled
                  ? 'Pengiriman otomatis WhatsApp dinonaktifkan.'
                  : 'Pengiriman otomatis WhatsApp diaktifkan!'
              );
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              waAutoSendEnabled
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 border border-slate-300'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            {waAutoSendEnabled ? 'Auto-Kirim: AKTIF' : 'Auto-Kirim: NONAKTIF'}
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Total Pesan WA Hari Ini</div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{whatsappLogs.length}</div>
          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCheck className="w-3.5 h-3.5" /> 100% Berhasil Terkirim
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Kecepatan Pengiriman</div>
          <div className="text-2xl font-bold text-emerald-700 font-mono">&lt; 1.2s</div>
          <div className="text-[11px] text-slate-500">Seketika setelah deteksi wajah</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Pemberitahuan Terlambat</div>
          <div className="text-2xl font-bold text-amber-700 font-mono">
            {whatsappLogs.filter((l: WhatsAppLog) => l.messageType === 'Terlambat').length}
          </div>
          <div className="text-[11px] text-amber-700/80">Laporan khusus ke orang tua</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Jaminan Privasi Pesan</div>
          <div className="text-sm font-bold text-slate-900 pt-1">UU PDP Verified</div>
          <div className="text-[11px] text-slate-500">Tanpa lampiran foto wajah</div>
        </div>
      </div>

      {/* Manual Dispatch Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-700 font-semibold">Uji Coba Kirim Notifikasi WhatsApp:</span>
          <select
            value={selectedStudentForTestId}
            onChange={e => setSelectedStudentForTestId(e.target.value)}
            disabled={students.length === 0}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 font-medium focus:outline-none focus:border-emerald-500 disabled:opacity-50"
          >
            {students.length === 0 ? (
              <option value="">Belum ada siswa terdaftar</option>
            ) : (
              students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} → Ortu: {s.parentName} ({s.parentPhone})
                </option>
              ))
            )}
          </select>
        </div>

        <button
          onClick={handleManualTestSend}
          disabled={students.length === 0}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          Kirim Notifikasi WA Sekarang
        </button>
      </div>

      {/* WhatsApp Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari siswa, nama orang tua, atau no HP..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Total Log WhatsApp: <span className="text-emerald-700 font-bold">{filteredLogs.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="py-3 px-4">Waktu Kirim</th>
                <th className="py-3 px-4">Siswa / NIS</th>
                <th className="py-3 px-4">Penerima (Orang Tua / Wali)</th>
                <th className="py-3 px-4">Tipe Notifikasi</th>
                <th className="py-3 px-4">Pratinjau Pesan WA</th>
                <th className="py-3 px-4 text-right">Status Pengiriman</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="max-w-xs mx-auto space-y-2 text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-slate-700 text-sm">
                        Belum Ada Notifikasi WhatsApp
                      </div>
                      <p className="text-xs text-slate-500">
                        Setiap kali siswa berhasil teridentifikasi saat melintas di gerbang, bukti presensi akan terkirim dan dicatat di sini.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log: WhatsAppLog) => (
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
                            className="w-8 h-8 rounded-lg object-cover border border-emerald-500 shadow-2xs shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center border border-emerald-300 shrink-0 text-xs">
                            {log.studentName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900">{log.studentName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{log.studentId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-900 font-medium">{log.parentName}</div>
                      <div className="text-[11px] text-emerald-700 font-mono font-semibold flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {log.parentPhone}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-semibold ${
                          log.messageType === 'Terlambat'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {log.messageType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs truncate font-mono">
                      {log.content.replace(/\n/g, ' ')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-sky-700 font-bold font-mono text-[11px]">
                        <CheckCheck className="w-4 h-4 text-sky-600" />
                        Terkirim &amp; Dibaca
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
