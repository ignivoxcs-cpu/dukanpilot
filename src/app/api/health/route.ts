// Used by Render to check the app is running.
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ ok: true });
}
