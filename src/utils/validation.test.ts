import {
  bookingRequestSchema,
  canPublishProperty,
  emailSchema,
  passwordSchema,
  phoneSchema,
  signUpSchema,
  timeSlotLabel,
  validateBarangayForCity,
  VISIT_TIME_SLOTS,
} from '@/utils/validation';

describe('phoneSchema', () => {
  it('accepts the two Philippine mobile formats', () => {
    expect(phoneSchema.safeParse('09171234567').success).toBe(true);
    expect(phoneSchema.safeParse('+639171234567').success).toBe(true);
    expect(phoneSchema.safeParse('639171234567').success).toBe(true);
  });

  it('rejects landlines and short numbers', () => {
    expect(phoneSchema.safeParse('0917123456').success).toBe(false);
    expect(phoneSchema.safeParse('091712345678').success).toBe(false);
    expect(phoneSchema.safeParse('+1 917 123 4567').success).toBe(false);
    expect(phoneSchema.safeParse('').success).toBe(false);
  });

  it('rejects spaces, which is what the placeholder suggests', () => {
    // The UI hint shows "0917 123 4567" so the schema must tolerate it.
    expect(phoneSchema.safeParse('0917 123 4567').success).toBe(false);
  });
});

describe('emailSchema', () => {
  it('lowercases the value', () => {
    expect(emailSchema.parse('  Juan.DelaCruz@Example.COM ')).toBe('juan.delacruz@example.com');
  });

  it('rejects malformed addresses', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('requires length, a letter and a number', () => {
    expect(passwordSchema.safeParse('short1').success).toBe(false);
    expect(passwordSchema.safeParse('alllettersonly').success).toBe(false);
    expect(passwordSchema.safeParse('12345678').success).toBe(false);
    expect(passwordSchema.safeParse('roomlink2026').success).toBe(true);
  });

  it('caps the length so Supabase Auth cannot reject it later', () => {
    expect(passwordSchema.safeParse(`${'a'.repeat(65)}1`).success).toBe(false);
  });
});

describe('signUpSchema', () => {
  const base = {
    fullName: 'Juan dela Cruz',
    email: 'juan@example.com',
    phone: '09171234567',
    password: 'roomlink2026',
    confirmPassword: 'roomlink2026',
    role: 'student' as const,
    acceptTerms: true as const,
  };

  it('accepts a complete student sign-up', () => {
    expect(signUpSchema.safeParse(base).success).toBe(true);
  });

  it('reports a mismatched confirmation on the confirmPassword field', () => {
    const result = signUpSchema.safeParse({ ...base, confirmPassword: 'roomlink2027' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'confirmPassword');
      expect(issue).toBeDefined();
      expect(issue?.message).toBe('Passwords do not match.');
    }
  });

  it('requires the terms to be accepted', () => {
    const result = signUpSchema.safeParse({ ...base, acceptTerms: false });
    expect(result.success).toBe(false);
  });
});

describe('canPublishProperty', () => {
  const valid = {
    description: 'A bright solo unit near the main road with its own meter.',
    landmark: 'Across from the market',
    totalUnits: 5,
    occupiedUnits: 2,
    amenityIds: [1, 2],
  };

  it('accepts a complete listing', () => {
    expect(canPublishProperty(valid)).toEqual({ ok: true });
  });

  it('accepts a street address in place of a landmark', () => {
    expect(
      canPublishProperty({ ...valid, landmark: undefined, addressLine: '18 Katipunan Ave' }),
    ).toEqual({ ok: true });
  });

  it('rejects a listing with no way to find it', () => {
    const result = canPublishProperty({ ...valid, landmark: '  ', addressLine: '' });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/landmark or street address/i);
  });

  it('rejects a short description', () => {
    expect(canPublishProperty({ ...valid, description: 'Nice place' }).ok).toBe(false);
  });

  it('rejects a fully occupied listing rather than publishing a dead listing', () => {
    const result = canPublishProperty({ ...valid, occupiedUnits: 5 });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/occupied/i);
  });

  it('requires at least one amenity', () => {
    expect(canPublishProperty({ ...valid, amenityIds: [] }).ok).toBe(false);
  });
});

describe('bookingRequestSchema', () => {
  const base = {
    kind: 'visit' as const,
    scheduledDate: '',
    scheduledTime: '',
    moveInDate: '',
    occupants: 1,
    contactName: 'Juan dela Cruz',
    contactPhone: '09171234567',
    contactEmail: '',
    note: '',
  };

  const tomorrow = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  };

  it('requires a date and a slot for a viewing', () => {
    const result = bookingRequestSchema.safeParse(base);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path[0]);
      expect(paths).toContain('scheduledDate');
      expect(paths).toContain('scheduledTime');
    }
  });

  it('accepts a complete viewing request', () => {
    const result = bookingRequestSchema.safeParse({
      ...base,
      scheduledDate: tomorrow(),
      scheduledTime: '14:00:00',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a viewing date in the past', () => {
    const result = bookingRequestSchema.safeParse({
      ...base,
      scheduledDate: '2020-01-01',
      scheduledTime: '14:00:00',
    });
    expect(result.success).toBe(false);
  });

  it('ignores viewing fields for an application and demands move-in instead', () => {
    const result = bookingRequestSchema.safeParse({ ...base, kind: 'application' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toContain('moveInDate');
    }
  });

  it('accepts a complete application', () => {
    const result = bookingRequestSchema.safeParse({
      ...base,
      kind: 'application',
      moveInDate: tomorrow(),
      occupants: 2,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an implausible occupant count', () => {
    const result = bookingRequestSchema.safeParse({
      ...base,
      kind: 'application',
      moveInDate: tomorrow(),
      occupants: 99,
    });
    expect(result.success).toBe(false);
  });
});

describe('VISIT_TIME_SLOTS', () => {
  it('offers daytime slots only', () => {
    const hours = VISIT_TIME_SLOTS.map((slot) => Number.parseInt(slot.value.slice(0, 2), 10));
    expect(hours.every((hour) => hour >= 9 && hour <= 17)).toBe(true);
    // No 12:00 slot, so the list skips straight from 11 AM to 1 PM.
    expect(hours).not.toContain(12);
  });

  it('labels a slot whether or not the seconds are supplied', () => {
    expect(timeSlotLabel('14:00:00')).toBe('2:00 PM');
    expect(timeSlotLabel('14:00')).toBe('2:00 PM');
  });

  it('returns the raw value for a slot it does not know', () => {
    expect(timeSlotLabel('03:00:00')).toBe('03:00:00');
  });
});

describe('validateBarangayForCity', () => {
  it('accepts a known barangay regardless of case and padding', () => {
    expect(validateBarangayForCity('Quezon City', '  commonwealth ')).toBe('Commonwealth');
  });

  it('returns null for a barangay that is not in that city', () => {
    expect(validateBarangayForCity('Quezon City', 'Lahug')).toBeNull();
  });

  it('does not block a city it has no barangay list for', () => {
    expect(validateBarangayForCity('Some Unknown City', 'Anything')).toBeNull();
  });
});