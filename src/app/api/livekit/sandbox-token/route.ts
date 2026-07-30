import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Permanent sandbox room — no booking required
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      hrApplication: { select: { fullName: true } },
    },
  });

  const displayName =
    user?.hrApplication?.fullName ||
    (user?.firstName
      ? [user.firstName, user.lastName].filter(Boolean).join(" ")
      : null) ||
    user?.email ||
    "Participant";

  const apiKey    = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;

  const token = new AccessToken(apiKey, apiSecret, {
    identity: session.user.id,
    name: displayName,
    ttl: 86400, // 24h — refresh on page reload
  });

  token.addGrant({
    roomJoin: true,
    room: "withyou-sandbox",
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return NextResponse.json({
    token: await token.toJwt(),
    roomName: "withyou-sandbox",
    displayName,
    role: user?.role?.toLowerCase() ?? "student",
  });
}
