import { identity, cors, json, status } from "../_shared/auth.ts";
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: cors(req) });
  if (req.method !== "POST")
    return json(req, { error: "Method not allowed" }, 405);
  try {
    await identity(req, true);
    const p = await req.json(),
      key = Deno.env.get("ORS_API_KEY");
    if (!key)
      throw new Error(
        "Routing is pending configuration: set the server-only ORS_API_KEY.",
      );
    let response: Response;
    if (p.action === "geocode") {
      if (
        typeof p.text !== "string" ||
        p.text.trim().length < 3 ||
        p.text.length > 240
      )
        throw new Error(
          "Enter a Philippine address between 3 and 240 characters.",
        );
      const u = new URL("https://api.openrouteservice.org/geocode/search");
      u.searchParams.set("text", p.text);
      u.searchParams.set("boundary.country", "PH");
      u.searchParams.set("size", "5");
      response = await fetch(u, {
        headers: { Authorization: key },
        signal: AbortSignal.timeout(15000),
      });
    } else if (p.action === "directions") {
      if (
        !Array.isArray(p.coordinates) ||
        p.coordinates.length !== 2 ||
        !p.coordinates.every(
          (c: unknown) =>
            Array.isArray(c) &&
            c.length === 2 &&
            c.every(Number.isFinite) &&
            c[0] >= -180 &&
            c[0] <= 180 &&
            c[1] >= -90 &&
            c[1] <= 90,
        )
      )
        throw new Error("Supply two valid [longitude, latitude] coordinates.");
      response = await fetch(
        "https://api.openrouteservice.org/v2/directions/driving-hgv/geojson",
        {
          method: "POST",
          headers: { Authorization: key, "Content-Type": "application/json" },
          body: JSON.stringify({ coordinates: p.coordinates }),
          signal: AbortSignal.timeout(20000),
        },
      );
    } else throw new Error("Unknown route action");
    if (!response.ok)
      throw new Error(
        `Routing provider returned ${response.status}. Check locations, API key, and provider quota.`,
      );
    return json(req, await response.json());
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    return json(req, { error: error.message }, status(error));
  }
});
