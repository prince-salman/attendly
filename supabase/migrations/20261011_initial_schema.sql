-- ====================================================================
-- SKEMA DATABASE SUPABASE: SISTEM PRESENSI WAJAH WALK-THROUGH SEKOLAH
-- Project: fruurxbfolykyylzktns
-- ====================================================================

-- 1. TABEL SISWA TERDAFTAR (STUDENTS)
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  gender TEXT DEFAULT 'L',
  parent_name TEXT,
  parent_phone TEXT,
  photo_url TEXT,
  face_descriptors JSONB NOT NULL, -- Array 128-D multi-angle vectors [[...], [...]]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL LOG KEHADIRAN GERBANG (ATTENDANCE_LOGS)
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  class TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  date_string TEXT NOT NULL, -- Format: YYYY-MM-DD
  time_string TEXT NOT NULL, -- Format: HH:mm:ss
  status TEXT NOT NULL,      -- 'Hadir Tepat Waktu' | 'Terlambat'
  gate_name TEXT DEFAULT 'Terminal Gerbang Tablet',
  confidence TEXT DEFAULT '98.5',
  speed TEXT DEFAULT '1.4 m/s',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INDEX UNTUK QUERY PERFORMA TINGGI
CREATE INDEX IF NOT EXISTS idx_attendance_date_student 
  ON public.attendance_logs(date_string, student_id);

CREATE INDEX IF NOT EXISTS idx_attendance_date 
  ON public.attendance_logs(date_string);

CREATE INDEX IF NOT EXISTS idx_students_class 
  ON public.students(class);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Izinkan akses baca dan tulis untuk anon client terminal sekolah
DROP POLICY IF EXISTS "Public full access to students" ON public.students;
CREATE POLICY "Public full access to students" 
  ON public.students 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access to attendance_logs" ON public.attendance_logs;
CREATE POLICY "Public full access to attendance_logs" 
  ON public.attendance_logs 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
