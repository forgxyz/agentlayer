const ALLIUM_API_BASE = 'https://api.allium.so/api/v1/explorer';

interface QueryResult<T> {
  data: T[];
  meta: {
    columns: { name: string; data_type: string }[];
    row_count: number | null;
    run_id: string | null;
  };
}

export async function runExplorerQuery<T>(
  queryId: string,
  computeProfile?: string
): Promise<T[]> {
  const apiKey = process.env.ALLIUM_API_KEY;
  if (!apiKey) throw new Error('ALLIUM_API_KEY not set');

  // Start query run
  const body = computeProfile ? { compute_profile: computeProfile } : {};
  const runRes = await fetch(`${ALLIUM_API_BASE}/queries/${queryId}/run`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!runRes.ok) {
    const errorText = await runRes.text();
    throw new Error(`Failed to start query: ${runRes.status} ${errorText}`);
  }

  const runData = await runRes.json();

  // Check if results returned synchronously (cached query)
  if (runData.data && Array.isArray(runData.data)) {
    console.log('✅ Query returned cached results synchronously');
    return runData.data;
  }

  // Async execution - get run_id and poll
  const run_id = runData.run_id || runData.id || runData.runId;

  if (!run_id) {
    console.error('Run response:', JSON.stringify(runData));
    throw new Error('No run_id or data in response from query start');
  }

  // Poll for results (5 minutes max for heavy queries)
  for (let i = 0; i < 150; i++) {
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

/**
 * Fetch the latest completed query run results (doesn't start a new run)
 */
export async function fetchLatestQueryRun<T>(queryId: string): Promise<T[]> {
  const apiKey = process.env.ALLIUM_API_KEY;
  if (!apiKey) throw new Error('ALLIUM_API_KEY not set');

  // Get latest run metadata (returns QueryRun object)
  const runRes = await fetch(
    `${ALLIUM_API_BASE}/query-runs?query_id=${queryId}`,
    { headers: { 'X-API-Key': apiKey } }
  );

  if (!runRes.ok) {
    throw new Error(`Failed to fetch latest run: ${runRes.status} ${await runRes.text()}`);
  }

  const runData = await runRes.json();

  // Check if it's a successful run with results
  if (runData.status !== 'success') {
    throw new Error(`Latest run status: ${runData.status}`);
  }

  const runId = runData.run_id;
  if (!runId) {
    throw new Error('No run_id found in latest run');
  }

  // Fetch results for that run
  const resultsRes = await fetch(
    `${ALLIUM_API_BASE}/query-runs/${runId}/results?f=json`,
    { headers: { 'X-API-Key': apiKey } }
  );

  if (!resultsRes.ok) {
    throw new Error(`Failed to fetch results: ${resultsRes.status} ${await resultsRes.text()}`);
  }

  const result: QueryResult<T> = await resultsRes.json();
  return result.data;
}
