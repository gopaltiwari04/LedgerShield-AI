import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "HEALTHY";
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch (error: any) {
    dbStatus = "UNHEALTHY";
    console.error("Health check DB ping failed:", error);
  }

  const overallHealthy = dbStatus === "HEALTHY";

  return NextResponse.json(
    {
      status: overallHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      version: "0.2.0",
      environment: process.env.NODE_ENV || "development",
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        storage: {
          status: "HEALTHY",
          driver: process.env.STORAGE_DRIVER || "local",
        },
        aiProvider: {
          configured: !!process.env.AI_API_KEY,
          provider: process.env.AI_PROVIDER || "deterministic-fallback",
        },
      },
      responseTimeMs: Date.now() - startTime,
    },
    { status: overallHealthy ? 200 : 503 }
  );
}
