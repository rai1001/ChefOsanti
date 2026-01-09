
interface RateLimitRecord {
    count: number
    resetAt: number
}

// In-memory store (per isolate)
const store = new Map<string, RateLimitRecord>()

// Periodic cleanup every 5 minutes
setInterval(() => {
    const now = Date.now()
    for (const [key, record] of store.entries()) {
        if (now > record.resetAt) {
            store.delete(key)
        }
    }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
    limit: number        // Number of allowed requests
    windowMs: number     // Time window in milliseconds
    keyPrefix?: string   // Prefix for the key (e.g., 'ocr', 'audit')
}

export class RateLimitError extends Error {
    constructor(
        public readonly retryAfter: number,
        message = 'Rate limit exceeded'
    ) {
        super(message)
        this.name = 'RateLimitError'
    }
}

/**
 * Checks rate limit for a specific key (e.g., orgId or userId)
 * @param key Unique identifier for the client (orgId, userId, ip)
 * @param config Rate limit configuration
 * @returns void if allowed, throws RateLimitError if exceeded
 */
export function checkRateLimit(key: string, config: RateLimitConfig): void {
    const now = Date.now()
    const fullKey = `${config.keyPrefix || 'default'}:${key}`

    let record = store.get(fullKey)

    // Initialize or reset if expired
    if (!record || now > record.resetAt) {
        record = {
            count: 0,
            resetAt: now + config.windowMs
        }
        store.set(fullKey, record)
    }

    // Check limit
    if (record.count >= config.limit) {
        const retryAfter = Math.ceil((record.resetAt - now) / 1000)
        throw new RateLimitError(retryAfter)
    }

    // Increment
    record.count++
}
