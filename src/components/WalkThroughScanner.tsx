import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import * as faceapi from '@vladmandic/face-api';
import { loadFaceApiModels } from '../utils/faceDetector';
import { updateTracksWithDetections, DetectionInput } from '../utils/faceTracker';
import { getStudentCallName } from '../utils/nameHelper';
import {
  PYTHON_WS_URL,
  checkPythonBackendHealth,
  PythonDetectionMessage,
  PythonDetectedFace
} from '../utils/pythonBackendClient';
import {
  Volume2,
  VolumeX,
  DoorOpen,
  SwitchCamera,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Lock,
  Radio,
  Cpu,
  RefreshCw,
  CheckCircle2,
  Users,
  UserCheck,
  UserX,
  School,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  ShieldCheck,
  LogIn,
  LogOut,
  ArrowRightLeft,
  Clock,
  Calendar,
  Sparkles,
  PanelRight,
  SlidersHorizontal,
  X,
  KeyRound,
  Wifi,
  WifiOff,
  QrCode,
  Search
} from 'lucide-react';
import { ActiveTrack, Student, AttendanceScanType } from '../types';

export type TurnstileGateStatus = 'READY' | 'OPENING' | 'PASSING';

// High-precision vector frame styling for face detection (Attendly Blue + Emerald branding)
const TRACK_STYLES = {
  verified: {
    stroke: '#10b981', // Brand Emerald Green (from Attendly checkmark)
    bg: 'rgba(16, 185, 129, 0.08)',
    badgeBg: 'rgba(10, 20, 38, 0.94)', // Deep Brand Midnight Navy
    badgeBorder: 'rgba(16, 185, 129, 0.55)',
    textColor: '#ffffff',
    subColor: '#34d399'
  },
  unverified: {
    stroke: '#3b82f6', // Brand Royal Blue (from Attendly logo base)
    bg: 'rgba(59, 130, 246, 0.06)',
    badgeBg: 'rgba(10, 20, 38, 0.88)',
    badgeBorder: 'rgba(59, 130, 246, 0.4)',
    textColor: '#f1f5f9',
    subColor: '#93c5fd'
  }
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 6
) {
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

/**
 * Enterprise Omni-Angle Face Scanning Visualizer
 * Mendeteksi dan memvisualisasikan seluruh bagian wajah:
 * - Atas (Dahi / Forehead & Pitch Down)
 * - Bawah (Dagu / Chin & Pitch Up)
 * - Samping Kiri (Left Profile & Yaw -)
 * - Samping Kanan (Right Profile & Yaw +)
 * Dilengkapi 3D facial topology wireframe mesh dan 4-axis compass reticle.
 */
/**
 * Clean Enterprise Biometric Face Viewfinder
 * Menghasilkan visualisasi pemindai wajah yang tenang, elegan, dan profesional:
 * - Corner reticle lembut dengan radius rounded
 * - Status pill minimalis melayang di atas wajah
 * - Bebas dari garis wireframe dan elemen futuristik berlebihan yang mengganggu pandangan
 */
function drawOmniAngleFaceScan(
  ctx: CanvasRenderingContext2D,
  vw: number,
  vh: number,
  cameraFacing: 'user' | 'environment',
  box: { x: number; y: number; w: number; h: number },
  isVer: boolean,
  studentName: string,
  studentClass: string,
  _confidence: string,
  _pose?: any,
  _landmarks?: any,
  _coverage?: any
) {
  const normX = cameraFacing === 'user' ? (100 - box.x - box.w) : box.x;
  const pxX = (normX / 100) * vw;
  const pxY = (box.y / 100) * vh;
  const pxW = (box.w / 100) * vw;
  const pxH = (box.h / 100) * vh;

  ctx.save();

  // 1. Sleek, clean corner brackets (Verkada / Apple FaceID Style)
  const cornerLen = Math.min(22, pxW * 0.22, pxH * 0.22);
  const cornerRadius = 6;
  ctx.lineWidth = isVer ? 2.5 : 2;
  ctx.strokeStyle = isVer ? '#10b981' : 'rgba(255, 255, 255, 0.7)';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(pxX, pxY + cornerLen);
  ctx.lineTo(pxX, pxY + cornerRadius);
  ctx.quadraticCurveTo(pxX, pxY, pxX + cornerRadius, pxY);
  ctx.lineTo(pxX + cornerLen, pxY);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(pxX + pxW - cornerLen, pxY);
  ctx.lineTo(pxX + pxW - cornerRadius, pxY);
  ctx.quadraticCurveTo(pxX + pxW, pxY, pxX + pxW, pxY + cornerRadius);
  ctx.lineTo(pxX + pxW, pxY + cornerLen);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(pxX, pxY + pxH - cornerLen);
  ctx.lineTo(pxX, pxY + pxH - cornerRadius);
  ctx.quadraticCurveTo(pxX, pxY + pxH, pxX + cornerRadius, pxY + pxH);
  ctx.lineTo(pxX + cornerLen, pxY + pxH);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(pxX + pxW - cornerLen, pxY + pxH);
  ctx.lineTo(pxX + pxW - cornerRadius, pxY + pxH);
  ctx.quadraticCurveTo(pxX + pxW, pxY + pxH, pxX + pxW, pxY + pxH - cornerRadius);
  ctx.lineTo(pxX + pxW, pxY + pxH - cornerLen);
  ctx.stroke();

  // Subtle interior tint
  ctx.fillStyle = isVer ? 'rgba(16, 185, 129, 0.04)' : 'rgba(255, 255, 255, 0.02)';
  ctx.beginPath();
  drawRoundedRect(ctx, pxX, pxY, pxW, pxH, 8);
  ctx.fill();

  // Estimated distance based on face coverage percentage
  // At ~1m distance, face is ~30-35% of frame height; at ~3m ~10-12%; at ~5-8m ~4-7%.
  const faceCoverage = Math.max(box.h, box.w);
  const approxDistanceMeters = faceCoverage > 0
    ? Math.max(0.8, Math.min(8.0, Number((36.0 / faceCoverage).toFixed(1))))
    : 2.0;
  const distanceTag = approxDistanceMeters >= 3.5
    ? `Jarak Jauh (~${approxDistanceMeters}m)`
    : `~${approxDistanceMeters}m`;

  // 2. Refined Floating Label Pill
  if (isVer) {
    const titleText = `${studentName}`;
    const subText = `${studentClass || '10-IPA-1'} • ${distanceTag} • Terverifikasi`;

    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    const textWidth = Math.max(ctx.measureText(titleText).width, ctx.measureText(subText).width, 140);
    const badgeW = textWidth + 24;
    const badgeH = 36;
    const badgeX = pxX + (pxW - badgeW) / 2;
    const badgeY = Math.max(12, pxY - badgeH - 10);

    // Pill background
    ctx.fillStyle = 'rgba(11, 15, 25, 0.92)';
    ctx.beginPath();
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Checkmark icon & Name
    ctx.fillStyle = '#10b981';
    ctx.fillText('✓', badgeX + 10, badgeY + 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(titleText, badgeX + 22, badgeY + 16);

    // Subtext
    ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(subText, badgeX + 10, badgeY + 29);
  } else {
    // Unverified scanning pill
    const scanText = `Memindai Wajah (${distanceTag})...`;
    ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
    const textW = ctx.measureText(scanText).width;
    const badgeW = textW + 28;
    const badgeH = 24;
    const badgeX = pxX + (pxW - badgeW) / 2;
    const badgeY = Math.max(10, pxY - badgeH - 8);

    ctx.fillStyle = 'rgba(11, 15, 25, 0.85)';
    ctx.beginPath();
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Small pulsing green dot
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(badgeX + 10, badgeY + 12, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(scanText, badgeX + 18, badgeY + 16);
  }

  ctx.restore();
}


export const WalkThroughScanner: React.FC = () => {
  const {
    students,
    attendanceLogs,
    activeSchool,
    processWalkThroughAttendance,
    gateAttendanceMode,
    setGateAttendanceMode,
    toggleGateAttendanceMode,
    confidenceThreshold,
    setConfidenceThreshold,
    isOnline,
    offlineQueueCount,
    syncOfflineQueue,
    recordManualFallbackAttendance,
    notify
  } = useApp();

  // State to toggle HUD expansion on the left
  const [isHudExpanded, setIsHudExpanded] = useState<boolean>(true);

  // 🛡️ SOLUSI 2: Modal Absensi Cadangan (Wajah Tidak Terdeteksi)
  const [showFallbackModal, setShowFallbackModal] = useState<boolean>(false);
  const [fallbackSearch, setFallbackSearch] = useState<string>('');
  const [fallbackReason, setFallbackReason] = useState<string>('Wajah Tertutup Masker / Aksesoris');
  const [fallbackSelectedStudentId, setFallbackSelectedStudentId] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');

  // Real-time calculation of enrolled, checked-in (sudah absen), and pending (belum absen) students for today
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const {
    totalStudents,
    sudahDatangCount,
    sudahPulangCount,
    belumDatangCount,
    datangRate,
    pulangRate
  } = useMemo(() => {
    const total = students.length;
    const datangIds = new Set<string>();
    const pulangIds = new Set<string>();

    attendanceLogs.forEach(log => {
      const matchDate =
        (log.dateString && log.dateString === todayStr) ||
        (log.timestamp && log.timestamp.includes(todayStr));
      if (matchDate && log.studentId) {
        if (log.attendanceType === 'PULANG') {
          pulangIds.add(log.studentId);
        } else {
          // Defaults or 'DATANG'
          datangIds.add(log.studentId);
        }
      }
    });

    const datangCount = students.filter(s => datangIds.has(s.id)).length;
    const effectiveDatang = Math.min(total, Math.max(datangCount, datangIds.size));

    const pulangCount = students.filter(s => pulangIds.has(s.id)).length;
    const effectivePulang = Math.min(total, Math.max(pulangCount, pulangIds.size));

    const belumDatang = Math.max(0, total - effectiveDatang);
    const rateDatang = total > 0 ? Math.round((effectiveDatang / total) * 100) : 0;
    const ratePulang = total > 0 ? Math.round((effectivePulang / total) * 100) : 0;

    return {
      totalStudents: total,
      sudahDatangCount: effectiveDatang,
      sudahPulangCount: effectivePulang,
      belumDatangCount: belumDatang,
      datangRate: rateDatang,
      pulangRate: ratePulang
    };
  }, [students, attendanceLogs, todayStr]);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelsReady, setModelsReady] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [voiceEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isKioskSidebarOpen, setIsKioskSidebarOpen] = useState<boolean>(true);
  const isSplitKioskVisible = isFullscreen || isKioskSidebarOpen;

  // Real-time digital clock & date for Kiosk HUD
  const [currentClock, setCurrentClock] = useState<{ timeStr: string; dateStr: string }>({
    timeStr: new Date().toTimeString().slice(0, 8) + ' WIB',
    dateStr: new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentClock({
        timeStr: now.toTimeString().slice(0, 8) + ' WIB',
        dateStr: now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to native fullscreen changes (e.g. user pressing ESC key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Engine selection: 'python' (InsightFace ArcFace walk-by) vs 'browser' (fallback)
  const [engineMode, setEngineMode] = useState<'python' | 'browser'>('python');
  const [pythonStatus, setPythonStatus] = useState<'connected' | 'connecting' | 'offline'>('connecting');
  const [pythonLatency, setPythonLatency] = useState<number>(0);
  const [pythonEnrolledCount, setPythonEnrolledCount] = useState<number>(0);

  // Operational states
  const [gateStatus, setGateStatus] = useState<TurnstileGateStatus>('READY');
  const [activeTracksList, setActiveTracksList] = useState<ActiveTrack[]>([]);
  const [, setTrafficCount] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);
  const [sensorRangeMode, setSensorRangeMode] = useState<'ultra_range' | 'balanced' | 'fast'>('ultra_range');
  const [showGateSettings, setShowGateSettings] = useState<boolean>(false);
  const [lastVerifiedStudent, setLastVerifiedStudent] = useState<{
    name: string;
    class: string;
    photoUrl: string | null;
    status: string;
    time: string;
    attendanceType: AttendanceScanType;
    isDuplicate?: boolean;
  } | null>(null);

  // Temporal duplicate cooldown toast state
  const [cooldownToast, setCooldownToast] = useState<{
    name: string;
    type: AttendanceScanType;
    message: string;
  } | null>(null);

  // Active spotlight student for Kiosk panel (shows last verified or most recent today)
  const activeSpotlightStudent = useMemo(() => {
    if (lastVerifiedStudent) return lastVerifiedStudent;
    if (attendanceLogs.length > 0) {
      const latest = attendanceLogs[0];
      const matched = students.find(s => s.id === latest.studentId);
      return {
        name: latest.studentName,
        class: latest.class,
        photoUrl: matched?.photoUrl || null,
        status: latest.status,
        time: latest.timestamp,
        attendanceType: latest.attendanceType || 'DATANG',
        isDuplicate: false
      };
    }
    return null;
  }, [lastVerifiedStudent, attendanceLogs, students]);

  // Feed of recent check-ins for the kiosk panel (top 4 latest)
  const recentAttendanceFeed = useMemo(() => {
    return attendanceLogs.slice(0, 4);
  }, [attendanceLogs]);

  // Anti-duplication cooldown map: Prevents the same student from being scanned multiple times in a short window (3 minutes)
  const recentStudentScanCooldownRef = useRef<Map<string, { timestamp: number; type: AttendanceScanType }>>(new Map());

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tracksMapRef = useRef<Map<string, ActiveTrack>>(new Map());
  const processedAttendanceTracksRef = useRef<Set<string>>(new Set());
  const recentVocalGreetingsRef = useRef<Map<string, number>>(new Map());
  const isLoopRunningRef = useRef<boolean>(false);

  // WebSocket & offscreen capture refs
  const wsRef = useRef<WebSocket | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isSendingFrameRef = useRef<boolean>(false);

  // Play audio chime via Web Audio API
  const playChime = useCallback((isSuccess = true) => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';

      if (isSuccess) {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(320, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(160, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      }
    } catch {
      // Audio fallback
    }
  }, [soundEnabled]);

  // Voice greeting via Web Speech API using smart student call-name and mode context
  const speakGreeting = useCallback((
    studentName: string,
    isAlreadyAttended = false,
    nickname?: string,
    mode: AttendanceScanType = 'DATANG'
  ) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const callName = getStudentCallName(studentName, nickname);
      let text = '';
      if (mode === 'PULANG') {
        text = isAlreadyAttended
          ? `Halo ${callName}, Anda sudah tercatat absen pulang hari ini.`
          : `Selamat sore ${callName}, hati-hati di jalan.`;
      } else {
        text = isAlreadyAttended
          ? `Halo ${callName}, Anda sudah tercatat absen datang hari ini.`
          : `Selamat pagi ${callName}, silakan masuk.`;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  }, [voiceEnabled]);

  // Execute Attendance when a Student is Verified (shared by Python and Browser engines)
  // Dilengkapi ANTI-DUPLIKASI KETAT: Cooldown 3 menit & Larangan 2x absen dalam satu waktu
  const handleStudentVerified = useCallback((targetStudent: Student, trackId: string) => {
    if (processedAttendanceTracksRef.current.has(trackId)) return;
    processedAttendanceTracksRef.current.add(trackId);

    const now = Date.now();
    const callName = getStudentCallName(targetStudent.name, targetStudent.nickname);
    const isDatang = gateAttendanceMode === 'DATANG';
    const modeLabel = isDatang ? 'Datang' : 'Pulang';

    // 🛡️ ANTI-DUPLIKASI LAYER 1: Temporal Cooldown (3 Menit / 180,000 ms)
    // Mencegah siswa yang diam/berulang kali lewat di depan kamera memicu rekaman atau chime ganda
    const existingCooldown = recentStudentScanCooldownRef.current.get(targetStudent.id);
    if (
      existingCooldown &&
      existingCooldown.type === gateAttendanceMode &&
      now - existingCooldown.timestamp < 180000
    ) {
      // Hanya tampilkan visual cooldown notice jika sudah > 3 detik sejak peringatan terakhir
      if (now - existingCooldown.timestamp > 3000) {
        setCooldownToast({
          name: callName,
          type: gateAttendanceMode,
          message: `${callName} sudah tercatat absen ${modeLabel}, silakan melanjutkan jalan.`
        });
        setTimeout(() => setCooldownToast(null), 3500);
      }
      return;
    }

    const lastGreetingTime = recentVocalGreetingsRef.current.get(targetStudent.id) || 0;
    const canGreet = now - lastGreetingTime > 12000;

    // 🛡️ ANTI-DUPLIKASI LAYER 2: Database / Log Level Deduplication
    const result = processWalkThroughAttendance(targetStudent, '1.3 m/s', gateAttendanceMode);

    // Perbarui stempel waktu cooldown untuk siswa ini
    recentStudentScanCooldownRef.current.set(targetStudent.id, {
      timestamp: now,
      type: gateAttendanceMode
    });

    if (result.alreadyAttended) {
      // Siswa SUDAH absen untuk mode ini hari ini -> Tolak duplikasi dengan sopan
      setCooldownToast({
        name: callName,
        type: gateAttendanceMode,
        message: `${callName} sudah pernah absen ${modeLabel} hari ini (Anti-Duplikasi Aktif).`
      });
      setTimeout(() => setCooldownToast(null), 4000);

      setLastVerifiedStudent({
        name: callName,
        class: targetStudent.class,
        photoUrl: targetStudent.photoUrl || null,
        status: `Sudah Absen ${modeLabel}`,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        attendanceType: gateAttendanceMode,
        isDuplicate: true
      });

      setTimeout(() => {
        setLastVerifiedStudent(null);
      }, 4000);

      if (canGreet) {
        recentVocalGreetingsRef.current.set(targetStudent.id, now);
        playChime(false); // Chime peringatan lembut
        speakGreeting(targetStudent.name, true, targetStudent.nickname, gateAttendanceMode);
      }
      return;
    }

    // ✅ Presensi Berhasil Dicatat (Belum pernah absen pada mode ini hari ini)
    setTrafficCount(prev => prev + 1);
    setGateStatus('OPENING');

    setLastVerifiedStudent({
      name: callName,
      class: targetStudent.class,
      photoUrl: targetStudent.photoUrl || null,
      status: isDatang ? 'Tepat Waktu' : 'Selesai KBM / Pulang',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      attendanceType: gateAttendanceMode,
      isDuplicate: false
    });

    setTimeout(() => {
      setLastVerifiedStudent(null);
    }, 4500);

    if (canGreet) {
      recentVocalGreetingsRef.current.set(targetStudent.id, now);
      playChime(true);
      speakGreeting(targetStudent.name, false, targetStudent.nickname, gateAttendanceMode);
    }

    setTimeout(() => {
      setGateStatus('PASSING');
      setTimeout(() => {
        setGateStatus('READY');
      }, 1000);
    }, 2500);
  }, [gateAttendanceMode, processWalkThroughAttendance, playChime, speakGreeting]);

  // Check Python backend health on load and periodically
  useEffect(() => {
    let isMounted = true;
    async function verifyHealth() {
      const health = await checkPythonBackendHealth();
      if (isMounted) {
        if (health && health.status === 'ok') {
          setPythonStatus('connected');
          setPythonEnrolledCount(health.enrolled_count);
        } else {
          setPythonStatus('offline');
        }
      }
    }
    verifyHealth();
    const timer = setInterval(verifyHealth, 6000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  // Pre-load browser Face-API models as backup
  useEffect(() => {
    let isMounted = true;
    loadFaceApiModels().then(ok => {
      if (isMounted) setModelsReady(ok);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize camera stream
  useEffect(() => {
    let isMounted = true;

    async function startCamera() {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
        }

        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            facingMode: cameraFacing
          },
          audio: false
        });

        if (isMounted) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().catch(e => console.warn('Play warning:', e));
              setCameraActive(true);
            };
            if (videoRef.current.readyState >= 1) {
              videoRef.current.play().catch(e => console.warn('Play warning:', e));
              setCameraActive(true);
            }
          }
        }
      } catch (err) {
        console.warn('Camera stream error:', err);
        if (isMounted) {
          setCameraActive(false);
          setCameraError('Camera inactive or browser access permission denied.');
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [cameraFacing]);

  // Ensure stream stays attached to videoRef
  useEffect(() => {
    if (videoRef.current && streamRef.current && (!videoRef.current.srcObject || !cameraActive)) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().then(() => {
        setCameraActive(true);
      }).catch(e => console.warn('Video attach warning:', e));
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // PIPELINE 1: PYTHON WEBSOCKET STREAMING (Passive Walk-By Mode)
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (engineMode !== 'python' || !cameraActive) return;

    let isSubscribed = true;
    let ws: WebSocket | null = null;
    let frameInterval: any = null;

    function connectWs() {
      try {
        setPythonStatus('connecting');
        ws = new WebSocket(PYTHON_WS_URL);
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
          if (!isSubscribed) return;
          setPythonStatus('connected');
          wsRef.current = ws;
        };

        ws.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const data: PythonDetectionMessage = JSON.parse(event.data);
            setFps(data.fps || 24);
            setPythonLatency(data.proc_ms || 0);
            if (typeof data.enrolled_count === 'number') {
              setPythonEnrolledCount(data.enrolled_count);
            }

            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas) return;

            const vw = video.videoWidth || 640;
            const vh = video.videoHeight || 480;

            if (canvas.width !== vw || canvas.height !== vh) {
              canvas.width = vw;
              canvas.height = vh;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.clearRect(0, 0, vw, vh);

            // Convert Python detections to ActiveTrack representation
            const tracks: ActiveTrack[] = (data.faces || []).map((f: PythonDetectedFace) => ({
              id: f.trackId,
              box: f.box,
              lastSeen: Date.now(),
              studentId: f.studentId,
              studentName: f.studentName,
              studentNickname: f.studentNickname,
              studentClass: f.studentClass,
              isVerified: f.matched,
              isAnonymous: !f.matched,
              confidence: f.confidence,
              framesMatched: f.matched ? 5 : 1,
              missingFrames: 0
            }));

            setActiveTracksList(tracks);

            // Draw Omni-Angle Full-Face Scanning Visualizations (Seluruh Bagian Wajah: Samping, Atas, Bawah)
            for (const face of data.faces || []) {
              const isVer = face.matched;
              const callName = face.studentNickname || getStudentCallName(face.studentName || 'Student');

              drawOmniAngleFaceScan(
                ctx,
                vw,
                vh,
                cameraFacing,
                face.box,
                isVer,
                callName,
                face.studentClass || '10-IPA-1',
                face.confidence,
                face.pose,
                face.landmarks,
                face.coverage
              );

              // Trigger attendance when verified
              if (isVer && face.studentId) {
                const studentObj = students.find(s => s.id === face.studentId) || {
                  id: face.studentId,
                  name: face.studentName || 'Student',
                  nickname: face.studentNickname || callName,
                  class: face.studentClass || '10-IPA-1',
                  gender: 'L' as const,
                  parentName: 'Parent',
                  parentPhone: '',
                  enrolledAt: new Date().toLocaleTimeString(),
                  consentCertified: true
                };
                handleStudentVerified(studentObj, `${face.studentId}-${Math.floor(Date.now() / 15000)}`);
              }
            }
          } catch (e) {
            console.warn('WS message parse error:', e);
          } finally {
            isSendingFrameRef.current = false;
          }
        };

        ws.onclose = () => {
          if (!isSubscribed) return;
          setPythonStatus('offline');
          wsRef.current = null;
        };

        ws.onerror = () => {
          if (!isSubscribed) return;
          setPythonStatus('offline');
        };
      } catch (err) {
        console.warn('WS connection setup error:', err);
        setPythonStatus('offline');
      }
    }

    connectWs();

    // Stream video frames to Python WebSocket
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }

    frameInterval = setInterval(() => {
      const video = videoRef.current;
      const wsCurrent = wsRef.current;

      if (
        !video ||
        video.readyState < 2 ||
        !wsCurrent ||
        wsCurrent.readyState !== WebSocket.OPEN ||
        isSendingFrameRef.current
      ) {
        return;
      }

      const offCanvas = offscreenCanvasRef.current;
      if (!offCanvas) return;

      const targetW = sensorRangeMode === 'fast' ? 480 : sensorRangeMode === 'ultra_range' ? 960 : 640;
      const aspect = (video.videoHeight || 480) / (video.videoWidth || 640);
      const targetH = Math.round(targetW * aspect);

      if (offCanvas.width !== targetW || offCanvas.height !== targetH) {
        offCanvas.width = targetW;
        offCanvas.height = targetH;
      }

      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return;

      offCtx.drawImage(video, 0, 0, targetW, targetH);
      isSendingFrameRef.current = true;

      offCanvas.toBlob(
        (blob) => {
          if (blob && wsCurrent && wsCurrent.readyState === WebSocket.OPEN) {
            blob.arrayBuffer().then((buf) => {
              wsCurrent.send(buf);
            }).catch(() => {
              isSendingFrameRef.current = false;
            });
          } else {
            isSendingFrameRef.current = false;
          }
        },
        'image/jpeg',
        0.75
      );
    }, 60); // ~16-18 FPS streaming for low latency

    return () => {
      isSubscribed = false;
      if (frameInterval) clearInterval(frameInterval);
      if (ws) {
        ws.close();
      }
      wsRef.current = null;
      isSendingFrameRef.current = false;
    };
  }, [engineMode, cameraActive, sensorRangeMode, cameraFacing, students, handleStudentVerified]);

  // ──────────────────────────────────────────────────────────────────
  // PIPELINE 2: BROWSER FALLBACK LOOP (Runs only if engineMode === 'browser')
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (engineMode !== 'browser' || !cameraActive || !modelsReady) return;

    let animFrame: number;
    let lastFpsTime = performance.now();
    let frameCount = 0;
    let lastBioExtractionTime = 0;
    isLoopRunningRef.current = true;
    let isProcessing = false;

    const activeDetectorOptions =
      sensorRangeMode === 'ultra_range'
        ? new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.04 })
        : sensorRangeMode === 'fast'
        ? new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.05 })
        : new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.04 });

    const processFrame = async () => {
      if (!isLoopRunningRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && (video.readyState >= 2 || video.videoWidth > 0) && canvas && !isProcessing) {
        isProcessing = true;
        try {
          frameCount++;
          const nowTime = performance.now();
          if (nowTime - lastFpsTime >= 1000) {
            setFps(Math.round((frameCount * 1000) / (nowTime - lastFpsTime)));
            frameCount = 0;
            lastFpsTime = nowTime;
          }

          const vw = video.videoWidth || 640;
          const vh = video.videoHeight || 480;

          if (canvas.width !== vw || canvas.height !== vh) {
            canvas.width = vw;
            canvas.height = vh;
          }

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, vw, vh);

            const hasUnverifiedTracks = Array.from(tracksMapRef.current.values()).some(
              t => !t.isVerified && t.missingFrames <= 1
            );

            const shouldExtractBiometrics =
              (hasUnverifiedTracks && (nowTime - lastBioExtractionTime >= 100)) ||
              (nowTime - lastBioExtractionTime >= 800);

            const detectionInputs: DetectionInput[] = [];

            if (shouldExtractBiometrics) {
              lastBioExtractionTime = nowTime;
              const rawDetections = await faceapi
                .detectAllFaces(video, activeDetectorOptions)
                .withFaceLandmarks(true)
                .withFaceDescriptors();

              for (const d of rawDetections) {
                const xPct = Math.max(0, Math.min(95, (d.detection.box.x / vw) * 100));
                const yPct = Math.max(0, Math.min(95, (d.detection.box.y / vh) * 100));
                const wPct = Math.max(1.5, Math.min(90, (d.detection.box.width / vw) * 100));
                const hPct = Math.max(1.5, Math.min(90, (d.detection.box.height / vh) * 100));

                detectionInputs.push({
                  box: {
                    x: Math.round(xPct),
                    y: Math.round(yPct),
                    w: Math.round(wPct),
                    h: Math.round(hPct)
                  },
                  descriptor: d.descriptor ? Array.from(d.descriptor) : null,
                  confidence: d.detection.score
                });
              }
            } else {
              const rawFaces = await faceapi.detectAllFaces(video, activeDetectorOptions);

              for (const d of rawFaces) {
                const xPct = Math.max(0, Math.min(95, (d.box.x / vw) * 100));
                const yPct = Math.max(0, Math.min(95, (d.box.y / vh) * 100));
                const wPct = Math.max(1.5, Math.min(90, (d.box.width / vw) * 100));
                const hPct = Math.max(1.5, Math.min(90, (d.box.height / vh) * 100));

                detectionInputs.push({
                  box: {
                    x: Math.round(xPct),
                    y: Math.round(yPct),
                    w: Math.round(wPct),
                    h: Math.round(hPct)
                  },
                  descriptor: null,
                  confidence: d.score
                });
              }
            }

            const nowMs = Date.now();
            const updatedTracks = updateTracksWithDetections(
              tracksMapRef.current,
              detectionInputs,
              students,
              nowMs
            );

            tracksMapRef.current = updatedTracks;
            const currentTracks = Array.from(updatedTracks.values());
            setActiveTracksList(currentTracks);

            for (const track of currentTracks) {
              if (track.missingFrames > 3) continue;

              const isVer = track.isVerified;
              const callName = getStudentCallName(track.studentName, track.studentNickname);

              // Synthesize topological 13-point landmarks for browser fallback
              const b = track.box;
              const midX = b.x + b.w / 2;
              const fallbackLms: Record<string, [number, number]> = {
                forehead: [midX, b.y + b.h * 0.15],
                forehead_l: [b.x + b.w * 0.25, b.y + b.h * 0.15],
                forehead_r: [b.x + b.w * 0.75, b.y + b.h * 0.15],
                left_eye: [b.x + b.w * 0.3, b.y + b.h * 0.38],
                right_eye: [b.x + b.w * 0.7, b.y + b.h * 0.38],
                nose: [midX, b.y + b.h * 0.55],
                left_mouth: [b.x + b.w * 0.35, b.y + b.h * 0.75],
                right_mouth: [b.x + b.w * 0.65, b.y + b.h * 0.75],
                chin: [midX, b.y + b.h * 0.92],
                jaw_l: [b.x + b.w * 0.2, b.y + b.h * 0.8],
                jaw_r: [b.x + b.w * 0.8, b.y + b.h * 0.8],
                cheek_l: [b.x + b.w * 0.12, b.y + b.h * 0.5],
                cheek_r: [b.x + b.w * 0.88, b.y + b.h * 0.5],
              };

              drawOmniAngleFaceScan(
                ctx,
                vw,
                vh,
                cameraFacing,
                track.box,
                isVer,
                callName,
                track.studentClass || '10-IPA-1',
                track.confidence ? `${Math.round(Number(track.confidence) * 100)}%` : '98.5%',
                {
                  yaw: 0,
                  pitch: 0,
                  pose_label: isVer ? 'Frontal • Terverifikasi' : 'Memindai Seluruh Bagian Wajah...',
                  is_angled: false
                },
                fallbackLms,
                { top: true, bottom: true, left: true, right: true, coverage_pct: 100 }
              );

              if (isVer && track.studentId) {
                const student = students.find(s => s.id === track.studentId);
                if (student) {
                  handleStudentVerified(student, track.id);
                }
              }
            }
          }
        } catch (inferenceErr) {
          console.warn('Inference warning:', inferenceErr);
        } finally {
          isProcessing = false;
        }
      }

      if (isLoopRunningRef.current) {
        animFrame = requestAnimationFrame(processFrame);
      }
    };

    animFrame = requestAnimationFrame(processFrame);

    return () => {
      isLoopRunningRef.current = false;
      cancelAnimationFrame(animFrame);
    };
  }, [engineMode, cameraActive, modelsReady, students, sensorRangeMode, cameraFacing, handleStudentVerified]);

  // Clean stale tracks in processed set
  useEffect(() => {
    const interval = setInterval(() => {
      if (processedAttendanceTracksRef.current.size > 200) {
        processedAttendanceTracksRef.current.clear();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.warn('Fullscreen error:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => {
        console.warn('Exit fullscreen error:', err);
      });
      setIsFullscreen(false);
    }
  };

  const handleToggleCamera = () => {
    setCameraFacing(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const verifiedTracksCount = activeTracksList.filter(t => t.isVerified).length;

  return (
    <div className="w-full flex flex-col gap-3 select-none">
      {/* Modern Enterprise Gate Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-1">
        {/* Left: Corridor Identity & Status */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-900 dark:text-white">Gerbang Utama (Gate 01)</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {students.length} Siswa Terdaftar
            </span>
          </div>

          {/* Network & Local Processing Status */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono shadow-xs transition-colors ${
              isOnline
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
            title={
              isOnline
                ? 'Koneksi Cloud Online: Data disinkronkan real-time ke Supabase.'
                : 'Mode Pemrosesan Lokal Aktif (Edge Offline): Data tersimpan di terminal dan akan otomatis disinkronkan saat online.'
            }
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
            <span className="font-semibold">{isOnline ? 'Online Sync' : 'Edge Lokal Offline'}</span>
            {!isOnline && offlineQueueCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px] font-bold">
                {offlineQueueCount} Antrean
              </span>
            )}
          </div>

          {/* Tombol Absensi Cadangan (Wajah Tidak Terdeteksi / Masker / Masalah Kamera) */}
          <button
            type="button"
            onClick={() => {
              setFallbackSearch('');
              setFallbackSelectedStudentId('');
              setBarcodeInput('');
              setShowFallbackModal(true);
            }}
            className="px-3 py-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            title="Metode Absensi Cadangan jika Wajah Tidak Terdeteksi / Menggunakan Masker"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>+ Absen Cadangan</span>
          </button>
        </div>

        {/* Right Controls: Clean Session Toggle & Compact Settings */}
        <div className="flex items-center gap-2 relative">
          {/* Mode Switcher: Datang vs Pulang */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs font-semibold">
            <button
              type="button"
              onClick={() => setGateAttendanceMode('DATANG')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-bold ${
                gateAttendanceMode === 'DATANG'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Aktifkan Mode Absen Datang (Pagi/Masuk)"
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Absen Datang</span>
            </button>

            <button
              type="button"
              onClick={() => setGateAttendanceMode('PULANG')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-bold ${
                gateAttendanceMode === 'PULANG'
                  ? 'bg-[#174384] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Aktifkan Mode Absen Pulang (Sore/Keluar)"
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Absen Pulang</span>
            </button>
          </div>

          {/* Settings Trigger */}
          <button
            type="button"
            onClick={() => setShowGateSettings(!showGateSettings)}
            className={`p-2 rounded-xl border text-xs transition-all cursor-pointer shadow-xs ${
              showGateSettings
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Pengaturan Sensor, Engine & Confidence Threshold"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Compact Settings Popover */}
          {showGateSettings && (
            <div className="absolute right-0 top-11 z-50 w-72 p-3.5 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs font-semibold text-white">
                <span>Pengaturan Gate Scanner</span>
                <button
                  onClick={() => setShowGateSettings(false)}
                  className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Confidence Threshold Control (SOLUSI 1: Salah Mengenali Wajah) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <label className="font-semibold text-slate-300">Confidence Threshold</label>
                  <span className="font-mono font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                    {confidenceThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="1"
                  value={confidenceThreshold}
                  onChange={e => setConfidenceThreshold(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <p className="text-[10px] text-slate-400 leading-tight">
                  Skor &lt; <strong className="text-slate-200">{confidenceThreshold}%</strong> otomatis dialihkan ke status <em>Perlu Verifikasi Manual</em> agar absensi tidak keliru.
                </p>
              </div>

              {/* Engine Selection */}
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <label className="text-[11px] font-medium text-slate-400">Engine Pengenalan Wajah</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-white/5 text-xs">
                  <button
                    onClick={() => setEngineMode('python')}
                    className={`py-1 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      engineMode === 'python'
                        ? 'bg-slate-800 text-white font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Cpu className="w-3 h-3" />
                    <span>Python ArcFace</span>
                  </button>
                  <button
                    onClick={() => setEngineMode('browser')}
                    className={`py-1 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      engineMode === 'browser'
                        ? 'bg-slate-800 text-white font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>WebGL Browser</span>
                  </button>
                </div>
              </div>

              {/* Range Mode */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-400">Jangkauan Sensor Gerbang</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-white/5 text-xs">
                  <button
                    onClick={() => setSensorRangeMode('balanced')}
                    className={`py-1 px-2 rounded-lg font-medium transition-all cursor-pointer text-center ${
                      sensorRangeMode === 'balanced'
                        ? 'bg-[#174384] text-white font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Standar (1-3m)
                  </button>
                  <button
                    onClick={() => setSensorRangeMode('ultra_range')}
                    className={`py-1 px-2 rounded-lg font-medium transition-all cursor-pointer text-center ${
                      sensorRangeMode === 'ultra_range'
                        ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Jarak Jauh Gerbang (3-8m) ⚡
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Camera Viewport Container */}
      <div
        ref={containerRef}
        className={`relative w-full bg-slate-950 overflow-hidden select-none transition-all flex flex-col ${
          isFullscreen
            ? 'fixed inset-0 z-50 h-screen w-screen p-0 rounded-none'
            : 'h-[calc(100vh-170px)] min-h-[580px] p-2 sm:p-2.5 rounded-[1.75rem] ring-1 ring-slate-800/90 shadow-2xl'
        }`}
      >
        <div className={`w-full h-full flex ${isSplitKioskVisible ? 'flex-row' : 'flex-col'} overflow-hidden`}>
          {/* Inner Precision Viewport (Camera Feed) */}
          <div className={`relative flex-1 h-full overflow-hidden bg-black flex items-center justify-center ${isFullscreen ? 'rounded-none' : 'rounded-[1.25rem]'}`}>
            {/* Video Stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraFacing === 'user' ? '-scale-x-100' : ''}`}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
            />

            {/* Subtle Precision Viewfinder Corner Reticles */}
            <div className="absolute inset-0 pointer-events-none z-10 p-5 sm:p-7 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="w-4 h-4 border-t border-l border-white/20 rounded-tl-sm" />
                <div className="w-4 h-4 border-t border-r border-white/20 rounded-tr-sm" />
              </div>
              <div className="flex justify-between items-end">
                <div className="w-4 h-4 border-b border-l border-white/20 rounded-bl-sm" />
                <div className="w-4 h-4 border-b border-r border-white/20 rounded-br-sm" />
              </div>
            </div>

            {/* Loading or Error States */}
            {cameraError ? (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-8 text-center bg-slate-950/95 text-slate-300">
                <AlertTriangle className="w-10 h-10 text-rose-500 mb-3" />
                <h3 className="font-semibold text-sm text-white mb-1">Camera Stream Inactive</h3>
                <p className="text-xs text-slate-400 max-w-sm font-mono">{cameraError}</p>
              </div>
            ) : engineMode === 'python' && pythonStatus === 'offline' ? (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-8 text-center bg-slate-950/85 backdrop-blur-sm text-slate-300">
                <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mb-3" />
                <h3 className="font-semibold text-sm text-white mb-1">Connecting to Python Recognition Backend...</h3>
                <p className="text-xs text-slate-400 max-w-md font-mono mb-4">
                  Connecting to ws://127.0.0.1:8000/ws/detect for passive walk-by recognition.
                </p>
                <button
                  onClick={() => setEngineMode('browser')}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 cursor-pointer"
                >
                  Switch to Browser Engine Fallback
                </button>
              </div>
            ) : engineMode === 'browser' && !modelsReady ? (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-8 text-center bg-slate-950/90 backdrop-blur-sm text-slate-300">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs text-slate-400">
                  Loading detection models...
                </p>
              </div>
            ) : null}

            {/* Top-Right Action Controls */}
            <div className="absolute top-4 right-4 z-40 flex items-center gap-1.5 pointer-events-auto">
              {/* Toggle Kiosk Split Panel Button */}
              <button
                onClick={() => setIsKioskSidebarOpen(prev => !prev)}
                className={`p-2 rounded-lg border backdrop-blur-md transition-colors cursor-pointer shadow-md ${
                  isSplitKioskVisible
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-slate-950/75 hover:bg-slate-900 text-slate-300 hover:text-white border-white/10'
                }`}
                title={isSplitKioskVisible ? 'Ciutkan Panel Kiosk Samping' : 'Buka Panel Kiosk Samping'}
              >
                <PanelRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleToggleCamera}
                className="p-2 rounded-lg bg-slate-950/75 hover:bg-slate-900 text-slate-300 hover:text-white border border-white/10 backdrop-blur-md transition-colors cursor-pointer shadow-md"
                title="Switch Camera"
              >
                <SwitchCamera className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 rounded-lg bg-slate-950/75 hover:bg-slate-900 text-slate-300 hover:text-white border border-white/10 backdrop-blur-md transition-colors cursor-pointer shadow-md"
                title="Toggle Audio"
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-slate-950/75 hover:bg-slate-900 text-slate-300 hover:text-white border border-white/10 backdrop-blur-md transition-colors cursor-pointer shadow-md"
                title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh (Kiosk)'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

          {/* Left-Side HUD: School Logo, School Name, Total Students, Attended & Pending Counts */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 max-w-[270px] sm:max-w-[300px] pointer-events-auto select-none">
            {/* FPS & Scanner Status Pill */}
            <div className="flex items-center gap-2.5 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white text-xs shadow-lg w-fit">
              <span className={`w-2 h-2 rounded-full ${verifiedTracksCount > 0 ? 'bg-emerald-400' : 'bg-emerald-500'} animate-pulse`} />
              <span className="text-xs font-semibold text-slate-200">
                {verifiedTracksCount > 0
                  ? `${verifiedTracksCount} Terverifikasi`
                  : activeTracksList.length > 0
                  ? 'Memindai...'
                  : 'Gate Aktif'}
              </span>
              <span className="text-white/20">•</span>
              <span className="font-mono text-[11px] text-slate-400">
                {fps > 0 ? `${fps} FPS` : '25 FPS'}
              </span>
              {engineMode === 'python' && pythonLatency > 0 && (
                <>
                  <span className="text-white/20">•</span>
                  <span className="font-mono text-[11px] text-emerald-400">
                    {pythonLatency}ms
                  </span>
                </>
              )}
            </div>

            {/* School Identity & Live Attendance Counter Card (Only shown in windowed view without split kiosk) */}
            {!isSplitKioskVisible && (
              <div className="bg-slate-950/85 backdrop-blur-xl border border-white/15 rounded-2xl p-3.5 shadow-2xl text-white space-y-3 transition-all hover:bg-slate-950/95">
              {/* Header: School Logo & School Name */}
              <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-white/10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/15 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {activeSchool?.logoUrl ? (
                      <img
                        src={activeSchool.logoUrl}
                        alt={activeSchool.name}
                        className="w-full h-full object-contain"
                      />
                    ) : activeSchool?.institutionType === 'UNIVERSITAS' ? (
                      <GraduationCap className="w-5 h-5 text-sky-400" />
                    ) : (
                      <School className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          activeSchool?.institutionType === 'UNIVERSITAS'
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {activeSchool?.institutionType === 'UNIVERSITAS' ? 'KAMPUS' : 'SEKOLAH'}
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 font-semibold truncate">
                        {activeSchool?.activationCode ? activeSchool.activationCode.slice(0, 14) + '...' : 'ATND-...'}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold truncate leading-tight text-white mt-0.5" title={activeSchool?.name}>
                      {activeSchool?.name || 'SMA Harapan Nusantara'}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsHudExpanded(!isHudExpanded)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  title={isHudExpanded ? 'Ciutkan Panel' : 'Perluas Panel'}
                >
                  {isHudExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Mode Switcher Segmented Control */}
              <div className="p-1 bg-white/[0.06] border border-white/10 rounded-xl flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setGateAttendanceMode('DATANG')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    gateAttendanceMode === 'DATANG'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Absen Datang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGateAttendanceMode('PULANG')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    gateAttendanceMode === 'PULANG'
                      ? 'bg-[#174384] text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Absen Pulang</span>
                </button>
              </div>

              {/* Collapsible Content: Attendance Statistics */}
              {isHudExpanded && (
                <div className="space-y-2 pt-0.5 animate-in fade-in duration-150">
                  {/* Total Peserta Didik */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/5">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>Total Peserta Didik</span>
                    </div>
                    <div className="font-mono font-bold text-xs text-white">
                      {totalStudents} <span className="text-[10px] text-slate-400 font-normal">Siswa</span>
                    </div>
                  </div>

                  {/* 2-Column Grid: Sudah Datang & Sudah Pulang */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Sudah Absen Datang */}
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">
                        <UserCheck className="w-3 h-3" />
                        <span>Sudah Datang</span>
                      </div>
                      <div className="font-mono font-extrabold text-sm sm:text-base text-emerald-300 mt-0.5">
                        {sudahDatangCount}
                        <span className="text-[10px] font-normal text-emerald-400/80 ml-1">({datangRate}%)</span>
                      </div>
                    </div>

                    {/* Sudah Absen Pulang */}
                    <div className="p-2 rounded-xl bg-blue-950/40 border border-blue-500/30">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-300">
                        <LogOut className="w-3 h-3" />
                        <span>Sudah Pulang</span>
                      </div>
                      <div className="font-mono font-extrabold text-sm sm:text-base text-blue-200 mt-0.5">
                        {sudahPulangCount}
                        <span className="text-[10px] font-normal text-blue-300/80 ml-1">({pulangRate}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Belum Absen Datang */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-rose-500/10 border border-rose-500/25">
                    <div className="flex items-center gap-2 text-xs text-rose-300">
                      <UserX className="w-3.5 h-3.5 text-rose-400" />
                      <span>Belum Absen Datang</span>
                    </div>
                    <div className="font-mono font-bold text-xs text-rose-200">
                      {belumDatangCount} <span className="text-[10px] text-rose-300/80 font-normal">Siswa</span>
                    </div>
                  </div>

                  {/* Attendance Rate Progress Bar */}
                  {totalStudents > 0 && (
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>
                          {gateAttendanceMode === 'DATANG' ? 'Progres Hadir Masuk' : 'Progres Siswa Pulang'}
                        </span>
                        <span className="font-bold text-emerald-400">
                          {gateAttendanceMode === 'DATANG' ? datangRate : pulangRate}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            gateAttendanceMode === 'DATANG'
                              ? 'bg-emerald-500'
                              : 'bg-[#174384]'
                          }`}
                          style={{
                            width: `${gateAttendanceMode === 'DATANG' ? datangRate : pulangRate}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Anti-Duplication Protection Notice */}
                  <div className="flex items-center gap-1.5 text-[9.5px] font-mono text-emerald-400/90 bg-emerald-950/50 border border-emerald-500/20 px-2 py-1.5 rounded-xl">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Anti-Duplikasi Aktif • Maks 1x Scan/Sesi</span>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>

          {/* Floating Anti-Duplication Cooldown Warning Toast */}
          {cooldownToast && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-amber-950/95 border border-amber-500/50 text-amber-200 text-xs px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 max-w-sm sm:max-w-md">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-semibold leading-tight">{cooldownToast.message}</span>
              </div>
            </div>
          )}

          {/* Bottom Center: Physical Turnstile Status */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-xl">
              {gateStatus === 'OPENING' ? (
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                  <DoorOpen className="w-4 h-4 text-emerald-400" />
                  <span>
                    Access Granted • {gateAttendanceMode === 'DATANG' ? 'Masuk Sekolah' : 'Pulang KBM'}
                  </span>
                </div>
              ) : gateStatus === 'PASSING' ? (
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    {gateAttendanceMode === 'DATANG' ? 'Presensi Datang Dicatat' : 'Presensi Pulang Dicatat'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Gate Standby ({gateAttendanceMode})</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Right: Student Arrival Toast Card (Only shown in windowed view without split kiosk) */}
          {!isSplitKioskVisible && lastVerifiedStudent && (
            <div className="absolute bottom-5 right-5 z-20 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div
                className={`backdrop-blur-md border rounded-xl p-3 shadow-2xl flex items-center gap-3 text-white max-w-xs pointer-events-auto ${
                  lastVerifiedStudent.isDuplicate
                    ? 'bg-amber-950/90 border-amber-500/40'
                    : 'bg-slate-950/90 border-white/15'
                }`}
              >
                {lastVerifiedStudent.photoUrl ? (
                  <img
                    src={lastVerifiedStudent.photoUrl}
                    alt={lastVerifiedStudent.name}
                    className="w-10 h-10 rounded-lg object-cover border border-white/20 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-white/10">
                    {lastVerifiedStudent.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 pr-1">
                  <div className="font-semibold text-xs text-white truncate leading-tight flex items-center gap-1.5">
                    <span className="truncate">{lastVerifiedStudent.name}</span>
                    <span
                      className={`text-[8.5px] px-1 py-0.2 rounded font-mono font-bold ${
                        lastVerifiedStudent.attendanceType === 'PULANG'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {lastVerifiedStudent.attendanceType}
                    </span>
                  </div>
                  <div
                    className={`text-[11px] font-medium mt-0.5 truncate ${
                      lastVerifiedStudent.isDuplicate ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {lastVerifiedStudent.class} • {lastVerifiedStudent.status}
                  </div>
                  <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                    {lastVerifiedStudent.time} WIB
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Dedicated Fullscreen / Split Kiosk Information Panel */}
        {isSplitKioskVisible && (
          <aside className="w-80 sm:w-96 lg:w-[420px] shrink-0 h-full bg-[#080d19]/95 border-l border-white/[0.08] backdrop-blur-2xl flex flex-col p-4 sm:p-5 overflow-y-auto text-white z-30 space-y-3.5">
            {/* 1. Header: Live Digital Clock & Gate Status */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] shrink-0 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-medium text-slate-200">Gerbang 01 • Aktif</span>
                </div>
                {isFullscreen && (
                  <button
                    onClick={toggleFullscreen}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    title="Keluar Layar Penuh"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Digital Clock */}
              <div className="flex items-baseline gap-2 pt-1">
                <div className="text-3xl sm:text-4xl font-bold tracking-tight text-white tabular-nums">
                  {currentClock.timeStr.replace(' WIB', '')}
                </div>
                <span className="text-xs font-semibold text-slate-400">WIB</span>
              </div>

              <div className="text-xs text-slate-400 font-medium">
                {currentClock.dateStr}
              </div>
            </div>

            {/* 2. School Identity (Clean & Dignified) */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3 shrink-0">
              <div className="w-11 h-11 rounded-xl bg-slate-900 border border-white/10 p-1 flex items-center justify-center overflow-hidden shrink-0">
                {activeSchool?.logoUrl ? (
                  <img
                    src={activeSchool.logoUrl}
                    alt={activeSchool.name}
                    className="w-full h-full object-contain"
                  />
                ) : activeSchool?.institutionType === 'UNIVERSITAS' ? (
                  <GraduationCap className="w-5 h-5 text-sky-400" />
                ) : (
                  <School className="w-5 h-5 text-emerald-400" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold truncate text-white leading-tight">
                  {activeSchool?.name || 'SMA Harapan Nusantara'}
                </h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  Terminal Presensi Biometrik Wajah
                </div>
              </div>
            </div>

            {/* 3. Attendance Counter Deck (Clean Metrics) */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3 shrink-0">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Presensi Hari Ini</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 font-medium">
                  {gateAttendanceMode === 'DATANG' ? 'Sesi Masuk' : 'Sesi Pulang'}
                </span>
              </div>

              {/* 2-Column Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Sudah Hadir */}
                <div className="p-3 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20">
                  <div className="text-[11px] font-medium text-emerald-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Sudah Hadir</span>
                  </div>
                  <div className="text-2xl font-bold text-white mt-1 tabular-nums">
                    {gateAttendanceMode === 'DATANG' ? sudahDatangCount : sudahPulangCount}
                  </div>
                  <div className="text-[11px] text-emerald-400/90 mt-0.5">
                    {gateAttendanceMode === 'DATANG' ? datangRate : pulangRate}% Kehadiran
                  </div>
                </div>

                {/* Belum Hadir */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                    <UserX className="w-3.5 h-3.5" />
                    <span>Belum Hadir</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-200 mt-1 tabular-nums">
                    {gateAttendanceMode === 'DATANG' ? belumDatangCount : Math.max(0, totalStudents - sudahPulangCount)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    dari {totalStudents} Siswa
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {totalStudents > 0 && (
                <div className="pt-0.5">
                  <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        gateAttendanceMode === 'DATANG' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${gateAttendanceMode === 'DATANG' ? datangRate : pulangRate}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4. Siswa Terakhir Absen (Spotlight Card) */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2.5 shrink-0">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Siswa Terakhir Absen</span>
                </div>
                {activeSpotlightStudent && (
                  <span className="text-[11px] text-slate-400">
                    {activeSpotlightStudent.time} WIB
                  </span>
                )}
              </div>

              {activeSpotlightStudent ? (
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 flex items-center gap-3.5">
                  {/* Foto Siswa */}
                  {activeSpotlightStudent.photoUrl ? (
                    <img
                      src={activeSpotlightStudent.photoUrl}
                      alt={activeSpotlightStudent.name}
                      className="w-13 h-13 rounded-xl object-cover border border-emerald-500/50 shrink-0"
                    />
                  ) : (
                    <div className="w-13 h-13 rounded-xl bg-slate-800 border border-emerald-500/40 text-emerald-300 font-semibold text-sm flex items-center justify-center shrink-0">
                      {activeSpotlightStudent.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  {/* Informasi Siswa */}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-white truncate">
                      {activeSpotlightStudent.name}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 font-medium">
                        Kelas {activeSpotlightStudent.class}
                      </span>
                      <span className={`text-xs font-medium ${
                        activeSpotlightStudent.status.toLowerCase().includes('late') || activeSpotlightStudent.status.toLowerCase().includes('terlambat')
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}>
                        • {activeSpotlightStudent.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">WhatsApp terkirim ke Orang Tua</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 px-4 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center flex flex-col items-center justify-center">
                  <Radio className="w-6 h-6 text-slate-500 animate-pulse mb-1.5" />
                  <p className="text-xs font-medium text-slate-300">Menunggu Pemindaian</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Silakan berjalan melewati gerbang</p>
                </div>
              )}
            </div>

            {/* 5. Riwayat Presensi Terkini */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2.5 shrink-0">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Presensi Terkini</span>
                <span className="text-[11px] text-slate-400">{recentAttendanceFeed.length} Terkini</span>
              </div>

              {recentAttendanceFeed.length > 0 ? (
                <div className="divide-y divide-white/[0.06]">
                  {recentAttendanceFeed.map((log) => {
                    const isLate = log.status.toLowerCase().includes('late') || log.status.toLowerCase().includes('terlambat');
                    return (
                      <div
                        key={log.id}
                        className="py-2.5 flex items-center justify-between text-xs first:pt-1 last:pb-1"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-medium text-slate-200 truncate">
                            {log.studentName}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Kelas {log.class} • {log.timestamp}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium shrink-0 ${
                            log.attendanceType === 'PULANG'
                              ? 'bg-amber-500/15 text-amber-300'
                              : isLate
                              ? 'bg-rose-500/15 text-rose-300'
                              : 'bg-emerald-500/15 text-emerald-300'
                          }`}
                        >
                          {log.attendanceType === 'PULANG' ? 'Pulang' : isLate ? 'Terlambat' : 'Tepat Waktu'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-500">
                  Belum ada rekaman presensi sesi ini
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 🛡️ MODAL METODE ABSENSI CADANGAN (Wajah Tidak Terdeteksi / Masker)          */}
      {/* ========================================================================= */}
      {showFallbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0b111e] border border-white/15 rounded-3xl p-6 w-full max-w-xl text-white shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Metode Absensi Cadangan Gerbang</h3>
                  <p className="text-[11px] text-slate-400">Solusi resmi saat wajah tidak terdeteksi atau tertutup masker</p>
                </div>
              </div>
              <button
                onClick={() => setShowFallbackModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input Barcode / QR NIS Scanner Cepat */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Scan Barcode / Tap Kartu Pelajar (NIS)</span>
                <span className="text-[10px] font-mono text-sky-400">Auto-detect</span>
              </label>
              <div className="relative">
                <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Arahkan barcode scanner atau ketik NIS siswa..."
                  value={barcodeInput}
                  onChange={e => {
                    const val = e.target.value;
                    setBarcodeInput(val);
                    const matched = students.find(
                      s => s.id.toLowerCase() === val.trim().toLowerCase() ||
                           (s.rfidCardId && s.rfidCardId.toLowerCase() === val.trim().toLowerCase())
                    );
                    if (matched) {
                      setFallbackSelectedStudentId(matched.id);
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && fallbackSelectedStudentId) {
                      recordManualFallbackAttendance(fallbackSelectedStudentId, fallbackReason);
                      setShowFallbackModal(false);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>

            {/* Pencarian Manual Siswa */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Pilih Siswa dari Direktori</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama atau kelas..."
                  value={fallbackSearch}
                  onChange={e => setFallbackSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
                />
              </div>

              {/* Daftar Siswa Filtered */}
              <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl bg-slate-950/80 p-2 border border-white/5">
                {students
                  .filter(s =>
                    s.name.toLowerCase().includes(fallbackSearch.toLowerCase()) ||
                    s.id.toLowerCase().includes(fallbackSearch.toLowerCase()) ||
                    s.class.toLowerCase().includes(fallbackSearch.toLowerCase())
                  )
                  .slice(0, 8)
                  .map(st => {
                    const isSelected = fallbackSelectedStudentId === st.id;
                    return (
                      <div
                        key={st.id}
                        onClick={() => setFallbackSelectedStudentId(st.id)}
                        className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-sky-500/20 border border-sky-500/40 text-sky-200'
                            : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">{st.id}</span>
                          <span className="font-semibold text-white">{st.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">{st.class}</span>
                        </div>
                        {isSelected && <span className="text-[11px] font-bold text-sky-400">✓ Terpilih</span>}
                      </div>
                    );
                  })}
                {students.length === 0 && (
                  <div className="py-4 text-center text-xs text-slate-500">
                    Belum ada siswa terdaftar. Tambahkan siswa di tab Direktori Siswa.
                  </div>
                )}
              </div>
            </div>

            {/* Pilihan Alasan Cadangan (Audit Trail) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Alasan Menggunakan Absensi Cadangan</label>
              <select
                value={fallbackReason}
                onChange={e => setFallbackReason(e.target.value)}
                className="w-full p-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden focus:border-sky-500"
              >
                <option value="Wajah Tertutup Masker / Aksesoris">Wajah Tertutup Masker / Aksesoris</option>
                <option value="Pencahayaan Rendah / Silau Ekstrem">Pencahayaan Rendah / Silau Ekstrem</option>
                <option value="Sudut Wajah Ekstrem / Kamera Terkendala">Sudut Wajah Ekstrem / Kamera Terkendala</option>
                <option value="Siswa Baru (Belum Rekam Biometrik)">Siswa Baru (Belum Rekam Biometrik)</option>
                <option value="Kacamata Reflektif / Medis">Kacamata Reflektif / Medis</option>
                <option value="Permintaan Khusus Operator">Permintaan Khusus Operator</option>
              </select>
            </div>

            {/* Mode & Action Buttons */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Mode Aktif: <strong className="text-white">{gateAttendanceMode === 'DATANG' ? 'Absen Datang' : 'Absen Pulang'}</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFallbackModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs border border-white/10 hover:bg-white/5 cursor-pointer text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!fallbackSelectedStudentId}
                  onClick={() => {
                    if (fallbackSelectedStudentId) {
                      recordManualFallbackAttendance(fallbackSelectedStudentId, fallbackReason);
                      setShowFallbackModal(false);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                    fallbackSelectedStudentId
                      ? 'bg-[#174384] hover:bg-[#13376d] text-white'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Catat Presensi Cadangan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};
