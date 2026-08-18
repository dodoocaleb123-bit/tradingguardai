const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export type SupabaseRow = Record<string, unknown>;

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase is not configured");
  }
}

export async function supabaseRequest<T = SupabaseRow[]>(
  table: string,
  options: { method?: string; query?: string; body?: unknown } = {},
): Promise<T> {
  assertConfig();
  const url = `${SUPABASE_URL!.replace(/\/$/, "")}/rest/v1/${table}${options.query ? `?${options.query}` : ""}`;
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${SUPABASE_ANON_KEY!}`,
      "Content-Type": "application/json",
      Prefer: options.method === "POST" ? "return=representation" : "return=minimal",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${text}`);
  return text ? (JSON.parse(text) as T) : ([] as T);
}

export async function supabaseInsert<T = SupabaseRow[]>(table: string, rows: SupabaseRow | SupabaseRow[]) {
  return supabaseRequest<T>(table, { method: "POST", body: rows });
}

export async function supabaseSelect<T = SupabaseRow[]>(table: string, query = "select=*&order=created_at.desc") {
  return supabaseRequest<T>(table, { query });
}

export async function supabaseUpdate<T = SupabaseRow[]>(table: string, query: string, body: SupabaseRow) {
  return supabaseRequest<T>(table, { method: "PATCH", query, body });
}
