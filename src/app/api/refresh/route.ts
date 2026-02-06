import { NextResponse } from 'next/server';
import { invalidateAll, getAllCacheStatus, getCachedData } from '@/lib/redis-cache';
import { fetchers, type DatasetKey } from '@/lib/data-fetchers';

/**
 * Cache Refresh Endpoint
 *
 * GET  /api/refresh - Get cache status
 * POST /api/refresh - Invalidate cache (optionally pre-warm)
 *
 * Protected by REFRESH_SECRET env var
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
  const summary = {
    total_keys: Object.keys(status).length,
    fresh: 0,
    stale: 0,
    missing: 0,
  };

  for (const entry of Object.values(status)) {
    if (!entry.exists) {
      summary.missing++;
    } else if (entry.isStale) {
      summary.stale++;
    } else {
      summary.fresh++;
    }
  }

  return NextResponse.json({
    summary,
    cache: status,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const prewarm = url.searchParams.get('prewarm') === 'true';
  const datasets = url.searchParams.get('datasets')?.split(',') || null;

  // Invalidate cache
  if (datasets) {
    // Invalidate specific datasets
    for (const key of datasets) {
      invalidateAll(); // For now, just invalidate all (fine-grained per-key later if needed)
    }
  } else {
    invalidateAll();
  }

  let prewarmed: string[] = [];
  if (prewarm) {
    const keysToWarm = datasets || Object.keys(fetchers);
    const warmPromises = keysToWarm.map(async (key) => {
      const fetcher = fetchers[key as DatasetKey];
      if (!fetcher) return null;
      try {
        await getCachedData(key, fetcher.fetch, fetcher.fallback);
        return key;
      } catch (error) {
        console.error(`Failed to prewarm ${key}:`, error);
        return null;
      }
    });

    const results = await Promise.allSettled(warmPromises);
    prewarmed = results
      .filter((r) => r.status === 'fulfilled' && r.value !== null)
      .map((r) => (r as PromiseFulfilledResult<string | null>).value!);
  }

  return NextResponse.json({
    success: true,
    invalidated: datasets || 'all',
    prewarmed: prewarm ? prewarmed : null,
    timestamp: new Date().toISOString(),
  });
}
