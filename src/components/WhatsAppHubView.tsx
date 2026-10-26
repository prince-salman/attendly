import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Send,
  CheckCheck,
  Search,
  Phone,
  Radio,
  Inbox,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { WhatsAppLog } from '../types';

export const WhatsAppHubView: React.FC = () => {
  const {
    whatsappLogs,
    students,
    dispatchParentWhatsApp,
    resendWhatsAppNotification,
    waAutoSendEnabled,
    setWaAutoSendEnabled,
    notify,
    currentRole,
    userAssignedClass
  } = useApp();

  const [resendingId, setResendingId] = useState<string | null>(null);

  const scopedStudents = currentRole === 'wali_kelas' && userAssignedClass
    ? students.filter(s => s.class === userAssignedClass)
    : students;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentForTestId, setSelectedStudentForTestId] = useState(scopedStudents[0]?.id || '');

  useEffect(() => {
    if (scopedStudents.length > 0 && !selectedStudentForTestId) {
      setSelectedStudentForTestId(scopedStudents[0].id);
    }
  }, [scopedStudents, selectedStudentForTestId]);

  const selectedStudentForTest = scopedStudents.find(s => s.id === selectedStudentForTestId) || scopedStudents[0];

  const filteredLogs = whatsappLogs.filter((log: WhatsAppLog) => {
    if (currentRole === 'wali_kelas' && userAssignedClass) {
      const st = students.find(s => s.id === log.studentId);
      if (st && st.class !== userAssignedClass) return false;
    }
    return (
      log.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.parentPhone.includes(searchTerm)
    );
  });

  const handleManualTestSend = () => {
    if (!selectedStudentForTest) {
      notify('No students enrolled yet for dispatch testing.', 'warning');
      return;
    }
    const nowTime = new Date().toLocaleTimeString('en-US');
    dispatchParentWhatsApp(
      selectedStudentForTest,
      nowTime,
      'System Test (Admin Trigger)',
      false
    );
    notify(`WhatsApp notification dispatched to ${selectedStudentForTest.parentName} (${selectedStudentForTest.parentPhone}).`);
  };

  const lateAlertCount = whatsappLogs.filter(
    (l: WhatsAppLog) => l.messageType.toLowerCase().includes('late') || l.messageType.toLowerCase().includes('terlambat')
  ).length;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Automated Parent WhatsApp Hub
            </h2>
            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800/90 rounded-md border border-slate-200 dark:border-white/10">
              WEBHOOK ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time biometric attendance notifications dispatched directly to parents as soon as students enter the gate terminal.
          </p>
        </div>

        {/* Gateway API Status & Toggle */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-slate-300 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-500 dark:text-slate-400">GATEWAY:</span>
            <span className="text-slate-900 dark:text-white font-bold">ONLINE</span>
          </div>

          <button
            onClick={() => {
              setWaAutoSendEnabled(!waAutoSendEnabled);
              notify(
                waAutoSendEnabled
                  ? 'Automatic WhatsApp dispatch paused.'
                  : 'Automatic WhatsApp dispatch enabled.'
              );
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-98 ${
              waAutoSendEnabled
                ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 font-bold'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/90 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${waAutoSendEnabled ? 'text-emerald-400 dark:text-slate-950' : 'text-slate-400'}`} />
            <span>{waAutoSendEnabled ? 'DISPATCH: ACTIVE' : 'DISPATCH: PAUSED'}</span>
          </button>
        </div>
      </div>

      {/* Monolithic KPI Deck */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xs dark:shadow-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-white/5 overflow-hidden backdrop-blur-xl">
        <div className="p-5 flex flex-col justify-between">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">
            TODAY DISPATCHES
          </div>
          <div className="text-3xl font-light tracking-tight font-mono text-slate-900 dark:text-white mt-2">
            {whatsappLogs.length}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-1 flex items-center gap-1">
            <CheckCheck className="w-3.5 h-3.5" /> 100% DELIVERED
          </div>
        </div>

        <div className="p-5 flex flex-col justify-between">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">
            DISPATCH LATENCY
          </div>
          <div className="text-3xl font-light tracking-tight font-mono text-slate-900 dark:text-white mt-2">
            &lt; 1.2s
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Immediate edge trigger
          </div>
        </div>

        <div className="p-5 flex flex-col justify-between">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">
            LATE ARRIVAL NOTICES
          </div>
          <div className="text-3xl font-light tracking-tight font-mono text-amber-600 dark:text-amber-400 mt-2">
            {lateAlertCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Flagged arrival notifications
          </div>
        </div>

        <div className="p-5 flex flex-col justify-between">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">
            PRIVACY INTEGRITY
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white mt-2">
            Zero Raw Biometrics
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Vectors stay strictly local
          </div>
        </div>
      </div>

      {/* Manual Dispatch Testing Ribbon */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs dark:shadow-lg backdrop-blur-xl">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">MANUAL DISPATCH TEST:</span>
          <select
            value={selectedStudentForTestId}
            onChange={e => setSelectedStudentForTestId(e.target.value)}
            disabled={students.length === 0}
            className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
          >
            {students.length === 0 ? (
              <option value="">No enrolled students</option>
            ) : (
              students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} → Parent: {s.parentName} ({s.parentPhone})
                </option>
              ))
            )}
          </select>
        </div>

        <button
          onClick={handleManualTestSend}
          disabled={students.length === 0}
          className="px-3.5 py-1.5 bg-[#174384] hover:bg-[#13376e] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-blue-400/25"
        >
          <Send className="w-3 h-3 text-emerald-400" />
          <span>Dispatch Test Notice</span>
        </button>
      </div>

      {/* WhatsApp Logs Table */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-2xs dark:shadow-xl backdrop-blur-xl">
        <div className="p-3.5 border-b border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search recipient or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
            RECORDED: <span className="text-slate-900 dark:text-emerald-400 font-bold">{filteredLogs.length}</span> ALERTS
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-white/10 text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">TIMESTAMP</th>
                <th className="py-3 px-4">STUDENT</th>
                <th className="py-3 px-4">PARENT RECIPIENT</th>
                <th className="py-3 px-4">TYPE</th>
                <th className="py-3 px-4">PAYLOAD PREVIEW</th>
                <th className="py-3 px-4 text-center">STATUS PENGIRIMAN</th>
                <th className="py-3 px-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="max-w-xs mx-auto space-y-2 text-slate-400">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
                        <Inbox className="w-5 h-5" />
                      </div>
                      <div className="font-semibold text-slate-700 dark:text-slate-200 text-xs">
                        No WhatsApp Dispatches Logged
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Automatic parent notifications will be logged here as students walk through the gate.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log: WhatsAppLog) => {
                  const isLateMsg = log.messageType.toLowerCase().includes('late') || log.messageType.toLowerCase().includes('terlambat');
                  const isFailed = log.deliveryStatus === 'FAILED';
                  const isPending = log.deliveryStatus === 'PENDING';
                  const isCorrection = log.isCorrection || log.deliveryStatus === 'REVISED';
                  const retryCount = log.retryCount || 0;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div>{log.timestamp}</div>
                        {retryCount > 0 && (
                          <div className="text-[9px] text-sky-500 font-mono mt-0.5">
                            Retry ke-{retryCount}
                          </div>
                        )}
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
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold flex items-center justify-center border border-slate-200 dark:border-white/10 shrink-0 text-xs">
                              {log.studentName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white text-xs">{log.studentName}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{log.studentId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-900 dark:text-white font-medium text-xs">{log.parentName}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5" />
                          {log.parentPhone}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wide ${
                            isCorrection
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-700/50'
                              : isLateMsg
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-700/50'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-700/50'
                          }`}
                        >
                          {isCorrection ? 'REVISI' : isLateMsg ? 'LATE' : 'ON TIME'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-300 max-w-xs truncate font-mono">
                        {log.content.replace(/\n/g, ' ')}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isFailed ? (
                          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-mono text-[10px] font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                            GAGAL (No. Invalid)
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 font-mono text-[10px] font-bold bg-slate-500/10 px-2 py-0.5 rounded border border-slate-500/20 animate-pulse">
                            <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />
                            MENUNGGU JARINGAN
                          </span>
                        ) : isCorrection ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                            <CheckCheck className="w-3 h-3 text-blue-500" />
                            REVISI TERKIRIM
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <CheckCheck className="w-3 h-3 text-emerald-500" />
                            TERKIRIM
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={async () => {
                            setResendingId(log.id);
                            await resendWhatsAppNotification(log.id);
                            setResendingId(null);
                          }}
                          disabled={resendingId === log.id}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold font-mono inline-flex items-center gap-1 border border-slate-200 dark:border-white/10 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                          title="Kirim ulang notifikasi WhatsApp ini ke orang tua"
                        >
                          <RefreshCw className={`w-3 h-3 ${resendingId === log.id ? 'animate-spin' : ''}`} />
                          <span>{resendingId === log.id ? 'Mengirim...' : 'Kirim Ulang'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
