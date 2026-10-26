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

  // Fallback ke single descriptor jika ada dan belum ada di array
  if (vectors.length === 0 && Array.isArray(student.faceDescriptor) && student.faceDescriptor.length === 128) {
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
 * Toleransi Euclidean sangat ketat (default 0.38) untuk mencegah wajah orang lain dianggap sebagai siswa terdaftar!
 */
export function matchDescriptorAgainstStudents(
  candidateVec: number[],
  students: Student[],
  maxEuclideanDistance = 0.40
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
    // 0.0 dist -> 99.6%, 0.40 dist -> 88.0%
    const confidencePct = Math.max(88, Math.min(99.6, 100 - (bestDistance / maxEuclideanDistance) * 12)).toFixed(1);
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
    confidence: bestDistance < 1 ? (Math.max(10, Math.min(75, 100 - bestDistance * 90))).toFixed(1) : '0.0',
    distance: bestDistance
  };
}

let trackCounter = 1;

/**
 * Pembaruan Kontinu Multi-Wajah Melintasi Frame Kamera dengan Konsensus Multi-Frame
 * - Mencegah false positive dengan verifikasi konsensus minimal 3 frame berturut-turut.
 * - Memverifikasi ulang track secara kontinu; jika orang berganti, verifikasi seketika dicabut.
 */
export function updateTracksWithDetections(
  prevTracks: Map<string, ActiveTrack>,
  detections: DetectionInput[],
  students: Student[],
  now = Date.now(),
  maxMissingFrames = 5,
  strictThreshold = 0.42
): Map<string, ActiveTrack> {
  const updatedTracks = new Map<string, ActiveTrack>();
  const unmatchedDetections: DetectionInput[] = [];
  const assignedTrackIds = new Set<string>();

  // 1. Asosiasikan setiap deteksi baru dengan track terdekat (IoU >= 0.18 atau Centroid <= 12%)
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

    // Jika IoU rendah karena gerakan langkah cepat, gunakan centroid dengan radius ketat (12%)
    if (!bestTrackId) {
      let lowestCentroidDist = 12.0; // Maksimal perpindahan 12% ukuran frame (mencegah salah kait ke orang lain)
      for (const [tId, track] of prevTracks.entries()) {
        if (assignedTrackIds.has(tId)) continue;
        if (track.missingFrames > 1) continue; // Jangan kaitkan ke track yang sudah hilang

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

      // Evaluasi biometrik kontinu & verifikasi multi-frame konsensus
      if (det.descriptor && det.descriptor.length === 128) {
        const matchResult = matchDescriptorAgainstStudents(det.descriptor, students, strictThreshold);

        // A. Jika track sudah terverifikasi sebelumnya, pastikan wajah saat ini MASIH orang yang sama!
        if (trackUpdate.isVerified && trackUpdate.studentId) {
          const currentStudent = students.find(s => s.id === trackUpdate.studentId);
          if (currentStudent) {
            const distToCurrent = computeMinEuclideanDistance(det.descriptor, currentStudent);
            // Jika jarak wajah melebihi 0.44, berarti orang berbeda telah masuk ke kotak ini.
            // Cabut status verifikasi seketika!
            if (distToCurrent > 0.44) {
              trackUpdate.isVerified = false;
              trackUpdate.studentId = null;
              trackUpdate.studentName = null;
              trackUpdate.studentClass = null;
              trackUpdate.isAnonymous = true;
              trackUpdate.matchStreak = 0;
              trackUpdate.candidateStudentId = null;
            }
          }
        }

        // B. Evaluasi verifikasi dengan syarat konsensus minimal 3 frame konsisten berturut-turut
        if (!trackUpdate.isVerified) {
          if (matchResult.isMatch && matchResult.student) {
            if (trackUpdate.candidateStudentId === matchResult.student.id) {
              trackUpdate.matchStreak = (trackUpdate.matchStreak || 0) + 1;
            } else {
              trackUpdate.candidateStudentId = matchResult.student.id;
              trackUpdate.matchStreak = 1;
            }

            // HANYA jika konsisten 3 frame berturut-turut, tandai sebagai terverifikasi!
            if ((trackUpdate.matchStreak || 0) >= 3) {
              trackUpdate.isVerified = true;
              trackUpdate.isAnonymous = false;
              trackUpdate.studentId = matchResult.student.id;
              trackUpdate.studentName = matchResult.student.name;
              trackUpdate.studentNickname = matchResult.student.nickname || null;
              trackUpdate.studentClass = matchResult.student.class;
              trackUpdate.confidence = matchResult.confidence;
            } else {
              trackUpdate.isAnonymous = true;
              trackUpdate.confidence = matchResult.confidence;
            }
          } else {
            // Wajah bukan siswa terdaftar (stranger / unregistered)
            trackUpdate.matchStreak = 0;
            trackUpdate.candidateStudentId = null;
            trackUpdate.isAnonymous = true;
            trackUpdate.confidence = matchResult.confidence;
          }
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
    let isAnonymous = true;
    let studentId: string | null = null;
    let studentName: string | null = null;
    let studentNickname: string | null = null;
    let studentClass: string | null = null;
    let confidence = '0.0';
    let matchStreak = 0;
    let candidateStudentId: string | null = null;

    if (det.descriptor && det.descriptor.length === 128) {
      const matchResult = matchDescriptorAgainstStudents(det.descriptor, students, strictThreshold);
      if (matchResult.isMatch && matchResult.student) {
        // Frame pertama: tandai kandidat, belum langsung diverifikasi sampai ada frame berikutnya
        candidateStudentId = matchResult.student.id;
        studentNickname = matchResult.student.nickname || null;
        matchStreak = 1;
        confidence = matchResult.confidence;
      } else {
        confidence = matchResult.confidence;
      }
    }

    const newTrack: ActiveTrack = {
      id: newTrackId,
      box: det.box,
      lastSeen: now,
      studentId,
      studentName,
      studentNickname,
      studentClass,
      isVerified,
      isAnonymous,
      confidence,
      framesMatched: 1,
      missingFrames: 0,
      matchStreak,
      candidateStudentId
    };

    updatedTracks.set(newTrackId, newTrack);
  }

  // 3. Pertahankan track yang hilang sementara (frame dropping tolerance hingga maxMissingFrames)
  for (const [tId, track] of prevTracks.entries()) {
    if (!assignedTrackIds.has(tId)) {
      const missingCount = track.missingFrames + 1;
      const ageMs = now - track.lastSeen;

      // Maksimal hilang 3 frame (~100ms) dan umur maksimal 400ms agar tidak tersangkut ke orang lain
      if (missingCount <= maxMissingFrames && ageMs <= 400) {
        updatedTracks.set(tId, {
          ...track,
          missingFrames: missingCount
        });
      }
    }
  }

  return updatedTracks;
}
