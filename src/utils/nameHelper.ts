/**
 * Smart Name & Call-Name Extractor for School Face Attendance
 * Menghilangkan gelar dan awalan islami/formal seperti "Muhammad", "Ahmad", "Siti", dll.
 * agar sistem menyapa siswa dengan nama panggilan ramah (contoh: "Salman" alih-alih "Muhammad").
 */

const HONORIFIC_PREFIXES = new Set([
  'muhammad',
  'muhamad',
  'mohammad',
  'mohamad',
  'mochammad',
  'mochamad',
  'moch',
  'muh',
  'md',
  'm',
  'ahmad',
  'achmad',
  'ahmd',
  'siti',
  'nur',
  'raden',
  'tubagus',
  'igusti',
  'idabagus'
]);

/**
 * Mendapatkan nama panggilan siswa secara cerdas.
 * 1. Jika ada nickname eksplisit yang diberikan, gunakan itu.
 * 2. Jika nama diawali "Muhammad", "Muhamad", "Ahmad", "Siti", dll, ambil kata kedua ("Salman").
 * 3. Jika tidak, gunakan kata pertama ("Budi").
 */
export function getStudentCallName(
  fullName?: string | null,
  customNickname?: string | null
): string {
  if (customNickname && customNickname.trim().length > 0) {
    return customNickname.trim();
  }

  if (!fullName) return 'Siswa';

  const clean = fullName.trim();
  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) {
    return tokens[0] || 'Siswa';
  }

  const firstTokenNorm = tokens[0].toLowerCase().replace(/[^a-z]/g, '');

  // Jika kata pertama adalah prefix umum seperti "Muhammad", lewati dan gunakan kata kedua
  if (HONORIFIC_PREFIXES.has(firstTokenNorm) && tokens.length > 1) {
    return tokens[1];
  }

  return tokens[0];
}
