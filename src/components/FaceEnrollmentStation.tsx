import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { extractFaceDescriptorAsync } from '../utils/faceBiometrics';
import {
  Camera,
  Database,
  UserCheck,
  UserPlus,
  Users,
  User,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  SwitchCamera
} from 'lucide-react';
import { Student } from '../types';

interface AngleInstruction {
  title: string;
  subtitle: string;
  tip: string;
}

const CAPTURE_STAGES: AngleInstruction[] = [
  {
    title: '1. Tatap Lurus (Depan)',
    subtitle: 'Posisikan wajah tepat di tengah frame',
    tip: 'Pandang lurus ke lensa'
  },
  {
    title: '2. Serong Sedikit ke Kiri',
    subtitle: 'Putar kepala sekitar 15-20° ke kiri Anda',
    tip: 'Tengok santai ke kiri'
  },
  {
    title: '3. Serong Sedikit ke Kanan',
    subtitle: 'Putar kepala sekitar 15-20° ke kanan Anda',
    tip: 'Tengok santai ke kanan'
  },
  {
    title: '4. Sedikit Tunduk',
    subtitle: 'Tundukkan pandangan sedikit (posisi saat melangkah)',
    tip: 'Tunduk wajar seperti berjalan'
  }
];

export const FaceEnrollmentStation: React.FC = () => {
  const { students, saveStudent, deleteStudent, supabaseConnected, notify } = useApp();

  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Multi-angle capture state
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const [capturedVectors, setCapturedVectors] = useState<number[][]>([]);
  const [primaryPhotoUrl, setPrimaryPhotoUrl] = useState<string | null>(null);
  const [captureStatusMessage, setCaptureStatusMessage] = useState<string>('');

  // Search in student roster
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('ALL');

  // Form for New Student
  const [formData, setFormData] = useState({
    name: '',
    id: `NIS-${Math.floor(2024000 + Math.random() * 900)}`,
    class: '10-IPA-1',
    gender: 'L' as 'L' | 'P',
    parentName: '',
    parentPhone: '0812-',
    consentDocId: `IZIN-WALI-2026/${Math.floor(100 + Math.random() * 900)}`
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const currentStudent = mode === 'existing'
    ? students.find(s => s.id === selectedStudentId) || students[0]
    : null;

  // Start / restart webcam with current facing mode
  useEffect(() => {
    let isMounted = true;

    async function initCamera() {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
        }

        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: cameraFacing
          },
          audio: false
        });

        if (isMounted) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              setCameraActive(true);
            };
          }
        }
      } catch (err: any) {
        console.warn('Camera permission issue:', err);
        if (isMounted) {
          setCameraActive(false);
          setCameraError('Izin kamera ditolak atau kamera tidak ditemukan.');
        }
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [cameraFacing]);

  // Update selected student ID when student list changes
  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleCamera = () => {
    setCameraFacing(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleDeleteStudentClick = async (student: Student) => {
    if (window.confirm(`Hapus data profil dan biometrik ${student.name} (${student.id}) dari database sekolah dan Supabase?`)) {
      await deleteStudent(student.id);
      setSelectedStudentId('');
      setMode('new');
      notify(`Siswa ${student.name} berhasil dihapus.`);
    }
  };

  // Helper untuk capture foto thumbnail
  const takeSnapshotPhoto = (): string | null => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const vw = videoRef.current.videoWidth || 640;
    const vh = videoRef.current.videoHeight || 480;
    const size = Math.min(vw, vh);
    const sx = (vw - size) / 2;
    const sy = (vh - size) / 2;
    ctx.drawImage(videoRef.current, sx, sy, size, size, 0, 0, 240, 240);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // Mulai alur perekaman multi-sudut otomatis
  const handleStartMultiAngleCapture = async () => {
    if (!videoRef.current) return;

    if (mode === 'new') {
      if (!formData.name.trim()) {
        notify('Mohon masukkan Nama Siswa terlebih dahulu.', 'warning');
        return;
      }
      if (!formData.parentName.trim()) {
        notify('Mohon masukkan Nama Orang Tua/Wali murid.', 'warning');
        return;
      }
      if (!formData.parentPhone.trim() || formData.parentPhone.length < 8) {
        notify('Mohon masukkan Nomor WhatsApp Orang Tua yang valid.', 'warning');
        return;
      }
    } else if (!currentStudent) {
      notify('Pilih siswa yang akan direkam ulang.', 'warning');
      return;
    }

    setIsCapturing(true);
    setCurrentStageIdx(0);
    setCapturedVectors([]);
    setPrimaryPhotoUrl(null);

    const vectorsCollected: number[][] = [];
    let photoThumb: string | null = null;

    // Loop otomatis 4 sudut
    for (let stage = 0; stage < CAPTURE_STAGES.length; stage++) {
      setCurrentStageIdx(stage);
      setCaptureStatusMessage(CAPTURE_STAGES[stage].title);

      // Beri jeda 800ms agar siswa mengarahkan sudut wajah
      await new Promise(r => setTimeout(r, 900));

      let extracted: number[] | null = null;
      let attempts = 0;

      // Coba deteksi dan ekstraksi hingga 3 kali jika frame buram
      while (attempts < 3 && (!extracted || extracted.length !== 128)) {
        attempts++;
        if (videoRef.current) {
          extracted = await extractFaceDescriptorAsync(videoRef.current);
        }
        if (!extracted) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      if (extracted && extracted.length === 128) {
        vectorsCollected.push(extracted);
        if (stage === 0) {
          photoThumb = takeSnapshotPhoto();
          setPrimaryPhotoUrl(photoThumb);
        }
        setCapturedVectors([...vectorsCollected]);
      } else {
        // Fallback jika salah satu sudut tidak terbaca sempurna
        notify(`Sudut "${CAPTURE_STAGES[stage].title}" kurang jelas, sistem melanjutkan ke sudut berikutnya.`, 'info');
      }
    }

    if (vectorsCollected.length === 0) {
      setIsCapturing(false);
      notify('⚠️ Tidak ada wajah terdeteksi jelas. Pastikan pencahayaan terang dan posisikan wajah di dalam bingkai.', 'error');
      return;
    }

    setCaptureStatusMessage('Menyimpan ke Cloud Supabase & Database Lokal...');

    let targetStudent: Student;

    if (mode === 'new') {
      const newStudent: Student = {
        id: formData.id,
        name: formData.name,
        class: formData.class,
        gender: formData.gender,
        photoUrl: photoThumb,
        parentName: formData.parentName,
        parentPhone: formData.parentPhone,
        enrolledAt: new Date().toLocaleTimeString('id-ID'),
        consentCertified: true,
        consentDocId: formData.consentDocId,
        faceDescriptors: vectorsCollected,
        faceDescriptor: vectorsCollected[0],
        lastSeen: 'Baru Terdaftar'
      };

      await saveStudent(newStudent);
      targetStudent = newStudent;
      setSelectedStudentId(newStudent.id);

      // Reset form
      setFormData({
        name: '',
        id: `NIS-${Math.floor(2024000 + Math.random() * 900)}`,
        class: '10-IPA-1',
        gender: 'L',
        parentName: '',
        parentPhone: '0812-',
        consentDocId: `IZIN-WALI-2026/${Math.floor(100 + Math.random() * 900)}`
      });
    } else {
      const updatedStudent: Student = {
        ...currentStudent!,
        photoUrl: photoThumb || currentStudent!.photoUrl,
        faceDescriptors: vectorsCollected,
        faceDescriptor: vectorsCollected[0],
        consentCertified: true
      };

      await saveStudent(updatedStudent);
      targetStudent = updatedStudent;
    }

    setIsCapturing(false);
    notify(`🎉 Sukses! ${vectorsCollected.length} sudut biometrik untuk ${targetStudent.name} berhasil tersimpan.`);
  };

  // Filter siswa terdaftar
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter === 'ALL' || s.class === classFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Stasiun Perekaman Wajah Multi-Sudut
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${
                supabaseConnected
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                <Database className="w-3.5 h-3.5" />
                {supabaseConnected ? 'Supabase PostgreSQL Cloud Aktif' : 'Penyimpanan Lokal (Offline)'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Perekaman 4 sudut wajah otomatis (Depan, Kiri, Kanan, Tunduk) agar siswa dikenali saat berjalan santai.
            </p>
          </div>
        </div>

        {/* Action switch camera */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleCamera}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            title="Ganti Kamera Depan / Belakang"
          >
            <SwitchCamera className="w-4 h-4 text-emerald-600" />
            <span>Kamera: {cameraFacing === 'user' ? 'Depan (Selfie)' : 'Belakang (Utama)'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Camera Station & Student Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Enrollment Station Form & Camera View */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            {/* Mode Selector */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMode('new')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'new'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 inline mr-1.5" />
                  Daftarkan Siswa Baru
                </button>
                <button
                  onClick={() => setMode('existing')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'existing'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5 inline mr-1.5" />
                  Perekaman Ulang Wajah
                </button>
              </div>
            </div>

            {/* Video Preview with Multi-Angle Visual Overlay */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video border border-slate-800 shadow-inner flex items-center justify-center">
              {cameraError ? (
                <div className="text-center p-6 text-slate-300">
                  <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold">{cameraError}</p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraFacing === 'user' ? '-scale-x-100' : ''}`}
                />
              )}

              {/* Oval Head Silhouette Guide */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className={`w-48 h-64 border-2 rounded-[50%] transition-all duration-300 ${
                  isCapturing ? 'border-emerald-400 scale-105 shadow-[0_0_25px_rgba(16,185,129,0.5)]' : 'border-white/50 border-dashed'
                }`} />
              </div>

              {/* Interactive Multi-Angle Step Prompt Overlay */}
              {isCapturing && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-4 text-white text-center">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    {CAPTURE_STAGES[currentStageIdx]?.title}
                  </div>
                  <div className="text-sm font-semibold">
                    {CAPTURE_STAGES[currentStageIdx]?.subtitle}
                  </div>
                  {/* Progress dots */}
                  <div className="flex items-center justify-center gap-2 mt-3">
                    {CAPTURE_STAGES.map((stg, i) => (
                      <div
                        key={stg.title}
                        className={`h-2 rounded-full transition-all ${
                          i < capturedVectors.length
                            ? 'w-6 bg-emerald-500'
                            : i === currentStageIdx
                            ? 'w-6 bg-amber-400 animate-pulse'
                            : 'w-2 bg-white/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Form Fields */}
            {mode === 'new' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap Siswa *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                    placeholder="Contoh: Muhammad Salman"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor Induk Siswa (NIS) *
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={e => handleInputChange('id', e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kelas *
                  </label>
                  <select
                    value={formData.class}
                    onChange={e => handleInputChange('class', e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  >
                    <option value="10-IPA-1">10-IPA-1</option>
                    <option value="10-IPA-2">10-IPA-2</option>
                    <option value="11-IPA-1">11-IPA-1</option>
                    <option value="12-IPA-1">12-IPA-1</option>
                    <option value="10-IPS-1">10-IPS-1</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Orang Tua / Wali *
                  </label>
                  <input
                    type="text"
                    value={formData.parentName}
                    onChange={e => handleInputChange('parentName', e.target.value)}
                    placeholder="Contoh: Hendra Wijaya"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-emerald-500 focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor WhatsApp Orang Tua (Untuk Notifikasi Gerbang) *
                  </label>
                  <input
                    type="text"
                    value={formData.parentPhone}
                    onChange={e => handleInputChange('parentPhone', e.target.value)}
                    placeholder="08123456789"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-emerald-500 focus:bg-white"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Siswa untuk Direkam Ulang
                </label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id} - {s.class})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Action Trigger Button */}
            <div className="mt-6">
              <button
                onClick={handleStartMultiAngleCapture}
                disabled={isCapturing || !cameraActive}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isCapturing || !cameraActive
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                }`}
              >
                {isCapturing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{captureStatusMessage || 'Sedang merekam multi-sudut...'}</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>
                      {mode === 'new'
                        ? 'Mulai Perekaman Multi-Sudut Wajah (4 Sudut)'
                        : `Rekam Ulang Wajah ${currentStudent?.name || ''}`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Registered Students Roster */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Daftar Siswa Terdaftar ({students.length})
                </h3>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="col-span-2 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari nama / NIS..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <select
                  value={classFilter}
                  onChange={e => setClassFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="ALL">Semua</option>
                  <option value="10-IPA-1">10-IPA-1</option>
                  <option value="10-IPA-2">10-IPA-2</option>
                  <option value="11-IPA-1">11-IPA-1</option>
                </select>
              </div>
            </div>

            {/* Student List */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  <User className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  Belum ada siswa terdaftar. Gunakan formulir di sebelah kiri untuk mendaftarkan siswa pertama.
                </div>
              ) : (
                filteredStudents.map(student => {
                  const angleCount = student.faceDescriptors?.length || (student.faceDescriptor ? 1 : 0);

                  return (
                    <div
                      key={student.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {student.photoUrl ? (
                          <img
                            src={student.photoUrl}
                            alt={student.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-300 shadow-2xs"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                            {student.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-bold text-slate-900 leading-tight">
                            {student.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {student.id} • {student.class}
                          </div>
                          <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {angleCount} Sudut Biometrik
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setMode('existing');
                          }}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="Rekam Ulang Wajah"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudentClick(student)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
