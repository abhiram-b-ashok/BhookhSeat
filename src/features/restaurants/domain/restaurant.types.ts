export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

/** Opening and closing time in 24-hour "HH:mm" format. */
export type TimeRange = readonly [open: string, close: string];

export type OpeningHours = Record<Weekday, TimeRange>;

export type PriceLevel = 1 | 2 | 3;

export type TableType = 'couple' | 'standard' | 'family' | 'large_group';

export type Address = {
  line1: string;
  area: string;
  city: string;
  state: string;
  postalCode: string;
};

export type BookingRules = {
  slotDurationMinutes: number;
  advanceBookingDays: number;
  gracePeriodMinutes: number;
  cancellationAllowed: boolean;
};

export type TableInventoryItem = {
  type: TableType;
  label: string;
  capacity: number;
  totalTables: number;
};

export type MenuHighlight = {
  id: string;
  name: string;
  price: number;
  currency: string;
  dietary: string[];
  isPopular: boolean;
};

export type Restaurant = {
  id: string;
  name: string;
  tagline: string;
  cuisine: string[];
  description: string;
  address: Address;
  priceLevel: PriceLevel;
  averageSpendPerPerson: number;
  currency: string;
  rating: number;
  ratingCount: number;
  isFeatured: boolean;
  isVegetarianFriendly: boolean;
  amenities: string[];
  openingHours: OpeningHours;
  bookingRules: BookingRules;
  tableInventory: TableInventoryItem[];
  menuHighlights: MenuHighlight[];
  imageSearchTerms: string[];
  imageUrl: string | null;
};