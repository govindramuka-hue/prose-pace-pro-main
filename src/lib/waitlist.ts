const WAITLIST_KEY = "lumen:waitlist:v1";
const SUPABASE_URL = "https://ymvxhigodzshwmgehlkd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_USgP-kAmfMTrg-026Pb4xw_bGO6eZ65";

export interface WaitlistEntry {
  email: string;
  name?: string;
  readingTypes?: string[];
  priorities?: string[];
  createdAt: string;
  source: string;
  userAgent: string;
  timezone: string;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readEntries(): WaitlistEntry[] {
  try {
    return JSON.parse(localStorage.getItem(WAITLIST_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function listWaitlistEntries() {
  return readEntries();
}

export async function joinWaitlist(entry: Omit<WaitlistEntry, "email" | "createdAt" | "userAgent" | "timezone"> & { email: string }) {
  const email = normalizeEmail(entry.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const entries = readEntries();
  const existing = entries.find(item => normalizeEmail(item.email) === email);
  if (existing) {
    return { ok: false as const, reason: "duplicate" as const, entry: existing };
  }

  const fullEntry: WaitlistEntry = {
    ...entry,
    email,
    createdAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  const saved = await saveToSupabase(fullEntry);
  if (!saved.ok) return saved;

  entries.push(fullEntry);
  localStorage.setItem(WAITLIST_KEY, JSON.stringify(entries));
  return { ok: true as const, duplicate: false as const, entry: fullEntry };
}

async function saveToSupabase(entry: WaitlistEntry) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        email: entry.email,
        name: entry.name ?? null,
        reading_types: entry.readingTypes ?? [],
        priorities: entry.priorities ?? [],
        source: entry.source,
        user_agent: entry.userAgent,
        timezone: entry.timezone,
        created_at: entry.createdAt,
      }),
    });

    if (res.ok) return { ok: true as const };

    const text = await res.text();
    if (res.status === 409 || text.includes("duplicate key")) {
      return { ok: false as const, reason: "duplicate" as const };
    }
    console.error("Waitlist save failed", text);
    return { ok: false as const, reason: "unavailable" as const };
  } catch (error) {
    console.error("Waitlist save failed", error);
    return { ok: false as const, reason: "unavailable" as const };
  }
}
