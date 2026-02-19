import { Pilot, Drone, Mission } from './types';
import pilotsData from '../data/pilots.json';
import dronesData from '../data/drones.json';
import missionsData from '../data/missions.json';

// ─── In-Memory Data Store (Singleton) ─────────────────────────────────────────

class DataStore {
    private static instance: DataStore;
    private pilots: Pilot[];
    private drones: Drone[];
    private missions: Mission[];

    private constructor() {
        this.pilots = pilotsData as Pilot[];
        this.drones = dronesData as Drone[];
        this.missions = missionsData as Mission[];
    }

    static getInstance(): DataStore {
        if (!DataStore.instance) {
            DataStore.instance = new DataStore();
        }
        return DataStore.instance;
    }

    // ── Pilot Operations ─────────────────────────────────────────────────────

    getPilots(filters?: {
        skill?: string;
        certification?: string;
        location?: string;
        status?: string;
    }): Pilot[] {
        let result = [...this.pilots];
        if (filters?.skill) {
            result = result.filter(p =>
                p.skills.some(s => s.toLowerCase().includes(filters.skill!.toLowerCase()))
            );
        }
        if (filters?.certification) {
            result = result.filter(p =>
                p.certifications.some(c =>
                    c.toLowerCase().includes(filters.certification!.toLowerCase())
                )
            );
        }
        if (filters?.location) {
            result = result.filter(
                p => p.location.toLowerCase() === filters.location!.toLowerCase()
            );
        }
        if (filters?.status) {
            result = result.filter(
                p => p.status.toLowerCase() === filters.status!.toLowerCase()
            );
        }
        return result;
    }

    getPilotById(id: string): Pilot | undefined {
        return this.pilots.find(p => p.pilot_id === id);
    }

    getPilotByName(name: string): Pilot | undefined {
        return this.pilots.find(
            p => p.name.toLowerCase() === name.toLowerCase()
        );
    }

    updatePilotStatus(
        pilotId: string,
        status: Pilot['status'],
        assignment?: string
    ): Pilot | null {
        const pilot = this.pilots.find(p => p.pilot_id === pilotId);
        if (!pilot) return null;
        pilot.status = status;
        if (assignment !== undefined) {
            pilot.current_assignment = assignment;
        }
        return pilot;
    }

    // ── Drone Operations ──────────────────────────────────────────────────────

    getDrones(filters?: {
        capability?: string;
        status?: string;
        location?: string;
        weatherResistant?: boolean;
    }): Drone[] {
        let result = [...this.drones];
        if (filters?.capability) {
            result = result.filter(d =>
                d.capabilities.some(c =>
                    c.toLowerCase().includes(filters.capability!.toLowerCase())
                )
            );
        }
        if (filters?.status) {
            result = result.filter(
                d => d.status.toLowerCase() === filters.status!.toLowerCase()
            );
        }
        if (filters?.location) {
            result = result.filter(
                d => d.location.toLowerCase() === filters.location!.toLowerCase()
            );
        }
        if (filters?.weatherResistant) {
            result = result.filter(d =>
                d.weather_resistance.toLowerCase().includes('ip43')
            );
        }
        return result;
    }

    getDroneById(id: string): Drone | undefined {
        return this.drones.find(d => d.drone_id === id);
    }

    updateDroneStatus(
        droneId: string,
        status: Drone['status'],
        assignment?: string
    ): Drone | null {
        const drone = this.drones.find(d => d.drone_id === droneId);
        if (!drone) return null;
        drone.status = status;
        if (assignment !== undefined) {
            drone.current_assignment = assignment;
        }
        return drone;
    }

    // ── Mission Operations ────────────────────────────────────────────────────

    getMissions(filters?: {
        location?: string;
        priority?: string;
        skill?: string;
    }): Mission[] {
        let result = [...this.missions];
        if (filters?.location) {
            result = result.filter(
                m => m.location.toLowerCase() === filters.location!.toLowerCase()
            );
        }
        if (filters?.priority) {
            result = result.filter(
                m => m.priority.toLowerCase() === filters.priority!.toLowerCase()
            );
        }
        if (filters?.skill) {
            result = result.filter(m =>
                m.required_skills.some(s =>
                    s.toLowerCase().includes(filters.skill!.toLowerCase())
                )
            );
        }
        return result;
    }

    getMissionById(id: string): Mission | undefined {
        return this.missions.find(m => m.project_id === id);
    }

    // ── Stats ─────────────────────────────────────────────────────────────────

    getStats() {
        return {
            totalPilots: this.pilots.length,
            availablePilots: this.pilots.filter(p => p.status === 'Available').length,
            totalDrones: this.drones.length,
            availableDrones: this.drones.filter(d => d.status === 'Available').length,
            activeMissions: this.missions.length,
            urgentMissions: this.missions.filter(m => m.priority === 'Urgent').length,
            activeConflicts: 0, // Will be calculated dynamically
        };
    }

    // ── Full Data Access (for agent context) ──────────────────────────────────

    getAllData() {
        return {
            pilots: this.pilots,
            drones: this.drones,
            missions: this.missions,
        };
    }
}

export const dataStore = DataStore.getInstance();
