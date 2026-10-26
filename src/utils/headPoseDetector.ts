/**
 * Head Pose Estimation & Verification Engine based on 68 Facial Landmarks
 * Mendeteksi orientasi wajah (Depan, Kanan, Kiri, Atas, Bawah) secara real-time
 * untuk memvalidasi pose siswa saat perekaman biometrik (Anti-Kecurangan / Pose-Lock).
 */

export type TargetPose = 'FRONT' | 'RIGHT' | 'LEFT' | 'UP' | 'DOWN';

export interface Point2D {
  x: number;
  y: number;
}

export interface PoseEvaluationResult {
  currentPose: TargetPose;
  isMatch: boolean;
  yawMetric: number;      // < -0.22 = LEFT, > 0.22 = RIGHT, else CENTER
  noseFraction: number;   // < 0.35 = UP, > 0.51 = DOWN, else CENTER
  guidanceText: string;
  poseAccuracyPercent: number;
}

/**
 * Menghitung orientasi kepala dan memvalidasi apakah sesuai dengan target pose yang diminta.
 * @param positions Array 68 titik koordinat wajah dari face-api
 * @param targetPose Pose yang sedang diinstruksikan oleh sistem
 * @param cameraFacing 'user' (kamera depan/selfie) atau 'environment' (kamera belakang)
 */
export function evaluateHeadPose(
  positions: Point2D[],
  targetPose: TargetPose,
  cameraFacing: 'user' | 'environment' = 'user'
): PoseEvaluationResult {
  if (!positions || positions.length < 68) {
    return {
      currentPose: 'FRONT',
      isMatch: false,
      yawMetric: 0,
      noseFraction: 0.43,
      guidanceText: 'Position your face inside the camera frame',
      poseAccuracyPercent: 0
    };
  }

  const p0 = positions[0];    // Rahang kanan kamera (pipi kanan jika selfie)
  const p16 = positions[16];  // Rahang kiri kamera
  const p8 = positions[8];    // Dagu
  const p27 = positions[27];  // Pangkal hidung atas (antara kedua mata)
  const p30 = positions[30];  // Ujung hidung

  // Titik tengah kedua mata
  const rightEyeX = (positions[36].x + positions[39].x) / 2;
  const rightEyeY = (positions[36].y + positions[39].y) / 2;
  const leftEyeX = (positions[42].x + positions[45].x) / 2;
  const leftEyeY = (positions[42].y + positions[45].y) / 2;
  const eyeMidY = (rightEyeY + leftEyeY) / 2;

  // 1. Hitung Yaw (Horizontal: Kiri vs Kanan)
  // Jarak ujung hidung ke rahang kanan vs kiri
  const distNoseToRightJaw = Math.abs(p30.x - p0.x);
  const distNoseToLeftJaw = Math.abs(p16.x - p30.x);
  const totalJawWidth = distNoseToRightJaw + distNoseToLeftJaw;

  let rawYaw = totalJawWidth > 0
    ? (distNoseToLeftJaw - distNoseToRightJaw) / totalJawWidth
    : 0;

  // Jika kamera depan (user/selfie mirror):
  // Menoleh ke Kanan pengguna membuat hidung mendekat ke rahang kanan sensor (distRight mengecil, distLeft membesar -> yawMetric > 0)
  const yawMetric = cameraFacing === 'user' ? rawYaw : -rawYaw;

  // 2. Hitung Pitch (Vertikal: Atas vs Bawah)
  const totalFaceHeight = p8.y - eyeMidY;
  const noseFraction = totalFaceHeight > 0
    ? (p30.y - eyeMidY) / totalFaceHeight
    : 0.43;

  const noseLength = Math.max(1, p30.y - p27.y);
  const lowerFaceHeight = Math.max(1, p8.y - p30.y);
  const pitchRatio = lowerFaceHeight / noseLength;

  // 3. Klasifikasi Pose Terdeteksi
  let detectedPose: TargetPose = 'FRONT';

  // Ambang batas toleransi ergonomis
  const YAW_THRESHOLD = 0.22;
  const PITCH_UP_THRESHOLD = 0.36;
  const PITCH_DOWN_THRESHOLD = 0.50;

  if (yawMetric > YAW_THRESHOLD) {
    detectedPose = 'RIGHT';
  } else if (yawMetric < -YAW_THRESHOLD) {
    detectedPose = 'LEFT';
  } else if (noseFraction < PITCH_UP_THRESHOLD || pitchRatio > 2.35) {
    detectedPose = 'UP';
  } else if (noseFraction > PITCH_DOWN_THRESHOLD || pitchRatio < 1.25) {
    detectedPose = 'DOWN';
  } else {
    detectedPose = 'FRONT';
  }

  const isMatch = detectedPose === targetPose;

  // 4. Hitung Persentase Akurasi Pose (0% - 100%)
  let accuracy = 0;
  let guidanceText = '';

  switch (targetPose) {
    case 'FRONT':
      if (detectedPose === 'FRONT') {
        const dev = Math.abs(yawMetric) + Math.abs(noseFraction - 0.43);
        accuracy = Math.round(Math.max(80, 100 - dev * 90));
        guidanceText = 'Looking straight ahead... Perfect! ✅';
      } else {
        accuracy = Math.round(Math.max(10, 50 - Math.abs(yawMetric) * 40));
        guidanceText = 'Look straight ahead, do not turn or tilt';
      }
      break;

    case 'RIGHT':
      if (detectedPose === 'RIGHT') {
        accuracy = Math.round(Math.min(100, 75 + (yawMetric - YAW_THRESHOLD) * 100));
        guidanceText = 'Right pose matched! Hold steady... ✅';
      } else if (detectedPose === 'LEFT') {
        accuracy = 5;
        guidanceText = '❌ Wrong direction! Turn head to the Right 👉';
      } else {
        accuracy = Math.round(Math.max(15, (yawMetric / YAW_THRESHOLD) * 60));
        guidanceText = 'Turn your head to the Right 👉';
      }
      break;

    case 'LEFT':
      if (detectedPose === 'LEFT') {
        accuracy = Math.round(Math.min(100, 75 + (Math.abs(yawMetric) - YAW_THRESHOLD) * 100));
        guidanceText = 'Left pose matched! Hold steady... ✅';
      } else if (detectedPose === 'RIGHT') {
        accuracy = 5;
        guidanceText = '❌ Wrong direction! Turn head to the Left 👈';
      } else {
        accuracy = Math.round(Math.max(15, (Math.abs(yawMetric) / YAW_THRESHOLD) * 60));
        guidanceText = 'Turn your head to the Left 👈';
      }
      break;

    case 'UP':
      if (detectedPose === 'UP') {
        accuracy = Math.round(Math.min(100, 80 + (PITCH_UP_THRESHOLD - noseFraction) * 150));
        guidanceText = 'Tilt up matched! Hold steady... ✅';
      } else if (detectedPose === 'DOWN') {
        accuracy = 5;
        guidanceText = '❌ Do not tilt down! Lift head Up 👆';
      } else {
        accuracy = Math.round(Math.max(15, ((0.43 - noseFraction) / 0.1) * 60));
        guidanceText = 'Tilt your head slightly Up 👆';
      }
      break;

    case 'DOWN':
      if (detectedPose === 'DOWN') {
        accuracy = Math.round(Math.min(100, 80 + (noseFraction - PITCH_DOWN_THRESHOLD) * 150));
        guidanceText = 'Tilt down matched! Hold steady... ✅';
      } else if (detectedPose === 'UP') {
        accuracy = 5;
        guidanceText = '❌ Do not look up! Tilt head Down 👇';
      } else {
        accuracy = Math.round(Math.max(15, ((noseFraction - 0.43) / 0.1) * 60));
        guidanceText = 'Tilt your gaze naturally Down 👇';
      }
      break;
  }

  return {
    currentPose: detectedPose,
    isMatch,
    yawMetric,
    noseFraction,
    guidanceText,
    poseAccuracyPercent: Math.max(0, Math.min(100, accuracy))
  };
}
