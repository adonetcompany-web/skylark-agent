import { NextResponse } from 'next/server';
import { detectAllConflicts } from '@/lib/agent/conflict-detector';

export async function GET() {
    const conflicts = detectAllConflicts();
    return NextResponse.json({ conflicts, total: conflicts.length });
}
