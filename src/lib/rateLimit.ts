import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (!_redis) _redis = Redis.fromEnv();
  return _redis;
}

const limiters = new Map<string, Ratelimit>();

function getLimiter(prefix: string, requests: number, windowSec: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  if (!limiters.has(prefix)) {
    limiters.set(prefix, new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, `${windowSec} s`),
      prefix,
    }));
  }
  return limiters.get(prefix)!;
}

/**
 * Returns a 429 NextResponse if rate-limited, null otherwise.
 * Falls back to allow-all when Upstash env vars are absent.
 *
 * @param prefix  - rate-limit namespace, e.g. "rl:change-password"
 * @param key     - per-user key, e.g. `${userId}:${ip}`
 * @param requests - max attempts in window (default 5)
 * @param windowSec - window in seconds (default 900 = 15 min)
 */
export async function checkRateLimit(
  prefix: string,
  key: string,
  requests = 5,
  windowSec = 900,
  lang: "fr" | "en" = "fr",
): Promise<NextResponse | null> {
  const limiter = getLimiter(prefix, requests, windowSec);
  if (!limiter) return null;

  const { success } = await limiter.limit(key);
  if (!success) {
    const mins = Math.round(windowSec / 60);
    const msg = lang === "en"
      ? `Too many attempts. Please try again in ${mins} minute${mins !== 1 ? "s" : ""}.`
      : `Trop de tentatives. Réessayez dans ${mins} minute${mins !== 1 ? "s" : ""}.`;
    return NextResponse.json(
      { error: msg },
      { status: 429, headers: { "Retry-After": String(windowSec) } },
    );
  }
  return null;
}
