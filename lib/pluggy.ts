const BASE = 'https://api.pluggy.ai';

async function getApiKey(): Promise<string> {
  const res = await fetch(`${BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: process.env.PLUGGY_CLIENT_ID!,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new Error(`Pluggy auth failed: ${res.status}`);
  const data = await res.json();
  return data.apiKey;
}

export async function createConnectToken(itemId?: string): Promise<string> {
  const apiKey = await getApiKey();
  const body: Record<string, unknown> = {};
  if (itemId) body.itemId = itemId;
  const res = await fetch(`${BASE}/connect_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Connect token failed: ${res.status}`);
  const data = await res.json();
  return data.accessToken;
}

export interface PluggyInvestmentTransaction {
  id: string;
  type: 'BUY' | 'SELL' | 'TAX' | 'TRANSFER';
  name: string;
  quantity: number;
  value: number;
  amount: number;
  tradeDate: string;
  date: string;
}

export async function getInvestmentTransactions(
  itemId: string,
  dateFrom: string,
  dateTo: string,
): Promise<PluggyInvestmentTransaction[]> {
  const apiKey = await getApiKey();
  const params = new URLSearchParams({ itemId, dateFrom, dateTo, pageSize: '500' });
  const res = await fetch(`${BASE}/investment-transactions?${params}`, {
    headers: { 'X-API-KEY': apiKey },
  });
  if (!res.ok) throw new Error(`Pluggy transactions failed: ${res.status}`);
  const data = await res.json();
  return data.results ?? [];
}
