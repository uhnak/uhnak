import type { ScrapedData } from "@/types";
import { scrapeSauto } from "./sauto";
import { scrapeAutobazar } from "./autobazar";

export type SupportedSource = "sauto" | "autobazar";

export function detectSource(url: string): SupportedSource | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes("sauto.cz")) return "sauto";
    if (hostname.includes("autobazar.eu")) return "autobazar";
    return null;
  } catch {
    return null;
  }
}

export async function scrape(
  url: string,
  source: SupportedSource
): Promise<ScrapedData> {
  if (source === "sauto") return scrapeSauto(url);
  if (source === "autobazar") return scrapeAutobazar(url);
  throw new Error(`Unsupported source: ${source}`);
}
