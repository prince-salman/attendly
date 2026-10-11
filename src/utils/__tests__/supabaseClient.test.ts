import { describe, it, expect } from 'vitest';
import {
  isAlreadyAttendedToday,
  formatAttendanceDate,
  formatAttendanceTime,
  evaluateAttendancePunctuality
} from '../supabaseClient';
import { AttendanceLog } from '../../types';

describe('supabaseClient attendance rules and deduplication', () => {
  it('formats dates and times consistently for daily checks', () => {
    const testDate = new Date('2026-10-11T06:45:00+07:00');
    const dateStr = formatAttendanceDate(testDate);
    expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dateStr).toBe('2026-10-11');
  });

  it('determines punctuality based on cutoff time (07:00 WIB)', () => {
    const onTimeDate = new Date('2026-10-11T06:50:00');
    expect(evaluateAttendancePunctuality(onTimeDate, '07:00')).toBe('Hadir Tepat Waktu');

    const exactCutoff = new Date('2026-10-11T07:00:00');
    expect(evaluateAttendancePunctuality(exactCutoff, '07:00')).toBe('Hadir Tepat Waktu');

    const lateDate = new Date('2026-10-11T07:05:00');
    expect(evaluateAttendancePunctuality(lateDate, '07:00')).toBe('Terlambat');
  });

  it('accurately identifies whether student already attended today (1x per day protection)', () => {
    const logs: AttendanceLog[] = [
      {
        id: 'LOG-1',
        studentId: 'NIS-001',
        studentName: 'Budi',
        class: '10-IPA-1',
        timestamp: '11/10/2026, 06:45:00',
        dateString: '2026-10-11',
        timeString: '06:45:00',
        method: 'Walk-Through Biometric',
        confidence: '98.5',
        qualityScore: '0.96',
        processingNode: 'Edge-Gate',
        storageStatus: 'Cloud Synced',
        status: 'Hadir Tepat Waktu',
        speed: '1.3 m/s'
      }
    ];

    // Same student, same date -> should return TRUE (already attended)
    expect(isAlreadyAttendedToday('NIS-001', '2026-10-11', logs)).toBe(true);

    // Different student, same date -> should return FALSE
    expect(isAlreadyAttendedToday('NIS-002', '2026-10-11', logs)).toBe(false);

    // Same student, different date -> should return FALSE
    expect(isAlreadyAttendedToday('NIS-001', '2026-10-12', logs)).toBe(false);
  });
});
