const ALLIUM_API_BASE = 'https://api.allium.so/api/v1/explorer';

interface QueryResult<T> {
  data: T[];
  meta: {
    columns: { name: string; data_type: string }[];
    row_count: number | null;
    run_id: string | null;
  };
}

export async function runExplorerQuery<T>(queryId: string): Promise<T[]> {
  const apiKey = process.env.ALLIUM_API_KEY;
  if (!apiKey) throw new Error('ALLIUM_API_KEY not set');

  // Start query run
  const runRes = await fetch(`${ALLIUM_API_BASE}/queries/${queryId}/run`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!runRes.ok) {
    throw new Error(`Failed to start query: ${runRes.status} ${await runRes.text()}`);
  }

  const { run_id } = await runRes.json();

  // Poll for results
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));

    const statusRes = await fetch(
      `${ALLIUM_API_BASE}/query-runs/${run_id}/status`,
      { headers: { 'X-API-Key': apiKey } }
    );

    if (!statusRes.ok) continue;
    const status = await statusRes.json();

    if (status.status === 'success') {
      const resultsRes = await fetch(
        `${ALLIUM_API_BASE}/query-runs/${run_id}/results?f=json`,
        { headers: { 'X-API-Key': apiKey } }
      );
      if (!resultsRes.ok) throw new Error('Failed to fetch results');
      const result: QueryResult<T> = await resultsRes.json();
      return result.data;
    }

    if (status.status === 'failed') {
      throw new Error(`Query failed: ${status.error || 'Unknown error'}`);
    }
  }

  throw new Error('Query timed out');
}
