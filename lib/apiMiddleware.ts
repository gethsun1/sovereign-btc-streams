import type { NextApiRequest, NextApiResponse } from "next";
import { createRateLimitMiddleware } from "./rateLimit";

export const withRateLimit = createRateLimitMiddleware({
  windowMs: 60 * 1000,
  maxRequests: 60,
});

export const withStrictRateLimit = createRateLimitMiddleware({
  windowMs: 60 * 1000,
  maxRequests: 10,
});

export function withErrorHandler(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      console.error("API Error:", error);
      
      if (res.headersSent) {
        return;
      }

      const isDevelopment = process.env.NODE_ENV === "development";
      
      res.status(error.statusCode || 500).json({
        error: error.message || "Internal server error",
        ...(isDevelopment && { stack: error.stack }),
      });
    }
  };
}

export function compose(...middlewares: Array<(handler: any) => any>) {
  return (handler: any) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}
