const API_URL = import.meta.env.VITE_API_URL || '';

interface Campaign {
  id: number;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface LineItem {
  id: number;
  campaign_id: number;
  name: string;
  priority: number;
  weight: number;
  frequency_cap: number;
  frequency_cap_period: string;
  status: string;
  created_at: string;
  updated_at: string;
  targeting_rules?: TargetingRule[];
  creatives?: Creative[];
  ad_unit_ids?: number[];
}

interface AdUnit {
  id: number;
  code: string;
  name: string;
  description: string;
  sizes: number[][];
  status: string;
  created_at: string;
  updated_at: string;
}

interface TargetingRule {
  id: number;
  line_item_id: number;
  key: string;
  operator: string;
  values: string[];
}

interface Creative {
  id: number;
  line_item_id: number;
  name: string;
  width: number;
  height: number;
  image_url: string;
  click_url: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ReportSummary {
  total_impressions: number;
  total_clicks: number;
  total_viewable: number;
  ctr: number;
  viewability_rate: number;
}

interface DailyStats {
  date: string;
  impressions: number;
  clicks: number;
  viewable: number;
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Campaigns
export async function getCampaigns(): Promise<Campaign[]> {
  return fetchAPI<Campaign[]>('/api/campaigns');
}

export async function getCampaign(id: number): Promise<Campaign> {
  return fetchAPI<Campaign>(`/api/campaigns/${id}`);
}

export async function createCampaign(data: { name: string; status?: string }): Promise<Campaign> {
  return fetchAPI<Campaign>('/api/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCampaign(id: number, data: { name?: string; status?: string }): Promise<Campaign> {
  return fetchAPI<Campaign>(`/api/campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCampaign(id: number): Promise<void> {
  return fetchAPI<void>(`/api/campaigns/${id}`, { method: 'DELETE' });
}

// Line Items
export async function getLineItems(campaignId: number): Promise<LineItem[]> {
  return fetchAPI<LineItem[]>(`/api/campaigns/${campaignId}/line-items`);
}

export async function getLineItem(id: number): Promise<LineItem> {
  return fetchAPI<LineItem>(`/api/line-items/${id}`);
}

export async function createLineItem(data: {
  campaign_id: number;
  name: string;
  priority?: number;
  frequency_cap?: number;
  status?: string;
}): Promise<LineItem> {
  return fetchAPI<LineItem>('/api/line-items', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateLineItem(id: number, data: Partial<LineItem>): Promise<LineItem> {
  return fetchAPI<LineItem>(`/api/line-items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteLineItem(id: number): Promise<void> {
  return fetchAPI<void>(`/api/line-items/${id}`, { method: 'DELETE' });
}

// Targeting Rules
export async function getTargetingRules(lineItemId: number): Promise<TargetingRule[]> {
  return fetchAPI<TargetingRule[]>(`/api/line-items/${lineItemId}/targeting`);
}

export async function setTargetingRules(
  lineItemId: number,
  rules: { key: string; operator: string; values: string[] }[]
): Promise<TargetingRule[]> {
  return fetchAPI<TargetingRule[]>(`/api/line-items/${lineItemId}/targeting`, {
    method: 'POST',
    body: JSON.stringify({ rules }),
  });
}

// Creatives
export async function getCreatives(lineItemId: number): Promise<Creative[]> {
  return fetchAPI<Creative[]>(`/api/line-items/${lineItemId}/creatives`);
}

export async function getCreative(id: number): Promise<Creative> {
  return fetchAPI<Creative>(`/api/creatives/${id}`);
}

export async function createCreative(data: {
  line_item_id: number;
  name: string;
  width: number;
  height: number;
  image_url: string;
  click_url: string;
}): Promise<Creative> {
  return fetchAPI<Creative>('/api/creatives', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCreative(id: number, data: Partial<Creative>): Promise<Creative> {
  return fetchAPI<Creative>(`/api/creatives/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCreative(id: number): Promise<void> {
  return fetchAPI<void>(`/api/creatives/${id}`, { method: 'DELETE' });
}

// Reports
export async function getReportSummary(startDate?: string, endDate?: string): Promise<{ summary: ReportSummary }> {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  return fetchAPI<{ summary: ReportSummary }>(`/api/reports/summary?${params}`);
}

export async function getDailyReport(startDate?: string, endDate?: string): Promise<{ daily: DailyStats[] }> {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  return fetchAPI<{ daily: DailyStats[] }>(`/api/reports/daily?${params}`);
}

export async function getCampaignReport(
  campaignId: number,
  startDate?: string,
  endDate?: string
): Promise<{ campaign: { impressions: number; clicks: number; viewable: number; ctr: number } }> {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  return fetchAPI(`/api/reports/campaigns/${campaignId}?${params}`);
}

interface KeyValueStat {
  key: string;
  value: string;
  impressions: number;
  clicks: number;
  viewable: number;
  ctr: number;
}

interface LineItemStat {
  line_item_id: number;
  line_item_name: string;
  campaign_name: string;
  impressions: number;
  clicks: number;
  viewable: number;
  ctr: number;
}

export async function getKeyValueReport(
  key: string,
  startDate?: string,
  endDate?: string
): Promise<{ key: string; data: KeyValueStat[] }> {
  const params = new URLSearchParams();
  params.set('key', key);
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  return fetchAPI(`/api/reports/keyvalue?${params}`);
}

export async function getLineItemReport(
  startDate?: string,
  endDate?: string
): Promise<{ data: LineItemStat[] }> {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  return fetchAPI(`/api/reports/lineitems?${params}`);
}

// Uploads
interface UploadResponse {
  success: boolean;
  filename: string;
  image_url: string;
}

export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_URL}/api/uploads`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
}

// Ad Units
export async function getAdUnits(): Promise<AdUnit[]> {
  return fetchAPI<AdUnit[]>('/api/ad-units');
}

export async function getAdUnit(id: number): Promise<AdUnit> {
  return fetchAPI<AdUnit>(`/api/ad-units/${id}`);
}

export async function createAdUnit(data: {
  code: string;
  name: string;
  description?: string;
  sizes?: number[][];
}): Promise<AdUnit> {
  return fetchAPI<AdUnit>('/api/ad-units', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdUnit(id: number, data: Partial<AdUnit>): Promise<AdUnit> {
  return fetchAPI<AdUnit>(`/api/ad-units/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAdUnit(id: number): Promise<void> {
  return fetchAPI<void>(`/api/ad-units/${id}`, { method: 'DELETE' });
}

// Line Item Ad Units
export async function getLineItemAdUnits(lineItemId: number): Promise<{ ad_unit_ids: number[] }> {
  return fetchAPI(`/api/line-items/${lineItemId}/ad-units`);
}

export async function setLineItemAdUnits(lineItemId: number, adUnitIds: number[]): Promise<{ ad_unit_ids: number[] }> {
  return fetchAPI(`/api/line-items/${lineItemId}/ad-units`, {
    method: 'POST',
    body: JSON.stringify({ ad_unit_ids: adUnitIds }),
  });
}

export type { Campaign, LineItem, TargetingRule, Creative, ReportSummary, DailyStats, AdUnit };
