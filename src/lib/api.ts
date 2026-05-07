const BASE_URL = 'http://localhost:8000';

/**
 * Internal helper function for making GET requests
 * Throws on non-ok responses
 */
async function get<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `API Error ${response.status}: ${errorText || response.statusText}`
    );
  }

  return response.json();
}

/**
 * Health check endpoint
 */
export async function getHealth(): Promise<{ status: string }> {
  return get('/health');
}

/**
 * Get available events and default event
 */
export async function getEvents(): Promise<{ events: string[]; default: string }> {
  return get('/events');
}

/**
 * Get event volume data grouped by period
 */
export async function getEventVolume(
  event: string,
  periodType: 'daily' | 'weekly' = 'daily'
): Promise<{ period: string; period_type: string; event_count: number }[]> {
  const params = new URLSearchParams({ period_type: periodType });
  return get(`/signals/${event}/event-volume?${params.toString()}`);
}

/**
 * Get event type breakdown (CAMEO codes)
 */
export async function getEventType(
  event: string
): Promise<{ cameo_root: string; cameo_description: string; event_count: number }[]> {
  return get(`/signals/${event}/event-type`);
}

/**
 * Get actor frequency for an event
 */
export async function getActorFrequency(
  event: string,
  limit: number = 10
): Promise<{ actor: string; event_count: number }[]> {
  const params = new URLSearchParams({ limit: limit.toString() });
  return get(`/signals/${event}/actor-frequency?${params.toString()}`);
}

/**
 * Get location frequency for an event
 */
export async function getLocationFrequency(
  event: string,
  limit: number = 10
): Promise<{ location: string; country: string; event_count: number }[]> {
  const params = new URLSearchParams({ limit: limit.toString() });
  return get(`/signals/${event}/location-frequency?${params.toString()}`);
}

/**
 * Get tone over time for an event
 */
export async function getToneOverTime(
  event: string,
  periodType: 'daily' | 'weekly' = 'daily'
): Promise<{ period: string; avg_tone: number }[]> {
  const params = new URLSearchParams({ period_type: periodType });
  return get(`/signals/${event}/tone-over-time?${params.toString()}`);
}

/**
 * Get media attention (mentions) over time for an event
 */
export async function getMediaAttention(
  event: string,
  periodType: 'daily' | 'weekly' = 'daily'
): Promise<{ period: string; total_mentions: number }[]> {
  const params = new URLSearchParams({ period_type: periodType });
  return get(`/signals/${event}/media-attention?${params.toString()}`);
}

/**
 * Get actor-location network graph data
 */
export async function getActorLocationGraph(
  event: string,
  minEdgeWeight: number = 1
): Promise<{ nodes: object[]; edges: object[] }> {
  const params = new URLSearchParams({
    min_edge_weight: minEdgeWeight.toString(),
  });
  return get(`/signals/${event}/actor-location-graph?${params.toString()}`);
}

/**
 * Get dashboard summary for an event
 */
export async function getDashboardSummary(
  event: string
): Promise<Record<string, unknown>> {
  return get(`/dashboard/${event}/summary`);
}

/**
 * Get recent events
 */
export async function getRecentEvents(
  event: string,
  limit: number = 10
): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({ limit: limit.toString() });
  return get(`/dashboard/${event}/recent-events?${params.toString()}`);
}

/**
 * Get saved graphs
 */
export async function getSavedGraphs(
  event: string
): Promise<Record<string, unknown>[]> {
  return get(`/graphs/${event}`);
}

/**
 * Delete a saved graph
 */
export async function deleteGraph(id: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/graphs/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `API Error ${response.status}: ${errorText || response.statusText}`
    );
  }
}

/**
 * Update graph visibility
 */
export async function updateGraphVisibility(
  id: number,
  visible: boolean
): Promise<void> {
  const response = await fetch(`${BASE_URL}/graphs/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ visible }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `API Error ${response.status}: ${errorText || response.statusText}`
    );
  }
}
