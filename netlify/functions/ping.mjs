/**
 * Temporary health check for step 1.
 * It proves Functions are deployed and that the functions directory is not
 * served as static files. It will be removed when api.mjs lands.
 */
export default async () =>
  Response.json({
    ok: true,
    service: "portfolio-admin-api",
    now: new Date().toISOString(),
  });

export const config = { path: "/api/ping" };
