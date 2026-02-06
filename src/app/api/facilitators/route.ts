import { NextResponse } from 'next/server';
import type { Facilitator } from '@/lib/types';

import facilitatorsData from '../../../../public/data/facilitators.json';

export async function GET() {
  try {
    const facilitators = facilitatorsData as Facilitator[];
    return NextResponse.json(facilitators);
  } catch (error) {
    console.error('Facilitators API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch facilitators' },
      { status: 500 }
    );
  }
}
