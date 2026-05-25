import axios from "axios";

// Resolve API base URL:
// - Use REACT_APP_BACKEND_URL when present (preview / dev).
// - Otherwise (and when the configured URL doesn't match the current host),
//   fall back to the same-origin "/api" so the production domain talks to its
//   own backend without cross-origin CORS issues.
function resolveApiBase() {
  const configured = process.env.REACT_APP_BACKEND_URL;
  if (typeof window !== "undefined" && configured) {
    try {
      const u = new URL(configured);
      if (u.host !== window.location.host) {
        return "/api"; // same-origin fallback for production deploys
      }
    } catch (_) {
      return "/api";
    }
  }
  if (!configured) return "/api";
  return `${configured}/api`;
}

export const API = resolveApiBase();

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (detail == null) return err?.message || "Algo deu errado. Tente novamente.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
