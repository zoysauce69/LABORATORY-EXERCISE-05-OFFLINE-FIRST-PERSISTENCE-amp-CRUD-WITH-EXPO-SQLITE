import {
  formatAppointment,
  formatCompactNumber,
  formatDistance,
  formatPeso,
  humaniseToken,
  initialsOf,
  maskPhone,
  parsePesoInput,
  pluralUnitSummary,
  pluralise,
} from '@/utils/format';

describe('formatPeso', () => {
  it('renders whole pesos without decimals', () => {
    expect(formatPeso(4500)).toBe('₱4,500');
    expect(formatPeso(0)).toBe('₱0');
  });

  it('renders two decimals when the amount is fractional', () => {
    expect(formatPeso(4500.5)).toBe('₱4,500.50');
  });

  it('returns an em dash for missing values instead of zero', () => {
    // Zero pesos and unknown rent must never look the same.
    expect(formatPeso(null)).toBe('—');
    expect(formatPeso(undefined)).toBe('—');
    expect(formatPeso(Number.NaN)).toBe('—');
  });
});

describe('parsePesoInput', () => {
  it('strips formatting characters typed by the user', () => {
    expect(parsePesoInput('₱4,500')).toBe(4500);
    expect(parsePesoInput(' 4500 ')).toBe(4500);
  });

  it('returns null for an empty field', () => {
    expect(parsePesoInput('')).toBeNull();
    expect(parsePesoInput('abc')).toBeNull();
  });
});

describe('formatCompactNumber', () => {
  it('keeps small numbers readable', () => {
    expect(formatCompactNumber(0)).toBe('0');
    expect(formatCompactNumber(999)).toBe('999');
  });

  it('shortens thousands and millions', () => {
    expect(formatCompactNumber(1500)).toBe('1.5k');
    expect(formatCompactNumber(2000)).toBe('2k');
    expect(formatCompactNumber(2_400_000)).toBe('2.4M');
  });
});

describe('formatDistance', () => {
  it('uses metres below one kilometre', () => {
    expect(formatDistance(0.32)).toBe('320 m');
  });

  it('uses one decimal below ten kilometres', () => {
    expect(formatDistance(7.34)).toBe('7.3 km');
  });

  it('rounds above ten kilometres', () => {
    expect(formatDistance(24.6)).toBe('25 km');
  });

  it('does not invent a distance', () => {
    expect(formatDistance(null)).toBe('—');
    expect(formatDistance(Number.NaN)).toBe('—');
  });
});

describe('formatAppointment', () => {
  it('combines a Postgres date and time', () => {
    expect(formatAppointment('2026-03-12', '15:30:00')).toContain('3:30 PM');
    expect(formatAppointment('2026-03-12', '15:30:00')).toContain('12 Mar 2026');
  });

  it('handles midnight and noon correctly', () => {
    expect(formatAppointment('2026-03-12', '00:00:00')).toContain('12:00 AM');
    expect(formatAppointment('2026-03-12', '12:00:00')).toContain('12:00 PM');
  });

  it('returns an em dash when the date is missing', () => {
    expect(formatAppointment(null, '15:30:00')).toBe('—');
  });
});

describe('humaniseToken', () => {
  it('turns a slug into a readable label', () => {
    expect(humaniseToken('boarding_house')).toBe('Boarding house');
    expect(humaniseToken('non_smoker')).toBe('Non smoker');
  });
});

describe('maskPhone', () => {
  it('keeps only the prefix and last two digits', () => {
    const masked = maskPhone('09171234567');
    expect(masked).toContain('0917');
    expect(masked).toContain('67');
    expect(masked).not.toContain('2345');
  });

  it('leaves values that are too short alone', () => {
    expect(maskPhone('123')).toBe('123');
    expect(maskPhone(null)).toBe('—');
  });
});

describe('initialsOf', () => {
  it('uses at most two letters', () => {
    expect(initialsOf('Juan dela Cruz Santos')).toBe('JD');
    expect(initialsOf('Maria')).toBe('M');
  });

  it('falls back for missing or blank names', () => {
    expect(initialsOf(null)).toBe('?');
    expect(initialsOf('   ')).toBe('?');
  });
});

describe('pluralise', () => {
  it('handles the singular and plural cases', () => {
    expect(pluralise(1, 'unit')).toBe('unit');
    expect(pluralise(0, 'unit')).toBe('units');
    expect(pluralise(2, 'property', 'properties')).toBe('properties');
  });
});

describe('pluralUnitSummary', () => {
  it('never reports a negative number of free units', () => {
    expect(pluralUnitSummary(4, 6)).toBe('Fully occupied');
  });

  it('counts available units correctly', () => {
    expect(pluralUnitSummary(4, 2)).toBe('2 of 4 units available');
    expect(pluralUnitSummary(1, 0)).toBe('1 of 1 unit available');
  });
});