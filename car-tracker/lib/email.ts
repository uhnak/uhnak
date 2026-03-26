import { Resend } from "resend";
import { formatPrice } from "@/types";
import type { Listing } from "@/types";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPriceChangeEmail(
  listing: Listing,
  oldPrice: number,
  newPrice: number
) {
  const from = process.env.RESEND_FROM ?? "Car Tracker <noreply@resend.dev>";
  const to = process.env.NOTIFICATION_EMAIL ?? "";
  if (!to) return;

  const delta = newPrice - oldPrice;
  const sign = delta < 0 ? "↓" : "↑";
  const type = delta < 0 ? "Price Drop" : "Price Increase";
  const color = delta < 0 ? "#22c55e" : "#ef4444";

  await resend.emails.send({
    from,
    to,
    subject: `${sign} ${type}: ${listing.title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 16px; color: ${color}">${sign} ${type}</h2>
        <h3 style="margin: 0 0 8px;">${listing.title}</h3>
        <p style="margin: 0 0 16px; font-size: 18px;">
          <span style="text-decoration: line-through; color: #888;">${formatPrice(oldPrice, listing.currency)}</span>
          &nbsp;→&nbsp;
          <strong style="color: ${color}">${formatPrice(newPrice, listing.currency)}</strong>
        </p>
        <p style="margin: 0 0 16px; color: #555;">
          Change: <strong style="color: ${color}">${formatPrice(Math.abs(delta), listing.currency)}</strong>
        </p>
        <a href="${listing.url}" style="display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
          View listing
        </a>
      </div>
    `,
  });
}

export async function sendListingGoneEmail(listing: Listing) {
  const from = process.env.RESEND_FROM ?? "Car Tracker <noreply@resend.dev>";
  const to = process.env.NOTIFICATION_EMAIL ?? "";
  if (!to) return;

  await resend.emails.send({
    from,
    to,
    subject: `Gone: ${listing.title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 16px; color: #888;">Listing Gone / Sold</h2>
        <h3 style="margin: 0 0 8px;">${listing.title}</h3>
        <p style="margin: 0 0 8px; color: #555;">
          Original price: <strong>${formatPrice(listing.savedPrice, listing.currency)}</strong>
        </p>
        <p style="margin: 0 0 16px; color: #555;">
          This listing is no longer available.
        </p>
        <a href="${listing.url}" style="display: inline-block; background: #6b7280; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
          Try listing URL
        </a>
      </div>
    `,
  });
}
