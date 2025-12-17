import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/db";

type ReadyStatus = {
  ready: boolean;
  timestamp: number;
  services: {
    database: boolean;
    application: boolean;
  };
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReadyStatus>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({
      ready: false,
      timestamp: Date.now(),
      services: { database: false, application: false },
      error: "Method not allowed",
    });
  }

  const timestamp = Date.now();
  let dbReady = false;
  let error: string | undefined;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbReady = true;
  } catch (err: any) {
    error = err?.message || "Database not ready";
  }

  const appReady = process.uptime() > 5;
  const ready = dbReady && appReady;
  const statusCode = ready ? 200 : 503;

  return res.status(statusCode).json({
    ready,
    timestamp,
    services: {
      database: dbReady,
      application: appReady,
    },
    error,
  });
}
