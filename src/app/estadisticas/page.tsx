'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGroups } from '@/context/GroupContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Trophy, Target, Star, Award, Calendar, Loader2 } from 'lucide-react';

interface PlayerStat {
    id: string;
    name: string;
    goals: number;
    chamigoCount: number;
    matchesPlayed: number;
    awards: Record<string, number>;
}

const PREMIOS = [
    { key: 'poste', emoji: '🧱', name: 'El Poste' },
    { key: 'rayo', emoji: '⚡', name: 'El Rayo' },
    { key: 'cerebrito', emoji: '🧠', name: 'El Cerebrito' },
    { key: 'comico', emoji: '🎭', name: 'El Cómico' },
];

export default function EstadisticasPage() {
    const { activeGroup } = useGroups();
    const [stats, setStats] = useState<PlayerStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [matchCount, setMatchCount] = useState(0);
    const [totalGoalsFromScores, setTotalGoalsFromScores] = useState(0);

    useEffect(() => {
        if (activeGroup) fetchStats();
    }, [activeGroup]);

    const fetchStats = async () => {
        if (!activeGroup) return;
        setLoading(true);

        const { data: matches } = await supabase
            .from('Match')
            .select('*')
            .eq('groupId', activeGroup.id)
            .eq('status', 'completed');

        if (!matches || matches.length === 0) {
            setLoading(false);
            return;
        }

        setMatchCount(matches.length);

        // Compute total goals from match scores (source of truth)
        const totalGoals = matches.reduce((sum, m) => sum + (m.scoreA || 0) + (m.scoreB || 0), 0);
        setTotalGoalsFromScores(totalGoals);

        // Build player map from all match rosters
        const playerMap: Record<string, PlayerStat> = {};

        const ensurePlayer = (id: string, name: string) => {
            if (!playerMap[id]) {
                playerMap[id] = { id, name, goals: 0, chamigoCount: 0, matchesPlayed: 0, awards: {} };
            }
        };

        matches.forEach(match => {
            let teamA: any[] = [];
            let teamB: any[] = [];
            try { teamA = JSON.parse(match.teamA_JSON || '[]'); } catch { }
            try { teamB = JSON.parse(match.teamB_JSON || '[]'); } catch { }

            // Track participation
            [...teamA, ...teamB].forEach((p: any) => {
                if (p.id && p.name) {
                    ensurePlayer(p.id, p.name);
                    playerMap[p.id].matchesPlayed++;
                }
            });

            // Chamigo
            if (match.chamigo && playerMap[match.chamigo]) {
                playerMap[match.chamigo].chamigoCount++;
            }

            // Goleadores
            if (match.goleadores) {
                try {
                    const goles = JSON.parse(match.goleadores);
                    goles.forEach((g: any) => {
                        if (g.playerId && playerMap[g.playerId]) {
                            playerMap[g.playerId].goals += (g.goals || 0);
                        }
                    });
                } catch { }
            }

            // Awards
            if (match.awards) {
                try {
                    const awds = JSON.parse(match.awards);
                    Object.entries(awds).forEach(([key, playerId]) => {
                        if (typeof playerId === 'string' && playerMap[playerId]) {
                            playerMap[playerId].awards[key] = (playerMap[playerId].awards[key] || 0) + 1;
                        }
                    });
                } catch { }
            }
        });

        const arr = Object.values(playerMap).sort((a, b) => b.goals - a.goals || b.chamigoCount - a.chamigoCount);
        setStats(arr);
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <Loader2 className="animate-spin text-[var(--grafico-red)]" size={64} />
                <p className="font-masthead text-2xl tracking-widest text-black/30">CARGANDO ESTADÍSTICAS...</p>
            </div>
        );
    }

    const topGoleadores = [...stats].sort((a, b) => b.goals - a.goals).filter(s => s.goals > 0);
    const topChamigos = [...stats].sort((a, b) => b.chamigoCount - a.chamigoCount).filter(s => s.chamigoCount > 0);
    const topPresencia = [...stats].sort((a, b) => b.matchesPlayed - a.matchesPlayed).slice(0, 10);

    return (
        <main className="max-w-6xl mx-auto p-4 md:p-8 mb-20 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/" className="p-2 hover:bg-black/5 rounded-full transition-colors"><ArrowLeft /></Link>
                <div>
                    <div className="text-[10px] font-bold uppercase text-black/30 tracking-widest">TABLAS Y NÚMEROS</div>
                    <h1 className="text-3xl md:text-5xl uppercase tracking-tighter font-masthead">ESTADÍSTICAS</h1>
                </div>
            </div>

            {/* Summary bar */}
            <div className="bg-[var(--ink-black)] text-white p-4 mb-8 flex flex-wrap items-center justify-center gap-6 sm:gap-12 border-4 border-black">
                <div className="text-center">
                    <div className="text-[10px] text-white/50 uppercase tracking-widest">Partidos jugados</div>
                    <div className="font-masthead text-3xl text-[var(--grafico-gold)]">{matchCount}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-white/50 uppercase tracking-widest">Promedio Gol/Partido</div>
                    <div className="font-masthead text-3xl text-[var(--grafico-cyan)]">{matchCount > 0 ? (totalGoalsFromScores / matchCount).toFixed(1) : '—'}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-white/50 uppercase tracking-widest">Goles totales</div>
                    <div className="font-masthead text-3xl text-[var(--grafico-red)]">{totalGoalsFromScores}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Goleadores */}
                <div className="border-4 border-black overflow-hidden">
                    <div className="bg-[var(--grafico-red)] text-white px-4 py-3 font-masthead tracking-widest text-sm flex items-center gap-2">
                        <Target size={16} /> TABLA DE GOLEADORES
                    </div>
                    <div className="divide-y divide-black/5 bg-white">
                        {topGoleadores.length > 0 ? topGoleadores.map((s, i) => (
                            <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className={`font-masthead text-2xl w-8 text-center ${i === 0 ? 'text-[var(--grafico-gold)]' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-black/20'}`}>{i + 1}</span>
                                    <span className="font-bold text-sm uppercase">{s.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-masthead text-green-600 text-lg">{s.goals}</span>
                                    <span className="text-[10px] text-black/30">⚽</span>
                                </div>
                            </div>
                        )) : (
                            <div className="p-6 text-center font-serif italic text-black/40">&quot;Aún no se registraron goles.&quot;</div>
                        )}
                    </div>
                </div>

                {/* Chamigos de la Fecha */}
                <div className="border-4 border-black overflow-hidden">
                    <div className="bg-[var(--grafico-gold)] text-black px-4 py-3 font-masthead tracking-widest text-sm flex items-center gap-2">
                        <Trophy size={16} /> CHAMIGOS DE LA FECHA
                    </div>
                    <div className="divide-y divide-black/5 bg-white">
                        {topChamigos.length > 0 ? topChamigos.map((s, i) => (
                            <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className={`font-masthead text-2xl w-8 text-center ${i === 0 ? 'text-[var(--grafico-gold)]' : 'text-black/20'}`}>{i + 1}</span>
                                    <span className="font-bold text-sm uppercase">{s.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-masthead text-[var(--grafico-gold)] text-lg">{s.chamigoCount}</span>
                                    <span className="text-[10px] text-black/30">🏆</span>
                                </div>
                            </div>
                        )) : (
                            <div className="p-6 text-center font-serif italic text-black/40">&quot;Aún no hay Chamigos designados.&quot;</div>
                        )}
                    </div>
                </div>

                {/* Presencia */}
                <div className="border-4 border-black overflow-hidden">
                    <div className="bg-[var(--grafico-cyan)] text-white px-4 py-3 font-masthead tracking-widest text-sm flex items-center gap-2">
                        <Calendar size={16} /> PRESENCIA (PARTIDOS JUGADOS)
                    </div>
                    <div className="divide-y divide-black/5 bg-white">
                        {topPresencia.map((s, i) => (
                            <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className={`font-masthead text-2xl w-8 text-center ${i === 0 ? 'text-[var(--grafico-gold)]' : 'text-black/20'}`}>{i + 1}</span>
                                    <span className="font-bold text-sm uppercase">{s.name}</span>
                                </div>
                                <span className="font-masthead text-black/40 text-lg">{s.matchesPlayed}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Premios */}
                <div className="border-4 border-black overflow-hidden">
                    <div className="bg-[var(--ink-black)] text-white px-4 py-3 font-masthead tracking-widest text-sm flex items-center gap-2">
                        <Award size={16} /> PREMIOS ACUMULADOS
                    </div>
                    <div className="divide-y divide-black/5 bg-white">
                        {PREMIOS.map(premio => {
                            const winners = stats
                                .filter(s => (s.awards[premio.key] || 0) > 0)
                                .sort((a, b) => (b.awards[premio.key] || 0) - (a.awards[premio.key] || 0))
                                .slice(0, 3);
                            return (
                                <div key={premio.key} className="px-4 py-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xl">{premio.emoji}</span>
                                        <span className="font-masthead text-xs tracking-wider">{premio.name}</span>
                                    </div>
                                    {winners.length > 0 ? (
                                        <div className="space-y-1">
                                            {winners.map((w, i) => (
                                                <div key={w.id} className="flex justify-between text-xs">
                                                    <span className="uppercase font-bold">{w.name}</span>
                                                    <span className="text-black/40">{w.awards[premio.key]}×</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-black/30 italic">Sin ganadores aún</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </main>
    );
}
