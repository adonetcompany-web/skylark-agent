// ─── Core Data Types ──────────────────────────────────────────────────────────

export interface Pilot {
    pilot_id: string;
    name: string;
    skills: string[];
    certifications: string[];
    location: string;
    status: 'Available' | 'Assigned' | 'On Leave' | 'Unavailable';
    current_assignment: string;
    available_from: string;
    daily_rate_inr: number;
}

export interface Drone {
    drone_id: string;
    model: string;
    capabilities: string[];
    status: 'Available' | 'Maintenance' | 'Deployed';
    location: string;
    current_assignment: string;
    maintenance_due: string;
    weather_resistance: string;
}

export interface Mission {
    project_id: string;
    client: string;
    location: string;
    required_skills: string[];
    required_certs: string[];
    start_date: string;
    end_date: string;
    priority: 'Standard' | 'High' | 'Urgent';
    mission_budget_inr: number;
    weather_forecast: string;
}

// ─── Conflict Types ───────────────────────────────────────────────────────────

export type ConflictSeverity = 'critical' | 'warning' | 'info';

export interface Conflict {
    id: string;
    type:
    | 'double_booking'
    | 'skill_mismatch'
    | 'cert_mismatch'
    | 'weather_risk'
    | 'budget_overrun'
    | 'location_mismatch'
    | 'maintenance_conflict';
    severity: ConflictSeverity;
    title: string;
    description: string;
    entities: string[];
}

// ─── Chat Types ───────────────────────────────────────────────────────────────

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    toolResults?: ToolResult[];
}

export interface ToolResult {
    toolName: string;
    result: string;
}

// ─── Dashboard Types ──────────────────────────────────────────────────────────

export interface DashboardStats {
    totalPilots: number;
    availablePilots: number;
    totalDrones: number;
    availableDrones: number;
    activeMissions: number;
    urgentMissions: number;
    activeConflicts: number;
}
