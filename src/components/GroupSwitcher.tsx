'use client';

import { useGroups } from "@/context/GroupContext";
import { ChevronDown, Plus, Users, Settings } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function GroupSwitcher() {
    const { groups, activeGroup, setActiveGroup, loading } = useGroups();
    const [isOpen, setIsOpen] = useState(false);

    if (loading) return <div className="animate-pulse h-8 w-32 bg-white/10 rounded"></div>;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 hover:bg-white/10 px-3 py-1 rounded transition-colors border border-white/10"
            >
                <Users size={16} className="text-[var(--grafico-cyan)] flex-shrink-0" />
                <span className="font-masthead text-xs md:text-sm tracking-tight truncate max-w-[80px] md:max-w-none">
                    {activeGroup?.name || "SIN GRUPO"}
                </span>
                <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-[280px] md:w-64 bg-[var(--ink-black)] border border-white/20 shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-white/10 text-[10px] font-bold uppercase opacity-50 tracking-widest px-4">
                        TUS EQUIPOS
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {groups.map(g => (
                            <button
                                key={g.id}
                                onClick={() => {
                                    setActiveGroup(g);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left p-3 hover:bg-white/10 transition-colors flex items-center justify-between group ${activeGroup?.id === g.id ? 'bg-white/5' : ''
                                    }`}
                            >
                                <div className="flex flex-col">
                                    <span className="font-masthead text-lg tracking-tight group-hover:text-[var(--grafico-cyan)] transform transition-transform">
                                        {g.name}
                                    </span>
                                    <span className="text-[10px] opacity-40 uppercase tracking-widest">
                                        {g.role}
                                    </span>
                                </div>
                                {activeGroup?.id === g.id && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--grafico-cyan)] shadow-[0_0_8px_var(--grafico-cyan)]"></div>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="p-2 border-t border-white/10 space-y-1">
                        <Link
                            href="/configurar-grupo"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2 w-full p-2 text-xs hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
                        >
                            <Plus size={14} /> NUEVO GRUPO
                        </Link>
                        {activeGroup && activeGroup.role === 'ADMIN' && (
                            <Link
                                href="/gestion-grupo"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-2 w-full p-2 text-xs hover:bg-white/10 transition-colors opacity-70 hover:opacity-100 text-[var(--grafico-gold)]"
                            >
                                <Settings size={14} /> GESTIÓN DEL EQUIPO
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
