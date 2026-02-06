import { NextResponse } from 'next/server';
import type { DailyFlow } from '@/lib/types';

import flowsData from '../../../../public/data/flows.json';

export async function GET() {
  try {
    const flows = flowsData as DailyFlow[];
    return NextResponse.json(flows);
  } catch (error) {
    console.error('Flows API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flows' },
      { status: 500 }
    );
  }
}
