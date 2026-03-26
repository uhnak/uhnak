"use client";

import { useState, useCallback } from "react";
import { signOut } from "next-auth/react";
import { ListingCard } from "@/components/ListingCard";
import { AddListingForm } from "@/components/AddListingForm";
import type { Listing, ListingStatus } from "@/types";

type FilterStatus = "all" | ListingStatus;

const statusFilters: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "price_drop", label: "Price Drop" },
  { value: "price_increase", label: "Price Up" },
  { value: "gone", label: "Gone" },
];

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialListings: any[];
}

export function DashboardClient({ initialListings }: Props) {
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [filter, setFilter] = useState<FilterStatus>("all");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/listings");
    if (res.ok) {
      const data = await res.json();
      setListings(data);
    }
  }, []);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
    if (res.ok) {
      setListings((prev) => prev.filter((l) => l.id !== id));
    }
  }

  async function handleCheck(id: string) {
    await fetch(`/api/listings/${id}/check`, { method: "POST" });
    await refresh();
  }

  const filtered =
    filter === "all" ? listings : listings.filter((l) => l.status === filter);

  const counts: Record<FilterStatus, number> = {
    all: listings.length,
    live: listings.filter((l) => l.status === "live" || l.status === "price_drop" || l.status === "price_increase").length,
    price_drop: listings.filter((l) => l.status === "price_drop").length,
    price_increase: listings.filter((l) => l.status === "price_increase").length,
    gone: listings.filter((l) => l.status === "gone").length,
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0f0f0f]/90 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">Car Tracker</span>
          <span className="text-xs text-zinc-500 ml-1">
            {listings.length} tracked
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-zinc-500 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 flex flex-col gap-4 pb-16">
        {/* Add form */}
        <AddListingForm onAdded={refresh} />

        {/* Filter tabs */}
        {listings.length > 0 && (
          <div className="flex gap-1 overflow-x-auto pb-0.5 -mx-1 px-1">
            {statusFilters.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === value
                    ? "bg-blue-600 text-white"
                    : "bg-surface text-zinc-400 hover:text-white border border-border"
                }`}
              >
                {label}
                {counts[value] > 0 && (
                  <span
                    className={`ml-1.5 ${
                      filter === value ? "text-blue-200" : "text-zinc-600"
                    }`}
                  >
                    {counts[value]}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Listings */}
        {filtered.length === 0 && listings.length === 0 && (
          <div className="text-center py-16 text-zinc-600">
            <svg
              className="w-12 h-12 mx-auto mb-4 opacity-30"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
            </svg>
            <p className="text-sm">No listings yet.</p>
            <p className="text-xs mt-1">Paste a URL from sauto.cz or autobazar.eu to start tracking.</p>
          </div>
        )}

        {filtered.length === 0 && listings.length > 0 && (
          <div className="text-center py-8 text-zinc-600 text-sm">
            No listings with status &ldquo;{filter}&rdquo;
          </div>
        )}

        {filtered.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            onDelete={handleDelete}
            onCheck={handleCheck}
          />
        ))}
      </main>
    </div>
  );
}
