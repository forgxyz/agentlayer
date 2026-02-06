import { NextResponse } from 'next/server';
import { invalidateAll, getAllCacheStatus, getCachedData } from '@/lib/redis-cache';
import { fetchers, type DatasetKey } from '@/lib/data-fetchers';

/**
 * Fetch Latest Query Runs Endpoint
 *
 * GET  /api/fetch - Get cache status
 * POST /api/fetch - Fetch latest completed runs (no new queries)
 *
 * Use this to populate cache from already-completed Explorer queries
 * without triggering new runs.
 */

function checkAuth(request: Request): boolean {
  const secret = process.env.REFRESH_SECRET;
  if (!secret) return true; // No auth required if not configured

  const authHeader = request.headers.get('authorization');
  const providedSecret = authHeader?.replace('Bearer ', '');

  return providedSecret === secret;
}

export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = getAllCacheStatus();
  return NextResponse.json({
    cache: await status,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const invalidate = url.searchParams.get('invalidate') === 'true';
  const datasets = url.searchParams.get('datasets')?.split(',') || null;

  // Optionally invalidate cache first
  if (invalidate) {
    if (datasets) {
      for (const key of datasets) {
        // Will implement per-key invalidation if needed
      }
    } else {
      await invalidateAll();
    }
  }

  // Fetch latest completed runs
  const keysToFetch = datasets || Object.keys(fetchers);
  const fetchedKeys: string[] = [];
  const errors: Record<string, string> = {};

  for (const key of keysToFetch) {
    const fetcher = fetchers[key as DatasetKey];
    if (!fetcher) continue;

    try {
      console.log(`📥 Fetching latest run for ${key}...`);
      await getCachedData(key, fetcher.fetchLatest, fetcher.fallback);
      fetchedKeys.push(key);
      console.log(`✅ Cached latest run for ${key}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to fetch ${key}:`, errMsg);
      errors[key] = errMsg;
    }
  }

  return NextResponse.json({
    success: true,
    fetched: fetchedKeys,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  });
}
