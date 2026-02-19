import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/data-store';
import { sheetsService } from '@/lib/google-sheets';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const drones = dataStore.getDrones({
        capability: searchParams.get('capability') || undefined,
        status: searchParams.get('status') || undefined,
        location: searchParams.get('location') || undefined,
        weatherResistant: searchParams.get('weather_resistant') === 'true' || undefined,
    });

    return NextResponse.json({ drones });
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { drone_id, status, assignment } = body;

        if (!drone_id || !status) {
            return NextResponse.json(
                { error: 'drone_id and status are required.' },
                { status: 400 }
            );
        }

        const drone = dataStore.updateDroneStatus(drone_id, status, assignment);
        if (!drone) {
            return NextResponse.json(
                { error: `Drone ${drone_id} not found.` },
                { status: 404 }
            );
        }

        const synced = await sheetsService.syncDroneStatus(
            drone_id,
            status,
            assignment || drone.current_assignment
        );

        return NextResponse.json({ drone, google_sheets_synced: synced });
    } catch (error) {
        console.error('Drone update error:', error);
        return NextResponse.json(
            { error: 'Failed to update drone.' },
            { status: 500 }
        );
    }
}
