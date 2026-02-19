import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/data-store';
import { detectAllConflicts } from '@/lib/agent/conflict-detector';

export async function GET() {
    const stats = dataStore.getStats();
    const conflicts = detectAllConflicts();
    stats.activeConflicts = conflicts.length;
    return NextResponse.json(stats);
}
