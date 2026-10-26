import { describe, it, expect } from 'vitest';
import {
  computeIoU,
  computeCentroidDistance,
  computeMinEuclideanDistance,
  matchDescriptorAgainstStudents,
  updateTracksWithDetections
} from '../faceTracker';
import { Student } from '../../types';

describe('faceTracker & multi-vector biometric math', () => {
  it('computes IoU correctly for overlapping and non-overlapping boxes', () => {
    const boxA = { x: 10, y: 10, w: 20, h: 20 };
    const boxB = { x: 10, y: 10, w: 20, h: 20 };
    expect(computeIoU(boxA, boxB)).toBeCloseTo(1.0, 2);

    const boxC = { x: 50, y: 50, w: 20, h: 20 };
    expect(computeIoU(boxA, boxC)).toBe(0);

    const boxD = { x: 20, y: 10, w: 20, h: 20 }; // 50% overlap along X
    const iou = computeIoU(boxA, boxD);
    expect(iou).toBeGreaterThan(0.2);
    expect(iou).toBeLessThan(0.5);
  });

  it('computes centroid distance between two boxes', () => {
    const boxA = { x: 0, y: 0, w: 10, h: 10 }; // center at 5, 5
    const boxB = { x: 3, y: 4, w: 10, h: 10 }; // center at 8, 9 -> dx=3, dy=4
    expect(computeCentroidDistance(boxA, boxB)).toBeCloseTo(5.0, 2);
  });

  it('finds minimum Euclidean distance across multi-angle descriptors', () => {
    const vecFrontal = new Array(128).fill(0.1);
    const vecLeft = new Array(128).fill(0.2);
    const vecRight = new Array(128).fill(0.3);

    const student: Student = {
      id: 'NIS-001',
      name: 'Budi Santoso',
      class: '10-IPA-1',
      gender: 'L',
      parentName: 'Ayah Budi',
      parentPhone: '08123456789',
      enrolledAt: '10:00',
      consentCertified: true,
      faceDescriptors: [vecFrontal, vecLeft, vecRight]
    };

    // Candidate walking with head slightly turned to left (matches vecLeft closely)
    const candidateLeftAngle = new Array(128).fill(0.21);
    const minDistance = computeMinEuclideanDistance(candidateLeftAngle, student);

    // Euclidean distance between 0.20 and 0.21 across 128 dimensions is sqrt(128 * 0.01^2) = sqrt(0.0128) ≈ 0.113
    expect(minDistance).toBeLessThan(0.2);
  });

  it('correctly distinguishes verified student vs anonymous stranger', () => {
    const studentVec1 = new Array(128).fill(0.1);
    const studentVec2 = new Array(128).fill(0.15);

    const student: Student = {
      id: 'NIS-001',
      name: 'Ahmad Dahlan',
      class: '10-IPA-1',
      gender: 'L',
      parentName: 'Ayah Ahmad',
      parentPhone: '08123456789',
      enrolledAt: '10:00',
      consentCertified: true,
      faceDescriptors: [studentVec1, studentVec2]
    };

    const enrolledStudents = [student];

    // Case 1: Live candidate is student walking past (distance < 0.46)
    const candidateStudent = new Array(128).fill(0.11);
    const match = matchDescriptorAgainstStudents(candidateStudent, enrolledStudents, 0.46);
    expect(match.isMatch).toBe(true);
    expect(match.student?.name).toBe('Ahmad Dahlan');

    // Case 2: Live candidate is anonymous stranger (distance > 0.46)
    const candidateStranger = new Array(128).fill(0.5);
    const strangerMatch = matchDescriptorAgainstStudents(candidateStranger, enrolledStudents, 0.46);
    expect(strangerMatch.isMatch).toBe(false);
    expect(strangerMatch.student).toBeNull();
  });

  it('updates tracks continuously across frames and purges missing tracks', () => {
    const studentVec = new Array(128).fill(0.1);
    const student: Student = {
      id: 'NIS-001',
      name: 'Ahmad Dahlan',
      class: '10-IPA-1',
      gender: 'L',
      parentName: 'Ayah Ahmad',
      parentPhone: '08123456789',
      enrolledAt: '10:00',
      consentCertified: true,
      faceDescriptors: [studentVec]
    };

    let tracks = new Map();
    const now = Date.now();

    // Frame 1: Detection at x=30, y=30 (Streak 1, waiting for consensus)
    const descriptor = new Array(128).fill(0.11);
    tracks = updateTracksWithDetections(tracks, [{ box: { x: 30, y: 30, w: 20, h: 30 }, descriptor }], [student], now);
    expect(tracks.size).toBe(1);
    expect(Array.from(tracks.values())[0].isVerified).toBe(false); // Frame 1: prevents single-frame false matches

    // Frame 2: Same person at x=31, y=30 (Streak 2)
    tracks = updateTracksWithDetections(tracks, [{ box: { x: 31, y: 30, w: 20, h: 30 }, descriptor }], [student], now + 33);
    expect(Array.from(tracks.values())[0].isVerified).toBe(false);

    // Frame 3: Confirmed consensus (Streak 3) -> Verified!
    tracks = updateTracksWithDetections(tracks, [{ box: { x: 32, y: 30, w: 20, h: 30 }, descriptor }], [student], now + 66);
    expect(Array.from(tracks.values())[0].isVerified).toBe(true);
    expect(Array.from(tracks.values())[0].studentName).toBe('Ahmad Dahlan');

    // Frame 4: Person walked out of camera (empty frames)
    for (let i = 0; i < 7; i++) {
      tracks = updateTracksWithDetections(tracks, [], [student], now + 100 + i * 50);
    }
    // Track should be cleanly purged after missing frames threshold
    expect(tracks.size).toBe(0);
  });

  it('instantly revokes verification if a different person steps into the track', () => {
    const studentVec = new Array(128).fill(0.1);
    const student: Student = {
      id: 'NIS-001',
      name: 'Ahmad Dahlan',
      class: '10-IPA-1',
      gender: 'L',
      parentName: 'Ayah Ahmad',
      parentPhone: '08123456789',
      enrolledAt: '10:00',
      consentCertified: true,
      faceDescriptors: [studentVec]
    };

    let tracks = new Map();
    const now = Date.now();

    // 3 frames of true student to verify
    for (let i = 0; i < 3; i++) {
      tracks = updateTracksWithDetections(
        tracks,
        [{ box: { x: 30, y: 30, w: 20, h: 30 }, descriptor: new Array(128).fill(0.11) }],
        [student],
        now + i * 33
      );
    }
    expect(Array.from(tracks.values())[0].isVerified).toBe(true);
    expect(Array.from(tracks.values())[0].studentName).toBe('Ahmad Dahlan');

    // Stranger steps into the exact same track box with distance > 0.44
    const strangerDescriptor = new Array(128).fill(0.8);
    tracks = updateTracksWithDetections(
      tracks,
      [{ box: { x: 30, y: 30, w: 20, h: 30 }, descriptor: strangerDescriptor }],
      [student],
      now + 100
    );

    // Verification must be REVOKED immediately!
    const track = Array.from(tracks.values())[0];
    expect(track.isVerified).toBe(false);
    expect(track.studentId).toBeNull();
    expect(track.studentName).toBeNull();
    expect(track.isAnonymous).toBe(true);
  });
});
