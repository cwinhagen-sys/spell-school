export async function GET() {
  return Response.json({
    region: process.env.VERCEL_REGION || "unknown",
    environment: process.env.NODE_ENV || "unknown",
    isVercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString(),
    info: "Lokalt: region kommer att vara 'unknown'. På Vercel kommer du se 'fra1' (Frankfurt) eller 'ams1' (Amsterdam) för EU."
  });
}
