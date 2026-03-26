import { NextRequest, NextResponse } from "next/server";
import { checkAllListings } from "@/lib/monitor";

export const maxDuration = 300; // 5 minutes

export async function GET(req: NextRequest) {
  // Protect with secret header (set CRON_SECRET in env)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await checkAllListings();
  return NextResponse.json(result);
}
