export type ListingStatus =
  | "live"
  | "price_drop"
  | "price_increase"
  | "gone";

export interface ScrapedData {
  title: string;
  price: number;
  currency: string;
  mileage?: string;
  location?: string;
  thumbnail?: string;
}

export interface Listing {
  id: string;
  url: string;
  source: string;
  title: string;
  savedPrice: number;
  currentPrice: number | null;
  currency: string;
  mileage: string | null;
  location: string | null;
  thumbnail: string | null;
  status: ListingStatus;
  tags: string | null;
  note: string | null;
  createdAt: string;
  lastChecked: string;
  updatedAt: string;
}

export function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}

export function formatPrice(amount: number, currency: string): string {
  if (currency === "CZK") {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function priceDelta(
  savedPrice: number,
  currentPrice: number | null
): number | null {
  if (currentPrice === null) return null;
  return currentPrice - savedPrice;
}
