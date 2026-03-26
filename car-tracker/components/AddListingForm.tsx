"use client";

import { useState } from "react";

interface Props {
  onAdded: () => void;
}

export function AddListingForm({ onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, tags: tagList, note: note || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add listing");
        return;
      }

      setUrl("");
      setTags("");
      setNote("");
      setOpen(false);
      onAdded();
    } catch {
      setError("Network error, please try again");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border hover:border-blue-500/50 hover:bg-blue-500/5 text-zinc-500 hover:text-blue-400 transition-colors text-sm font-medium"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
        </svg>
        Track new listing
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface rounded-xl border border-border p-4 flex flex-col gap-3"
    >
      <h2 className="text-sm font-semibold text-white">Track new listing</h2>

      <div>
        <label className="text-xs text-zinc-500 block mb-1">
          Listing URL <span className="text-zinc-600">(sauto.cz or autobazar.eu)</span>
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.sauto.cz/..."
          required
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div>
        <label className="text-xs text-zinc-500 block mb-1">
          Tags <span className="text-zinc-600">(comma-separated, optional)</span>
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="GTI, maybe, negotiated"
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div>
        <label className="text-xs text-zinc-500 block mb-1">
          Note <span className="text-zinc-600">(optional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Seller seemed flexible, contact in March"
          rows={2}
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          {loading ? "Scraping..." : "Add listing"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="px-4 text-sm text-zinc-400 hover:text-white bg-surface-2 hover:bg-surface-3 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>

      {loading && (
        <p className="text-xs text-zinc-500 text-center">
          Scraping listing data, this may take a few seconds...
        </p>
      )}
    </form>
  );
}
