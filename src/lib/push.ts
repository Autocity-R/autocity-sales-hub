import { supabase } from "@/integrations/supabase/client";

/** Publieke VAPID-sleutel — mag in de frontend staan (privékey zit als secret in de edge function). */
export const VAPID_PUBLIC_KEY =
  "BALUuPzD6qRO6sZ091vadS4hE9Fd8fBsy2FhugEg-l95mlOLqxeuueDLQ5KntMQwfOspwrH_PrlE7c3vyLepHTw";

const SW_PATH = "/sw-push.js";

export const pushSupported = (): boolean =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

/** True als de app als PWA op het beginscherm draait (vereist op iOS voor push). */
export const isStandalone = (): boolean =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true);

export const isIos = (): boolean =>
  typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

const registerSw = async (): Promise<ServiceWorkerRegistration> => {
  const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_PATH, { scope: "/" });
};

/** Huidige status voor de UI. */
export const getPushStatus = async (): Promise<{
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
}> => {
  if (!pushSupported()) return { supported: false, permission: "unsupported", subscribed: false };
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return { supported: true, permission: Notification.permission, subscribed: !!sub };
  } catch {
    return { supported: true, permission: Notification.permission, subscribed: false };
  }
};

/** Meldingen aanzetten: permissie vragen, abonneren en opslaan in de database. */
export const enablePush = async (): Promise<{ ok: boolean; error?: string }> => {
  if (!pushSupported()) return { ok: false, error: "Deze browser ondersteunt geen meldingen." };
  if (isIos() && !isStandalone()) {
    return {
      ok: false,
      error:
        "Op de iPhone werkt dit alleen als de app op je beginscherm staat. Open Safari → Deel-knop → 'Zet op beginscherm', start de app daarvandaan en zet meldingen dan aan.",
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: "Meldingen zijn geweigerd in de browser." };

  const reg = await registerSw();
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) return { ok: false, error: "Niet ingelogd." };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, error: "Abonnement kon niet worden gelezen." };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 300),
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false, error: error.message };

  return { ok: true };
};

/** Meldingen uitzetten voor dit apparaat. */
export const disablePush = async (): Promise<{ ok: boolean; error?: string }> => {
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Onbekende fout" };
  }
};