type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetAt: number;
}

export function consumeRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
	const now = Date.now();
	const existing = buckets.get(key);
	if (!existing || existing.resetAt < now) {
		const fresh: Bucket = { count: 1, resetAt: now + windowMs };
		buckets.set(key, fresh);
		return { allowed: true, remaining: limit - 1, resetAt: fresh.resetAt };
	}
	if (existing.count >= limit) {
		return { allowed: false, remaining: 0, resetAt: existing.resetAt };
	}
	existing.count += 1;
	return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

export function resetRateLimit(key: string) {
	buckets.delete(key);
}

// Periodisches GC, falls die Map zu groß wird (single-Instance, ok).
const GC_INTERVAL_MS = 60_000;
setInterval(() => {
	const now = Date.now();
	for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
}, GC_INTERVAL_MS).unref?.();
