// Gmail integration: read-only access to a user's own inbox (their own OAuth
// consent, their own data) to auto-detect application status changes —
// "did company X reply, and does it sound like an interview/rejection/offer?"
// This is NOT scraping — it's the official Gmail REST API against an account
// that explicitly granted access.

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

function getClientCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Gmail integration isn't configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (see docs/DEPLOYMENT.md)."
    );
  }
  return { clientId, clientSecret };
}

export function isGmailConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGmailAuthUrl(redirectUri: string, state: string): string {
  const { clientId } = getClientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const { clientId, clientSecret } = getClientCredentials();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = getClientCredentials();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token refresh failed (${res.status}): ${await res.text()}`);
  }
  const data: TokenResponse = await res.json();
  return data.access_token;
}

export async function getGmailUserEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(`${GMAIL_API_BASE}/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.emailAddress ?? null;
}

type GmailMessageSummary = { subject: string; snippet: string; from: string };

// Searches for messages mentioning the given company, received after
// `sinceDate`, and returns their subject/snippet/sender for classification.
export async function searchCompanyMessages(
  accessToken: string,
  company: string,
  sinceDate: Date,
  maxResults = 5
): Promise<GmailMessageSummary[]> {
  const afterEpoch = Math.floor(sinceDate.getTime() / 1000);
  const q = `(from:${JSON.stringify(company)} OR subject:${JSON.stringify(company)}) after:${afterEpoch}`;
  const listRes = await fetch(
    `${GMAIL_API_BASE}/messages?q=${encodeURIComponent(q)}&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) return [];
  const listData = await listRes.json();
  const ids: string[] = (listData.messages ?? []).map((m: { id: string }) => m.id);
  if (ids.length === 0) return [];

  const messages = await Promise.all(
    ids.map(async (id) => {
      const res = await fetch(
        `${GMAIL_API_BASE}/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const headers: { name: string; value: string }[] = data.payload?.headers ?? [];
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
      const from = headers.find((h) => h.name === "From")?.value ?? "";
      return { subject, snippet: data.snippet ?? "", from };
    })
  );
  return messages.filter((m): m is GmailMessageSummary => m !== null);
}

export type EmailClassification = "interview" | "offer" | "rejected" | "responded" | null;

const REJECTION_PATTERNS = [
  "unfortunately",
  "not moving forward",
  "not selected",
  "other candidates",
  "will not be",
  "decided not to proceed",
  "pursue other applicants",
  "position has been filled",
];
const OFFER_PATTERNS = [
  "pleased to offer",
  "excited to offer",
  "offer letter",
  "job offer",
  "welcome to the team",
  "extend an offer",
];
const INTERVIEW_PATTERNS = [
  "interview",
  "schedule a call",
  "schedule a chat",
  "next steps",
  "would like to speak",
  "phone screen",
  "hiring manager would like",
];

// Very deliberately simple keyword matching, not an AI call — this runs
// against every applied job's inbox search results on every scheduled sync,
// so it needs to be fast and free. Checked in priority order: an email
// mentioning both "interview" and "unfortunately" is almost always a
// rejection ("we won't be moving forward with an interview"), so rejection
// patterns are checked first.
export function classifyEmail(subject: string, snippet: string): EmailClassification {
  const text = `${subject} ${snippet}`.toLowerCase();
  if (REJECTION_PATTERNS.some((p) => text.includes(p))) return "rejected";
  if (OFFER_PATTERNS.some((p) => text.includes(p))) return "offer";
  if (INTERVIEW_PATTERNS.some((p) => text.includes(p))) return "interview";
  return "responded";
}
