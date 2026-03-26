import * as cheerio from "cheerio";
import type { ScrapedData } from "@/types";

function parsePrice(raw: string): { price: number; currency: string } | null {
  const cleaned = raw.replace(/\s/g, "").replace(/\u00a0/g, "");

  const eur = cleaned.match(/(\d+(?:[,.]\d+)?)\s*€/);
  if (eur) {
    return { price: Math.round(parseFloat(eur[1].replace(",", "."))), currency: "EUR" };
  }

  const czk = cleaned.match(/(\d+(?:[,.]\d+)?)\s*Kč/i);
  if (czk) {
    return { price: Math.round(parseFloat(czk[1].replace(",", "."))), currency: "CZK" };
  }

  // Plain number (assume EUR for autobazar.eu)
  const plain = cleaned.match(/^(\d[\d\s,.]*)$/);
  if (plain) {
    const num = parseFloat(cleaned.replace(/[^\d.]/g, ""));
    if (!isNaN(num) && num > 0) return { price: Math.round(num), currency: "EUR" };
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
      "Accept-Language": "sk,cs;q=0.9,en;q=0.8",
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
            result.price = Math.round(parseFloat(String(item.offers.price)));
            result.currency = item.offers.priceCurrency ?? "EUR";
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
      // continue
    }
  }
  return null;
}

export async function scrapeAutobazar(url: string): Promise<ScrapedData> {
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  // Check for gone/404 indicators in page content
  const pageText = $("body").text().toLowerCase();
  if (
    pageText.includes("inzerát neexistuje") ||
    pageText.includes("inzerát bol vymazaný") ||
    pageText.includes("oglasenie ne postoji") ||
    $("title").text().toLowerCase().includes("404")
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
      $("h1.advert-title").text().trim() ||
      $("h1.detail-title").text().trim() ||
      $('[class*="advert-title"]').first().text().trim() ||
      $('[class*="detail__title"]').first().text().trim() ||
      $("h1").first().text().trim() ||
      "Unknown listing";
  }

  // 3. Price fallbacks
  if (!result.price) {
    const priceSelectors = [
      ".price-tag",
      ".advert-price",
      '[class*="price-main"]',
      '[class*="advert__price"]',
      '[class*="detail-price"]',
      '[class*="price"]',
    ];
    for (const sel of priceSelectors) {
      const text = $(sel).first().text().trim();
      if (text) {
        const parsed = parsePrice(text);
        if (parsed) {
          result.price = parsed.price;
          result.currency = parsed.currency;
          break;
        }
      }
    }
  }

  // 4. Mileage
  if (!result.mileage) {
    const candidates = [
      $('[class*="mileage"]').first().text().trim(),
      $('[class*="kilometre"]').first().text().trim(),
      $('[class*="najazdene"]').first().text().trim(),
    ].filter(Boolean);
    if (candidates[0]) result.mileage = candidates[0].replace(/\s+/g, " ").trim();
  }

  // 5. Location
  if (!result.location) {
    result.location =
      $('[class*="location"]').first().text().trim() ||
      $('[class*="region"]').first().text().trim() ||
      undefined;
  }

  // 6. Thumbnail
  if (!result.thumbnail) {
    const imgSrc =
      $('meta[property="og:image"]').attr("content") ||
      $('[class*="gallery"] img').first().attr("src") ||
      $('[class*="photo"] img').first().attr("src");
    if (imgSrc) result.thumbnail = imgSrc;
  }

  if (!result.price) {
    throw new Error("Could not extract price from autobazar.eu listing");
  }

  return {
    title: result.title ?? "Unknown listing",
    price: result.price,
    currency: result.currency ?? "EUR",
    mileage: result.mileage,
    location: result.location,
    thumbnail: result.thumbnail,
  };
}
