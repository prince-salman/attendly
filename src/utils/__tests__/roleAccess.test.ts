import { describe, it, expect } from 'vitest';
import { PRESET_USERS, RoleType, UserProfile } from '../../types';

describe('Role-Based Access Control (RBAC)', () => {
  it('has all 3 required roles: admin, kepala_sekolah, and wali_kelas', () => {
    const roles = new Set(PRESET_USERS.map(u => u.role));
    expect(roles.has('admin')).toBe(true);
    expect(roles.has('kepala_sekolah')).toBe(true);
    expect(roles.has('wali_kelas')).toBe(true);
  });

  it('assigns specific classes to Wali Kelas profiles', () => {
    const waliUsers = PRESET_USERS.filter(u => u.role === 'wali_kelas');
    expect(waliUsers.length).toBeGreaterThan(0);
    waliUsers.forEach(u => {
      expect(u.assignedClass).toBeDefined();
      expect(typeof u.assignedClass).toBe('string');
      expect(u.assignedClass?.length).toBeGreaterThan(0);
    });
  });

  it('correctly grants permissions per role', () => {
    const checkCanAccessTab = (role: RoleType, tab: string) => {
      if (role === 'admin') return true;
      if (role === 'guru_bk') {
        return ['attendance', 'whatsapp'].includes(tab);
      }
      if (role === 'kepala_sekolah') {
        return ['scanner', 'attendance', 'whatsapp'].includes(tab);
      }
      if (role === 'pengawas') {
        return ['attendance'].includes(tab);
      }
      if (role === 'wali_kelas') {
        return ['attendance', 'whatsapp'].includes(tab);
      }
      return false;
    };

    // Admin has access to all tabs
    expect(checkCanAccessTab('admin', 'scanner')).toBe(true);
    expect(checkCanAccessTab('admin', 'enrollment')).toBe(true);
    expect(checkCanAccessTab('admin', 'attendance')).toBe(true);
    expect(checkCanAccessTab('admin', 'whatsapp')).toBe(true);

    // Guru BK has access to attendance and whatsapp, but not gate scanner or enrollment
    expect(checkCanAccessTab('guru_bk', 'scanner')).toBe(false);
    expect(checkCanAccessTab('guru_bk', 'enrollment')).toBe(false);
    expect(checkCanAccessTab('guru_bk', 'attendance')).toBe(true);
    expect(checkCanAccessTab('guru_bk', 'whatsapp')).toBe(true);

    // Kepala Sekolah has executive access (read scanner, attendance, whatsapp) but cannot enroll students
    expect(checkCanAccessTab('kepala_sekolah', 'scanner')).toBe(true);
    expect(checkCanAccessTab('kepala_sekolah', 'enrollment')).toBe(false);
    expect(checkCanAccessTab('kepala_sekolah', 'attendance')).toBe(true);
    expect(checkCanAccessTab('kepala_sekolah', 'whatsapp')).toBe(true);

    // Pengawas has audit access to attendance
    expect(checkCanAccessTab('pengawas', 'scanner')).toBe(false);
    expect(checkCanAccessTab('pengawas', 'enrollment')).toBe(false);
    expect(checkCanAccessTab('pengawas', 'attendance')).toBe(true);
    expect(checkCanAccessTab('pengawas', 'whatsapp')).toBe(false);

    // Wali Kelas has access only to attendance and whatsapp for their class
    expect(checkCanAccessTab('wali_kelas', 'scanner')).toBe(false);
    expect(checkCanAccessTab('wali_kelas', 'enrollment')).toBe(false);
    expect(checkCanAccessTab('wali_kelas', 'attendance')).toBe(true);
    expect(checkCanAccessTab('wali_kelas', 'whatsapp')).toBe(true);
  });
});
