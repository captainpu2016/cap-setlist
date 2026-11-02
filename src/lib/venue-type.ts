export const VENUE_TYPES = [
  { value: 'livehouse', label: 'Live house' },
  { value: 'other', label: '其他場地' }
] as const;

export type VenueType = (typeof VENUE_TYPES)[number]['value'];

export function isVenueType(value: unknown): value is VenueType {
  return value === 'livehouse' || value === 'other';
}
