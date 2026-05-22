import { api } from "./api";

const SK = "autovisor_session_id";

function getSessionId() {
  let id = localStorage.getItem(SK);
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) || `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SK, id);
  }
  return id;
}

export function trackEvent(type, product_id = null) {
  // Fire-and-forget; never block UI on analytics
  try {
    api.post("/events", { type, product_id, session_id: getSessionId() }).catch((err) => {
      console.warn("analytics post failed", err);
    });
  } catch (err) {
    console.warn("analytics dispatch failed", err);
  }
}
