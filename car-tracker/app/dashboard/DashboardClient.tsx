"use client";

import { useState, useCallback, useEffect } from "react";
import { signOut } from "next-auth/react";
import { ListingCard } from "@/components/ListingCard";
import { AddListingForm } from "@/components/AddListingForm";
import { formatPrice } from "@/types";
import type { Listing, ListingStatus } from "@/types";

const FILTER_CHIPS: { value: ListingStatus; label: string }[] = [
  { value: "live", label: "Live" },
  { value: "price_drop", label: "↓ Price Drop" },
  { value: "price_increase", label: "↑ Price Up" },
  { value: "gone", label: "Gone" },
];

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialListings: any[];
}

export function DashboardClient({ initialListings }: Props) {
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [activeFilters, setActiveFilters] = useState<Set<ListingStatus>>(new Set());
  const [eurRate, setEurRate] = useState<number | null>(null);
  const [pasteState, setPasteState] = useState<"idle" | "loading" | "error">("idle");
  const [pasteMsg, setPasteMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/listings");
    if (res.ok) setListings(await res.json());
  }, []);

  // Fetch live EUR/CZK rate
  useEffect(() => {
    fetch("https://api.frankfurter.app/latest?from=CZK&to=EUR")
      .then((r) => r.json())
      .then((d) => { if (d.rates?.EUR) setEurRate(d.rates.EUR); })
      .catch(() => {});
  }, []);

  // Global paste handler — paste a sauto/autobazar URL anywhere to add it
  useEffect(() => {
    async function onPaste(e: ClipboardEvent) {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return;
      const text = e.clipboardData?.getData("text")?.trim() ?? "";
      if (!text.includes("sauto.cz") && !text.includes("autobazar.eu")) return;
      e.preventDefault();
      setPasteState("loading");
      setPasteMsg(null);
      try {
        const res = await fetch("/api/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: text }),
        });
        const data = await res.json();
        if (!res.ok) {
          setPasteState("error");
          setPasteMsg(data.error ?? "Failed to add listing");
          setTimeout(() => setPasteState("idle"), 3500);
          return;
        }
        await refresh();
        setPasteState("idle");
      } catch {
        setPasteState("error");
        setPasteMsg("Network error — try again");
        setTimeout(() => setPasteState("idle"), 3500);
      }
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [refresh]);

  function toggleFilter(status: ListingStatus) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  const filtered =
    activeFilters.size === 0
      ? listings
      : listings.filter((l) => activeFilters.has(l.status as ListingStatus));

  // Stats — convert everything to EUR for a unified total
  const activeListings = listings.filter((l) => l.status !== "gone");

  function toEur(price: number, currency: string): number | null {
    if (currency === "EUR") return price;
    return eurRate ? price * eurRate : null;
  }

  const eurTotals = activeListings.map((l) =>
    toEur(l.currentPrice ?? l.savedPrice, l.currency)
  );
  const allHaveRate = eurTotals.every((v) => v !== null);
  const totalEur = allHaveRate
    ? eurTotals.reduce<number>((s, v) => s + (v ?? 0), 0)
    : null;
  const avgEur = totalEur !== null && activeListings.length > 0
    ? totalEur / activeListings.length
    : null;

  const savedEur = activeListings.reduce<number>((sum, l) => {
    if (l.currentPrice === null) return sum;
    const saved = l.savedPrice - l.currentPrice;
    if (saved <= 0) return sum;
    const eur = toEur(saved, l.currency);
    return eur !== null ? sum + eur : sum;
  }, 0);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
    if (res.ok) setListings((prev) => prev.filter((l) => l.id !== id));
  }

  async function handleCheck(id: string) {
    await fetch(`/api/listings/${id}/check`, { method: "POST" });
    await refresh();
  }

  async function handleUpdate(id: string, tags: string[], note: string) {
    const res = await fetch(`/api/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags, note }),
    });
    if (res.ok) await refresh();
  }

  const filterCounts = FILTER_CHIPS.reduce<Record<string, number>>(
    (acc, { value }) => {
      acc[value] = listings.filter((l) => l.status === value).length;
      return acc;
    },
    {}
  );

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Paste toast */}
      {pasteState !== "idle" && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-2xl transition-all ${
            pasteState === "loading"
              ? "bg-blue-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {pasteState === "loading" ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Adding listing...
            </span>
          ) : (
            pasteMsg
          )}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0f0f0f]/90 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">Car Tracker</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-600">{listings.length} tracked</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-zinc-500 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 flex flex-col gap-4 pb-16">
        {/* Paste hint */}
        <p className="text-xs text-center text-zinc-600">
          Copy a listing URL and press{" "}
          <kbd className="px-1 py-0.5 rounded bg-surface-2 border border-border font-mono text-zinc-500">
            ⌘V
          </kbd>{" "}
          anywhere to add it instantly
        </p>

        {/* Add form */}
        <AddListingForm onAdded={refresh} />

        {/* Stats panel */}
        {activeListings.length > 0 && (
          <div className="bg-surface rounded-xl border border-border p-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Total value</p>
              <p className="text-base font-bold text-white">
                {totalEur !== null
                  ? formatPrice(Math.round(totalEur), "EUR")
                  : "—"}
              </p>
              <p className="text-xs text-zinc-600">{activeListings.length} active cars</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Avg price</p>
              <p className="text-base font-bold text-white">
                {avgEur !== null
                  ? formatPrice(Math.round(avgEur), "EUR")
                  : "—"}
              </p>
              {savedEur > 0 && (
                <p className="text-xs text-green-500">
                  ↓ {formatPrice(Math.round(savedEur), "EUR")} saved
                </p>
              )}
            </div>
          </div>
        )}

        {/* Filter chips — multi-select */}
        {listings.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_CHIPS.map(({ value, label }) => {
              const active = activeFilters.has(value);
              const count = filterCounts[value] ?? 0;
              return (
                <button
                  key={value}
                  onClick={() => toggleFilter(value)}
                  disabled={count === 0}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-default ${
                    active
                      ? "bg-blue-600 text-white"
                      : "bg-surface text-zinc-400 hover:text-white border border-border"
                  }`}
                >
                  {label}
                  <span className={`ml-1.5 ${active ? "text-blue-200" : "text-zinc-600"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
            {activeFilters.size > 0 && (
              <button
                onClick={() => setActiveFilters(new Set())}
                className="text-xs text-zinc-500 hover:text-white px-2 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Empty states */}
        {listings.length === 0 && (
          <div className="text-center py-16 text-zinc-600">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />
            </svg>
            <p className="text-sm">No listings yet.</p>
            <p className="text-xs mt-1 text-zinc-700">
              Paste a sauto.cz or autobazar.eu URL to start.
            </p>
          </div>
        )}

        {listings.length > 0 && filtered.length === 0 && (
          <p className="text-center py-8 text-zinc-600 text-sm">
            No listings match the selected filters.
          </p>
        )}

        {/* Listing cards */}
        {filtered.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            eurRate={eurRate}
            onDelete={handleDelete}
            onCheck={handleCheck}
            onUpdate={handleUpdate}
          />
        ))}
      </main>
    </div>
  );
}
