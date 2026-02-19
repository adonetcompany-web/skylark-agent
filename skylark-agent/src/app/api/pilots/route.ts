import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/data-store';
import { sheetsService } from '@/lib/google-sheets';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const pilots = dataStore.getPilots({
        skill: searchParams.get('skill') || undefined,
        certification: searchParams.get('certification') || undefined,
        location: searchParams.get('location') || undefined,
        status: searchParams.get('status') || undefined,
    });

    return NextResponse.json({ pilots });
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { pilot_id, status, assignment } = body;

        if (!pilot_id || !status) {
            return NextResponse.json(
                { error: 'pilot_id and status are required.' },
                { status: 400 }
            );
        }

        const pilot = dataStore.updatePilotStatus(pilot_id, status, assignment);
        if (!pilot) {
            return NextResponse.json(
                { error: `Pilot ${pilot_id} not found.` },
                { status: 404 }
            );
        }

        // Sync to Google Sheets
        const synced = await sheetsService.syncPilotStatus(
            pilot_id,
            status,
            assignment || pilot.current_assignment
        );

        return NextResponse.json({ pilot, google_sheets_synced: synced });
    } catch (error) {
        console.error('Pilot update error:', error);
        return NextResponse.json(
            { error: 'Failed to update pilot.' },
            { status: 500 }
        );
    }
}
