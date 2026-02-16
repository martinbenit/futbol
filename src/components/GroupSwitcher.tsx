'use client';

import { useGroups } from "@/context/GroupContext";
import { ChevronDown, ChevronUp, Plus, Users, Settings } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function GroupSwitcher() {
    const { groups, activeGroup, setActiveGroup, loading } = useGroups();
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    if (loading) return <div className="animate-pulse h-8 w-28 bg-white/10 rounded" />;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 sm:gap-2 hover:bg-white/10 px-2 sm:px-3 py-1.5 rounded transition-colors border border-white/10"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <Users size={14} className="text-[var(--grafico-cyan)] flex-shrink-0" />
                <span className="font-masthead text-[11px] sm:text-sm tracking-tight truncate max-w-[100px] sm:max-w-[160px]">
                    {activeGroup?.name || "SIN GRUPO"}
                </span>
                {isOpen
                    ? <ChevronUp size={12} className="flex-shrink-0 transition-transform" />
                    : <ChevronDown size={12} className="flex-shrink-0 transition-transform" />
                }
            </button>

            {isOpen && (
                <>
                    {/* Backdrop for mobile */}
                    <div className="fixed inset-0 z-[99] sm:hidden" onClick={() => setIsOpen(false)} />

                    <div className="
                        absolute top-full mt-2 z-[100]
                        left-0 right-auto
                        w-[260px] sm:w-72
                        bg-[var(--ink-black)] border border-white/20 shadow-2xl
                        animate-in fade-in slide-in-from-top-2 duration-200
                        max-h-[70vh] overflow-hidden flex flex-col
                    ">
                        <div className="p-3 border-b border-white/10 text-[10px] font-bold uppercase opacity-50 tracking-widest">
                            TUS EQUIPOS
                        </div>

                        <div className="overflow-y-auto flex-1" role="listbox">
                            {groups.length > 0 ? groups.map(g => (
                                <button
                                    key={g.id}
                                    role="option"
                                    aria-selected={activeGroup?.id === g.id}
                                    onClick={() => {
                                        setActiveGroup(g);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center justify-between group ${activeGroup?.id === g.id ? 'bg-white/5' : ''
                                        }`}
                                >
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-masthead text-base sm:text-lg tracking-tight group-hover:text-[var(--grafico-cyan)] transition-colors truncate">
                                            {g.name}
                                        </span>
                                        <span className="text-[10px] opacity-40 uppercase tracking-widest">
                                            {g.role === 'ADMIN' ? '👑 Admin' : '⚽ Jugador'}
                                        </span>
                                    </div>
                                    {activeGroup?.id === g.id && (
                                        <div className="w-2 h-2 rounded-full bg-[var(--grafico-cyan)] shadow-[0_0_8px_var(--grafico-cyan)] flex-shrink-0" />
                                    )}
                                </button>
                            )) : (
                                <div className="px-4 py-6 text-center text-white/30 text-xs font-serif italic">
                                    No estás en ningún grupo todavía.
                                </div>
                            )}
                        </div>

                        <div className="p-2 border-t border-white/10 space-y-0.5">
                            <Link
                                href="/configurar-grupo"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-2 w-full p-2.5 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors opacity-70 hover:opacity-100 rounded"
                            >
                                <Plus size={14} className="text-[var(--grafico-cyan)]" /> CREAR GRUPO
                            </Link>
                            {activeGroup && activeGroup.role === 'ADMIN' && (
                                <Link
                                    href="/gestion-grupo"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-2 w-full p-2.5 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors opacity-70 hover:opacity-100 text-[var(--grafico-gold)] rounded"
                                >
                                    <Settings size={14} /> GESTIÓN DEL EQUIPO
                                </Link>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
