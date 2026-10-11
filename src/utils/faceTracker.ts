/**
 * Engine Pelacakan Multi-Wajah dan Pencocokan Biometrik Multi-Sudut (Walk-Through)
 * Dirancang untuk mendeteksi dan melacak wajah siswa yang berjalan santai tanpa henti.
 */

import { Student, ActiveTrack } from '../types';

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DetectionInput {
  box: BoundingBox;
  descriptor?: number[] | null;
  confidence?: number;
}

export interface BiometricMatchResult {
  isMatch: boolean;
  student: Student | null;
  confidence: string;
  distance: number;
}

/**
 * Menghitung Intersection over Union (IoU) antara dua bounding box
 */
export function computeIoU(boxA: BoundingBox, boxB: BoundingBox): number {
  const x1 = Math.max(boxA.x, boxB.x);
  const y1 = Math.max(boxA.y, boxB.y);
  const x2 = Math.min(boxA.x + boxA.w, boxB.x + boxB.w);
  const y2 = Math.min(boxA.y + boxA.h, boxB.y + boxB.h);

  const intersectionW = Math.max(0, x2 - x1);
  const intersectionH = Math.max(0, y2 - y1);
  const intersectionArea = intersectionW * intersectionH;

  const areaA = boxA.w * boxA.h;
  const areaB = boxB.w * boxB.h;
  const unionArea = areaA + areaB - intersectionArea;

  if (unionArea <= 0) return 0;
  return intersectionArea / unionArea;
}

/**
 * Menghitung jarak Euclidean antar titik tengah (Centroid) dua kotak
 */
export function computeCentroidDistance(boxA: BoundingBox, boxB: BoundingBox): number {
  const cxA = boxA.x + boxA.w / 2;
  const cyA = boxA.y + boxA.h / 2;
  const cxB = boxB.x + boxB.w / 2;
  const cyB = boxB.y + boxB.h / 2;

  const dx = cxA - cxB;
  const dy = cyA - cyB;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Menghitung Jarak Euclidean standar antara dua vektor 128-D
 */
export function computeEuclideanDistance(vecA?: number[] | null, vecB?: number[] | null): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 1.0;
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Menghitung jarak minimum Euclidean terhadap seluruh sampel sudut wajah siswa
 * (Frontal, Serong Kiri, Serong Kanan, Tunduk)
 */
export function computeMinEuclideanDistance(candidateVec: number[], student: Student): number {
  if (!candidateVec || candidateVec.length !== 128) return 1.0;

  // Kumpulkan seluruh vektor referensi yang dimiliki siswa
  const vectors: number[][] = [];
  if (Array.isArray(student.faceDescriptors) && student.faceDescriptors.length > 0) {
    for (const v of student.faceDescriptors) {
      if (Array.isArray(v) && v.length === 128) vectors.push(v);
    }
  }

  // Fallback ke single descriptor jika ada
  if (Array.isArray(student.faceDescriptor) && student.faceDescriptor.length === 128) {
    vectors.push(student.faceDescriptor);
  }

  if (vectors.length === 0) return 1.0;

  let minDistance = Infinity;
  for (const refVec of vectors) {
    const dist = computeEuclideanDistance(candidateVec, refVec);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return minDistance === Infinity ? 1.0 : minDistance;
}

/**
 * Mencocokkan vektor wajah langsung (live candidate) terhadap seluruh siswa terdaftar
 * Toleransi Euclidean ketat (default 0.46) untuk walk-through tanpa false positive
 */
export function matchDescriptorAgainstStudents(
  candidateVec: number[],
  students: Student[],
  maxEuclideanDistance = 0.46
): BiometricMatchResult {
  if (!candidateVec || candidateVec.length !== 128 || students.length === 0) {
    return { isMatch: false, student: null, confidence: '0.0', distance: 1.0 };
  }

  let bestStudent: Student | null = null;
  let bestDistance = Infinity;

  for (const student of students) {
    const dist = computeMinEuclideanDistance(candidateVec, student);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestStudent = student;
    }
  }

  if (bestStudent && bestDistance <= maxEuclideanDistance) {
    // Konversi jarak euclidean ke confidence persentase (0.0 dist -> 100%, 0.46 dist -> ~88%)
    const confidencePct = Math.max(85, Math.min(99.4, 100 - bestDistance * 26)).toFixed(1);
    return {
      isMatch: true,
      student: bestStudent,
      confidence: confidencePct,
      distance: bestDistance
    };
  }

  return {
    isMatch: false,
    student: null,
    confidence: bestDistance < 1 ? (Math.max(10, 100 - bestDistance * 70)).toFixed(1) : '0.0',
    distance: bestDistance
  };
}

let trackCounter = 1;

/**
 * Pembaruan Kontinu Multi-Wajah Melintasi Frame Kamera
 * Menghubungkan deteksi frame baru dengan track ID yang sedang aktif.
 */
export function updateTracksWithDetections(
  prevTracks: Map<string, ActiveTrack>,
  detections: DetectionInput[],
  students: Student[],
  now = Date.now(),
  maxMissingFrames = 5
): Map<string, ActiveTrack> {
  const updatedTracks = new Map<string, ActiveTrack>();
  const unmatchedDetections: DetectionInput[] = [];
  const assignedTrackIds = new Set<string>();

  // 1. Asosiasikan setiap deteksi baru dengan track terdekat (IoU >= 0.20 atau Centroid <= 22%)
  for (const det of detections) {
    let bestTrackId: string | null = null;
    let highestIoU = 0.18; // Ambang batas IoU minimum

    for (const [tId, track] of prevTracks.entries()) {
      if (assignedTrackIds.has(tId)) continue;

      const iou = computeIoU(det.box, track.box);
      if (iou > highestIoU) {
        highestIoU = iou;
        bestTrackId = tId;
      }
    }

    // Jika IoU rendah karena gerakan langkah cepat, coba pencocokan jarak Centroid
    if (!bestTrackId) {
      let lowestCentroidDist = 22.0; // Maksimal perpindahan 22% ukuran frame
      for (const [tId, track] of prevTracks.entries()) {
        if (assignedTrackIds.has(tId)) continue;

        const cDist = computeCentroidDistance(det.box, track.box);
        if (cDist < lowestCentroidDist) {
          lowestCentroidDist = cDist;
          bestTrackId = tId;
        }
      }
    }

    if (bestTrackId) {
      assignedTrackIds.add(bestTrackId);
      const existing = prevTracks.get(bestTrackId)!;

      // Update posisi kotak secara halus (lerp/smoothing)
      const smoothedBox = {
        x: Math.round(existing.box.x * 0.35 + det.box.x * 0.65),
        y: Math.round(existing.box.y * 0.35 + det.box.y * 0.65),
        w: Math.round(existing.box.w * 0.35 + det.box.w * 0.65),
        h: Math.round(existing.box.h * 0.35 + det.box.h * 0.65)
      };

      const trackUpdate: ActiveTrack = {
        ...existing,
        box: smoothedBox,
        lastSeen: now,
        missingFrames: 0,
        framesMatched: existing.framesMatched + 1
      };

      // Jika belum terverifikasi dan ada vektor biometrik baru, coba cocokkan
      if (!trackUpdate.isVerified && det.descriptor && det.descriptor.length === 128) {
        const matchResult = matchDescriptorAgainstStudents(det.descriptor, students, 0.46);
        if (matchResult.isMatch && matchResult.student) {
          trackUpdate.isVerified = true;
          trackUpdate.isAnonymous = false;
          trackUpdate.studentId = matchResult.student.id;
          trackUpdate.studentName = matchResult.student.name;
          trackUpdate.studentClass = matchResult.student.class;
          trackUpdate.confidence = matchResult.confidence;
        } else {
          trackUpdate.isAnonymous = true;
          trackUpdate.confidence = matchResult.confidence;
        }
      }

      updatedTracks.set(bestTrackId, trackUpdate);
    } else {
      unmatchedDetections.push(det);
    }
  }

  // 2. Buat Track ID baru untuk deteksi wajah yang belum terasosiasi
  for (const det of unmatchedDetections) {
    const newTrackId = `TRK-${String(trackCounter++).padStart(2, '0')}`;
    if (trackCounter > 9999) trackCounter = 1;

    let isVerified = false;
    let isAnonymous = false;
    let studentId: string | null = null;
    let studentName: string | null = null;
    let studentClass: string | null = null;
    let confidence = '0.0';

    if (det.descriptor && det.descriptor.length === 128) {
      const matchResult = matchDescriptorAgainstStudents(det.descriptor, students, 0.46);
      if (matchResult.isMatch && matchResult.student) {
        isVerified = true;
        studentId = matchResult.student.id;
        studentName = matchResult.student.name;
        studentClass = matchResult.student.class;
        confidence = matchResult.confidence;
      } else {
        isAnonymous = true;
        confidence = matchResult.confidence;
      }
    }

    const newTrack: ActiveTrack = {
      id: newTrackId,
      box: det.box,
      lastSeen: now,
      studentId,
      studentName,
      studentClass,
      isVerified,
      isAnonymous,
      confidence,
      framesMatched: 1,
      missingFrames: 0
    };

    updatedTracks.set(newTrackId, newTrack);
  }

  // 3. Pertahankan track yang hilang sementara (frame dropping tolerance hingga maxMissingFrames)
  for (const [tId, track] of prevTracks.entries()) {
    if (!assignedTrackIds.has(tId)) {
      const missingCount = track.missingFrames + 1;
      const ageMs = now - track.lastSeen;

      if (missingCount <= maxMissingFrames && ageMs <= 1800) {
        updatedTracks.set(tId, {
          ...track,
          missingFrames: missingCount
        });
      }
    }
  }

  return updatedTracks;
}
