# Walk-Through Face Recognition Attendance System (Supabase Integrated) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 100% production-ready, fully automatic walk-through face recognition attendance web application for school gates on smartphone/tablet browsers, integrated with Supabase PostgreSQL, featuring multi-face IoU tracking, multi-angle biometric enrollment, zero demo/mock buttons, and strict 1x daily attendance deduplication.

**Architecture:** 
1. Real-time multi-face detection via `@vladmandic/face-api` (TinyFaceDetector) running at ~20 FPS.
2. Centroid & IoU Multi-Face Tracker maintaining persistent `Track ID`s across frames for walking students.
3. Multi-vector biometrics: Students store 3–4 descriptors (Front, Left yaw, Right yaw, Down pitch); matching uses minimum Euclidean distance (< 0.46).
4. Dual-layer storage: Supabase PostgreSQL (`students` & `attendance_logs`) as primary cloud database with offline IndexedDB/local cache.
5. Production Terminal UI: Dynamic bounding boxes (Green + Name for registered students, Yellow + "Anonim" for strangers with zero disk write, zero ghost boxes for empty frames), Front/Rear camera switcher, and Web Speech API vocal greeting.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS v4, `@vladmandic/face-api`, `@supabase/supabase-js`, Vitest.

**Spec:** [`docs/superpowers/specs/2026-10-11-walk-through-face-attendance-supabase-design.md`](file:///C:/Users/Salman/.gemini/antigravity/scratch/school-face-privacy-dashboard/docs/superpowers/specs/2026-10-11-walk-through-face-attendance-supabase-design.md)

## Global Constraints
- Target directory: `C:\Users\Salman\.gemini\antigravity\scratch\school-face-privacy-dashboard`
- Supabase Project URL: `https://fruurxbfolykyylzktns.supabase.co`
- Supabase Anon Key: `sb_publishable_Fl4iW8EVOWjzyhjhXcKZxA_Nm1gJFcS`
- Zero demo/simulation buttons: No fake walk-by triggers, no fake stranger buttons, no random dummy purges.
- Anonymous policy: Unregistered faces are tracked with yellow bounding boxes and labeled "Anonim / Belum Terdaftar", and NEVER written to logs or database.
- 1x daily attendance: Students are logged once per calendar date; subsequent walks on the same day trigger a greeting without duplicate attendance rows.

---

### Task 1: Setup Dependencies & Core Biometric Multi-Vector Tracking Engine

**Files:**
- Modify: `package.json`
- Modify: `src/types/index.ts`
- Create: `src/utils/faceTracker.ts`
- Modify: `src/utils/faceBiometrics.ts`
- Create: `src/utils/__tests__/faceTracker.test.ts`

**Interfaces:**
- `ActiveTrack`: `{ id: string; box: { x: number; y: number; w: number; h: number }; lastSeen: number; studentId: string | null; studentName: string | null; studentClass: string | null; isVerified: boolean; isAnonymous: boolean; confidence: string; framesMatched: number }`
- `updateTracksWithDetections(prevTracks: Map<string, ActiveTrack>, detections: DetectedBox[], students: Student[], now: number): Map<string, ActiveTrack>`
- `computeMinEuclideanDistance(candidateVec: number[], studentVectors: number[][]): number`

- [ ] **Step 1: Install `@supabase/supabase-js` and `vitest`**

Run: `npm install @supabase/supabase-js; npm install -D vitest`

- [ ] **Step 2: Update types in `src/types/index.ts`**

Update `Student` interface to support multi-vector array `faceDescriptors?: number[][]` alongside single `faceDescriptor?: number[]`. Add `ActiveTrack` and `SupabaseConfig` types.

- [ ] **Step 3: Write test for Multi-Vector Matcher & IoU Tracker**

Create `src/utils/__tests__/faceTracker.test.ts` testing IoU calculation, centroid matching, minimum Euclidean distance across multi-angle descriptors, and verified vs anonymous state transition.

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/faceTracker.test.ts`
Expected: FAIL (modules not implemented yet)

- [ ] **Step 5: Implement `src/utils/faceTracker.ts` & update `src/utils/faceBiometrics.ts`**

Implement `computeIoU`, `calculateCentroidDistance`, `computeMinEuclideanDistance`, and `updateTracksWithDetections` with 5-frame missing tolerance and 0.46 Euclidean threshold.

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/faceTracker.test.ts`
Expected: PASS

- [ ] **Step 7: Commit Task 1**

```bash
git add package.json package-lock.json src/types/index.ts src/utils/faceTracker.ts src/utils/faceBiometrics.ts src/utils/__tests__/faceTracker.test.ts
git commit -m "feat: add multi-vector biometric matching and IoU multi-face tracker"
```

---

### Task 2: Supabase Client Integration & PostgreSQL Schema

**Files:**
- Create: `supabase/migrations/20261011_initial_schema.sql`
- Create: `src/utils/supabaseClient.ts`
- Modify: `src/context/AppContext.tsx`
- Create: `src/utils/__tests__/supabaseClient.test.ts`

**Interfaces:**
- `supabaseClient`: Initialized client with `https://fruurxbfolykyylzktns.supabase.co` and key
- `fetchStudentsFromSupabase(): Promise<Student[]>`
- `saveStudentToSupabase(student: Student): Promise<boolean>`
- `deleteStudentFromSupabase(studentId: string): Promise<boolean>`
- `insertAttendanceToSupabase(log: AttendanceLog): Promise<boolean>`
- `isAlreadyAttendedToday(studentId: string, dateString: string): boolean`

- [ ] **Step 1: Create Supabase SQL schema**

Write `supabase/migrations/20261011_initial_schema.sql` defining `students` and `attendance_logs` tables with appropriate indexes and RLS policies.

- [ ] **Step 2: Write test for Supabase service methods & attendance deduplication**

Write unit test verifying `isAlreadyAttendedToday` and data serialization/deserialization.

- [ ] **Step 3: Implement `src/utils/supabaseClient.ts`**

Implement safe Supabase integration with offline fallback: if network is down or API fails, fallback seamlessly to local storage without throwing unhandled exceptions.

- [ ] **Step 4: Update `src/context/AppContext.tsx`**

Integrate Supabase auto-sync on mount: load students from Supabase (falling back to IndexedDB/local cache), persist new students and attendance logs to both Supabase and local cache, and enforce 1x daily attendance rule.

- [ ] **Step 5: Run tests**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit Task 2**

```bash
git add supabase/migrations/20261011_initial_schema.sql src/utils/supabaseClient.ts src/context/AppContext.tsx src/utils/__tests__/supabaseClient.test.ts
git commit -m "feat: integrate Supabase client and dual-layer offline sync"
```

---

### Task 3: Multi-Angle Face Enrollment Station

**Files:**
- Modify: `src/components/FaceEnrollmentStation.tsx`

**Interfaces:**
- Auto-capture flow: 4-stage visual guide (Frontal -> Left ~20° -> Right ~20° -> Down ~10°)
- Stores `faceDescriptors: number[][]` (4 vectors) in student record
- Saves to Supabase `students` table and local state
- Student roster: list with photo, class, NIS, enrollment date, and delete/re-enroll actions

- [ ] **Step 1: Implement Multi-Angle Auto Capture sequence**

Replace single-shot snapshot with automated 4-angle sequential vector extraction. Include visual countdown/prompt for each pose ("Lihat Lurus", "Serong Sedikit ke Kiri", "Serong Sedikit ke Kanan", "Sedikit Menunduk").

- [ ] **Step 2: Connect enrollment save directly to Supabase & local state**

Ensure student profile and all 4 vectors are sent to `saveStudentToSupabase` and appended to local `students` array.

- [ ] **Step 3: Add responsive roster view & camera switcher**

Include camera flip button (Front / Rear) and searchable roster with instant delete/re-capture capabilities.

- [ ] **Step 4: Verify TypeScript & build integrity**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit Task 3**

```bash
git add src/components/FaceEnrollmentStation.tsx
git commit -m "feat: implement multi-angle auto capture enrollment station"
```

---

### Task 4: Production Walk-Through Scanner Terminal (100% Automated, Zero Demo)

**Files:**
- Modify: `src/components/WalkThroughScanner.tsx`

**Interfaces:**
- Continuous multi-face detection loop using `faceapi.detectAllFaces` + `updateTracksWithDetections`
- Real-time HTML5 Canvas overlay rendering bounding boxes over live video:
  - Green box + student name + NIS for verified student
  - Amber/Yellow box + "Anonim / Belum Terdaftar" for stranger (never logged)
  - Zero bounding boxes on empty room / wall (pure standby)
- Audio feedback: Chime + SpeechSynthesis vocal greeting
- Turnstile gate status indicator: `READY` -> `OPENING` -> `PASSING` -> `READY`
- Camera switch toggle: front camera vs rear camera for mobile/tablet

- [ ] **Step 1: Remove all simulation buttons and mock controls**

Completely delete `handleSimulateEnrolledStudent`, `handleSimulateStranger`, simulation cards, and dummy test buttons.

- [ ] **Step 2: Implement continuous multi-face Canvas overlay loop**

Render dynamic bounding boxes synchronized with `videoRef` dimensions. Draw green rounded corners for verified students and amber for anonymous faces.

- [ ] **Step 3: Implement real-time walk-through attendance execution**

When an `ActiveTrack` transitions to `isVerified`:
1. Check `isAlreadyAttendedToday(student.id, todayDate)`.
2. If NOT attended: insert log into Supabase & local state, play chime, vocalize *"Selamat pagi [Nama], silakan masuk"*, trigger gate opening.
3. If ALREADY attended: vocalize *"Halo [Nama], kamu sudah absen hari ini"* without writing duplicate log.

- [ ] **Step 4: Add front/rear camera switcher for smartphones/tablets**

Provide clean toggle button (`facingMode: 'user' | 'environment'`) with instant stream re-initialization.

- [ ] **Step 5: Verify build & TypeScript**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit Task 4**

```bash
git add src/components/WalkThroughScanner.tsx
git commit -m "feat: complete automated walk-through scanner terminal without demo controls"
```

---

### Task 5: Operational Attendance Recap & Excel/CSV Export

**Files:**
- Modify: `src/components/AttendanceLogView.tsx`

**Interfaces:**
- Real-time table displaying attendance records from Supabase and local cache
- Filters: Date selector, Class selector, Status filter (All / Tepat Waktu / Terlambat)
- Summary metrics: Total Hadir Hari Ini, Tepat Waktu, Terlambat, Persentase Kehadiran
- 1-Click Export to CSV and Excel-compatible format

- [ ] **Step 1: Connect table directly to real attendance logs**

Remove any remaining mock references and bind table directly to live `attendanceLogs` from `AppContext`.

- [ ] **Step 2: Implement CSV / Excel export function**

Generate clean spreadsheet download with columns: No, Tanggal, Jam Masuk, NIS, Nama Siswa, Kelas, Status, Terminal.

- [ ] **Step 3: Verify TypeScript & build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit Task 5**

```bash
git add src/components/AttendanceLogView.tsx
git commit -m "feat: update attendance log view with real data and Excel export"
```

---

### Task 6: Clean Navigation & Supabase Cloud Status Indicator

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/data/mockData.ts` (wipe out any old mock artifacts)

**Interfaces:**
- Clean professional header: BioPass School Gate Terminal
- Cloud Connection Status pill: Green "Supabase Cloud Connected" / Amber "Local Offline Mode"
- Clean navigation tabs: Terminal Gerbang, Perekaman Wajah, Rekap Absensi, Pengaturan Cloud

- [ ] **Step 1: Clean `App.tsx` header and layout**

Remove all demo terminology and add Supabase connectivity indicator and quick terminal mode.

- [ ] **Step 2: Clean `mockData.ts`**

Ensure `INITIAL_STUDENTS` and `INITIAL_ATTENDANCE_LOGS` are clean empty arrays so the system starts with zero fake data.

- [ ] **Step 3: Commit Task 6**

```bash
git add src/App.tsx src/data/mockData.ts
git commit -m "refactor: clean layout and surface Supabase cloud connectivity status"
```

---

### Task 7: Full System Verification & Production Build

- [ ] **Step 1: Run all test suites**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Clean build in `dist/` without errors or missing imports

- [ ] **Step 3: Verify live Vite server on port 5173**

Confirm the web app runs cleanly and all terminal views render properly.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "chore: complete production-ready walk-through face attendance web system"
```
