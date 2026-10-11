import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import * as faceapi from '@vladmandic/face-api';
import { loadFaceApiModels } from '../utils/faceDetector';
import { updateTracksWithDetections, DetectionInput } from '../utils/faceTracker';
import {
  Camera,
  Radio,
  Volume2,
  VolumeX,
  DoorOpen,
  DoorClosed,
  ShieldCheck,
  SwitchCamera,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Database,
  UserCheck,
  Sparkles,
  Users
} from 'lucide-react';
import { Student, ActiveTrack } from '../types';

export type TurnstileGateStatus = 'READY' | 'OPENING' | 'PASSING';

// Palet Warna Sensor Dinamis untuk Setiap Orang Berbeda
const SENSOR_PALETTES = [
  { stroke: '#06b6d4', glow: 'rgba(6, 182, 212, 0.45)', bg: 'rgba(6, 182, 212, 0.12)', headerBg: '#083344', text: '#67e8f9', tag: 'CYAN' },
  { stroke: '#a855f7', glow: 'rgba(168, 85, 247, 0.45)', bg: 'rgba(168, 85, 247, 0.12)', headerBg: '#3b0764', text: '#d8b4fe', tag: 'VIOLET' },
  { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.45)', bg: 'rgba(245, 158, 11, 0.12)', headerBg: '#451a03', text: '#fde68a', tag: 'AMBER' },
  { stroke: '#38bdf8', glow: 'rgba(56, 189, 248, 0.45)', bg: 'rgba(56, 189, 248, 0.12)', headerBg: '#082f49', text: '#bae6fd', tag: 'SKY' },
  { stroke: '#f43f5e', glow: 'rgba(244, 63, 94, 0.45)', bg: 'rgba(244, 63, 94, 0.12)', headerBg: '#4c0519', text: '#fecdd3', tag: 'ROSE' },
  { stroke: '#2dd4bf', glow: 'rgba(45, 212, 191, 0.45)', bg: 'rgba(45, 212, 191, 0.12)', headerBg: '#042f2e', text: '#99f6e4', tag: 'TEAL' },
  { stroke: '#fb923c', glow: 'rgba(251, 146, 60, 0.45)', bg: 'rgba(251, 146, 60, 0.12)', headerBg: '#431407', text: '#fed7aa', tag: 'ORANGE' }
];

function getTrackPalette(trackId: string, isVerified: boolean) {
  if (isVerified) {
    return {
      stroke: '#10b981',
      glow: 'rgba(16, 185, 129, 0.55)',
      bg: 'rgba(16, 185, 129, 0.16)',
      headerBg: '#064e3b',
      text: '#a7f3d0',
      tag: 'VERIFIED SISWA'
    };
  }

  // Tiap orang asing / track mendapatkan warna sensor unik berbeda berdasarkan hash ID
  let hash = 0;
  for (let i = 0; i < trackId.length; i++) {
    hash = (hash << 5) - hash + trackId.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % SENSOR_PALETTES.length;
  return SENSOR_PALETTES[idx];
}

export const WalkThroughScanner: React.FC = () => {
  const {
    students,
    processWalkThroughAttendance,
    supabaseConnected,
    attendanceLogs,
    notify
  } = useApp();

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelsReady, setModelsReady] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Operational states
  const [gateStatus, setGateStatus] = useState<TurnstileGateStatus>('READY');
  const [activeTracksList, setActiveTracksList] = useState<ActiveTrack[]>([]);
  const [trafficCount, setTrafficCount] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);
  const [lastVerifiedStudent, setLastVerifiedStudent] = useState<{
    name: string;
    class: string;
    photoUrl: string | null;
    status: string;
    time: string;
  } | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tracksMapRef = useRef<Map<string, ActiveTrack>>(new Map());
  const processedAttendanceTracksRef = useRef<Set<string>>(new Set());
  const recentVocalGreetingsRef = useRef<Map<string, number>>(new Map());
  const isLoopRunningRef = useRef<boolean>(false);

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
    } catch (e) {
      // Audio fallback
    }
  }, [soundEnabled]);

  // Voice greeting via Web Speech API
  const speakGreeting = useCallback((studentName: string, isAlreadyAttended = false) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const firstName = studentName.split(' ')[0];
      const text = isAlreadyAttended
        ? `Halo ${firstName}, kamu sudah absen hari ini.`
        : `Selamat pagi ${firstName}, silakan masuk.`;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  }, [voiceEnabled]);

  // Load Face-API neural models
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
      } catch (err) {
        console.warn('Camera stream error:', err);
        if (isMounted) {
          setCameraActive(false);
          setCameraError('Kamera tidak aktif atau izin akses ditolak browser.');
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

  // Execute Attendance when a Track becomes Verified
  const handleVerifiedTrack = useCallback((track: ActiveTrack) => {
    if (!track.studentId) return;

    // Check track level lock to avoid repeated execution in the same walk pass
    if (processedAttendanceTracksRef.current.has(track.id)) return;
    processedAttendanceTracksRef.current.add(track.id);

    const student = students.find(s => s.id === track.studentId);
    if (!student) return;

    // Vocal cooldown: don't shout name every 2 seconds if student hovers around gate
    const now = Date.now();
    const lastGreetingTime = recentVocalGreetingsRef.current.get(student.id) || 0;
    const canGreet = now - lastGreetingTime > 15000;

    const result = processWalkThroughAttendance(student, '1.3 m/s');

    setTrafficCount(prev => prev + 1);
    setGateStatus('OPENING');

    setLastVerifiedStudent({
      name: student.name,
      class: student.class,
      photoUrl: student.photoUrl || null,
      status: result.alreadyAttended ? 'Sudah Absen Hari Ini' : 'Hadir Tepat Waktu',
      time: new Date().toLocaleTimeString('id-ID')
    });

    if (canGreet) {
      recentVocalGreetingsRef.current.set(student.id, now);
      playChime(true);
      speakGreeting(student.name, result.alreadyAttended);
    }

    // Auto close turnstile after student walks through (2.8 seconds)
    setTimeout(() => {
      setGateStatus('PASSING');
      setTimeout(() => {
        setGateStatus('READY');
      }, 1000);
    }, 2500);
  }, [students, processWalkThroughAttendance, playChime, speakGreeting]);

  // Real-Time Multi-Face Walk-Through Detection & Tracking Loop
  useEffect(() => {
    if (!cameraActive || !modelsReady) return;

    let animFrame: number;
    let lastFpsTime = performance.now();
    let frameCount = 0;
    isLoopRunningRef.current = true;

    const detectorOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 224,
      scoreThreshold: 0.38
    });

    const processFrame = async () => {
      if (!isLoopRunningRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState >= 2 && canvas) {
        // Calculate FPS
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

          try {
            // 1. Deteksi Seluruh Wajah di Frame Secara Paralel (Multi-Face)
            const rawDetections = await faceapi
              .detectAllFaces(video, detectorOptions)
              .withFaceLandmarks(true)
              .withFaceDescriptors();

            const detectionInputs: DetectionInput[] = [];

            for (const d of rawDetections) {
              const xPct = Math.max(0, Math.min(95, (d.detection.box.x / vw) * 100));
              const yPct = Math.max(0, Math.min(95, (d.detection.box.y / vh) * 100));
              const wPct = Math.max(5, Math.min(90, (d.detection.box.width / vw) * 100));
              const hPct = Math.max(5, Math.min(90, (d.detection.box.height / vh) * 100));

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

            // 2. Update Pelacakan Multi-Wajah Antar-Frame (IoU / Centroid Tracking)
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

            // 3. Render Dynamic Bounding Boxes on Canvas
            for (const track of currentTracks) {
              // Abaikan jika track sudah hilang lebih dari 3 frame
              if (track.missingFrames > 3) continue;

              // Transformasi koordinat sesuai kamera mirror tanpa membuat teks terbalik
              const normX = cameraFacing === 'user' ? (100 - track.box.x - track.box.w) : track.box.x;
              const pxX = (normX / 100) * vw;
              const pxY = (track.box.y / 100) * vh;
              const pxW = (track.box.w / 100) * vw;
              const pxH = (track.box.h / 100) * vh;

              const isVer = track.isVerified;
              const palette = getTrackPalette(track.id, isVer);

              ctx.save();
              ctx.shadowColor = palette.glow;
              ctx.shadowBlur = 10;
              ctx.strokeStyle = palette.stroke;
              ctx.lineWidth = 2.5;
              ctx.fillStyle = palette.bg;

              // Draw rounded bounding box

              const r = 8;
              ctx.beginPath();
              ctx.moveTo(pxX + r, pxY);
              ctx.lineTo(pxX + pxW - r, pxY);
              ctx.quadraticCurveTo(pxX + pxW, pxY, pxX + pxW, pxY + r);
              ctx.lineTo(pxX + pxW, pxY + pxH - r);
              ctx.quadraticCurveTo(pxX + pxW, pxY + pxH, pxX + pxW - r, pxY + pxH);
              ctx.lineTo(pxX + r, pxY + pxH);
              ctx.quadraticCurveTo(pxX, pxY + pxH, pxX, pxY + pxH - r);
              ctx.lineTo(pxX, pxY + r);
              ctx.quadraticCurveTo(pxX, pxY, pxX + r, pxY);
              ctx.closePath();
              ctx.stroke();
              ctx.fill();

              // Draw Corner Accents
              const cLen = 14;
              ctx.lineWidth = 3.5;
              ctx.strokeStyle = palette.stroke;
              ctx.beginPath();
              // Top-left
              ctx.moveTo(pxX, pxY + cLen);
              ctx.lineTo(pxX, pxY);
              ctx.lineTo(pxX + cLen, pxY);
              // Top-right
              ctx.moveTo(pxX + pxW - cLen, pxY);
              ctx.lineTo(pxX + pxW, pxY);
              ctx.lineTo(pxX + pxW, pxY + cLen);
              // Bottom-left
              ctx.moveTo(pxX, pxY + pxH - cLen);
              ctx.lineTo(pxX, pxY + pxH);
              ctx.lineTo(pxX + cLen, pxY + pxH);
              // Bottom-right
              ctx.moveTo(pxX + pxW - cLen, pxY + pxH);
              ctx.lineTo(pxX + pxW, pxY + pxH);
              ctx.lineTo(pxX + pxW, pxY + pxH - cLen);
              ctx.stroke();

              // Center Radar Target Dot
              const centerX = pxX + pxW / 2;
              const centerY = pxY + pxH / 2;
              ctx.beginPath();
              ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
              ctx.fillStyle = palette.stroke;
              ctx.fill();

              // Draw Badge Name Header
              const labelText = isVer
                ? `${track.studentName || 'Siswa'}`
                : `[ID-${track.id.slice(-4).toUpperCase()}] Anonim / Belum Terdaftar`;

              const subText = isVer
                ? `${track.studentClass || ''} • ${track.confidence}% Cocok`
                : `Sensor AI: ${palette.tag} • Tidak Disimpan`;

              ctx.font = 'bold 13px system-ui, sans-serif';
              const textWidth = Math.max(ctx.measureText(labelText).width, 160);
              const badgeH = 40;
              const badgeY = Math.max(0, pxY - badgeH - 6);

              // Badge background
              ctx.fillStyle = palette.headerBg;
              ctx.beginPath();
              ctx.roundRect(pxX, badgeY, textWidth + 24, badgeH, 6);
              ctx.fill();
              ctx.strokeStyle = palette.stroke;
              ctx.lineWidth = 1.5;
              ctx.stroke();

              // Badge text
              ctx.fillStyle = '#ffffff';
              ctx.fillText(labelText, pxX + 10, badgeY + 16);
              ctx.font = 'normal 11px system-ui, sans-serif';
              ctx.fillStyle = palette.text;
              ctx.fillText(subText, pxX + 10, badgeY + 32);

              // Draw bottom HUD tracker status
              const footerH = 20;
              const footerY = pxY + pxH + 4;
              ctx.font = 'bold 10px monospace, monospace';
              const footerText = isVer
                ? `STATUS: TERVERIFIKASI [1x ABSEN HARI INI]`
                : `SENSOR TRACK [${track.id.slice(-4).toUpperCase()}] • ${palette.tag}`;
              const footerWidth = ctx.measureText(footerText).width + 16;
              ctx.fillStyle = palette.headerBg;
              ctx.beginPath();
              ctx.roundRect(pxX, footerY, footerWidth, footerH, 4);
              ctx.fill();
              ctx.strokeStyle = palette.stroke;
              ctx.lineWidth = 1;
              ctx.stroke();
              ctx.fillStyle = palette.text;
              ctx.fillText(footerText, pxX + 8, footerY + 14);

              ctx.restore();

              // Trigger attendance on first verification
              if (isVer && !processedAttendanceTracksRef.current.has(track.id)) {
                handleVerifiedTrack(track);
              }
            }
          } catch (inferenceErr) {
            console.warn('Inference error in walk-through loop:', inferenceErr);
          }
        }
      }

      animFrame = requestAnimationFrame(processFrame);
    };

    animFrame = requestAnimationFrame(processFrame);

    return () => {
      isLoopRunningRef.current = false;
      cancelAnimationFrame(animFrame);
    };
  }, [cameraActive, modelsReady, students, handleVerifiedTrack]);

  // Clean stale tracks in processed list
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

  const registeredCount = students.length;
  const verifiedTracksCount = activeTracksList.filter(t => t.isVerified).length;
  const anonymousTracksCount = activeTracksList.filter(t => t.isAnonymous).length;

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Top Banner: Status Terminal Gerbang Operasional */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 relative">
            <Radio className="w-6 h-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 text-base sm:text-lg">
                Terminal Gerbang Walk-Through Mandiri
              </h2>
              {activeTracksList.length > 0 ? (
                verifiedTracksCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                    {verifiedTracksCount} Siswa Dikenali Saat Jalan
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    {anonymousTracksCount} Wajah Anonim Melintas (Diabaikan)
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Siaga • Menunggu Siswa Melintas
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Multi-face AI tracking langsung melacak siswa yang melangkah santai tanpa harus berhenti menatap kamera.
            </p>
          </div>
        </div>

        {/* Operational Controls */}
        <div className="flex items-center gap-2">
          {/* Camera switcher */}
          <button
            onClick={handleToggleCamera}
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Ganti Kamera Depan / Belakang"
          >
            <SwitchCamera className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">
              {cameraFacing === 'user' ? 'Depan' : 'Belakang'}
            </span>
          </button>

          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-slate-100 border-slate-300 text-slate-700'
                : 'bg-white border-slate-200 text-slate-400'
            }`}
            title="Bunyi Bel Gerbang"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen kiosk toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Mode Layar Penuh (Kiosk Tablet)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Terminal Grid: Video Canvas & Live Status Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Live Video Feed with Dynamic Canvas Bounding Boxes */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video border border-slate-800 shadow-xl flex items-center justify-center">
            {cameraError ? (
              <div className="text-center p-8 text-slate-300">
                <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                <h3 className="font-bold text-base text-white mb-1">Akses Kamera Gagal</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">{cameraError}</p>
              </div>
            ) : !modelsReady ? (
              <div className="text-center p-8 text-slate-300">
                <Sparkles className="w-10 h-10 text-emerald-400 mx-auto mb-3 animate-spin" />
                <p className="text-sm font-semibold text-white">Memuat Neural Biometric Model...</p>
                <p className="text-xs text-slate-400 mt-1">Mengaktifkan TinyFaceDetector &amp; FaceNet</p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraFacing === 'user' ? '-scale-x-100' : ''}`}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
              </>
            )}

            {/* Top Telemetry Overlay */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none text-white text-xs">
              <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono font-bold">{fps} FPS</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-300">Gerbang Walk-Through Aktif</span>
              </div>

              <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 shadow-xs">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300">
                  {supabaseConnected ? 'Supabase PostgreSQL Cloud' : 'IndexedDB Lokal'}
                </span>
              </div>
            </div>

            {/* Bottom Gate Turnstile Status Ribbon */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15 text-white shadow-md">
                {gateStatus === 'OPENING' ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs sm:text-sm">
                    <DoorOpen className="w-5 h-5 text-emerald-400 animate-bounce" />
                    <span>PALANG TERBUKA • SILAKAN LEWAT</span>
                  </div>
                ) : gateStatus === 'PASSING' ? (
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs sm:text-sm">
                    <DoorOpen className="w-5 h-5 text-cyan-400" />
                    <span>SISWA MELANGKAH MASUK</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs sm:text-sm">
                    <DoorClosed className="w-5 h-5 text-slate-400" />
                    <span>GERBANG SIAP (READY)</span>
                  </div>
                )}
              </div>

              {activeTracksList.length > 0 && (
                <div className="bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white/15 text-xs text-slate-300 font-mono">
                  {activeTracksList.length} Orang Terdeteksi
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Real-time Attendance Stream & Verified Student Card */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card: Last Verified Student Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Siswa Terakhir Diverifikasi
            </h3>

            {lastVerifiedStudent ? (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  {lastVerifiedStudent.photoUrl ? (
                    <img
                      src={lastVerifiedStudent.photoUrl}
                      alt={lastVerifiedStudent.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-emerald-400 shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-emerald-600 text-white font-bold text-lg flex items-center justify-center shadow-sm">
                      {lastVerifiedStudent.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm text-slate-900 leading-tight">
                      {lastVerifiedStudent.name}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {lastVerifiedStudent.class}
                    </div>
                    <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      {lastVerifiedStudent.status}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs text-emerald-800">
                  <span>Waktu Masuk:</span>
                  <span className="font-mono font-bold">{lastVerifiedStudent.time} WIB</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                Belum ada siswa yang melintas di depan kamera hari ini.
              </div>
            )}
          </div>

          {/* Card: Quick Daily Stats */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">
              Statistik Gerbang Hari Ini
            </h3>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {attendanceLogs.length}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  Total Absen Masuk
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-2xl font-black text-emerald-600 font-mono">
                  {trafficCount}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  Lintasan Terdeteksi
                </div>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100">
              <span>Siswa Terdaftar di Database:</span>
              <span className="font-bold text-slate-800">{registeredCount} Siswa</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
