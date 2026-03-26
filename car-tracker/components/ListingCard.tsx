"use client";

import { useState } from "react";
import Image from "next/image";
import { StatusBadge } from "./StatusBadge";
import { formatPrice, parseTags, priceDelta } from "@/types";
import type { Listing, ListingStatus } from "@/types";

function daysTracked(createdAt: string): number {
  return Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface Props {
  listing: Listing;
  onDelete: (id: string) => void;
  onCheck: (id: string) => void;
}

export function ListingCard({ listing, onDelete, onCheck }: Props) {
  const [checking, setChecking] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const tags = parseTags(listing.tags);
  const activePrice = listing.currentPrice ?? listing.savedPrice;
  const delta = priceDelta(listing.savedPrice, listing.currentPrice);
  const isGone = listing.status === "gone";

  async function handleCheck() {
    setChecking(true);
    await onCheck(listing.id);
    setChecking(false);
  }

  async function handleDelete() {
    if (!confirm(`Remove "${listing.title}" from tracking?`)) return;
    setDeleting(true);
    await onDelete(listing.id);
    setDeleting(false);
  }

  return (
    <div
      className={`bg-surface rounded-xl border border-border p-4 flex flex-col gap-3 ${
        isGone ? "opacity-60" : ""
      }`}
    >
      {/* Top row: thumb + info */}
      <div className="flex gap-3">
        {listing.thumbnail ? (
          <div className="relative w-20 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-surface-3">
            <Image
              src={listing.thumbnail}
              alt={listing.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-20 h-16 flex-shrink-0 rounded-lg bg-surface-3 flex items-center justify-center text-zinc-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
            </svg>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-white hover:text-blue-400 transition-colors line-clamp-2 leading-snug"
          >
            {listing.title}
          </a>
          <div className="mt-1 flex flex-wrap gap-1 items-center">
            <StatusBadge status={listing.status as ListingStatus} />
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-surface-3 text-zinc-400 border border-border"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Price row */}
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-white">
          {formatPrice(activePrice, listing.currency)}
        </span>
        {delta !== null && delta !== 0 && (
          <>
            <span className="text-sm text-zinc-500 line-through">
              {formatPrice(listing.savedPrice, listing.currency)}
            </span>
            <span
              className={`text-sm font-medium ${
                delta < 0 ? "text-green-400" : "text-amber-400"
              }`}
            >
              {delta < 0 ? "↓" : "↑"}
              {formatPrice(Math.abs(delta), listing.currency)}
            </span>
          </>
        )}
      </div>

      {/* Details */}
      <div className="text-xs text-zinc-500 flex flex-wrap gap-x-3 gap-y-1">
        {listing.mileage && <span>{listing.mileage}</span>}
        {listing.location && <span>{listing.location}</span>}
      </div>

      {/* Note */}
      {listing.note && (
        <p className="text-xs text-zinc-400 italic border-l-2 border-zinc-700 pl-2">
          {listing.note}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <span className="text-xs text-zinc-600">
          {daysTracked(listing.createdAt)}d tracked &middot; checked{" "}
          {relativeTime(listing.lastChecked)}
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleCheck}
            disabled={checking || isGone}
            className="text-xs px-2.5 py-1 rounded bg-surface-2 hover:bg-surface-3 text-zinc-400 hover:text-white transition-colors disabled:opacity-40"
          >
            {checking ? "Checking..." : "Refresh"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs px-2.5 py-1 rounded bg-surface-2 hover:bg-red-900/30 text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-40"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
