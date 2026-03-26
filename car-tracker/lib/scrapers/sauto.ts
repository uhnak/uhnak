import * as cheerio from "cheerio";
import type { ScrapedData } from "@/types";

// Parses a Czech/Slovak price string like "149 900 Kč" or "149900 Kč" → 149900
function parseCzechPrice(raw: string): { price: number; currency: string } | null {
  const cleaned = raw.replace(/\s/g, "").replace(/\u00a0/g, "");

  const czk = cleaned.match(/(\d+(?:[,.]\d+)?)\s*Kč/i);
  if (czk) {
    return { price: Math.round(parseFloat(czk[1].replace(",", "."))), currency: "CZK" };
  }

  const eur = cleaned.match(/(\d+(?:[,.]\d+)?)\s*€/);
  if (eur) {
    return { price: Math.round(parseFloat(eur[1].replace(",", "."))), currency: "EUR" };
  }

  return null;
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "cs,sk;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error("LISTING_GONE");
    throw new Error(`HTTP ${res.status}`);
  }

  return res.text();
}

// Try to extract data from JSON-LD schema markup
function extractFromJsonLd($: cheerio.CheerioAPI): Partial<ScrapedData> | null {
  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const el of scripts) {
    try {
      const data = JSON.parse($(el).html() ?? "{}");
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const type = item["@type"];
        if (type === "Car" || type === "Product" || type === "Vehicle") {
          const result: Partial<ScrapedData> = {};
          if (item.name) result.title = item.name;
          if (item.offers?.price) {
            const raw = String(item.offers.price);
            const currency = item.offers.priceCurrency ?? "CZK";
            result.price = Math.round(parseFloat(raw));
            result.currency = currency;
          }
          if (item.mileageFromOdometer?.value) {
            result.mileage = `${item.mileageFromOdometer.value} km`;
          }
          if (item.image) {
            result.thumbnail = Array.isArray(item.image) ? item.image[0] : item.image;
          }
          if (Object.keys(result).length > 0) return result;
        }
      }
    } catch {
      // continue to next script tag
    }
  }
  return null;
}

export async function scrapeSauto(url: string): Promise<ScrapedData> {
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  // Check if listing is gone/sold
  const pageTitle = $("title").text().toLowerCase();
  if (
    pageTitle.includes("nenalezeno") ||
    pageTitle.includes("404") ||
    pageTitle.includes("neexistuje")
  ) {
    throw new Error("LISTING_GONE");
  }

  const result: Partial<ScrapedData> = {};

  // 1. Try JSON-LD first
  const jsonLd = extractFromJsonLd($);
  if (jsonLd) Object.assign(result, jsonLd);

  // 2. Title fallbacks
  if (!result.title) {
    result.title =
      $('h1[data-dot="ad-detail-title"]').text().trim() ||
      $("h1.title-name").text().trim() ||
      $("h1.b-car__title").text().trim() ||
      $("h1").first().text().trim() ||
      "Unknown listing";
  }

  // 3. Price fallbacks
  if (!result.price) {
    const priceSelectors = [
      '[data-dot="price"]',
      ".price-main",
      ".c-car-price__value",
      ".b-car__price",
      '[class*="price"]',
    ];
    for (const sel of priceSelectors) {
      const text = $(sel).first().text().trim();
      if (text) {
        const parsed = parseCzechPrice(text);
        if (parsed) {
          result.price = parsed.price;
          result.currency = parsed.currency;
          break;
        }
      }
    }
  }

  // 4. Mileage fallbacks
  if (!result.mileage) {
    const mileageText = $('[data-dot="mileage"]').text().trim() ||
      $(".b-car__mileage").text().trim() ||
      $('[class*="mileage"]').first().text().trim();
    if (mileageText) result.mileage = mileageText.replace(/\s+/g, " ").trim();
  }

  // 5. Location fallbacks
  if (!result.location) {
    result.location =
      $('[data-dot="address"]').text().trim() ||
      $(".b-car__location").text().trim() ||
      $('[class*="location"]').first().text().trim() ||
      undefined;
  }

  // 6. Thumbnail fallbacks
  if (!result.thumbnail) {
    const imgSrc =
      $('meta[property="og:image"]').attr("content") ||
      $(".b-car__image img").first().attr("src") ||
      $('[class*="gallery"] img').first().attr("src");
    if (imgSrc) result.thumbnail = imgSrc;
  }

  if (!result.price) {
    throw new Error("Could not extract price from sauto.cz listing");
  }

  return {
    title: result.title ?? "Unknown listing",
    price: result.price,
    currency: result.currency ?? "CZK",
    mileage: result.mileage,
    location: result.location,
    thumbnail: result.thumbnail,
  };
}
