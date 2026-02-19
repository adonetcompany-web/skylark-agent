import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/data-store';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const missions = dataStore.getMissions({
        location: searchParams.get('location') || undefined,
        priority: searchParams.get('priority') || undefined,
        skill: searchParams.get('skill') || undefined,
    });

    return NextResponse.json({ missions });
}
