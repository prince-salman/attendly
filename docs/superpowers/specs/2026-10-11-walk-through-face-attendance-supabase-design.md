# Spesifikasi Desain: Sistem Presensi Wajah Walk-Through Mandiri Sekolah (Supabase Integrated)

- **Tanggal Dokumen:** 2026-10-11
- **Status:** Approved Architecture Design
- **Target Project:** `school-face-privacy-dashboard` (Vite + React + TypeScript + Tailwind CSS)
- **Supabase Project:** `https://fruurxbfolykyylzktns.supabase.co`

---

## 1. Latar Belakang & Masalah
Sistem presensi wajah konvensional mengharuskan siswa berhenti di depan kamera dan menatap lurus lensa satu per satu. Pada jam sibuk masuk sekolah (06:30 - 07:00), antrean panjang tidak dapat dihindari.
Sistem ini dirancang untuk:
1. **Walk-Through Recognition:** Mengenali wajah siswa saat berjalan santai melintasi gerbang tanpa harus berhenti atau menatap tepat ke arah kamera.
2. **Perangkat Terminal Fleksibel:** Berjalan mulus di browser smartphone/tablet yang difungsikan sebagai terminal gerbang, dengan saklar kamera depan/belakang (*front/rear camera*).
3. **Murni Operasional (Zero Demo / Mock):** Menghilangkan seluruh tombol simulasi dummy (*Simulasi Siswa*, *Simulasi Orang Asing*, dummy purges) agar langsung siap dipakai secara nyata di sekolah.
4. **Anonim untuk Wajah Tidak Terdaftar:** Jika wajah yang melintas belum terdaftar di database, sistem melacaknya dengan kotak kuning/abu dan label *"Anonim / Belum Terdaftar"* tanpa menyimpan data apa pun ke database/log.
5. **Sensor Siaga (Zero Ghost Bounding Boxes):** Jika tidak ada orang di depan kamera (hanya lantai/dinding/pintu), sensor tetap siaga tanpa memunculkan kotak palsu.
6. **Cloud Database Supabase + Offline-First:** Terkoneksi ke PostgreSQL Supabase untuk sinkronisasi terpusat, dengan penyimpanan lokal IndexedDB agar terminal tetap bekerja optimal saat koneksi internet terputus.
7. **Proteksi 1x Absen Masuk per Hari:** Siswa hanya dicatat masuk satu kali dalam satu hari. Jika melintas lagi di hari yang sama, sistem menyapa namanya dengan ramah tanpa menduplikasi data absensi.

---

## 2. Arsitektur Sistem

```
+---------------------------------------------------------------------------------+
|                          SMARTPHONE / TABLET BROWSER                            |
|                                                                                 |
|   +-----------------------+           +-------------------------------------+   |
|   |   Kamera Tablet/HP    |           |   Terminal Gerbang (Kiosk View)     |   |
|   | (User/Environment 720p| --------> | - Realtime Canvas Bounding Box      |   |
|   +-----------------------+           | - Status Palang (Ready/Open/Pass)   |   |
|               |                       | - Chime & Sapaan Audio Web Speech   |   |
|               v                       +-------------------------------------+   |
|   +-----------------------+                              ^                      |
|   |  Multi-Face Detection |                              |                      |
|   |  (TinyFaceDetector)   |                              |                      |
|   +-----------------------+                              |                      |
|               |                                          |                      |
|               v                                          |                      |
|   +------------------------------------------------------+                      |
|   |  Centroid / IoU Multi-Face Tracker                                          |
|   |  - Memberikan Track ID (TRK-01, TRK-02, ...)                                |
|   |  - Melacak gerak wajah berjalan antar-frame kontinu                         |
|   +-----------------------------------------------------------------------------+
|               |                                                                 
|               v                                                                 
|   +------------------------------------------------------+                      
|   |  Ekstraksi 128-D Biometrik & Multi-Vector Matcher    |                      
|   |  - Nearest-Neighbor Euclidean Distance (< 0.46)      |                      
|   |  - Uji ke 3-5 vektor sudut siswa (Depan, Kiri, Kanan)|                      
|   +------------------------------------------------------+                      
|         |                                        |                              
|         | [Match Siswa Terdaftar]                | [Wajah Anonim]               
|         v                                        v                              
|   +--------------------------+             +--------------------------+         
|   | Kunci Status: VERIFIED   |             | Status: ANONIM           |         
|   | Kotak Hijau + Nama + NIS |             | Kotak Kuning / Netral    |         
|   | Cek 1x Absen Hari Ini:   |             | ABAIKAN (NOL DISK WRITE) |         
|   | - Belum: Simpan Absensi  |             +--------------------------+         
|   | - Sudah: Sapa tanpa catat|                                                  
|   +--------------------------+                                                  
|               |                                                                 
|               +-----------------------+                                         
|                                       v                                         
|                         +---------------------------+                           
|                         | Dual-Layer Storage Engine |                           
|                         | - IndexedDB (Local cache) |                           
|                         | - Supabase Client (Cloud) |                           
|                         +---------------------------+                           
|                                       |                                         
+---------------------------------------|-----------------------------------------+
                                        | (HTTPS / WSS)
                                        v
                    +---------------------------------------+
                    |           SUPABASE CLOUD              |
                    | Project: fruurxbfolykyylzktns         |
                    | - Table: students                     |
                    | - Table: attendance_logs              |
                    +---------------------------------------+
```

---

## 3. Detail Komponen & Desain Teknis

### 3.1. Engine Pelacakan Multi-Wajah Saat Berjalan (`faceTracker.ts`)
- **Deteksi:** `faceapi.detectAllFaces(video, options)` dengan input size 224px.
- **Tracker:** 
  - Struktur data: `ActiveTrack { id: string, box: Box, lastSeen: number, studentId?: string, isVerified: boolean, name?: string, class?: string }`.
  - Menggunakan perhitungan Euclidean Centroid & IoU (*Intersection over Union*) untuk mencocokkan kotak wajah antar-frame.
  - Toleransi frame hilang: 5 frame (menghindari kotak berkedip jika terjadi sedikit *motion blur* saat melangkah).
- **Inference Throttling:**
  - Hanya menjalankan `withFaceLandmarks().withFaceDescriptor()` pada track yang belum terverifikasi dan ukuran kotak > 60px.
  - Setelah track terverifikasi sebagai Siswa X, track tersebut dikunci sehingga CPU/GPU tablet tidak perlu melakukan ekstraksi ulang di setiap frame.

### 3.2. Perekaman Multi-Sudut (`FaceEnrollmentStation.tsx`)
- Form data: Nama, NIS, Kelas, Nama Orang Tua, Nomor WhatsApp.
- Mode perekaman otomatis 3–4 detik:
  1. Wajah Menghadap Lurus (Frontal)
  2. Wajah Serong Kiri (~20°)
  3. Wajah Serong Kanan (~20°)
  4. Wajah Sedikit Tunduk (~10°)
- Hasil ekstraksi: `faceDescriptors: number[][]` (array 3–4 vektor biometrik).
- Foto thumbnail disimpan untuk identitas kartu siswa.
- Sinkronisasi otomatis ke tabel `students` di Supabase.

### 3.3. Logika Presensi & Proteksi Duplikasi
- **Status Kehadiran:**
  - Jam cutoff default: 07:00 WIB (dapat diubah di konfigurasi).
  - Waktu <= cutoff: `Hadir Tepat Waktu`
  - Waktu > cutoff: `Terlambat`
- **Aturan 1x Absen Masuk:**
  - Kunci unik: `student_id + date_string` (misal `NIS-10291_2026-10-11`).
  - Jika belum ada di log hari ini:
    - Rekam log absensi baru ke IndexedDB dan Supabase `attendance_logs`.
    - Mainkan audio chime konfirmasi.
    - Ucapkan suara sambutan: *"Selamat pagi [Nama], silakan masuk"*.
    - Buka gerbang/palang virtual (*OPENING* -> *PASSING* -> *READY*).
  - Jika sudah absen masuk hari ini:
    - Mainkan chime ramah dan ucapkan suara *"Halo [Nama], kamu sudah absen hari ini"*.
    - Tidak membuat entri absensi baru ke database.

### 3.4. Integrasi Supabase Cloud (`supabaseClient.ts`)
- URL: `https://fruurxbfolykyylzktns.supabase.co`
- Publishable/Anon Key terkonfigurasi.
- **Skema SQL:**
```sql
-- Tabel Siswa Terdaftar
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  gender TEXT DEFAULT 'L',
  parent_name TEXT,
  parent_phone TEXT,
  photo_url TEXT,
  face_descriptors JSONB NOT NULL, -- Array of 128-D vectors
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Log Kehadiran Gerbang
CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  class TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  date_string TEXT NOT NULL, -- Format: YYYY-MM-DD
  time_string TEXT NOT NULL, -- Format: HH:mm:ss
  status TEXT NOT NULL,      -- 'Hadir Tepat Waktu' | 'Terlambat'
  gate_name TEXT DEFAULT 'Gerbang Utama'
);

-- Index untuk pencarian cepat absensi harian
CREATE INDEX IF NOT EXISTS idx_attendance_date_student ON attendance_logs(date_string, student_id);
```
- **Sinkronisasi Otomatis:** Saat pertama kali dimuat, aplikasi mengambil data siswa dari Supabase. Setiap absensi baru langsung di-`insert` ke Supabase secara asinkron.

### 3.5. Pembersihan UI Demo
- Hapus seluruh tombol tiruan:
  - ❌ *Simulasikan Siswa Terdaftar Masuk*
  - ❌ *Simulasikan Orang Asing (Akses Ditolak)*
  - ❌ *Simulasi Keterlambatan*
  - ❌ Random Purge Timer & slider demo
- Ganti dengan kontrol operasional riil:
  - ✅ Saklar Kamera (Depan / Belakang)
  - ✅ Saklar Suara Bel / Speech Greeting
  - ✅ Indikator Status Koneksi Supabase (Online / Syncing / Offline)
  - ✅ Tombol Fullscreen Terminal Mode (Kiosk)

---

## 4. Penanganan Kasus Khusus (Edge Cases)
1. **Orang Asing / Siswa Belum Terdaftar Melintas:**
   - Wajah terdeteksi kotak kuning dengan teks *"Anonim / Belum Terdaftar"*.
   - Tidak ada aksi database, tidak ada pengiriman WA, gerbang tidak terbuka.
2. **Kamera Ditutup / Ruangan Kosong:**
   - Deteksi 0 wajah. Status tetap "Siaga". Bebas false positive.
3. **Koneksi Internet Putus:**
   - Sistem beralih ke IndexedDB offline.
   - Absensi tetap tersimpan lokal dan akan di-push otomatis saat internet kembali tersambung.
4. **Cahaya Redup atau Siswa Bergerak Cepat:**
   - Algoritma IoU mempertahankan kotak pelacakan hingga 5 frame saat wajah berpaling sejenak.

---

## 5. Rencana Pengujian
1. **Unit & Biometric Math:** Validasi kalkulasi jarak Euclidean multi-vektor (< 0.46) dan fungsi IoU tracker.
2. **Enrollment Test:** Perekaman 3 sudut wajah siswa uji (Depan, Kiri, Kanan) dan verifikasi tersimpannya multi-vektor di Supabase/IndexedDB.
3. **Walk-Through Test:** Melangkah di depan kamera tablet dari jarak 2 meter tanpa menatap lensa, memastikan kotak melacak mulus, mengenali identitas, dan memicu sapaan suara.
4. **Anti-Duplikasi Test:** Berjalan melewati kamera untuk kedua kalinya dalam hari yang sama dan memastikan absensi tidak dobel.
5. **Stranger / Anonim Test:** Orang tanpa registrasi melangkah melewati kamera dan memastikan diberi label "Anonim" tanpa masuk ke log presensi.
6. **Supabase Cloud Sync Test:** Verifikasi data langsung muncul di tabel `students` dan `attendance_logs` Supabase.
