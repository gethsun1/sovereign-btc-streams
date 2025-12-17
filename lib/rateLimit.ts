import type { NextApiRequest, NextApiResponse } from "next";

type RateLimitStore = Map<string, { count: number; resetTime: number }>;

const store: RateLimitStore = new Map();

export type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextApiRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
};

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded
      ? (typeof forwarded === "string" ? forwarded.split(",")[0] : forwarded[0])
      : req.socket.remoteAddress || "unknown";
    return ip;
  },
};

export function rateLimit(config: Partial<RateLimitConfig> = {}) {
  const options = { ...defaultConfig, ...config };

  return async (
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => Promise<void> | void
  ): Promise<void> => {
    const key = options.keyGenerator!(req);
    const now = Date.now();
    const record = store.get(key);

    if (!record || now > record.resetTime) {
      store.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return next();
    }

    if (record.count >= options.maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfter.toString());
      res.setHeader("X-RateLimit-Limit", options.maxRequests.toString());
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", record.resetTime.toString());
      
      return res.status(429).json({
        error: "Too many requests",
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter,
      });
    }

    record.count += 1;
    store.set(key, record);

    res.setHeader("X-RateLimit-Limit", options.maxRequests.toString());
    res.setHeader(
      "X-RateLimit-Remaining",
      (options.maxRequests - record.count).toString()
    );
    res.setHeader("X-RateLimit-Reset", record.resetTime.toString());

    return next();
  };
}

export function createRateLimitMiddleware(config: Partial<RateLimitConfig> = {}) {
  const limiter = rateLimit(config);
  
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      await limiter(req, res, async () => {
        await handler(req, res);
      });
    };
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(key);
    }
  }
}, 60 * 1000);
