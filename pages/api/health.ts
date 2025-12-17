import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";

type HealthStatus = {
  status: "healthy" | "unhealthy";
  timestamp: number;
  checks: {
    database: "ok" | "error";
    uptime: number;
  };
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthStatus>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({
      status: "unhealthy",
      timestamp: Date.now(),
      checks: { database: "error", uptime: process.uptime() },
      error: "Method not allowed",
    });
  }

  const timestamp = Date.now();
  const uptime = process.uptime();
  let dbStatus: "ok" | "error" = "error";
  let error: string | undefined;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "ok";
  } catch (err: any) {
    error = err?.message || "Database connection failed";
  }

  const status = dbStatus === "ok" ? "healthy" : "unhealthy";
  const statusCode = status === "healthy" ? 200 : 503;

  return res.status(statusCode).json({
    status,
    timestamp,
    checks: {
      database: dbStatus,
      uptime,
    },
    error,
  });
}
