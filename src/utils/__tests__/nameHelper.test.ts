import { describe, it, expect } from 'vitest';
import { getStudentCallName } from '../nameHelper';

describe('nameHelper - getStudentCallName', () => {
  it('extracts call name ignoring Muhammad / Muhamad prefix', () => {
    expect(getStudentCallName('Muhammad Salman')).toBe('Salman');
    expect(getStudentCallName('Muhamad Salman')).toBe('Salman');
    expect(getStudentCallName('Mohammad Salman Al-Farisi')).toBe('Salman');
    expect(getStudentCallName('M. Salman')).toBe('Salman');
    expect(getStudentCallName('Muh. Salman')).toBe('Salman');
  });

  it('extracts call name ignoring Ahmad, Siti, Raden prefixes', () => {
    expect(getStudentCallName('Ahmad Dahlan')).toBe('Dahlan');
    expect(getStudentCallName('Achmad Fauzi')).toBe('Fauzi');
    expect(getStudentCallName('Siti Aisyah')).toBe('Aisyah');
    expect(getStudentCallName('Raden Mas Danang')).toBe('Mas');
  });

  it('uses first name for regular names without prefixes', () => {
    expect(getStudentCallName('Budi Santoso')).toBe('Budi');
    expect(getStudentCallName('Joko Widodo')).toBe('Joko');
    expect(getStudentCallName('Salman')).toBe('Salman');
  });

  it('prioritizes explicit custom nickname if provided', () => {
    expect(getStudentCallName('Muhammad Salman', 'Salman')).toBe('Salman');
    expect(getStudentCallName('Muhammad Salman', 'Man')).toBe('Man');
    expect(getStudentCallName('Budi Santoso', 'Bud')).toBe('Bud');
  });

  it('handles edge cases gracefully', () => {
    expect(getStudentCallName('')).toBe('Siswa');
    expect(getStudentCallName(null)).toBe('Siswa');
    expect(getStudentCallName('   ')).toBe('Siswa');
  });
});
