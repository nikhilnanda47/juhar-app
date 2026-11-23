import { indiaDayBounds } from './india-day';

// India is UTC+5:30, so the India day starts at 18:30 UTC the evening before.
describe('indiaDayBounds', () => {
  it('starts the day at midnight India time (18:30 UTC the day before)', () => {
    const { start, end, date } = indiaDayBounds(new Date('2026-11-23T10:00:00Z')); // 3:30 pm in India
    expect(start.toISOString()).toBe('2026-11-22T18:30:00.000Z');
    expect(end.toISOString()).toBe('2026-11-23T18:30:00.000Z');
    expect(date).toBe('2026-11-23');
  });

  it('one second before India midnight is still the old day', () => {
    const b = indiaDayBounds(new Date('2026-11-23T18:29:59Z')); // 11:59:59 pm, 23 Nov
    expect(b.date).toBe('2026-11-23');
    expect(b.end.toISOString()).toBe('2026-11-23T18:30:00.000Z');
  });

  it('exactly India midnight starts the new day', () => {
    const b = indiaDayBounds(new Date('2026-11-23T18:30:00Z')); // 12:00 am, 24 Nov
    expect(b.date).toBe('2026-11-24');
    expect(b.start.toISOString()).toBe('2026-11-23T18:30:00.000Z');
  });

  it('between 18:30 and midnight UTC it is already the next day in India', () => {
    expect(indiaDayBounds(new Date('2026-11-23T20:00:00Z')).date).toBe('2026-11-24'); // 1:30 am
    expect(indiaDayBounds(new Date('2026-11-23T23:59:00Z')).date).toBe('2026-11-24');
  });

  it('is 24 hours long all year (no daylight saving) and handles month and year ends', () => {
    for (const iso of ['2026-03-29T12:00:00Z', '2026-10-25T12:00:00Z', '2026-12-31T20:00:00Z', '2028-02-28T20:00:00Z']) {
      const b = indiaDayBounds(new Date(iso));
      expect(b.end.getTime() - b.start.getTime()).toBe(24 * 3600 * 1000);
    }
    expect(indiaDayBounds(new Date('2026-12-31T20:00:00Z')).date).toBe('2027-01-01');
    expect(indiaDayBounds(new Date('2028-02-28T20:00:00Z')).date).toBe('2028-02-29'); // leap year
  });

  it('does not depend on the time zone of the machine', () => {
    const before = process.env.TZ;
    for (const tz of ['UTC', 'America/Los_Angeles', 'Asia/Kolkata', 'Pacific/Auckland']) {
      process.env.TZ = tz;
      expect(indiaDayBounds(new Date('2026-11-23T20:00:00Z')).date).toBe('2026-11-24');
    }
    if (before === undefined) delete process.env.TZ; else process.env.TZ = before;
  });
});
