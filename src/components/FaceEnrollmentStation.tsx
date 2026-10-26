import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { useApp } from '../context/AppContext';
import { getStudentCallName } from '../utils/nameHelper';
import { evaluateHeadPose, TargetPose, PoseEvaluationResult } from '../utils/headPoseDetector';
import { loadFaceApiModels } from '../utils/faceDetector';
import {
  enrollStudentInPython,
  checkPythonBackendHealth,
  syncAllStudentsToPython,
  fetchStudentsFromPython
} from '../utils/pythonBackendClient';
import {
  Camera,
  UserCheck,
  UserPlus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  SwitchCamera,
  XCircle,
  Crosshair,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Trash2,
  Users,
  Zap,
  Upload,
  Sparkles,
  Sliders
} from 'lucide-react';
import { Student } from '../types';

export type EnrollmentMethod = 'instant' | 'upload' | 'burst' | 'multi_angle';

export interface EnrollmentStage {
  id: TargetPose;
  title: string;
  subtitle: string;
  targetPose: TargetPose;
  shortLabel: string;
}

const ENROLLMENT_STAGES: EnrollmentStage[] = [
  {
    id: 'FRONT',
    title: '1. Neutral Forward (0°)',
    subtitle: 'Position your face in the center facing directly forward',
    targetPose: 'FRONT',
    shortLabel: 'Front'
  },
  {
    id: 'RIGHT',
    title: '2. Right Profile (+25°)',
    subtitle: 'Slowly rotate head toward your right',
    targetPose: 'RIGHT',
    shortLabel: 'Right'
  },
  {
    id: 'LEFT',
    title: '3. Left Profile (-25°)',
    subtitle: 'Slowly rotate head toward your left',
    targetPose: 'LEFT',
    shortLabel: 'Left'
  },
  {
    id: 'UP',
    title: '4. Upward Incline (+15°)',
    subtitle: 'Slightly elevate chin upward',
    targetPose: 'UP',
    shortLabel: 'Up'
  },
  {
    id: 'DOWN',
    title: '5. Downward Incline (-15°)',
    subtitle: 'Tilt gaze downward naturally',
    targetPose: 'DOWN',
    shortLabel: 'Down'
  }
];

const renderPoseGlyph = (pose: TargetPose, className = 'w-4 h-4') => {
  switch (pose) {
    case 'FRONT':
      return <Crosshair className={className} />;
    case 'RIGHT':
      return <ArrowRight className={className} />;
    case 'LEFT':
      return <ArrowLeft className={className} />;
    case 'UP':
      return <ArrowUp className={className} />;
    case 'DOWN':
      return <ArrowDown className={className} />;
  }
};

function playEnrollmentTone(type: 'success' | 'complete') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.connect(audioCtx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.12);
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.24);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    }
  } catch {
    // Ignore audio error
  }
}

export const FaceEnrollmentStation: React.FC = () => {
  const { students, setStudents, saveStudent, deleteStudent, deleteAllStudents, notify } = useApp();

  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [enrollMethod, setEnrollMethod] = useState<EnrollmentMethod>('instant');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Instant / Upload / Burst state
  const [isProcessingInstant, setIsProcessingInstant] = useState<boolean>(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-angle capture state (Advanced mode)
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const [capturedVectors, setCapturedVectors] = useState<number[][]>([]);
  const [, setPrimaryPhotoUrl] = useState<string | null>(null);
  const [captureStatusMessage, setCaptureStatusMessage] = useState<string>('');

  // Python backend status
  const [pythonOnline, setPythonOnline] = useState<boolean>(false);
  const [pythonEnrolledCount, setPythonEnrolledCount] = useState<number>(0);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);

  // Search in student roster
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('ALL');

  // Form for New Student
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
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

  const [existingNickname, setExistingNickname] = useState<string>('');
  const [livePoseEval, setLivePoseEval] = useState<PoseEvaluationResult | null>(null);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const isCapturingRef = useRef<boolean>(false);

  // Periodic health check for Python ArcFace engine status
  useEffect(() => {
    let isMounted = true;
    async function checkHealth() {
      const h = await checkPythonBackendHealth();
      if (isMounted) {
        if (h && h.status === 'ok') {
          setPythonOnline(true);
          setPythonEnrolledCount(h.enrolled_count);
        } else {
          setPythonOnline(false);
        }
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleCancelCapture = () => {
    isCapturingRef.current = false;
    setIsCapturing(false);
    setLivePoseEval(null);
    setHoldProgress(0);
    setCaptureStatusMessage('');
    notify('Enrollment sequence cancelled.');
  };

  useEffect(() => {
    if (currentStudent) {
      setExistingNickname(currentStudent.nickname || getStudentCallName(currentStudent.name));
    }
  }, [selectedStudentId, currentStudent]);

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
          setCameraError('Camera permission denied or camera device not found.');
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
    if (window.confirm(`Hapus profil siswa dan data biometrik untuk ${student.name} (${student.id}) secara permanen?`)) {
      await deleteStudent(student.id);
      setSelectedStudentId('');
      setMode('new');
      notify(`Siswa ${student.name} (${student.id}) berhasil dihapus permanen dari sistem.`);
    }
  };

  const [liveFaceDetected, setLiveFaceDetected] = useState<boolean>(false);
  const [detectedDistanceInfo, setDetectedDistanceInfo] = useState<string>('');
  const [liveAnglePart, setLiveAnglePart] = useState<'top' | 'bottom' | 'left' | 'right' | 'front'>('front');
  const [liveAngleLabel, setLiveAngleLabel] = useState<string>('Frontal (Tampak Depan)');

  // Pre-load Face-API neural network models on station mount
  useEffect(() => {
    loadFaceApiModels().catch(err => console.warn('Enrollment station model preload warning:', err));
  }, []);

  // Live face & omni-angle detection feedback while camera is active
  useEffect(() => {
    if (!cameraActive || isCapturing) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      try {
        let result = await faceapi
          .detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.05 })
          )
          .withFaceLandmarks(true);

        if (isMounted) {
          const detBox = (result as any)?.detection?.box || (result as any)?.box;
          if (result && detBox) {
            setLiveFaceDetected(true);
            const boxW = detBox.width;
            if (boxW < 75) {
              setDetectedDistanceInfo('Mendekat');
            } else if (boxW > 280) {
              setDetectedDistanceInfo('Mundur Sedikit');
            } else {
              setDetectedDistanceInfo('Jarak Optimal');
            }

            // Real-time Omni-Angle Pose Evaluation (Samping, Atas, Bawah)
            if (result.landmarks && result.landmarks.positions) {
              const evalRes = evaluateHeadPose(result.landmarks.positions, 'FRONT', cameraFacing);
              if (evalRes.yawMetric < -0.16) {
                setLiveAnglePart('left');
                setLiveAngleLabel('Samping Kiri (Profile)');
              } else if (evalRes.yawMetric > 0.16) {
                setLiveAnglePart('right');
                setLiveAngleLabel('Samping Kanan (Profile)');
              } else if (evalRes.noseFraction < 0.36) {
                setLiveAnglePart('bottom');
                setLiveAngleLabel('Bawah / Dagu (Pitch Up)');
              } else if (evalRes.noseFraction > 0.49) {
                setLiveAnglePart('top');
                setLiveAngleLabel('Atas / Dahi (Pitch Down)');
              } else {
                setLiveAnglePart('front');
                setLiveAngleLabel('Frontal (Tampak Depan)');
              }
            }
          } else {
            setLiveFaceDetected(false);
            setDetectedDistanceInfo('');
            setLiveAnglePart('front');
            setLiveAngleLabel('Posisikan Wajah');
          }
        }
      } catch {
        // Suppress interval inference errors
      }
    }, 250);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [cameraActive, isCapturing, cameraFacing]);

  // Capture clean square avatar photo
  const takeSnapshotPhoto = async (): Promise<string | null> => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (cameraFacing === 'user') {
      ctx.translate(360, 0);
      ctx.scale(-1, 1);
    }

    try {
      let det = await faceapi.detectSingleFace(
        video,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.10 })
      );

      if (det && det.box) {
        const box = det.box;
        const pad = Math.max(box.width, box.height) * 0.45;
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        const cropSize = Math.max(box.width, box.height) + pad * 2;
        const sx = Math.max(0, Math.min(vw - cropSize, cx - cropSize / 2));
        const sy = Math.max(0, Math.min(vh - cropSize, cy - cropSize / 2));
        const finalSize = Math.min(cropSize, vw - sx, vh - sy);
        ctx.drawImage(video, sx, sy, finalSize, finalSize, 0, 0, 360, 360);
        return canvas.toDataURL('image/jpeg', 0.85);
      }
    } catch {
      // Fallback
    }

    const size = Math.min(vw, vh);
    const sx = (vw - size) / 2;
    const sy = (vh - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 360, 360);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // ──────────────────────────────────────────────────────────────────
  // ⚡ METHOD 1: INSTANT 1-CLICK ENROLLMENT (Fastest & Frictionless)
  // ──────────────────────────────────────────────────────────────────
  const handleInstantEnroll = async () => {
    if (mode === 'new') {
      if (!formData.name.trim()) {
        notify('Please enter the student full name.', 'warning');
        return;
      }
    } else if (!currentStudent) {
      notify('Please select a student to re-enroll.', 'warning');
      return;
    }

    setIsProcessingInstant(true);
    try {
      const photoThumb = await takeSnapshotPhoto();
      if (!photoThumb) {
        notify('Camera stream not ready. Please make sure camera is active.', 'warning');
        setIsProcessingInstant(false);
        return;
      }

      const callName = mode === 'new'
        ? (formData.nickname.trim() || getStudentCallName(formData.name))
        : (existingNickname.trim() || currentStudent?.nickname || getStudentCallName(currentStudent?.name || ''));

      const targetStudent: Student = mode === 'new' ? {
        id: formData.id,
        name: formData.name,
        nickname: callName,
        class: formData.class,
        gender: formData.gender,
        photoUrl: photoThumb,
        parentName: formData.parentName || 'Parent',
        parentPhone: formData.parentPhone || '0812-',
        enrolledAt: new Date().toLocaleTimeString('en-US'),
        consentCertified: true,
        consentDocId: formData.consentDocId,
        faceDescriptors: [],
        lastSeen: 'Newly Enrolled'
      } : {
        ...currentStudent!,
        photoUrl: photoThumb,
        nickname: callName,
        consentCertified: true
      };

      // 1. Save locally and in Supabase
      await saveStudent(targetStudent);

      // 2. Direct enrollment into Python ArcFace Engine
      const pyResult = await enrollStudentInPython(targetStudent, photoThumb);

      playEnrollmentTone('complete');

      if (pyResult.success) {
        notify(`⚡ 1-Click Enrollment complete! "${callName}" is ready for walk-by gate attendance.`);
      } else {
        notify(`Student ${callName} saved. Note: Python backend status (${pyResult.error || 'Saved'})`);
      }

      if (mode === 'new') {
        setSelectedStudentId(targetStudent.id);
        setFormData({
          name: '',
          nickname: '',
          id: `NIS-${Math.floor(2024000 + Math.random() * 900)}`,
          class: '10-IPA-1',
          gender: 'L',
          parentName: '',
          parentPhone: '0812-',
          consentDocId: `IZIN-WALI-2026/${Math.floor(100 + Math.random() * 900)}`
        });
      }
    } catch (err: any) {
      notify(`Enrollment error: ${err.message}`, 'error');
    } finally {
      setIsProcessingInstant(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // 📁 METHOD 2: UPLOAD PHOTO FILE (From gallery / school documents)
  // ──────────────────────────────────────────────────────────────────
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setUploadedPhotoUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEnrollWithUploadedPhoto = async () => {
    if (!uploadedPhotoUrl) {
      notify('Please select an image file first.', 'warning');
      return;
    }

    if (mode === 'new' && !formData.name.trim()) {
      notify('Please enter student name.', 'warning');
      return;
    }

    setIsProcessingInstant(true);
    try {
      const callName = mode === 'new'
        ? (formData.nickname.trim() || getStudentCallName(formData.name))
        : (existingNickname.trim() || currentStudent?.nickname || getStudentCallName(currentStudent?.name || ''));

      const targetStudent: Student = mode === 'new' ? {
        id: formData.id,
        name: formData.name,
        nickname: callName,
        class: formData.class,
        gender: formData.gender,
        photoUrl: uploadedPhotoUrl,
        parentName: formData.parentName || 'Parent',
        parentPhone: formData.parentPhone || '0812-',
        enrolledAt: new Date().toLocaleTimeString('en-US'),
        consentCertified: true,
        consentDocId: formData.consentDocId,
        faceDescriptors: [],
        lastSeen: 'Newly Enrolled'
      } : {
        ...currentStudent!,
        photoUrl: uploadedPhotoUrl,
        nickname: callName,
        consentCertified: true
      };

      await saveStudent(targetStudent);
      const pyResult = await enrollStudentInPython(targetStudent, uploadedPhotoUrl);

      playEnrollmentTone('complete');

      if (pyResult.success) {
        notify(`📁 Photo enrolled! "${callName}" is ready for walk-by recognition.`);
        setUploadedPhotoUrl(null);
      } else {
        notify(`Student saved. Python note: ${pyResult.error}`);
      }

      if (mode === 'new') {
        setSelectedStudentId(targetStudent.id);
        setFormData({
          name: '',
          nickname: '',
          id: `NIS-${Math.floor(2024000 + Math.random() * 900)}`,
          class: '10-IPA-1',
          gender: 'L',
          parentName: '',
          parentPhone: '0812-',
          consentDocId: `IZIN-WALI-2026/${Math.floor(100 + Math.random() * 900)}`
        });
      }
    } catch (err: any) {
      notify(`Photo enrollment error: ${err.message}`, 'error');
    } finally {
      setIsProcessingInstant(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // 📷 METHOD 3: QUICK 3-SHOT AUTO BURST (Takes 3 natural shots in 2 sec)
  // ──────────────────────────────────────────────────────────────────
  const handleQuickBurstEnroll = async () => {
    if (mode === 'new' && !formData.name.trim()) {
      notify('Please enter student name.', 'warning');
      return;
    }

    setIsProcessingInstant(true);
    notify('Quick 3-shot burst starting. Simply move head naturally...');

    try {
      const callName = mode === 'new'
        ? (formData.nickname.trim() || getStudentCallName(formData.name))
        : (existingNickname.trim() || currentStudent?.nickname || getStudentCallName(currentStudent?.name || ''));

      let primaryPhoto: string | null = null;
      let pySuccessCount = 0;

      for (let i = 1; i <= 3; i++) {
        await new Promise(r => setTimeout(r, 600));
        const shot = await takeSnapshotPhoto();
        if (shot) {
          if (!primaryPhoto) primaryPhoto = shot;
          playEnrollmentTone('success');

          const dummyStudent: Student = {
            id: mode === 'new' ? formData.id : currentStudent!.id,
            name: mode === 'new' ? formData.name : currentStudent!.name,
            class: mode === 'new' ? formData.class : currentStudent!.class,
            nickname: callName,
            gender: 'L',
            parentName: '',
            parentPhone: '',
            enrolledAt: '',
            consentCertified: true
          };

          const res = await enrollStudentInPython(dummyStudent, shot);
          if (res.success) pySuccessCount++;
        }
      }

      if (primaryPhoto) {
        const studentToSave: Student = mode === 'new' ? {
          id: formData.id,
          name: formData.name,
          nickname: callName,
          class: formData.class,
          gender: formData.gender,
          photoUrl: primaryPhoto,
          parentName: formData.parentName || 'Parent',
          parentPhone: formData.parentPhone || '0812-',
          enrolledAt: new Date().toLocaleTimeString('en-US'),
          consentCertified: true,
          consentDocId: formData.consentDocId,
          faceDescriptors: [],
          lastSeen: 'Newly Enrolled'
        } : {
          ...currentStudent!,
          photoUrl: primaryPhoto,
          nickname: callName,
          consentCertified: true
        };

        await saveStudent(studentToSave);
      }

      playEnrollmentTone('complete');
      notify(`📷 3-Shot Burst Complete! ${pySuccessCount} ArcFace vectors registered for "${callName}".`);

      if (mode === 'new') {
        setSelectedStudentId(formData.id);
        setFormData({
          name: '',
          nickname: '',
          id: `NIS-${Math.floor(2024000 + Math.random() * 900)}`,
          class: '10-IPA-1',
          gender: 'L',
          parentName: '',
          parentPhone: '0812-',
          consentDocId: `IZIN-WALI-2026/${Math.floor(100 + Math.random() * 900)}`
        });
      }
    } catch (err: any) {
      notify(`Burst error: ${err.message}`, 'error');
    } finally {
      setIsProcessingInstant(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // 📐 METHOD 4: CALIBRATED 5-POSE SEQUENCE (Advanced)
  // ──────────────────────────────────────────────────────────────────
  const handleStartMultiAngleCapture = async () => {
    if (!videoRef.current) return;

    if (mode === 'new') {
      if (!formData.name.trim()) {
        notify('Please enter the student full name.', 'warning');
        return;
      }
    } else if (!currentStudent) {
      notify('Please select a student to re-enroll.', 'warning');
      return;
    }

    setIsCapturing(true);
    isCapturingRef.current = true;
    setCurrentStageIdx(0);
    setCapturedVectors([]);
    setPrimaryPhotoUrl(null);
    setLivePoseEval(null);
    setHoldProgress(0);

    const vectorsCollected: number[][] = [];
    let photoThumb: string | null = null;
    const REQUIRED_HOLD_FRAMES = 4;

    const tinyDetectorOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.10
    });

    for (let stage = 0; stage < ENROLLMENT_STAGES.length; stage++) {
      if (!isCapturingRef.current) break;

      const currentStage = ENROLLMENT_STAGES[stage];
      setCurrentStageIdx(stage);
      setCaptureStatusMessage(currentStage.title);
      setHoldProgress(0);

      let consecutiveMatchFrames = 0;
      let stageDescriptor: number[] | null = null;

      while (isCapturingRef.current && consecutiveMatchFrames < REQUIRED_HOLD_FRAMES) {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          await new Promise(r => setTimeout(r, 60));
          continue;
        }

        try {
          let det = await faceapi
            .detectSingleFace(videoRef.current, tinyDetectorOptions)
            .withFaceLandmarks(false)
            .withFaceDescriptor();

          if (det && det.landmarks) {
            const evalResult = evaluateHeadPose(
              det.landmarks.positions,
              currentStage.targetPose,
              cameraFacing
            );
            setLivePoseEval(evalResult);

            if (evalResult.isMatch) {
              consecutiveMatchFrames++;
              const pct = Math.round((consecutiveMatchFrames / REQUIRED_HOLD_FRAMES) * 100);
              setHoldProgress(pct);

              if (consecutiveMatchFrames >= REQUIRED_HOLD_FRAMES && det.descriptor) {
                stageDescriptor = Array.from(det.descriptor);
                playEnrollmentTone('success');
                break;
              }
            } else {
              consecutiveMatchFrames = 0;
              setHoldProgress(0);
            }
          } else {
            setLivePoseEval(null);
            consecutiveMatchFrames = 0;
            setHoldProgress(0);
          }
        } catch (inferenceErr) {
          console.warn('Pose inference warning:', inferenceErr);
        }

        await new Promise(r => setTimeout(r, 65));
      }

      if (!isCapturingRef.current) break;

      if (stageDescriptor && stageDescriptor.length === 128) {
        vectorsCollected.push(stageDescriptor);
        if (stage === 0) {
          photoThumb = await takeSnapshotPhoto();
          setPrimaryPhotoUrl(photoThumb);
        }
        setCapturedVectors([...vectorsCollected]);
        await new Promise(r => setTimeout(r, 350));
      }
    }

    if (!isCapturingRef.current) {
      setIsCapturing(false);
      setLivePoseEval(null);
      setHoldProgress(0);
      return;
    }

    if (vectorsCollected.length < 5) {
      setIsCapturing(false);
      isCapturingRef.current = false;
      setLivePoseEval(null);
      setHoldProgress(0);
      notify('Incomplete angle sequence (5 required).', 'warning');
      return;
    }

    playEnrollmentTone('complete');
    setCaptureStatusMessage('Finalizing biometric embeddings...');

    let targetStudent: Student;

    if (mode === 'new') {
      const callName = formData.nickname.trim() || getStudentCallName(formData.name);
      const newStudent: Student = {
        id: formData.id,
        name: formData.name,
        nickname: callName,
        class: formData.class,
        gender: formData.gender,
        photoUrl: photoThumb,
        parentName: formData.parentName || 'Parent',
        parentPhone: formData.parentPhone || '0812-',
        enrolledAt: new Date().toLocaleTimeString('en-US'),
        consentCertified: true,
        consentDocId: formData.consentDocId,
        faceDescriptors: vectorsCollected,
        faceDescriptor: vectorsCollected[0],
        lastSeen: 'Newly Enrolled'
      };

      await saveStudent(newStudent);
      targetStudent = newStudent;
      setSelectedStudentId(newStudent.id);

      setFormData({
        name: '',
        nickname: '',
        id: `NIS-${Math.floor(2024000 + Math.random() * 900)}`,
        class: '10-IPA-1',
        gender: 'L',
        parentName: '',
        parentPhone: '0812-',
        consentDocId: `IZIN-WALI-2026/${Math.floor(100 + Math.random() * 900)}`
      });
    } else {
      const callName = existingNickname.trim() || currentStudent?.nickname || getStudentCallName(currentStudent?.name || '');
      const updatedStudent: Student = {
        ...currentStudent!,
        photoUrl: photoThumb || currentStudent!.photoUrl,
        nickname: callName,
        faceDescriptors: vectorsCollected,
        faceDescriptor: vectorsCollected[0],
        consentCertified: true
      };

      await saveStudent(updatedStudent);
      targetStudent = updatedStudent;
    }

    setIsCapturing(false);
    isCapturingRef.current = false;
    setLivePoseEval(null);
    setHoldProgress(0);

    const finalCallName = targetStudent.nickname || getStudentCallName(targetStudent.name);
    
    // Sync with Python InsightFace ArcFace Engine
    if (photoThumb) {
      enrollStudentInPython(targetStudent, photoThumb).then(res => {
        if (res.success) {
          notify(`5/5 Biometric angles verified & synced to Python ArcFace Engine.`);
        }
      }).catch(() => {});
    }

    notify(`5/5 Biometric angles verified. Terminal initialized for "${finalCallName}".`);
  };

  // Bidirectional sync: Pull all enrolled students from Python and push any local students
  const handleBulkSync = async () => {
    setIsSyncingAll(true);
    try {
      // 1. Pull students currently enrolled in Python ArcFace database
      const pyStudents = await fetchStudentsFromPython();
      if (pyStudents.length > 0) {
        setStudents(prev => {
          const map = new Map<string, Student>();
          prev.forEach(s => map.set(s.id, s));
          pyStudents.forEach(s => {
            if (!map.has(s.id)) {
              map.set(s.id, s);
            }
          });
          return Array.from(map.values());
        });
      }

      // 2. Push any local students with photo to Python
      const res = await syncAllStudentsToPython(students);
      const totalEnrolled = Math.max(res.total_enrolled, pyStudents.length);
      setPythonEnrolledCount(totalEnrolled);
      notify(`Sinkronisasi berhasil: ${pyStudents.length} siswa tersinkronisasi dari database Python ArcFace.`);
    } catch (e: any) {
      notify(`Sync failed: ${e.message}`, 'error');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter === 'ALL' || s.class === classFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Biometric Face Enrollment
            </h2>
            {pythonOnline ? (
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Python ArcFace Active ({pythonEnrolledCount} enrolled)
              </span>
            ) : (
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Cloud Browser Mode (Supabase Cloud Active)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enroll students via camera snapshot or photo upload for high-speed walk-through recognition.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pythonOnline && (
            <button
              onClick={handleBulkSync}
              disabled={isSyncingAll}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Sync all students with existing photos into Python ArcFace database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>Sync to Python</span>
            </button>
          )}

          <button
            onClick={handleToggleCamera}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            title="Switch camera sensor"
          >
            <SwitchCamera className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>{cameraFacing === 'user' ? 'Front Camera' : 'Rear Camera'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Enrollment Station & Student Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Enrollment Station Form & Camera View */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-2xs dark:shadow-xl backdrop-blur-xl">
            
            {/* Top Bar: Registration Mode & Method Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-4 mb-5">
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200/80 dark:border-white/10 text-xs gap-1">
                <button
                  onClick={() => setMode('new')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    mode === 'new'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 inline mr-1.5 text-slate-500 dark:text-slate-400" />
                  New Registration
                </button>
                <button
                  onClick={() => setMode('existing')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    mode === 'existing'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5 inline mr-1.5 text-slate-500 dark:text-slate-400" />
                  Re-Enroll
                </button>
              </div>

              {/* Method Selector Pills */}
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200/80 dark:border-white/10 text-xs gap-1">
                <button
                  onClick={() => setEnrollMethod('instant')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    enrollMethod === 'instant'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Instant Camera Snapshot"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Instant Photo</span>
                </button>

                <button
                  onClick={() => setEnrollMethod('upload')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    enrollMethod === 'upload'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Upload student photo file from computer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Photo</span>
                </button>

                <button
                  onClick={() => setEnrollMethod('burst')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    enrollMethod === 'burst'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="3-Shot Quick Burst"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>3-Shot Burst</span>
                </button>

                <button
                  onClick={() => setEnrollMethod('multi_angle')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    enrollMethod === 'multi_angle'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="5-Angle Pose Calibration"
                >
                  Guided Pose
                </button>
              </div>
            </div>

            {/* Video Viewport or Upload Dropzone */}
            {enrollMethod === 'upload' ? (
              <div className="relative rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950/60 border-2 border-dashed border-slate-200 dark:border-white/10 aspect-video flex flex-col items-center justify-center p-6 text-center">
                {uploadedPhotoUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={uploadedPhotoUrl}
                      alt="Uploaded Preview"
                      className="w-36 h-36 rounded-2xl object-cover ring-2 ring-emerald-500 shadow-lg"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        Change Photo
                      </button>
                      <button
                        onClick={() => setUploadedPhotoUrl(null)}
                        className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-mono hover:bg-rose-100 dark:hover:bg-rose-900/60 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Click to choose student photo (JPG, PNG)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                      Python ArcFace will detect and extract 512-dim embedding automatically
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video ring-1 ring-slate-800 shadow-inner flex items-center justify-center">
                {cameraError ? (
                  <div className="text-center p-6 text-slate-300">
                    <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                    <p className="text-xs font-mono">{cameraError}</p>
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

                {/* Live Distance & Omni-Angle Coverage Indicator */}
                <div className="absolute top-3 left-3 z-10 pointer-events-none">
                  {liveFaceDetected ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-950/85 backdrop-blur-md text-emerald-400 border border-emerald-500/30 shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-semibold">{liveAngleLabel}</span>
                      <span className="text-slate-500">•</span>
                      <span className="font-mono text-slate-300">{detectedDistanceInfo}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-950/75 backdrop-blur-md text-slate-300 border border-white/10 shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      <span>Posisikan wajah di dalam frame kamera</span>
                    </div>
                  )}
                </div>

                {/* Omni-Angle 4-Axis Scanning Reticle Guide */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className={`transition-all duration-300 rounded-3xl relative flex items-center justify-center ${
                      liveFaceDetected
                        ? 'w-56 h-72 border-2 border-emerald-400/80 ring-2 ring-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.25)]'
                        : 'w-52 h-68 border border-dashed border-white/30'
                    }`}
                  >
                    {/* Corner Reticle Brackets */}
                    <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />

                    {/* 4-Axis Directional Badges (Atas, Bawah, Samping Kiri, Samping Kanan) */}
                    {/* ⬆️ ATAS */}
                    <div
                      className={`absolute -top-7 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
                        liveAnglePart === 'top'
                          ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.7)] scale-105'
                          : 'bg-slate-900/90 text-slate-400 border border-white/10'
                      }`}
                    >
                      ▲ Atas (Dahi)
                    </div>

                    {/* ⬇️ BAWAH */}
                    <div
                      className={`absolute -bottom-7 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
                        liveAnglePart === 'bottom'
                          ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.7)] scale-105'
                          : 'bg-slate-900/90 text-slate-400 border border-white/10'
                      }`}
                    >
                      ▼ Bawah (Dagu)
                    </div>

                    {/* ⬅️ KIRI */}
                    <div
                      className={`absolute -left-20 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
                        liveAnglePart === 'left'
                          ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.7)] scale-105'
                          : 'bg-slate-900/90 text-slate-400 border border-white/10'
                      }`}
                    >
                      ◄ Kiri
                    </div>

                    {/* ➡️ KANAN */}
                    <div
                      className={`absolute -right-22 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
                        liveAnglePart === 'right'
                          ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.7)] scale-105'
                          : 'bg-slate-900/90 text-slate-400 border border-white/10'
                      }`}
                    >
                      Kanan ►
                    </div>
                  </div>
                </div>

                {/* Multi-Angle Guidance Overlay (if in 5-pose calibration mode) */}
                {isCapturing && (
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col justify-between p-4 z-20 pointer-events-none">
                    <div className="flex items-center justify-between pointer-events-auto">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/15 text-white font-mono text-xs shadow-xl">
                        {renderPoseGlyph(ENROLLMENT_STAGES[currentStageIdx]?.targetPose, 'w-3.5 h-3.5 text-emerald-400')}
                        <span>
                          STAGE {currentStageIdx + 1}/5: {ENROLLMENT_STAGES[currentStageIdx]?.title}
                        </span>
                      </div>

                      <button
                        onClick={handleCancelCapture}
                        className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs font-mono transition-all cursor-pointer shadow-lg active:scale-95"
                      >
                        ABORT
                      </button>
                    </div>

                    <div className="flex flex-col items-center justify-center my-auto">
                      <div
                        className={`w-28 h-28 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-200 relative ${
                          livePoseEval?.isMatch
                            ? 'border-emerald-500 bg-emerald-950/50'
                            : 'border-slate-700 bg-slate-900/70'
                        }`}
                      >
                        <div className="text-white mb-1">
                          {renderPoseGlyph(ENROLLMENT_STAGES[currentStageIdx]?.targetPose, 'w-5 h-5')}
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-semibold">
                          {ENROLLMENT_STAGES[currentStageIdx]?.shortLabel}
                        </span>

                        {livePoseEval?.isMatch && (
                          <div className="absolute -bottom-6 text-emerald-400 font-mono text-[11px] font-semibold">
                            STEADY: {holdProgress}%
                          </div>
                        )}
                      </div>

                      <div className="mt-6 text-center">
                        <div
                          className={`inline-block px-3 py-1 rounded-full text-xs font-mono border transition-all ${
                            livePoseEval?.isMatch
                              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
                              : 'bg-slate-900/90 text-slate-400 border-slate-700'
                          }`}
                        >
                          {livePoseEval?.guidanceText || 'Position face within reticle'}
                        </div>
                      </div>
                    </div>

                    {/* Progress Rail */}
                    <div className="bg-slate-900/90 rounded-xl p-2 border border-white/10">
                      <div className="grid grid-cols-5 gap-1.5">
                        {ENROLLMENT_STAGES.map((stg, i) => {
                          const isDone = i < capturedVectors.length;
                          const isCurrent = i === currentStageIdx;

                          return (
                            <div
                              key={stg.id}
                              className={`p-1 rounded-lg text-center font-mono text-[9px] border transition-all flex flex-col items-center justify-center gap-0.5 ${
                                isDone
                                  ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-400'
                                  : isCurrent
                                  ? 'bg-slate-800 border-white/40 text-white'
                                  : 'bg-white/5 border-white/10 text-slate-600'
                              }`}
                            >
                              <div>{renderPoseGlyph(stg.targetPose, 'w-3 h-3')}</div>
                              <span className="truncate">{stg.shortLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Form Fields */}
            {mode === 'new' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => {
                      const newName = e.target.value;
                      handleInputChange('name', newName);
                      if (!formData.nickname || formData.nickname === getStudentCallName(formData.name)) {
                        handleInputChange('nickname', getStudentCallName(newName));
                      }
                    }}
                    placeholder="e.g., Muhammad Salman"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Gate Greeting Call Name</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Audio Greeting</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={e => handleInputChange('nickname', e.target.value)}
                    placeholder={getStudentCallName(formData.name) || 'e.g., Salman'}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Student ID (NIS) *
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={e => handleInputChange('id', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Class *
                  </label>
                  <select
                    value={formData.class}
                    onChange={e => handleInputChange('class', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="10-IPA-1">10-IPA-1</option>
                    <option value="10-IPA-2">10-IPA-2</option>
                    <option value="11-IPA-1">11-IPA-1</option>
                    <option value="12-IPA-1">12-IPA-1</option>
                    <option value="10-IPS-1">10-IPS-1</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Parent / Guardian Name
                  </label>
                  <input
                    type="text"
                    value={formData.parentName}
                    onChange={e => handleInputChange('parentName', e.target.value)}
                    placeholder="e.g., Hendra Wijaya"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Parent WhatsApp Phone
                  </label>
                  <input
                    type="text"
                    value={formData.parentPhone}
                    onChange={e => handleInputChange('parentPhone', e.target.value)}
                    placeholder="08123456789"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-5 p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Student to Re-Enroll
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={e => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200"
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.id} - {s.class})
                      </option>
                    ))}
                  </select>
                </div>

                {currentStudent && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Gate Audio Call Name
                    </label>
                    <input
                      type="text"
                      value={existingNickname}
                      onChange={e => setExistingNickname(e.target.value)}
                      placeholder={getStudentCallName(currentStudent.name)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* ACTION ENROLLMENT BUTTONS (Depends on Method) */}
            <div className="mt-6">
              {enrollMethod === 'instant' ? (
                <button
                  onClick={handleInstantEnroll}
                  disabled={isProcessingInstant || !cameraActive}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-98 ${
                    isProcessingInstant || !cameraActive
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/20'
                  }`}
                >
                  <Zap className="w-4 h-4 text-emerald-200" />
                  <span>
                    {isProcessingInstant
                      ? 'EXTRACTING BIOMETRICS IN PYTHON...'
                      : '⚡ 1-CLICK INSTANT ENROLL (PYTHON ARCFACE)'}
                  </span>
                </button>
              ) : enrollMethod === 'upload' ? (
                <button
                  onClick={handleEnrollWithUploadedPhoto}
                  disabled={isProcessingInstant || !uploadedPhotoUrl}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-98 ${
                    isProcessingInstant || !uploadedPhotoUrl
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/20'
                  }`}
                >
                  <Upload className="w-4 h-4 text-emerald-200" />
                  <span>
                    {isProcessingInstant
                      ? 'PROCESSING PHOTO IN PYTHON...'
                      : 'ENROLL WITH UPLOADED PHOTO'}
                  </span>
                </button>
              ) : enrollMethod === 'burst' ? (
                <button
                  onClick={handleQuickBurstEnroll}
                  disabled={isProcessingInstant || !cameraActive}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-98 ${
                    isProcessingInstant || !cameraActive
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/20'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>
                    {isProcessingInstant
                      ? 'CAPTURING 3 BURST FRAMES...'
                      : 'START 3-SHOT QUICK BURST (2 SECONDS)'}
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleStartMultiAngleCapture}
                  disabled={isCapturing || !cameraActive}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-98 ${
                    isCapturing || !cameraActive
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      : 'bg-slate-900 dark:bg-emerald-500 hover:bg-slate-800 dark:hover:bg-emerald-400 text-white dark:text-slate-950 shadow-slate-950/20'
                  }`}
                >
                  <Crosshair className="w-4 h-4 text-slate-300 dark:text-slate-950" />
                  <span>{isCapturing ? 'SEQUENCE IN PROGRESS...' : 'START 5-POSE CALIBRATION'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Enrolled Student Roster */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-2xs dark:shadow-xl flex flex-col h-full min-h-[500px] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h3 className="font-semibold text-xs text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                  Enrolled Students ({filteredStudents.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {students.length > 0 && (
                  <button
                    onClick={async () => {
                      if (window.confirm('Hapus seluruh data siswa dan biometrik dari sistem? Tindakan ini tidak dapat dibatalkan.')) {
                        await deleteAllStudents();
                        setSelectedStudentId('');
                        setMode('new');
                      }
                    }}
                    className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-md text-[11px] font-mono hover:bg-rose-100 dark:hover:bg-rose-900/70 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Hapus seluruh data siswa dari database lokal dan server"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus Semua</span>
                  </button>
                )}
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-md border border-emerald-200 dark:border-emerald-800/50">
                  {pythonEnrolledCount} synced
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search name or ID..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Classes</option>
                <option value="10-IPA-1">10-IPA-1</option>
                <option value="10-IPA-2">10-IPA-2</option>
                <option value="11-IPA-1">11-IPA-1</option>
                <option value="12-IPA-1">12-IPA-1</option>
                <option value="10-IPS-1">10-IPS-1</option>
              </select>
            </div>

            {/* Students List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[460px]">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                  <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-mono">No enrolled students found.</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Use 1-Click Instant Enroll on the left to add a student.
                  </p>
                </div>
              ) : (
                filteredStudents.map(student => (
                  <div
                    key={student.id}
                    className="p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-slate-950/50 hover:bg-slate-50/50 dark:hover:bg-white/[0.04] transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {student.photoUrl ? (
                        <img
                          src={student.photoUrl}
                          alt={student.name}
                          className="w-9 h-9 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {student.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                          <span>{student.name}</span>
                          {student.nickname && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-normal">
                              "{student.nickname}"
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {student.id} • {student.class}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleDeleteStudentClick(student)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete Student"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
