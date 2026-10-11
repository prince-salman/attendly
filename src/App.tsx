import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { WalkThroughScanner } from './components/WalkThroughScanner';
import { FaceEnrollmentStation } from './components/FaceEnrollmentStation';
import { AttendanceLogView } from './components/AttendanceLogView';
import { WhatsAppHubView } from './components/WhatsAppHubView';
import { WhatsAppLivePopup } from './components/WhatsAppLivePopup';
import {
  ShieldCheck,
  Camera,
  FileSpreadsheet,
  MessageSquare,
  UserCheck,
  Database,
  Clock,
  Settings
} from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    notification,
    supabaseConnected,
    cutoffTime,
    setCutoffTime
  } = useApp();

  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [tempCutoff, setTempCutoff] = useState<string>(cutoffTime);

  const handleSaveCutoff = () => {
    setCutoffTime(tempCutoff);
    setShowSettingsModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      {/* Top Global Navigation Bar - Clean Minimalist White */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo & System Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 m-0 p-0 leading-tight">
                    BioPass School
                  </h1>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Walk-Through AI
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  Presensi Wajah Sambil Jalan • Supabase Cloud
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setActiveTab('scanner')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-semibold cursor-pointer ${
                  activeTab === 'scanner'
                    ? 'bg-white text-emerald-800 border border-emerald-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                Terminal Gerbang
              </button>

              <button
                onClick={() => setActiveTab('enrollment')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-semibold cursor-pointer ${
                  activeTab === 'enrollment'
                    ? 'bg-white text-emerald-800 border border-emerald-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                Perekaman Wajah
              </button>

              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-semibold cursor-pointer ${
                  activeTab === 'attendance'
                    ? 'bg-white text-emerald-800 border border-emerald-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Rekap Absensi
              </button>

              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-semibold cursor-pointer ${
                  activeTab === 'whatsapp'
                    ? 'bg-white text-emerald-800 border border-emerald-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                Notifikasi WhatsApp
              </button>
            </nav>

            {/* Cloud Status Indicator & Quick Settings */}
            <div className="hidden sm:flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 text-xs font-semibold shadow-2xs ${
                  supabaseConnected
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-amber-50 border-amber-300 text-amber-800'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>{supabaseConnected ? 'Supabase Cloud: Terhubung' : 'Offline: IndexedDB'}</span>
              </div>

              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 transition-colors cursor-pointer"
                title="Pengaturan Batas Waktu Masuk"
              >
                <Settings className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Mobile Navigation Tabs */}
          <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-200 text-xs overflow-x-auto gap-2">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`py-1.5 px-3 rounded-lg font-medium text-xs cursor-pointer ${
                activeTab === 'scanner' ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200' : 'text-slate-600'
              }`}
            >
              Terminal
            </button>
            <button
              onClick={() => setActiveTab('enrollment')}
              className={`py-1.5 px-3 rounded-lg font-medium text-xs cursor-pointer ${
                activeTab === 'enrollment' ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200' : 'text-slate-600'
              }`}
            >
              Perekaman
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`py-1.5 px-3 rounded-lg font-medium text-xs cursor-pointer ${
                activeTab === 'attendance' ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200' : 'text-slate-600'
              }`}
            >
              Rekap
            </button>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`py-1.5 px-3 rounded-lg font-medium text-xs cursor-pointer ${
                activeTab === 'whatsapp' ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200' : 'text-slate-600'
              }`}
            >
              Notif WA
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                Pengaturan Waktu Masuk Gerbang
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Batas Jam Masuk Tepat Waktu (WIB)
                </label>
                <input
                  type="time"
                  value={tempCutoff}
                  onChange={e => setTempCutoff(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:bg-white"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Siswa yang terdeteksi sebelum atau pada jam ini berstatus &quot;Hadir Tepat Waktu&quot;. Melewati jam ini otomatis berstatus &quot;Terlambat&quot;.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                <div className="font-bold text-slate-700">Supabase Cloud Config:</div>
                <div className="text-slate-500 font-mono text-[11px] break-all">
                  fruurxbfolykyylzktns.supabase.co
                </div>
                <div className="text-emerald-700 font-semibold mt-1">
                  Status: {supabaseConnected ? '✅ Cloud Terhubung & Sinkron' : '⚡ Berjalan Lokal (IndexedDB)'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveCutoff}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Simpan Pengaturan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 left-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-xl border shadow-xl flex items-center gap-3 text-xs font-semibold ${
              notification.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                notification.type === 'warning' ? 'bg-amber-500' : 'bg-emerald-600'
              } animate-ping`}
            />
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Live WhatsApp Floating Bubble Pop-up */}
      <WhatsAppLivePopup />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'scanner' && <WalkThroughScanner />}
        {activeTab === 'enrollment' && <FaceEnrollmentStation />}
        {activeTab === 'attendance' && <AttendanceLogView />}
        {activeTab === 'whatsapp' && <WhatsAppHubView />}
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="font-semibold text-slate-700">BioPass School Enterprise</span>
            <span>•</span>
            <span>Walk-Through Biometrics &amp; Supabase PostgreSQL</span>
          </div>
          <div className="flex items-center gap-4 text-slate-600 text-[11px]">
            <span>1x Absen Harian Otomatis</span>
            <span>•</span>
            <span>Offline-First IndexedDB</span>
            <span>•</span>
            <span>Multi-Angle Facial Vectors</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App(): React.ReactElement {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </ErrorBoundary>
  );
}
