import { dataStore } from '../data-store';
import { Conflict } from '../types';

// ─── Conflict Detection Engine ────────────────────────────────────────────────

export function detectAllConflicts(): Conflict[] {
    const conflicts: Conflict[] = [];
    const { pilots, drones, missions } = dataStore.getAllData();

    // 1. Double-Booking Detection (Pilot assigned to overlapping projects)
    for (const pilot of pilots) {
        if (pilot.status === 'Assigned' && pilot.current_assignment !== '-') {
            const assignedMission = missions.find(
                m => m.project_id === pilot.current_assignment
            );
            if (assignedMission) {
                for (const otherMission of missions) {
                    if (otherMission.project_id === assignedMission.project_id) continue;
                    // Check if there's a date overlap
                    if (
                        datesOverlap(
                            assignedMission.start_date,
                            assignedMission.end_date,
                            otherMission.start_date,
                            otherMission.end_date
                        )
                    ) {
                        // Check if pilot is also assigned to this mission
                        const otherPilot = pilots.find(
                            p =>
                                p.current_assignment === otherMission.project_id &&
                                p.pilot_id === pilot.pilot_id
                        );
                        if (otherPilot) {
                            conflicts.push({
                                id: `DB-${pilot.pilot_id}-${otherMission.project_id}`,
                                type: 'double_booking',
                                severity: 'critical',
                                title: `Double Booking: ${pilot.name}`,
                                description: `Pilot ${pilot.name} is assigned to ${assignedMission.project_id} (${assignedMission.start_date} to ${assignedMission.end_date}) which overlaps with ${otherMission.project_id} (${otherMission.start_date} to ${otherMission.end_date}).`,
                                entities: [pilot.pilot_id, assignedMission.project_id, otherMission.project_id],
                            });
                        }
                    }
                }
            }
        }
    }

    // 2. Skill/Certification Mismatch
    for (const mission of missions) {
        const assignedPilots = pilots.filter(
            p => p.current_assignment === mission.project_id
        );
        for (const pilot of assignedPilots) {
            // Check skills
            const missingSkills = mission.required_skills.filter(
                s => !pilot.skills.some(ps => ps.toLowerCase() === s.toLowerCase())
            );
            if (missingSkills.length > 0) {
                conflicts.push({
                    id: `SM-${pilot.pilot_id}-${mission.project_id}`,
                    type: 'skill_mismatch',
                    severity: 'critical',
                    title: `Skill Mismatch: ${pilot.name} → ${mission.project_id}`,
                    description: `Pilot ${pilot.name} lacks required skills: ${missingSkills.join(', ')} for mission ${mission.project_id}.`,
                    entities: [pilot.pilot_id, mission.project_id],
                });
            }

            // Check certifications
            const missingCerts = mission.required_certs.filter(
                c => !pilot.certifications.some(pc => pc.toLowerCase() === c.toLowerCase())
            );
            if (missingCerts.length > 0) {
                conflicts.push({
                    id: `CM-${pilot.pilot_id}-${mission.project_id}`,
                    type: 'cert_mismatch',
                    severity: 'critical',
                    title: `Certification Mismatch: ${pilot.name} → ${mission.project_id}`,
                    description: `Pilot ${pilot.name} lacks required certifications: ${missingCerts.join(', ')} for mission ${mission.project_id}.`,
                    entities: [pilot.pilot_id, mission.project_id],
                });
            }
        }
    }

    // 3. Weather Risk Alerts (Non-IP43 drone assigned to rainy mission)
    for (const mission of missions) {
        if (mission.weather_forecast.toLowerCase() === 'rainy') {
            const assignedDrones = drones.filter(
                d => d.current_assignment === mission.project_id
            );
            for (const drone of assignedDrones) {
                if (!drone.weather_resistance.toLowerCase().includes('ip43')) {
                    conflicts.push({
                        id: `WR-${drone.drone_id}-${mission.project_id}`,
                        type: 'weather_risk',
                        severity: 'critical',
                        title: `Weather Risk: ${drone.model} → ${mission.project_id}`,
                        description: `Drone ${drone.drone_id} (${drone.model}) has "${drone.weather_resistance}" rating but mission ${mission.project_id} has Rainy weather forecast. Only IP43 rated drones can fly in rain.`,
                        entities: [drone.drone_id, mission.project_id],
                    });
                }
            }

            // Also warn about potential assignments
            const availableDronesAtLocation = drones.filter(
                d =>
                    d.status === 'Available' &&
                    d.location === mission.location &&
                    !d.weather_resistance.toLowerCase().includes('ip43')
            );
            if (availableDronesAtLocation.length > 0 && assignedDrones.length === 0) {
                conflicts.push({
                    id: `WR-WARN-${mission.project_id}`,
                    type: 'weather_risk',
                    severity: 'warning',
                    title: `Weather Warning: ${mission.project_id} (Rainy)`,
                    description: `Mission ${mission.project_id} in ${mission.location} has Rainy forecast. Available drones at that location without IP43 rating: ${availableDronesAtLocation.map(d => `${d.drone_id} (${d.model})`).join(', ')}. Ensure only IP43-rated drones are assigned.`,
                    entities: [mission.project_id, ...availableDronesAtLocation.map(d => d.drone_id)],
                });
            }
        }
    }

    // 4. Budget Overrun Warnings (Pilot Cost > Mission Budget)
    for (const mission of missions) {
        const missionDays = calculateDays(mission.start_date, mission.end_date);
        const assignedPilots = pilots.filter(
            p => p.current_assignment === mission.project_id
        );

        for (const pilot of assignedPilots) {
            const pilotCost = pilot.daily_rate_inr * missionDays;
            if (pilotCost > mission.mission_budget_inr) {
                conflicts.push({
                    id: `BO-${pilot.pilot_id}-${mission.project_id}`,
                    type: 'budget_overrun',
                    severity: 'warning',
                    title: `Budget Overrun: ${pilot.name} → ${mission.project_id}`,
                    description: `Pilot ${pilot.name} costs ₹${pilotCost} (₹${pilot.daily_rate_inr}/day × ${missionDays} days) but mission budget is ₹${mission.mission_budget_inr}. Over budget by ₹${pilotCost - mission.mission_budget_inr}.`,
                    entities: [pilot.pilot_id, mission.project_id],
                });
            }
        }

        // Also flag available pilots who are too expensive
        const availableButExpensive = pilots.filter(p => {
            if (p.status !== 'Available') return false;
            const cost = p.daily_rate_inr * missionDays;
            return cost > mission.mission_budget_inr;
        });

        if (availableButExpensive.length > 0) {
            conflicts.push({
                id: `BO-WARN-${mission.project_id}`,
                type: 'budget_overrun',
                severity: 'info',
                title: `Budget Notice: ${mission.project_id}`,
                description: `These available pilots exceed the ₹${mission.mission_budget_inr} budget for ${mission.project_id} (${missionDays} days): ${availableButExpensive.map(p => `${p.name} (₹${p.daily_rate_inr * missionDays})`).join(', ')}.`,
                entities: [mission.project_id, ...availableButExpensive.map(p => p.pilot_id)],
            });
        }
    }

    // 5. Location Mismatch (Pilot/Drone and mission in different locations)
    for (const mission of missions) {
        const assignedPilots = pilots.filter(
            p => p.current_assignment === mission.project_id
        );
        for (const pilot of assignedPilots) {
            if (pilot.location.toLowerCase() !== mission.location.toLowerCase()) {
                conflicts.push({
                    id: `LM-${pilot.pilot_id}-${mission.project_id}`,
                    type: 'location_mismatch',
                    severity: 'warning',
                    title: `Location Mismatch: ${pilot.name}`,
                    description: `Pilot ${pilot.name} is in ${pilot.location} but mission ${mission.project_id} is in ${mission.location}.`,
                    entities: [pilot.pilot_id, mission.project_id],
                });
            }
        }

        const assignedDrones = drones.filter(
            d => d.current_assignment === mission.project_id
        );
        for (const drone of assignedDrones) {
            if (drone.location.toLowerCase() !== mission.location.toLowerCase()) {
                conflicts.push({
                    id: `LM-${drone.drone_id}-${mission.project_id}`,
                    type: 'location_mismatch',
                    severity: 'warning',
                    title: `Location Mismatch: ${drone.model}`,
                    description: `Drone ${drone.drone_id} (${drone.model}) is in ${drone.location} but mission ${mission.project_id} is in ${mission.location}.`,
                    entities: [drone.drone_id, mission.project_id],
                });
            }
        }
    }

    // 6. Maintenance Conflict (Drone assigned but in maintenance)
    for (const drone of drones) {
        if (
            drone.status === 'Maintenance' &&
            drone.current_assignment !== '-' &&
            drone.current_assignment !== ''
        ) {
            conflicts.push({
                id: `MC-${drone.drone_id}`,
                type: 'maintenance_conflict',
                severity: 'critical',
                title: `Maintenance Conflict: ${drone.model}`,
                description: `Drone ${drone.drone_id} (${drone.model}) is in Maintenance but assigned to ${drone.current_assignment}. Maintenance due: ${drone.maintenance_due}.`,
                entities: [drone.drone_id, drone.current_assignment],
            });
        }
    }

    return conflicts;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function datesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
): boolean {
    const s1 = new Date(start1);
    const e1 = new Date(end1);
    const s2 = new Date(start2);
    const e2 = new Date(end2);
    return s1 <= e2 && s2 <= e1;
}

export function calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive
}
