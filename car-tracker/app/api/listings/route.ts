import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { detectSource, scrape } from "@/lib/scrapers";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const listings = await prisma.listing.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(listings);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { url, tags, note } = body as {
    url: string;
    tags?: string[];
    note?: string;
  };

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const source = detectSource(url);
  if (!source) {
    return NextResponse.json(
      { error: "URL must be from sauto.cz or autobazar.eu" },
      { status: 400 }
    );
  }

  // Check duplicate
  const existing = await prisma.listing.findUnique({ where: { url } });
  if (existing) {
    return NextResponse.json({ error: "This listing is already tracked" }, { status: 409 });
  }

  let scraped;
  try {
    scraped = await scrape(url, source);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Scrape failed";
    if (msg === "LISTING_GONE") {
      return NextResponse.json({ error: "Listing not found or already removed" }, { status: 404 });
    }
    return NextResponse.json({ error: `Failed to scrape listing: ${msg}` }, { status: 502 });
  }

  const listing = await prisma.listing.create({
    data: {
      url,
      source,
      title: scraped.title,
      savedPrice: scraped.price,
      currentPrice: scraped.price,
      currency: scraped.currency,
      mileage: scraped.mileage ?? null,
      location: scraped.location ?? null,
      thumbnail: scraped.thumbnail ?? null,
      status: "live",
      tags: tags?.length ? JSON.stringify(tags) : null,
      note: note ?? null,
    },
  });

  return NextResponse.json(listing, { status: 201 });
}
