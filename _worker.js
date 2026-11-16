// Cloudflare Pages Advanced Mode Worker
// 作用：把 Supabase 请求代理到同域 /api/sb/*，绕开部分地区对 *.supabase.co 的连接重置。
const SUPABASE_ORIGIN = "https://fzzjhinfmlpjylvucyyq.supabase.co";
const PREFIX = "/api/sb";

const CORS = {
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,accept-profile,content-profile,range,x-upsert",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    if (url.pathname === PREFIX || url.pathname.startsWith(PREFIX + "/")) {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: { ...CORS, "Access-Control-Allow-Origin": origin, Vary: "Origin" },
        });
      }
      const target = SUPABASE_ORIGIN + url.pathname.slice(PREFIX.length) + url.search;
      const headers = new Headers(request.headers);
      for (const h of ["host", "cf-connecting-ip", "cf-ray", "cf-visitor", "x-forwarded-proto", "origin", "referer"]) {
        headers.delete(h);
      }
      let body;
      if (request.method !== "GET" && request.method !== "HEAD") {
        body = await request.arrayBuffer();
      }
      let upstream;
      try {
        upstream = await fetch(target, { method: request.method, headers, body, redirect: "manual" });
      } catch (e) {
        return new Response(JSON.stringify({ message: "proxy error", detail: String(e) }), {
          status: 502,
          headers: { "content-type": "application/json", "Access-Control-Allow-Origin": origin, Vary: "Origin" },
        });
      }
      const resp = new Response(upstream.body, upstream);
      resp.headers.set("Access-Control-Allow-Origin", origin);
      for (const [k, v] of Object.entries(CORS)) resp.headers.set(k, v);
      resp.headers.set("Vary", "Origin");
      resp.headers.delete("content-security-policy");
      return resp;
    }

    return env.ASSETS.fetch(request);
  },
};
