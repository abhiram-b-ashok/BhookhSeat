import * as fs from 'fs';
import * as path from 'path';
import { toBookingDocument, BOOKING_DOCUMENT_KEYS, OCCUPANCY_DOCUMENT_KEYS } from '../features/bookings/domain/bookingDocument';
import type { Booking } from '../features/bookings/domain/booking.types';

const rules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8');

/** Pulls the names out of the first 'a', 'b', ... list after a marker in the rules file. */
function namesAfter(marker: string, listStart: string): string[] {
  const from = rules.indexOf(marker);
  if (from < 0) throw new Error(`Marker not found: ${marker}`);
  const open = rules.indexOf(listStart, from);
  const close = rules.indexOf(']', open);
  return [...rules.slice(open, close).matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

const booking: Booking = {
  id: 'b1', userId: 'u1', restaurantId: 'rest_001', restaurantName: 'Coconut Grove', durationMinutes: 90,
  cancellationAllowed: true, date: '2026-10-21', time: '19:30', guestCount: 2, tableType: 'couple',
  tableLabel: 'Couple table', status: 'confirmed', createdAt: '2026-10-20T04:30:00.000Z',
};

describe('booking documents match the security rules', () => {
  it('writes exactly the fields the rules allow', () => {
    const doc = toBookingDocument(booking, 'u1');
    expect(Object.keys(doc).sort()).toEqual([...BOOKING_DOCUMENT_KEYS].sort());
  });

  it('never writes undefined (Firestore rejects it)', () => {
    const doc = toBookingDocument({ ...booking, userId: undefined }, 'u1');
    expect(Object.values(doc).every((v) => v !== undefined)).toBe(true);
    expect(doc.userId).toBe('u1'); // always the signed-in user, whatever the booking object says
  });

  it('keeps the rules\' booking field list in step with the code', () => {
    const allowed = namesAfter('function isValidNewBooking', 'hasOnly([');
    const required = namesAfter('function isValidNewBooking', 'hasAll([');
    expect([...allowed].sort()).toEqual([...BOOKING_DOCUMENT_KEYS].sort());
    expect([...required].sort()).toEqual([...BOOKING_DOCUMENT_KEYS].sort());
  });

  it('keeps the rules\' occupancy field list in step with the code', () => {
    const allowed = namesAfter('function isValidOccupancy', 'hasOnly([');
    expect([...allowed].sort()).toEqual([...OCCUPANCY_DOCUMENT_KEYS].sort());
  });

  it('allows only the table types the app knows', () => {
    expect(namesAfter('b.tableType in', '[').sort()).toEqual(['couple', 'family', 'large_group', 'standard']);
  });

  /** The text of one `match` block, so a rule in another block cannot satisfy the check. */
  function block(header: string): string {
    const start = rules.indexOf(header);
    if (start < 0) throw new Error(`Block not found: ${header}`);
    const next = rules.indexOf('match /', start + header.length);
    return rules.slice(start, next < 0 ? rules.length : next);
  }

  const bookings = () => block('match /users/{userId}/bookings/{bookingId}');
  const occupancy = () => block('match /occupancy/{docId}');

  it('never allows deleting bookings', () => {
    expect(bookings()).toMatch(/allow delete: if false;/);
    expect(bookings()).not.toMatch(/allow delete: if (?!false)/);
  });

  it('only lets the owner read their bookings', () => {
    expect(bookings()).toMatch(/allow read: if isOwner\(userId\);/);
    expect(bookings()).not.toMatch(/allow read: if isSignedIn\(\)/);
  });

  it('only lets the owner create bookings, and only valid ones', () => {
    expect(bookings()).toMatch(/allow create: if isOwner\(userId\) && isValidNewBooking\(userId, bookingId\);/);
  });

  it('only allows the change confirmed -> cancelled, touching nothing else', () => {
    const b = bookings();
    expect(b).toMatch(/resource\.data\.status == 'confirmed'/);
    expect(b).toMatch(/request\.resource\.data\.status == 'cancelled'/);
    expect(b).toMatch(/affectedKeys\(\)\.hasOnly\(\['status'\]\)/);
  });

  it('never allows deleting shared counts, and requires sign-in to touch them', () => {
    const o = occupancy();
    expect(o).toMatch(/allow delete: if false;/);
    expect(o).toMatch(/allow read: if isSignedIn\(\);/);
    expect(o).toMatch(/allow create, update: if isSignedIn\(\) && isValidOccupancy\(docId\);/);
  });

  it('has no catch-all rule that would open everything up', () => {
    expect(rules).not.toMatch(/match \/\{document=\*\*\}/);
    expect(rules).not.toMatch(/allow [a-z, ]+: if true/);
  });
});
