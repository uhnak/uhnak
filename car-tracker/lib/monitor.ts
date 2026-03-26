import { prisma } from "@/lib/db";
import { scrape } from "@/lib/scrapers";
import type { SupportedSource } from "@/lib/scrapers";
import { sendPriceChangeEmail, sendListingGoneEmail } from "@/lib/email";
import type { Listing } from "@/types";

function deriveStatus(
  savedPrice: number,
  currentPrice: number | null,
  gone: boolean
): string {
  if (gone) return "gone";
  if (currentPrice === null) return "live";
  if (currentPrice < savedPrice) return "price_drop";
  if (currentPrice > savedPrice) return "price_increase";
  return "live";
}

export async function checkListing(id: string): Promise<{
  changed: boolean;
  status: string;
  error?: string;
}> {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) return { changed: false, status: "not_found", error: "Listing not found" };

  let scraped;
  let isGone = false;

  try {
    scraped = await scrape(listing.url, listing.source as SupportedSource);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "LISTING_GONE" || msg.includes("404")) {
      isGone = true;
    } else {
      // Scrape failed but not definitively gone — skip this round
      await prisma.listing.update({
        where: { id },
        data: { lastChecked: new Date() },
      });
      return { changed: false, status: listing.status, error: msg };
    }
  }

  const oldPrice = listing.currentPrice ?? listing.savedPrice;
  const newPrice = isGone ? null : scraped!.price;
  const newStatus = deriveStatus(listing.savedPrice, newPrice, isGone);
  const changed = newStatus !== listing.status || (!isGone && newPrice !== oldPrice);

  await prisma.listing.update({
    where: { id },
    data: {
      currentPrice: newPrice,
      status: newStatus,
      lastChecked: new Date(),
      ...(scraped?.mileage && { mileage: scraped.mileage }),
      ...(scraped?.location && { location: scraped.location }),
      ...(scraped?.thumbnail && { thumbnail: scraped.thumbnail }),
    },
  });

  // Send notifications
  if (changed) {
    const typedListing = listing as unknown as Listing;
    if (isGone && listing.status !== "gone") {
      await sendListingGoneEmail(typedListing).catch(console.error);
    } else if (!isGone && newPrice !== null && newPrice !== oldPrice) {
      await sendPriceChangeEmail(typedListing, oldPrice, newPrice).catch(console.error);
    }
  }

  return { changed, status: newStatus };
}

export async function checkAllListings(): Promise<{
  checked: number;
  changed: number;
  errors: number;
}> {
  const listings = await prisma.listing.findMany({
    where: { status: { not: "gone" } },
    select: { id: true },
  });

  let changed = 0;
  let errors = 0;

  for (const { id } of listings) {
    const result = await checkListing(id);
    if (result.changed) changed++;
    if (result.error) errors++;
    // Small delay to be polite to servers
    await new Promise((r) => setTimeout(r, 2000));
  }

  return { checked: listings.length, changed, errors };
}
