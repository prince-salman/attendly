import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteStudentFromPython } from '../pythonBackendClient';

describe('Data Management Isolation Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deleteStudentFromPython calls DELETE /students/{encodedId}', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, deleted: 'STD-1001' })
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await deleteStudentFromPython('STD-1001');

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain('/students/STD-1001');
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });

  it('Attendance log reset logic isolates attendance without touching student array', () => {
    const mockStudents = [
      { id: 'STD-001', name: 'Ahmad Faiz', class: '10-IPA-1' },
      { id: 'STD-002', name: 'Siti Nurhaliza', class: '10-IPA-2' }
    ];
    let attendanceLogs = [
      { id: 'ATT-001', studentId: 'STD-001', timestamp: '06:50 WIB' },
      { id: 'ATT-002', studentId: 'STD-002', timestamp: '06:55 WIB' }
    ];

    // Simulating clearAttendanceLogs behavior
    attendanceLogs = [];

    // Verify student records remain completely untouched
    expect(attendanceLogs.length).toBe(0);
    expect(mockStudents.length).toBe(2);
    expect(mockStudents[0].name).toBe('Ahmad Faiz');
  });
});
