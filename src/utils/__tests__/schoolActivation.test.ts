import { describe, it, expect } from 'vitest';
import { REGISTERED_SCHOOLS, generateActivationCode } from '../../data/mockData';
import { SchoolTenant } from '../../types';

describe('Multi-Tenant School & University Activation & License Architecture', () => {
  it('guarantees 1 unique activation code per institution', () => {
    const codes = REGISTERED_SCHOOLS.map(s => s.activationCode);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it('formats activation codes with standard ATND prefix and hyphen separators', () => {
    REGISTERED_SCHOOLS.forEach(school => {
      expect(school.activationCode).toMatch(/^ATND-[A-Z0-9]+-\d{4}-[A-Z0-9]{4}$/);
    });
  });

  it('contains complete institutional metadata, designated administrator, and valid logos', () => {
    REGISTERED_SCHOOLS.forEach(school => {
      expect(school.id).toBeTruthy();
      expect(school.name).toBeTruthy();
      expect(school.npsn).toMatch(/^\d{6,8}$/); // 6-digit Kode PT Dikti or 8-digit NPSN
      expect(school.adminName).toBeTruthy();
      expect(school.adminEmail).toContain('@');
      expect(school.adminPhone).toBeTruthy();
      expect(school.licenseStatus).toBe('ACTIVE');
      expect(school.maxStudents).toBeGreaterThan(0);
      expect(school.gateCorridors.length).toBeGreaterThan(0);

      // Verify custom logo exists
      expect(school.logoUrl).toBeDefined();
      expect(school.logoUrl?.length).toBeGreaterThan(10);
      expect(school.logoUrl).toMatch(/^(data:image\/|https?:\/\/|\/)/);
    });
  });

  it('supports both UNIVERSITAS and SEKOLAH institution types', () => {
    const types = new Set(REGISTERED_SCHOOLS.map(s => s.institutionType));
    expect(types.has('UNIVERSITAS')).toBe(true);
    expect(types.has('SEKOLAH')).toBe(true);

    const universities = REGISTERED_SCHOOLS.filter(s => s.institutionType === 'UNIVERSITAS');
    expect(universities.length).toBeGreaterThanOrEqual(2);
    universities.forEach(univ => {
      expect(univ.licenseType).toBe('ENTERPRISE_CAMPUS');
      expect(univ.maxStudents).toBeGreaterThanOrEqual(10000);
    });
  });

  it('generates distinct new activation codes using custom abbreviations', () => {
    const code1 = generateActivationCode('ITS');
    const code2 = generateActivationCode('ITS');
    const code3 = generateActivationCode('UGM');

    expect(code1).toMatch(/^ATND-ITS-\d{4}-[A-Z0-9]{4}$/);
    expect(code3).toMatch(/^ATND-UGM-\d{4}-[A-Z0-9]{4}$/);
    expect(code1).not.toBe(code2);
  });

  it('validates activation code case-insensitively and rejects invalid codes', () => {
    const testSchool = REGISTERED_SCHOOLS[0];
    const validateCode = (input: string, registry: SchoolTenant[]) => {
      const clean = input.trim().toUpperCase();
      return registry.find(s => s.activationCode.toUpperCase() === clean) || null;
    };

    // Valid lower-case entry
    const matchLower = validateCode(testSchool.activationCode.toLowerCase(), REGISTERED_SCHOOLS);
    expect(matchLower).not.toBeNull();
    expect(matchLower?.id).toBe(testSchool.id);

    // Valid with extra whitespace
    const matchSpaced = validateCode(`  ${testSchool.activationCode}  `, REGISTERED_SCHOOLS);
    expect(matchSpaced).not.toBeNull();
    expect(matchSpaced?.id).toBe(testSchool.id);

    // Invalid code
    const invalidMatch = validateCode('ATND-INVALID-0000-XXXX', REGISTERED_SCHOOLS);
    expect(invalidMatch).toBeNull();
  });
});
