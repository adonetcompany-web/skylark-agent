import { dataStore } from '../data-store';
import { sheetsService } from '../google-sheets';
import {
    detectAllConflicts,
    calculateDays,
} from './conflict-detector';

// ─── Agent Tool Definitions ───────────────────────────────────────────────────

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}

export const toolDefinitions: ToolDefinition[] = [
    {
        name: 'query_pilots',
        description:
            'Query the pilot roster with optional filters. Returns a list of pilots matching the criteria. You can filter by skill (e.g., "Mapping", "Inspection", "Thermal", "Survey"), certification (e.g., "DGCA", "Night Ops"), location (e.g., "Bangalore", "Mumbai"), and status (e.g., "Available", "Assigned", "On Leave").',
        parameters: {
            type: 'object',
            properties: {
                skill: { type: 'string', description: 'Filter by pilot skill' },
                certification: { type: 'string', description: 'Filter by certification' },
                location: { type: 'string', description: 'Filter by location' },
                status: { type: 'string', description: 'Filter by status' },
            },
        },
    },
    {
        name: 'get_pilot_cost',
        description:
            'Calculate the total cost for a pilot on a specific mission based on their daily rate and mission duration.',
        parameters: {
            type: 'object',
            properties: {
                pilot_name: {
                    type: 'string',
                    description: 'Name or ID of the pilot',
                },
                mission_id: {
                    type: 'string',
                    description: 'Project ID of the mission (e.g., PRJ001)',
                },
            },
            required: ['pilot_name', 'mission_id'],
        },
    },
    {
        name: 'update_pilot_status',
        description:
            'Update a pilot\'s status and optionally their current assignment. Syncs changes to Google Sheets. Valid statuses: Available, Assigned, On Leave, Unavailable.',
        parameters: {
            type: 'object',
            properties: {
                pilot_id: {
                    type: 'string',
                    description: 'Pilot ID (e.g., P001)',
                },
                status: {
                    type: 'string',
                    enum: ['Available', 'Assigned', 'On Leave', 'Unavailable'],
                    description: 'New status for the pilot',
                },
                assignment: {
                    type: 'string',
                    description:
                        'Current assignment project ID. Use "-" for no assignment.',
                },
            },
            required: ['pilot_id', 'status'],
        },
    },
    {
        name: 'match_pilot_to_mission',
        description:
            'Find the best matching pilot for a given mission based on skills, certifications, location, availability, and budget. Returns ranked candidates.',
        parameters: {
            type: 'object',
            properties: {
                mission_id: {
                    type: 'string',
                    description: 'Project ID of the mission (e.g., PRJ001)',
                },
            },
            required: ['mission_id'],
        },
    },
    {
        name: 'query_drones',
        description:
            'Query the drone fleet with optional filters. Returns a list of drones matching the criteria. You can filter by capability (e.g., "LiDAR", "RGB", "Thermal"), status (e.g., "Available", "Maintenance", "Deployed"), location, and weather resistance.',
        parameters: {
            type: 'object',
            properties: {
                capability: { type: 'string', description: 'Filter by drone capability' },
                status: { type: 'string', description: 'Filter by status' },
                location: { type: 'string', description: 'Filter by location' },
                weather_resistant: {
                    type: 'boolean',
                    description: 'Filter for IP43-rated weather resistant drones only',
                },
            },
        },
    },
    {
        name: 'match_drone_to_mission',
        description:
            'Find the best matching drone for a given mission based on weather compatibility, capabilities, location, and availability.',
        parameters: {
            type: 'object',
            properties: {
                mission_id: {
                    type: 'string',
                    description: 'Project ID of the mission (e.g., PRJ001)',
                },
            },
            required: ['mission_id'],
        },
    },
    {
        name: 'update_drone_status',
        description:
            'Update a drone\'s status and optionally its current assignment. Syncs changes to Google Sheets.',
        parameters: {
            type: 'object',
            properties: {
                drone_id: {
                    type: 'string',
                    description: 'Drone ID (e.g., D001)',
                },
                status: {
                    type: 'string',
                    enum: ['Available', 'Maintenance', 'Deployed'],
                    description: 'New status for the drone',
                },
                assignment: {
                    type: 'string',
                    description:
                        'Current assignment project ID. Use "-" for no assignment.',
                },
            },
            required: ['drone_id', 'status'],
        },
    },
    {
        name: 'detect_conflicts',
        description:
            'Run comprehensive conflict detection across all data. Checks for: double-bookings, skill/certification mismatches, weather risks, budget overruns, location mismatches, and maintenance conflicts.',
        parameters: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'get_assignments',
        description:
            'Get all current active assignments — showing which pilots and drones are assigned to which missions.',
        parameters: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'query_missions',
        description:
            'Query missions with optional filters by location, priority, or required skill.',
        parameters: {
            type: 'object',
            properties: {
                location: { type: 'string', description: 'Filter by mission location' },
                priority: { type: 'string', description: 'Filter by priority (Standard, High, Urgent)' },
                skill: { type: 'string', description: 'Filter by required skill' },
            },
        },
    },
    {
        name: 'handle_urgent_reassignment',
        description:
            'Handle an urgent reassignment request for a mission. Finds the best available replacement pilot and drone, considering all constraints (skills, certs, location, weather, budget). Use this when a currently assigned pilot or drone becomes unavailable.',
        parameters: {
            type: 'object',
            properties: {
                mission_id: {
                    type: 'string',
                    description: 'Project ID of the mission needing reassignment',
                },
                reason: {
                    type: 'string',
                    description: 'Reason for the urgent reassignment',
                },
            },
            required: ['mission_id'],
        },
    },
    {
        name: 'get_dashboard_stats',
        description:
            'Get summary statistics for the dashboard: total/available pilots, drones, active/urgent missions, and conflict count.',
        parameters: {
            type: 'object',
            properties: {},
        },
    },
];

// ─── Tool Execution ───────────────────────────────────────────────────────────

export async function executeTool(
    name: string,
    args: Record<string, unknown>
): Promise<string> {
    try {
        switch (name) {
            case 'query_pilots':
                return handleQueryPilots(args);
            case 'get_pilot_cost':
                return handleGetPilotCost(args);
            case 'update_pilot_status':
                return await handleUpdatePilotStatus(args);
            case 'match_pilot_to_mission':
                return handleMatchPilotToMission(args);
            case 'query_drones':
                return handleQueryDrones(args);
            case 'match_drone_to_mission':
                return handleMatchDroneToMission(args);
            case 'update_drone_status':
                return await handleUpdateDroneStatus(args);
            case 'detect_conflicts':
                return handleDetectConflicts();
            case 'get_assignments':
                return handleGetAssignments();
            case 'query_missions':
                return handleQueryMissions(args);
            case 'handle_urgent_reassignment':
                return await handleUrgentReassignment(args);
            case 'get_dashboard_stats':
                return handleGetDashboardStats();
            default:
                return JSON.stringify({ error: `Unknown tool: ${name}` });
        }
    } catch (error) {
        return JSON.stringify({
            error: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
    }
}

// ─── Tool Handlers ────────────────────────────────────────────────────────────

function handleQueryPilots(args: Record<string, unknown>): string {
    const pilots = dataStore.getPilots({
        skill: args.skill as string | undefined,
        certification: args.certification as string | undefined,
        location: args.location as string | undefined,
        status: args.status as string | undefined,
    });

    if (pilots.length === 0) {
        return JSON.stringify({ message: 'No pilots found matching the criteria.', pilots: [] });
    }

    return JSON.stringify({
        message: `Found ${pilots.length} pilot(s) matching your criteria.`,
        pilots: pilots.map(p => ({
            id: p.pilot_id,
            name: p.name,
            skills: p.skills.join(', '),
            certifications: p.certifications.join(', '),
            location: p.location,
            status: p.status,
            assignment: p.current_assignment,
            daily_rate: `₹${p.daily_rate_inr}`,
            available_from: p.available_from,
        })),
    });
}

function handleGetPilotCost(args: Record<string, unknown>): string {
    const pilotName = args.pilot_name as string;
    const missionId = args.mission_id as string;

    let pilot = dataStore.getPilotByName(pilotName);
    if (!pilot) {
        pilot = dataStore.getPilotById(pilotName);
    }
    if (!pilot) {
        return JSON.stringify({ error: `Pilot "${pilotName}" not found.` });
    }

    const mission = dataStore.getMissionById(missionId);
    if (!mission) {
        return JSON.stringify({ error: `Mission "${missionId}" not found.` });
    }

    const days = calculateDays(mission.start_date, mission.end_date);
    const totalCost = pilot.daily_rate_inr * days;
    const withinBudget = totalCost <= mission.mission_budget_inr;

    return JSON.stringify({
        pilot: pilot.name,
        mission: mission.project_id,
        daily_rate: `₹${pilot.daily_rate_inr}`,
        mission_duration: `${days} days (${mission.start_date} to ${mission.end_date})`,
        total_cost: `₹${totalCost}`,
        mission_budget: `₹${mission.mission_budget_inr}`,
        within_budget: withinBudget,
        budget_difference: withinBudget
            ? `Under budget by ₹${mission.mission_budget_inr - totalCost}`
            : `Over budget by ₹${totalCost - mission.mission_budget_inr}`,
    });
}

async function handleUpdatePilotStatus(
    args: Record<string, unknown>
): Promise<string> {
    const pilotId = args.pilot_id as string;
    const status = args.status as 'Available' | 'Assigned' | 'On Leave' | 'Unavailable';
    const assignment = (args.assignment as string) || (status === 'Available' ? '-' : undefined);

    const pilot = dataStore.updatePilotStatus(pilotId, status, assignment);
    if (!pilot) {
        return JSON.stringify({ error: `Pilot "${pilotId}" not found.` });
    }

    // Sync to Google Sheets
    const synced = await sheetsService.syncPilotStatus(
        pilotId,
        status,
        assignment || pilot.current_assignment
    );

    return JSON.stringify({
        message: `Pilot ${pilot.name} (${pilotId}) status updated to "${status}".`,
        pilot: {
            id: pilot.pilot_id,
            name: pilot.name,
            status: pilot.status,
            assignment: pilot.current_assignment,
        },
        google_sheets_synced: synced,
    });
}

function handleMatchPilotToMission(args: Record<string, unknown>): string {
    const missionId = args.mission_id as string;
    const mission = dataStore.getMissionById(missionId);
    if (!mission) {
        return JSON.stringify({ error: `Mission "${missionId}" not found.` });
    }

    const availablePilots = dataStore.getPilots({ status: 'Available' });
    const days = calculateDays(mission.start_date, mission.end_date);

    const candidates = availablePilots.map(pilot => {
        let score = 0;
        const issues: string[] = [];

        // Skills check
        const hasSkills = mission.required_skills.every(s =>
            pilot.skills.some(ps => ps.toLowerCase() === s.toLowerCase())
        );
        if (hasSkills) score += 30;
        else {
            const missing = mission.required_skills.filter(
                s => !pilot.skills.some(ps => ps.toLowerCase() === s.toLowerCase())
            );
            issues.push(`Missing skills: ${missing.join(', ')}`);
        }

        // Certification check
        const hasCerts = mission.required_certs.every(c =>
            pilot.certifications.some(pc => pc.toLowerCase() === c.toLowerCase())
        );
        if (hasCerts) score += 25;
        else {
            const missing = mission.required_certs.filter(
                c => !pilot.certifications.some(pc => pc.toLowerCase() === c.toLowerCase())
            );
            issues.push(`Missing certifications: ${missing.join(', ')}`);
        }

        // Location check
        if (pilot.location.toLowerCase() === mission.location.toLowerCase()) {
            score += 20;
        } else {
            issues.push(
                `Location mismatch: pilot in ${pilot.location}, mission in ${mission.location}`
            );
        }

        // Budget check
        const totalCost = pilot.daily_rate_inr * days;
        if (totalCost <= mission.mission_budget_inr) {
            score += 15;
        } else {
            issues.push(
                `Over budget: ₹${totalCost} > ₹${mission.mission_budget_inr}`
            );
        }

        // Availability check
        const availableDate = new Date(pilot.available_from);
        const missionStart = new Date(mission.start_date);
        if (availableDate <= missionStart) {
            score += 10;
        } else {
            issues.push(
                `Not available until ${pilot.available_from} (mission starts ${mission.start_date})`
            );
        }

        return {
            pilot_id: pilot.pilot_id,
            name: pilot.name,
            score,
            total_cost: `₹${totalCost}`,
            issues,
            fully_compatible: issues.length === 0,
        };
    });

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    return JSON.stringify({
        mission: {
            id: mission.project_id,
            client: mission.client,
            location: mission.location,
            required_skills: mission.required_skills.join(', '),
            required_certs: mission.required_certs.join(', '),
            budget: `₹${mission.mission_budget_inr}`,
            duration: `${days} days`,
            weather: mission.weather_forecast,
        },
        candidates,
        recommendation:
            candidates.length > 0 && candidates[0].fully_compatible
                ? `Best match: ${candidates[0].name} (${candidates[0].pilot_id}) — fully compatible with score ${candidates[0].score}/100`
                : candidates.length > 0
                    ? `Best available: ${candidates[0].name} (${candidates[0].pilot_id}) with score ${candidates[0].score}/100. Issues: ${candidates[0].issues.join('; ')}`
                    : 'No available pilots found.',
    });
}

function handleQueryDrones(args: Record<string, unknown>): string {
    const drones = dataStore.getDrones({
        capability: args.capability as string | undefined,
        status: args.status as string | undefined,
        location: args.location as string | undefined,
        weatherResistant: args.weather_resistant as boolean | undefined,
    });

    if (drones.length === 0) {
        return JSON.stringify({ message: 'No drones found matching the criteria.', drones: [] });
    }

    return JSON.stringify({
        message: `Found ${drones.length} drone(s) matching your criteria.`,
        drones: drones.map(d => ({
            id: d.drone_id,
            model: d.model,
            capabilities: d.capabilities.join(', '),
            status: d.status,
            location: d.location,
            assignment: d.current_assignment,
            maintenance_due: d.maintenance_due,
            weather_resistance: d.weather_resistance,
        })),
    });
}

function handleMatchDroneToMission(args: Record<string, unknown>): string {
    const missionId = args.mission_id as string;
    const mission = dataStore.getMissionById(missionId);
    if (!mission) {
        return JSON.stringify({ error: `Mission "${missionId}" not found.` });
    }

    const availableDrones = dataStore.getDrones({ status: 'Available' });
    const isRainy = mission.weather_forecast.toLowerCase() === 'rainy';

    const candidates = availableDrones.map(drone => {
        let score = 0;
        const issues: string[] = [];

        // Weather compatibility
        const isWeatherSafe =
            !isRainy || drone.weather_resistance.toLowerCase().includes('ip43');
        if (isWeatherSafe) score += 40;
        else
            issues.push(
                `Not weather-safe: ${drone.weather_resistance} cannot fly in ${mission.weather_forecast}`
            );

        // Location match
        if (drone.location.toLowerCase() === mission.location.toLowerCase()) {
            score += 30;
        } else {
            issues.push(
                `Location mismatch: drone in ${drone.location}, mission in ${mission.location}`
            );
        }

        // Maintenance check
        const maintenanceDate = new Date(drone.maintenance_due);
        const missionEnd = new Date(mission.end_date);
        if (maintenanceDate > missionEnd) {
            score += 20;
        } else {
            issues.push(
                `Maintenance due ${drone.maintenance_due} before mission ends ${mission.end_date}`
            );
        }

        // Status bonus
        if (drone.status === 'Available') score += 10;

        return {
            drone_id: drone.drone_id,
            model: drone.model,
            capabilities: drone.capabilities.join(', '),
            weather_resistance: drone.weather_resistance,
            score,
            issues,
            fully_compatible: issues.length === 0,
        };
    });

    candidates.sort((a, b) => b.score - a.score);

    return JSON.stringify({
        mission: {
            id: mission.project_id,
            location: mission.location,
            weather: mission.weather_forecast,
            dates: `${mission.start_date} to ${mission.end_date}`,
        },
        candidates,
        recommendation:
            candidates.length > 0 && candidates[0].fully_compatible
                ? `Best match: ${candidates[0].model} (${candidates[0].drone_id}) — fully compatible with score ${candidates[0].score}/100`
                : candidates.length > 0
                    ? `Best available: ${candidates[0].model} (${candidates[0].drone_id}) with score ${candidates[0].score}/100. Issues: ${candidates[0].issues.join('; ')}`
                    : 'No available drones found.',
    });
}

async function handleUpdateDroneStatus(
    args: Record<string, unknown>
): Promise<string> {
    const droneId = args.drone_id as string;
    const status = args.status as 'Available' | 'Maintenance' | 'Deployed';
    const assignment = (args.assignment as string) || (status === 'Available' ? '-' : undefined);

    const drone = dataStore.updateDroneStatus(droneId, status, assignment);
    if (!drone) {
        return JSON.stringify({ error: `Drone "${droneId}" not found.` });
    }

    const synced = await sheetsService.syncDroneStatus(
        droneId,
        status,
        assignment || drone.current_assignment
    );

    return JSON.stringify({
        message: `Drone ${drone.model} (${droneId}) status updated to "${status}".`,
        drone: {
            id: drone.drone_id,
            model: drone.model,
            status: drone.status,
            assignment: drone.current_assignment,
        },
        google_sheets_synced: synced,
    });
}

function handleDetectConflicts(): string {
    const conflicts = detectAllConflicts();

    if (conflicts.length === 0) {
        return JSON.stringify({
            message: 'No conflicts detected. All assignments look good!',
            conflicts: [],
        });
    }

    const critical = conflicts.filter(c => c.severity === 'critical');
    const warnings = conflicts.filter(c => c.severity === 'warning');
    const info = conflicts.filter(c => c.severity === 'info');

    return JSON.stringify({
        message: `Detected ${conflicts.length} issue(s): ${critical.length} critical, ${warnings.length} warnings, ${info.length} informational.`,
        conflicts: conflicts.map(c => ({
            type: c.type,
            severity: c.severity,
            title: c.title,
            description: c.description,
        })),
    });
}

function handleGetAssignments(): string {
    const { pilots, drones, missions } = dataStore.getAllData();

    const assignments = missions.map(mission => {
        const assignedPilots = pilots.filter(
            p => p.current_assignment === mission.project_id
        );
        const assignedDrones = drones.filter(
            d => d.current_assignment === mission.project_id
        );

        return {
            mission: {
                id: mission.project_id,
                client: mission.client,
                location: mission.location,
                priority: mission.priority,
                dates: `${mission.start_date} to ${mission.end_date}`,
                weather: mission.weather_forecast,
            },
            assigned_pilots: assignedPilots.map(p => ({
                id: p.pilot_id,
                name: p.name,
                skills: p.skills.join(', '),
            })),
            assigned_drones: assignedDrones.map(d => ({
                id: d.drone_id,
                model: d.model,
                capabilities: d.capabilities.join(', '),
            })),
            has_pilot: assignedPilots.length > 0,
            has_drone: assignedDrones.length > 0,
        };
    });

    return JSON.stringify({ assignments });
}

function handleQueryMissions(args: Record<string, unknown>): string {
    const missions = dataStore.getMissions({
        location: args.location as string | undefined,
        priority: args.priority as string | undefined,
        skill: args.skill as string | undefined,
    });

    return JSON.stringify({
        message: `Found ${missions.length} mission(s).`,
        missions: missions.map(m => ({
            id: m.project_id,
            client: m.client,
            location: m.location,
            required_skills: m.required_skills.join(', '),
            required_certs: m.required_certs.join(', '),
            dates: `${m.start_date} to ${m.end_date}`,
            priority: m.priority,
            budget: `₹${m.mission_budget_inr}`,
            weather: m.weather_forecast,
        })),
    });
}

async function handleUrgentReassignment(
    args: Record<string, unknown>
): Promise<string> {
    const missionId = args.mission_id as string;
    const reason = (args.reason as string) || 'Not specified';
    const mission = dataStore.getMissionById(missionId);

    if (!mission) {
        return JSON.stringify({ error: `Mission "${missionId}" not found.` });
    }

    const days = calculateDays(mission.start_date, mission.end_date);
    const isRainy = mission.weather_forecast.toLowerCase() === 'rainy';

    // Find best replacement pilot
    const availablePilots = dataStore.getPilots({ status: 'Available' });
    const pilotCandidates = availablePilots
        .map(pilot => {
            const hasSkills = mission.required_skills.every(s =>
                pilot.skills.some(ps => ps.toLowerCase() === s.toLowerCase())
            );
            const hasCerts = mission.required_certs.every(c =>
                pilot.certifications.some(pc => pc.toLowerCase() === c.toLowerCase())
            );
            const sameLocation =
                pilot.location.toLowerCase() === mission.location.toLowerCase();
            const withinBudget =
                pilot.daily_rate_inr * days <= mission.mission_budget_inr;
            const availableInTime =
                new Date(pilot.available_from) <= new Date(mission.start_date);

            return {
                ...pilot,
                hasSkills,
                hasCerts,
                sameLocation,
                withinBudget,
                availableInTime,
                totalCost: pilot.daily_rate_inr * days,
                score:
                    (hasSkills ? 30 : 0) +
                    (hasCerts ? 25 : 0) +
                    (sameLocation ? 20 : 0) +
                    (withinBudget ? 15 : 0) +
                    (availableInTime ? 10 : 0),
            };
        })
        .sort((a, b) => b.score - a.score);

    // Find best replacement drone
    const availableDrones = dataStore.getDrones({ status: 'Available' });
    const droneCandidates = availableDrones
        .map(drone => {
            const weatherSafe =
                !isRainy || drone.weather_resistance.toLowerCase().includes('ip43');
            const sameLocation =
                drone.location.toLowerCase() === mission.location.toLowerCase();
            const maintenanceOk =
                new Date(drone.maintenance_due) > new Date(mission.end_date);

            return {
                ...drone,
                weatherSafe,
                sameLocation,
                maintenanceOk,
                score:
                    (weatherSafe ? 40 : 0) +
                    (sameLocation ? 30 : 0) +
                    (maintenanceOk ? 20 : 0) +
                    10,
            };
        })
        .sort((a, b) => b.score - a.score);

    const bestPilot = pilotCandidates[0] || null;
    const bestDrone = droneCandidates[0] || null;

    const result = {
        mission: {
            id: mission.project_id,
            client: mission.client,
            location: mission.location,
            priority: mission.priority,
            dates: `${mission.start_date} to ${mission.end_date}`,
            weather: mission.weather_forecast,
            budget: `₹${mission.mission_budget_inr}`,
        },
        reason,
        recommended_pilot: bestPilot
            ? {
                id: bestPilot.pilot_id,
                name: bestPilot.name,
                score: `${bestPilot.score}/100`,
                total_cost: `₹${bestPilot.totalCost}`,
                issues: [
                    !bestPilot.hasSkills && 'Missing required skills',
                    !bestPilot.hasCerts && 'Missing required certifications',
                    !bestPilot.sameLocation && `Location mismatch (${bestPilot.location})`,
                    !bestPilot.withinBudget && `Over budget (₹${bestPilot.totalCost})`,
                    !bestPilot.availableInTime && `Not available until ${bestPilot.available_from}`,
                ].filter(Boolean),
            }
            : null,
        recommended_drone: bestDrone
            ? {
                id: bestDrone.drone_id,
                model: bestDrone.model,
                score: `${bestDrone.score}/100`,
                issues: [
                    !bestDrone.weatherSafe && `Not weather-safe for ${mission.weather_forecast}`,
                    !bestDrone.sameLocation && `Location mismatch (${bestDrone.location})`,
                    !bestDrone.maintenanceOk && `Maintenance due ${bestDrone.maintenance_due}`,
                ].filter(Boolean),
            }
            : null,
        action_needed:
            bestPilot && bestDrone
                ? `Ready to assign ${bestPilot.name} and ${bestDrone.model} to ${mission.project_id}. Would you like me to proceed with the assignment?`
                : 'No suitable candidates found for all requirements. Manual intervention required.',
    };

    return JSON.stringify(result);
}

function handleGetDashboardStats(): string {
    const stats = dataStore.getStats();
    const conflicts = detectAllConflicts();
    stats.activeConflicts = conflicts.length;

    return JSON.stringify(stats);
}
