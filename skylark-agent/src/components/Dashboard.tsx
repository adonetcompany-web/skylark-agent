'use client';

import React, { useState, useEffect } from 'react';
import {
    Users,
    Plane,
    Calendar,
    AlertTriangle,
    MapPin,
    ShieldCheck,
    Clock,
    CircleDollarSign,
    CloudRain,
    Sun,
    ArrowRightLeft,
    User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Pilot, Drone, Mission, Conflict, DashboardStats } from '@/lib/types';

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [pilots, setPilots] = useState<Pilot[]>([]);
    const [drones, setDrones] = useState<Drone[]>([]);
    const [missions, setMissions] = useState<Mission[]>([]);
    const [conflicts, setConflicts] = useState<Conflict[]>([]);
    const [activeTab, setActiveTab] = useState<'pilots' | 'drones' | 'missions' | 'conflicts'>('pilots');
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [statsRes, pilotsRes, dronesRes, missionsRes, conflictsRes] = await Promise.all([
                fetch('/api/stats'),
                fetch('/api/pilots'),
                fetch('/api/drones'),
                fetch('/api/missions'),
                fetch('/api/conflicts')
            ]);

            const [statsData, pilotsData, dronesData, missionsData, conflictsData] = await Promise.all([
                statsRes.json(),
                pilotsRes.json(),
                dronesRes.json(),
                missionsRes.json(),
                conflictsRes.json()
            ]);

            setStats(statsData);
            setPilots(pilotsData.pilots);
            setDrones(dronesData.drones);
            setMissions(missionsData.missions);
            setConflicts(conflictsData.conflicts);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Refresh every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const StatsCard = ({ title, value, icon: Icon, color }: any) => (
        <div className="card-premium p-6 flex items-start justify-between">
            <div>
                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em] mb-2">{title}</p>
                <p className="text-3xl font-black text-zinc-900 tabular-nums">{value}</p>
            </div>
            <div className={cn("p-2", color.split(' ')[1])}>
                <Icon size={20} className="opacity-80" />
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-12 h-full overflow-hidden animate-fade-in">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Pilot Personnel"
                    value={stats?.totalPilots ?? '...'}
                    icon={Users}
                    color="text-zinc-400 text-zinc-900"
                />
                <StatsCard
                    title="Available Fleet"
                    value={stats?.availableDrones ?? '...'}
                    icon={Plane}
                    color="text-zinc-400 text-zinc-900"
                />
                <StatsCard
                    title="Active Missions"
                    value={stats?.activeMissions ?? '...'}
                    icon={Calendar}
                    color="text-zinc-400 text-[#F25B2A]"
                />
                <StatsCard
                    title="Critical Alerts"
                    value={stats?.activeConflicts ?? '...'}
                    icon={AlertTriangle}
                    color="text-zinc-400 text-rose-600"
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tabs */}
                <div className="flex gap-8 border-b border-[var(--border)] shrink-0 mb-6">
                    {[
                        { id: 'pilots', label: 'Pilot Roster', icon: Users },
                        { id: 'drones', label: 'Drone Fleet', icon: Plane },
                        { id: 'missions', label: 'Mission Log', icon: Calendar },
                        { id: 'conflicts', label: 'Conflict Analysis', icon: AlertTriangle, count: conflicts.length }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex items-center gap-2 pb-4 text-[11px] font-black uppercase tracking-[0.15em] transition-all relative",
                                activeTab === tab.id
                                    ? "text-zinc-900 border-b-2 border-[#F25B2A]"
                                    : "text-zinc-400 hover:text-zinc-600"
                            )}
                        >
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 bg-rose-600 text-[9px] text-white">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center opacity-30">
                            <Clock className="animate-spin mr-2" />
                            <span>Updating fleet status...</span>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'pilots' && (
                                <div className="space-y-3">
                                    {pilots.map((pilot) => (
                                        <div key={pilot.pilot_id} className="card-premium p-4 flex items-center gap-6 group">
                                            <div className="w-12 h-12 bg-zinc-100 flex items-center justify-center shrink-0">
                                                <User size={20} className="text-zinc-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-0.5">
                                                    <h3 className="font-black text-sm text-zinc-900 truncate uppercase tracking-wider">{pilot.name}</h3>
                                                    <span className={cn(
                                                        "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5",
                                                        pilot.status === 'Available' ? "bg-emerald-100 text-emerald-700" :
                                                            pilot.status === 'Assigned' ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-400"
                                                    )}>
                                                        {pilot.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-bold uppercase tracking-tight">
                                                    <div className="flex items-center gap-1"><MapPin size={10} /> {pilot.location}</div>
                                                    <div className="flex items-center gap-1"><CircleDollarSign size={10} /> ₹{pilot.daily_rate_inr}/D</div>
                                                    <div className="hidden sm:block text-zinc-300">|</div>
                                                    <div className="hidden sm:block">{pilot.skills.slice(0, 2).join(' • ')}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1">ID</p>
                                                <p className="text-[11px] font-mono text-zinc-900">{pilot.pilot_id.slice(-6).toUpperCase()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'drones' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {drones.map((drone) => (
                                        <div key={drone.drone_id} className="card-premium p-5 flex flex-col gap-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-1">Fleet Unit</p>
                                                    <h3 className="font-black text-lg text-zinc-900 leading-tight tracking-tight uppercase">{drone.model}</h3>
                                                </div>
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    drone.status === 'Available' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,172,132,0.4)]" : "bg-zinc-300"
                                                )} />
                                            </div>
                                            <div className="flex items-center justify-between py-3 border-y border-zinc-100">
                                                <div className="text-center flex-1">
                                                    <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-1">Location</p>
                                                    <p className="text-[11px] font-bold text-zinc-800">{drone.location}</p>
                                                </div>
                                                <div className="w-px h-6 bg-zinc-100" />
                                                <div className="text-center flex-1">
                                                    <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-1">Weather</p>
                                                    <p className="text-[11px] font-bold text-zinc-800">{drone.weather_resistance}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {drone.capabilities.slice(0, 3).map(cap => (
                                                    <span key={cap} className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-zinc-50 text-zinc-500">
                                                        {cap}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'missions' && (
                                <div className="space-y-4">
                                    {missions.map((mission) => (
                                        <div key={mission.project_id} className="card-premium p-6 flex flex-col sm:flex-row gap-6">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className={cn(
                                                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5",
                                                        mission.priority === 'Urgent' ? "bg-rose-600 text-white" : "bg-black text-white"
                                                    )}>
                                                        {mission.priority}
                                                    </span>
                                                    <h3 className="font-black text-sm text-zinc-900 uppercase tracking-wider">{mission.project_id}</h3>
                                                </div>
                                                <p className="text-xl font-black text-zinc-900 mb-6">{mission.client}</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-1">Deployment</p>
                                                        <p className="text-[11px] font-bold text-zinc-800 uppercase">{mission.location}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-1">Timeline</p>
                                                        <p className="text-[11px] font-bold text-zinc-800 uppercase tracking-tighter">{mission.start_date.split('-').slice(1).join('/')} - {mission.end_date.split('-').slice(1).join('/')}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="sm:w-48 pt-4 sm:pt-0 sm:border-l sm:border-zinc-100 sm:pl-6 flex flex-col justify-between">
                                                <div>
                                                    <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-3">Skill Spec</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {mission.required_skills.map(s => (
                                                            <div key={s} className="w-1.5 h-1.5 bg-[#F25B2A] rounded-full" title={s} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-4">
                                                    {mission.weather_forecast === 'Rainy' ? <CloudRain size={16} className="text-zinc-600" /> : <Sun size={16} className="text-[#F25B2A]" />}
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">{mission.weather_forecast}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'conflicts' && (
                                <div className="space-y-4">
                                    {conflicts.length === 0 ? (
                                        <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-zinc-100">
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-300">Operational Status Clear</p>
                                        </div>
                                    ) : (
                                        conflicts.map((conflict) => (
                                            <div key={conflict.id} className="card-premium p-6 flex gap-6 border-l-4 border-l-rose-600">
                                                <div className="shrink-0 w-10 h-10 bg-rose-50 flex items-center justify-center text-rose-600">
                                                    <AlertTriangle size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black text-xs uppercase tracking-widest text-rose-600 mb-1">{conflict.title}</h4>
                                                    <p className="text-sm text-zinc-600 leading-relaxed font-medium">{conflict.description}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
