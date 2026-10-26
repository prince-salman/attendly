/**
 * Client helper to communicate with the Attendly Python Face Recognition Backend.
 * Backend uses InsightFace SCRFD + MobileFaceNet ArcFace for passive walk-by recognition.
 */

import { Student } from '../types';

export const PYTHON_BACKEND_URL = 'http://127.0.0.1:8000';
export const PYTHON_WS_URL = 'ws://127.0.0.1:8000/ws/detect';

export interface PythonHealthResponse {
  status: string;
  engine: string;
  model_ready: boolean;
  enrolled_count: number;
  walk_by_optimized: boolean;
}

export interface FacialCoverage {
  top: boolean;      // Bagian Atas / Dahi
  bottom: boolean;   // Bagian Bawah / Dagu
  left: boolean;     // Samping Kiri (Profile)
  right: boolean;    // Samping Kanan (Profile)
  coverage_pct: number;
  summary?: string;
}

export interface PythonDetectedFace {
  trackId: string;
  box: {
    x: number; // 0-100%
    y: number; // 0-100%
    w: number; // 0-100%
    h: number; // 0-100%
  };
  pxBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  det_score: number;
  matched: boolean;
  studentId: string | null;
  studentName: string | null;
  studentNickname: string | null;
  studentClass: string | null;
  similarity: number;
  confidence: string;
  pose?: {
    yaw: number;
    pitch: number;
    roll?: number;
    pose_label: string;
    is_angled: boolean;
    angle_tag: string;
    active_part?: 'left' | 'right' | 'top' | 'bottom' | 'front';
  };
  angle?: string;
  landmarks?: Record<string, [number, number]>; // Normalized percentage [x, y] coordinates
  coverage?: FacialCoverage;
}

export interface PythonDetectionMessage {
  ts: number;
  faces: PythonDetectedFace[];
  fps: number;
  proc_ms: number;
  enrolled_count: number;
}

/**
 * Checks if the Python FastAPI backend is running and healthy.
 */
export async function checkPythonBackendHealth(): Promise<PythonHealthResponse | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${PYTHON_BACKEND_URL}/health`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Enrolls a student face into the Python ArcFace engine using a Base64 image snapshot.
 */
export async function enrollStudentInPython(
  student: Student,
  imageBase64: string
): Promise<{ success: boolean; error?: string; embedding_count?: number }> {
  try {
    const res = await fetch(`${PYTHON_BACKEND_URL}/enroll-base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        student_id: student.id,
        student_name: student.name,
        student_class: student.class,
        nickname: student.nickname || student.name.split(' ')[0],
        gender: student.gender || 'L',
        parent_name: student.parentName || '',
        parent_phone: student.parentPhone || '',
        image_base64: imageBase64,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.detail || 'Enrollment failed' };
    }

    const data = await res.json();
    return { success: true, embedding_count: data.embedding_count };
  } catch (err: any) {
    return { success: false, error: err.message || 'Cannot connect to Python backend' };
  }
}

/**
 * Deletes a student from Python backend.
 */
export async function deleteStudentFromPython(studentId: string): Promise<boolean> {
  try {
    const res = await fetch(`${PYTHON_BACKEND_URL}/students/${encodeURIComponent(studentId)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Clears all enrolled students from Python backend.
 */
export async function clearAllStudentsInPython(): Promise<boolean> {
  try {
    const res = await fetch(`${PYTHON_BACKEND_URL}/students`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Bulk sync local students to Python ArcFace backend.
 */
export async function syncAllStudentsToPython(students: Student[]): Promise<{ synced_count: number; total_enrolled: number }> {
  try {
    const items = students
      .filter(s => s.photoUrl && (s.photoUrl.startsWith('data:image') || s.photoUrl.startsWith('http')))
      .map(s => ({
        id: s.id,
        name: s.name,
        class_name: s.class,
        nickname: s.nickname || s.name.split(' ')[0],
        gender: s.gender || 'L',
        parent_name: s.parentName || '',
        parent_phone: s.parentPhone || '',
        photo_base64: s.photoUrl
      }));

    if (items.length === 0) return { synced_count: 0, total_enrolled: 0 };

    const res = await fetch(`${PYTHON_BACKEND_URL}/sync-students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items)
    });
    if (!res.ok) return { synced_count: 0, total_enrolled: 0 };
    return await res.json();
  } catch {
    return { synced_count: 0, total_enrolled: 0 };
  }
}

/**
 * Fetches all enrolled students metadata from the Python ArcFace backend.
 */
export async function fetchStudentsFromPython(): Promise<Student[]> {
  try {
    const res = await fetch(`${PYTHON_BACKEND_URL}/students`);
    if (!res.ok) return [];
    const list = await res.json();
    if (!Array.isArray(list)) return [];

    return list.map((item: any) => ({
      id: item.id,
      name: item.name || 'Student',
      nickname: item.nickname || (item.name ? item.name.split(' ')[0] : 'Student'),
      class: item.class || '10-IPA-1',
      gender: (item.gender === 'P' ? 'P' : 'L') as 'L' | 'P',
      photoUrl: item.photoUrl || '',
      parentName: item.parentName || 'Parent / Guardian',
      parentPhone: item.parentPhone || '',
      enrolledAt: item.enrolledAt || new Date().toLocaleDateString('id-ID'),
      consentCertified: true,
      faceDescriptors: [],
      lastSeen: 'Python ArcFace Registered'
    }));
  } catch (e) {
    console.warn('Could not fetch students from Python backend:', e);
    return [];
  }
}

