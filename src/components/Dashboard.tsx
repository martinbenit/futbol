'use client';

import Link from 'next/link';
import {
    Users, History, Calendar, Plus,
    Settings, Share2, Star, Target,
    ExternalLink, Ghost, BrainCircuit,
    Shield, Zap, Trophy, Sparkles, Swords
} from 'lucide-react';
import { useGroups } from '@/context/GroupContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// ── Efemérides pool (20+ efemérides argentina futboleras) ──
const EFEMERIDES = [
    { date: "25 DE JUNIO 1978", title: "LA PRIMERA GLORIA", desc: "Argentina se consagra campeona del mundo por primera vez. Kempes desborda, la gente llora. El fútbol es pasión y nación.", img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000" },
    { date: "29 DE JUNIO 1986", title: "LA MANO DE DIOS Y EL GOL DEL SIGLO", desc: "Maradona anota dos goles históricos contra Inglaterra. Uno con la mano, otro driblando a todo el equipo. El mundo se arrodilla.", img: "https://images.unsplash.com/photo-1540747913346-19e3adbb17c3?q=80&w=1000" },
    { date: "18 DE DICIEMBRE 2022", title: "LA TERCERA ES LA VENCIDA", desc: "Messi levanta la Copa del Mundo en Qatar. Argentina vence a Francia en la final más épica de la historia. El país entero festeja.", img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000" },
    { date: "10 DE JULIO 2021", title: "MARACANAZO ALBICELESTE", desc: "Argentina gana la Copa América en el Maracaná. Di María define, Messi llora, todo un continente tiembla.", img: "https://images.unsplash.com/photo-1540747913346-19e3adbb17c3?q=80&w=1000" },
    { date: "12 DE SEPTIEMBRE 1930", title: "EL PRIMER SUBCAMPEÓN", desc: "Argentina llega a la primera final mundialista. Pierde 4-2 contra Uruguay, pero el fútbol argentino nace para siempre.", img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000" },
    { date: "30 DE OCTUBRE 1960", title: "NACE DIEGO ARMANDO MARADONA", desc: "En Lanús llega al mundo el pibe que cambiaría el fútbol para siempre. De Villa Fiorito a la eternidad.", img: "https://images.unsplash.com/photo-1540747913346-19e3adbb17c3?q=80&w=1000" },
    { date: "24 DE JUNIO 1987", title: "NACE LIONEL MESSI", desc: "En Rosario nace un genio. Destinado a disputarle el trono a Maradona y a darle la Tercera al país.", img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000" },
    { date: "14 DE FEBRERO 1946", title: "EL TRIUNFO EN EL GASÓMETRO", desc: "La Selección se consagra campeona de América tras vencer 2-0 a Brasil ante una multitud que desbordó el estadio de San Lorenzo.", img: "https://images.unsplash.com/photo-1540747913346-19e3adbb17c3?q=80&w=1000" },
    { date: "13 DE FEBRERO 1957", title: "LOS CARASUCIAS DE LIMA", desc: "Argentina golea 8-2 a Colombia en el Sudamericano. Fútbol lírico que marcó a una generación.", img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000" },
    { date: "22 DE JUNIO 1994", title: "MARADONA CONTRA GRECIA", desc: "El gol a Grecia y el grito desencajado a la cámara. La última genialidad mundialista de Diego.", img: "https://images.unsplash.com/photo-1540747913346-19e3adbb17c3?q=80&w=1000" },
    { date: "6 DE SEPTIEMBRE 1976", title: "BOCA CAMPEÓN LIBERTADORES", desc: "Boca Juniors gana su primera Copa Libertadores. El xeneize se instala en la élite sudamericana.", img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000" },
    { date: "25 DE NOVIEMBRE 2020", title: "ADIÓS DIEGO", desc: "El mundo despide a Maradona. El barrio llora al pibe que nos enseñó que con una pelota se conquista el cielo.", img: "https://images.unsplash.com/photo-1540747913346-19e3adbb17c3?q=80&w=1000" },
    { date: "26 DE SEPTIEMBRE 2018", title: "EL PIBE GALLARDO", desc: "River derrota a Gremio y se mete en la final de la Libertadores. La historia épica del Muñeco empieza a escribirse.", img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000" },
    { date: "1 DE JUNIO 2005", title: "LA SELECCIÓN SUB-20 BRILLA", desc: "Argentina se consagra campeona del mundo Sub-20 en Países Bajos con Messi como estrella. El futuro se veía brillante.", img: "https://images.unsplash.com/photo-1540747913346-19e3adbb17c3?q=80&w=1000" },
    { date: "15 DE AGOSTO 2008", title: "ORO OLÍMPICO EN BEIJING", desc: "Argentina obtiene la medalla de oro en fútbol olímpico con Messi, Riquelme y Di María. Puro fútbol champagne.", img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000" },
    { date: "9 DE DICIEMBRE 2018", title: "LA FINAL ETERNA", desc: "River vence a Boca en Madrid en la final más polémica de la historia de la Libertadores. Quintero para la eternidad.", img: "https://images.unsplash.com/photo-1540747913346-19e3adbb17c3?q=80&w=1000" },
    { date: "4 DE JULIO 1998", title: "EL GOL DE BERGKAMP... PERO", desc: "Argentina cae en cuartos del Mundial ante Holanda con gol agónico de Bergkamp. Una puñalada que aún duele.", img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000" },
    { date: "3 DE MARZO 2006", title: "INDEPENDIENTE Y LA SUDAMERICANA", desc: "El Rojo se corona en la Copa Sudamericana. El Rey de Copas nunca deja de ser rey.", img: "https://images.unsplash.com/photo-1540747913346-19e3adbb17c3?q=80&w=1000" },
    { date: "17 DE OCTUBRE 1973", title: "ESTUDIANTES CAMPEÓN INTERCONTINENTAL", desc: "Estudiantes de La Plata vence al Milan y se corona campeón del mundo. El Pincha contra los poderosos.", img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000" },
    { date: "20 DE DICIEMBRE 2000", title: "BOCA INTERCONTINENTAL EN TOKIO", desc: "Boca derrota al Real Madrid en la Intercontinental. Riquelme, Palermo y la gloria xeneize en Japón.", img: "https://images.unsplash.com/photo-1540747913346-19e3adbb17c3?q=80&w=1000" },
];

// Date parsing map for efemérides (month/day lookup)
const MONTH_MAP: Record<string, number> = {
    'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4, 'MAYO': 5, 'JUNIO': 6,
    'JULIO': 7, 'AGOSTO': 8, 'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12,
};

function parseEfemerideDate(dateStr: string): { month: number; day: number } | null {
    // Format: "30 DE OCTUBRE 1960" or "14 DE FEBRERO 1946"
    const match = dateStr.match(/(\d+)\s+DE\s+(\w+)/i);
    if (!match) return null;
    const day = parseInt(match[1]);
    const month = MONTH_MAP[match[2].toUpperCase()];
    if (!month) return null;
    return { month, day };
}

// Get today's efeméride: prioritize date match (month/day), fallback to daily rotation
function getTodayEfemeride() {
    const now = new Date();
    // Argentina is UTC-3
    const argDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
    const todayMonth = argDate.getMonth() + 1;
    const todayDay = argDate.getDate();

    // First: look for an exact month/day match
    const exactMatch = EFEMERIDES.find(e => {
        const parsed = parseEfemerideDate(e.date);
        return parsed && parsed.month === todayMonth && parsed.day === todayDay;
    });
    if (exactMatch) return exactMatch;

    // Second: look for same month
    const monthMatches = EFEMERIDES.filter(e => {
        const parsed = parseEfemerideDate(e.date);
        return parsed && parsed.month === todayMonth;
    });
    if (monthMatches.length > 0) {
        return monthMatches[todayDay % monthMatches.length];
    }

    // Fallback: deterministic daily rotation
    const dayOfYear = Math.floor((argDate.getTime() - new Date(argDate.getFullYear(), 0, 0).getTime()) / 86400000);
    return EFEMERIDES[dayOfYear % EFEMERIDES.length];
}

// Format date in Argentine timezone
function formatArgDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            weekday: 'long', day: '2-digit', month: 'short'
        }).toUpperCase();
    } catch {
        return dateStr;
    }
}

interface MatchData {
    id: string;
    date: string;
    teamA_Name: string | null;
    teamB_Name: string | null;
    teamA_JSON: string | null;
    teamB_JSON: string | null;
    scoreA: number | null;
    scoreB: number | null;
    motivation: string | null;
    status: string;
    hora: string | null;
    cancha: string | null;
    contributions: string | null;
    chamigo: string | null;
    goleadores: string | null;
}

export default function Dashboard() {
    const { activeGroup, loading: groupsLoading } = useGroups();
    const [matchStatus, setMatchStatus] = useState<MatchData | null>(null);
    const [loadingMatch, setLoadingMatch] = useState(false);
    const [chamigoData, setChamigoData] = useState<{ name: string; count: number }[]>([]);
    const [topGoleadores, setTopGoleadores] = useState<{ name: string; goals: number }[]>([]);

    useEffect(() => {
        if (activeGroup) {
            fetchLatestMatch();
            fetchStats();
        }
    }, [activeGroup]);

    const fetchLatestMatch = async () => {
        if (!activeGroup) return;
        setLoadingMatch(true);
        // First try upcoming, then fallback to most recent completed (persists until next match chosen)
        let { data } = await supabase
            .from('Match')
            .select('*')
            .eq('groupId', activeGroup.id)
            .eq('status', 'upcoming')
            .order('createdAt', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (!data) {
            const { data: completed } = await supabase
                .from('Match')
                .select('*')
                .eq('groupId', activeGroup.id)
                .eq('status', 'completed')
                .order('createdAt', { ascending: false })
                .limit(1)
                .maybeSingle();
            data = completed;
        }
        setMatchStatus(data);
        setLoadingMatch(false);
    };

    // Fetch cumulative stats from completed matches
    const fetchStats = async () => {
        if (!activeGroup) return;
        const { data: matches } = await supabase
            .from('Match')
            .select('chamigo, goleadores, teamA_JSON, teamB_JSON')
            .eq('groupId', activeGroup.id)
            .eq('status', 'completed');
        if (!matches || matches.length === 0) return;

        // Build a player map from all match rosters
        const playerMap: Record<string, string> = {};
        matches.forEach(m => {
            try {
                const teamA = JSON.parse(m.teamA_JSON || '[]');
                const teamB = JSON.parse(m.teamB_JSON || '[]');
                [...teamA, ...teamB].forEach((p: any) => { if (p.id && p.name) playerMap[p.id] = p.name; });
            } catch { }
        });

        // Chamigo counts
        const chamigoCounts: Record<string, number> = {};
        matches.forEach(m => {
            if (m.chamigo && playerMap[m.chamigo]) {
                chamigoCounts[m.chamigo] = (chamigoCounts[m.chamigo] || 0) + 1;
            }
        });
        const chamigoArr = Object.entries(chamigoCounts)
            .map(([id, count]) => ({ name: playerMap[id] || id, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
        setChamigoData(chamigoArr);

        // Top goleadores
        const goalCounts: Record<string, number> = {};
        matches.forEach(m => {
            if (!m.goleadores) return;
            try {
                const arr = JSON.parse(m.goleadores);
                arr.forEach((g: any) => {
                    const id = g.playerId;
                    if (id && playerMap[id]) {
                        goalCounts[id] = (goalCounts[id] || 0) + (g.goals || 0);
                    }
                });
            } catch { }
        });
        const goalArr = Object.entries(goalCounts)
            .map(([id, goals]) => ({ name: playerMap[id] || id, goals }))
            .sort((a, b) => b.goals - a.goals)
            .slice(0, 5);
        setTopGoleadores(goalArr);
    };

    if (groupsLoading) return <DashboardSkeleton />;

    if (!activeGroup) {
        return (
            <div className="max-w-4xl mx-auto p-12 text-center animate-in fade-in duration-500">
                <Ghost className="mx-auto mb-6 text-gray-300" size={80} />
                <h1 className="text-6xl mb-4 uppercase">CAMPO RECIÉN SEMBRADO</h1>
                <p className="font-serif italic text-xl text-gray-600 mb-12">
                    &quot;No hay equipos en su archivo. Funde su primer grupo para empezar la historia.&quot;
                </p>
                <Link href="/configurar-grupo" className="btn-primary !scale-110 !px-12">
                    FUNDAR MI PRIMER GRUPO <Plus className="ml-2" />
                </Link>
            </div>
        );
    }

    // Parse team data for preview
    let teamAPlayers: any[] = [];
    let teamBPlayers: any[] = [];
    let contributions: Record<string, string> = {};
    if (matchStatus?.teamA_JSON) {
        try { teamAPlayers = JSON.parse(matchStatus.teamA_JSON); } catch { }
    }
    if (matchStatus?.teamB_JSON) {
        try { teamBPlayers = JSON.parse(matchStatus.teamB_JSON); } catch { }
    }
    if (matchStatus?.contributions) {
        try { contributions = JSON.parse(matchStatus.contributions); } catch { }
    }
    const totalConvocados = teamAPlayers.length + teamBPlayers.length;

    // Get today's efeméride (rotates daily, Argentine timezone)
    const efemeride = getTodayEfemeride();

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-12 animate-in fade-in duration-500 overflow-hidden">

            {/* HEADER */}
            <header className="mb-12 border-b-4 border-black pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="w-full overflow-hidden">
                    <div className="flex items-center gap-3 mb-2">
                        <Target className="text-[var(--grafico-red)] w-6 h-6 md:w-8 md:h-8" />
                        <span className="font-masthead text-lg md:text-xl tracking-widest text-[var(--grafico-cyan)]">GRUPO OFICIAL</span>
                    </div>
                    <h1 className="text-clamp-title !text-5xl md:!text-9xl leading-none break-words">
                        {activeGroup.name}
                    </h1>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <Link href="/gestion-grupo" className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3 font-masthead tracking-widest hover:bg-[var(--grafico-red)] transition-all w-full md:w-auto">
                        <Settings size={20} /> GESTIONAR
                    </Link>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEFT: Efemérides */}
                <aside className="lg:col-span-3 space-y-8">
                    <h2 className="font-masthead text-2xl border-b-2 border-black pb-2">ARCHIVO HISTÓRICO</h2>
                    <div className="card-magazine !p-0 overflow-hidden group">
                        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[var(--ink-black)] via-[var(--grafico-red)] to-[var(--grafico-gold)]">
                            <img
                                src={efemeride.img}
                                alt="Efemérides"
                                className="bw-to-color w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <div className="absolute top-2 left-2 bg-[var(--grafico-gold)] text-black font-masthead text-xs px-2 py-1">EFEMÉRIDES</div>
                        </div>
                        <div className="p-4 bg-white">
                            <span className="block text-[10px] font-bold text-[var(--grafico-red)] mb-1 uppercase tracking-widest">{efemeride.date}</span>
                            <h3 className="text-xl mb-1">{efemeride.title}</h3>
                            <p className="text-xs font-serif italic text-gray-600 leading-tight line-clamp-3">&quot;{efemeride.desc}&quot;</p>
                            <button className="mt-4 text-[10px] font-bold uppercase hover:text-[var(--grafico-cyan)] flex items-center gap-1">VER CRÓNICA <ExternalLink size={12} /></button>
                        </div>
                    </div>
                    <div className="card-magazine !bg-[var(--ink-black)] text-white border-2 border-[var(--grafico-gold)] p-6 group">
                        <BrainCircuit className="text-[var(--grafico-gold)] mb-4 group-hover:scale-110 transition-transform" size={40} />
                        <h4 className="text-[var(--grafico-gold)] font-masthead text-2xl mb-2">TRIVIA DEL BARRIO</h4>
                        <p className="text-sm font-serif italic opacity-70 mb-6">&quot;¿Quién fue el primer goleador del grupo desde que usamos IA?&quot;</p>
                        <div className="space-y-2">
                            <button className="w-full text-left p-2 border border-white/10 hover:bg-white/10 text-xs font-masthead">A) EL TANQUE</button>
                            <button className="w-full text-left p-2 border border-white/10 hover:bg-white/10 text-xs font-masthead">B) FLASH JORGE</button>
                            <button className="w-full text-left p-2 border border-white/10 hover:bg-white/10 text-xs font-masthead">C) NI IDEA, CHE</button>
                        </div>
                    </div>
                </aside>

                {/* CENTER: Próximo Versus */}
                <section className="lg:col-span-6 space-y-8">
                    <div className="card-magazine !p-0 overflow-hidden relative border-t-8 border-t-[var(--grafico-red)] shadow-2xl">

                        {loadingMatch ? (
                            <div className="p-8"><div className="animate-pulse h-64 bg-gray-100 rounded"></div></div>
                        ) : matchStatus ? (
                            /* ═══ MATCH SAVED ═══ */
                            <>
                                <div className="p-6 sm:p-8 bg-white border-b-2 border-black/5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className={`${matchStatus.status === 'completed' ? 'bg-[var(--grafico-gold)] text-black' : 'bg-green-600 text-white'} px-3 py-1 text-[10px] md:text-xs font-masthead tracking-widest inline-block mb-2`}>
                                                {matchStatus.status === 'completed' ? '🏆 VERSUS FINALIZADO' : '✅ VERSUS CONFIRMADO'}
                                            </span>
                                            <h2 className="text-4xl md:text-6xl leading-none font-masthead">
                                                {matchStatus.status === 'completed' ? 'ÚLTIMO VERSUS' : 'PRÓXIMO VERSUS'}
                                            </h2>
                                        </div>
                                        <Calendar className="text-gray-200 hidden sm:block" size={48} />
                                    </div>

                                    {/* Date info */}
                                    <div className="flex flex-wrap gap-3 mb-4 text-xs text-black/50">
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {formatArgDate(matchStatus.date)}</span>
                                        {matchStatus.hora && <span className="flex items-center gap-1">🕐 {matchStatus.hora}</span>}
                                        {matchStatus.cancha && <span className="flex items-center gap-1">📍 {matchStatus.cancha}</span>}
                                    </div>

                                    {/* Score if completed */}
                                    {matchStatus.status === 'completed' && matchStatus.scoreA != null && (
                                        <div className="bg-[var(--grafico-red)] text-white p-4 mb-4 border-4 border-black text-center">
                                            <div className="flex items-center justify-center gap-4 sm:gap-8">
                                                <span className="font-masthead text-lg truncate max-w-[100px]">{matchStatus.teamA_Name}</span>
                                                <span className="font-masthead text-4xl bg-black px-4 py-1">{matchStatus.scoreA} - {matchStatus.scoreB}</span>
                                                <span className="font-masthead text-lg truncate max-w-[100px]">{matchStatus.teamB_Name}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* VS Header */}
                                    <div className="bg-[var(--ink-black)] text-white p-4 sm:p-6 mb-4 border-4 border-black">
                                        <div className="flex items-center justify-center gap-4 sm:gap-8">
                                            <div className="flex-1 text-center">
                                                <h3 className="text-lg sm:text-2xl font-masthead text-[var(--grafico-red)] leading-tight">{matchStatus.teamA_Name}</h3>
                                                <div className="text-[10px] text-white/40 mt-1">{teamAPlayers.length} jugadores</div>
                                            </div>
                                            <div className="font-masthead text-3xl sm:text-5xl text-white/10 italic">VS</div>
                                            <div className="flex-1 text-center">
                                                <h3 className="text-lg sm:text-2xl font-masthead text-[var(--grafico-cyan)] leading-tight">{matchStatus.teamB_Name}</h3>
                                                <div className="text-[10px] text-white/40 mt-1">{teamBPlayers.length} jugadores</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* FULL player list (Fix 3: show ALL players) */}
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="space-y-1">
                                            <div className="text-[8px] font-bold uppercase text-[var(--grafico-red)] tracking-widest mb-1">🛡️ {matchStatus.teamA_Name}</div>
                                            {teamAPlayers.map((p: any) => (
                                                <div key={p.id} className="flex items-center gap-2 text-xs">
                                                    <div className="w-5 h-5 border border-black/10 flex items-center justify-center text-[8px] font-bold shrink-0 overflow-hidden">
                                                        {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" /> : p.name?.[0]}
                                                    </div>
                                                    <span className="font-bold uppercase truncate text-[11px]">{p.name}</span>
                                                    {p.isGoalkeeper && <span className="text-[8px]">👐</span>}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-[8px] font-bold uppercase text-[var(--grafico-cyan)] tracking-widest mb-1">⚔️ {matchStatus.teamB_Name}</div>
                                            {teamBPlayers.map((p: any) => (
                                                <div key={p.id} className="flex items-center gap-2 text-xs">
                                                    <div className="w-5 h-5 border border-black/10 flex items-center justify-center text-[8px] font-bold shrink-0 overflow-hidden">
                                                        {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" /> : p.name?.[0]}
                                                    </div>
                                                    <span className="font-bold uppercase truncate text-[11px]">{p.name}</span>
                                                    {p.isGoalkeeper && <span className="text-[8px]">👐</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <Link href={`/versus/${matchStatus.id}`}
                                        className="w-full py-4 bg-gradient-to-r from-[var(--grafico-red)] to-[var(--grafico-cyan)] text-white font-masthead text-sm sm:text-base tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 border-4 border-black shadow-[3px_3px_0px_black]">
                                        <Trophy size={20} /> VER DETALLE DEL VERSUS
                                    </Link>
                                </div>

                                <div className="grid grid-cols-2 divide-x-2 divide-black/5">
                                    <div className="p-6">
                                        <span className="block text-[10px] font-bold uppercase opacity-40 mb-1">CONVOCADOS</span>
                                        <div className="flex items-end gap-2">
                                            <span className="text-5xl font-masthead text-[var(--grafico-red)]">{totalConvocados}</span>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-gray-50">
                                        <span className="block text-[10px] font-bold uppercase opacity-40 mb-1">ESTADO</span>
                                        <span className="text-xl font-masthead text-[var(--grafico-gold)]">
                                            {matchStatus.status === 'completed' ? 'PARTIDO JUGADO ✅' : 'LISTOS PARA LA CANCHA ⚽'}
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* ═══ NO MATCH YET ═══ */
                            <>
                                <div className="p-8 bg-white border-b-2 border-black/5">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <span className="bg-[var(--grafico-cyan)] text-white px-3 py-1 text-[10px] md:text-xs font-masthead tracking-widest inline-block mb-3">EN PREPARACIÓN</span>
                                            <h2 className="text-4xl md:text-7xl leading-none font-masthead">PRÓXIMO VERSUS</h2>
                                        </div>
                                        <Calendar className="text-gray-200 hidden sm:block" size={64} />
                                    </div>
                                    <div className="bg-[var(--aged-paper)] p-12 border-2 border-dashed border-black/20 mb-6 flex flex-col items-center justify-center text-center">
                                        <Star className="text-[var(--grafico-gold)] mb-4" size={48} />
                                        <p className="font-serif italic text-2xl mb-8">&quot;El campo está en silencio. No hay guerreros designados para esta fecha.&quot;</p>
                                        <Link href="/armar-partido" className="py-4 px-8 bg-gradient-to-r from-[var(--grafico-red)] to-[var(--grafico-cyan)] text-white font-masthead text-base tracking-wider hover:brightness-110 transition-all flex items-center gap-2 border-4 border-black shadow-[3px_3px_0px_black]">
                                            <Sparkles size={20} /> ARMAR PRÓXIMO VERSUS!
                                        </Link>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 divide-x-2 divide-black/5">
                                    <div className="p-6">
                                        <span className="block text-[10px] font-bold uppercase opacity-40 mb-1">CONVOCADOS</span>
                                        <div className="flex items-end gap-2">
                                            <span className="text-5xl font-masthead text-[var(--grafico-red)]">0</span>
                                            <span className="text-xl font-masthead opacity-30 pb-1">/ 10</span>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-gray-50">
                                        <span className="block text-[10px] font-bold uppercase opacity-40 mb-1">ESTADO DEL ASADO</span>
                                        <span className="text-xl font-masthead text-[var(--grafico-gold)]">PENDIENTE DE CONFIRMACIÓN 🍖</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Quick Links */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <QuickLink href="/armar-partido" title="VERSUS" icon={<Swords size={32} />} color="group-hover:text-[var(--grafico-red)]" />
                        <QuickLink href="/jugadores" title="PLANTEL" icon={<Users size={32} />} color="group-hover:text-[var(--grafico-cyan)]" />
                        <QuickLink href="/estadisticas" title="TABLAS" icon={<Star size={32} />} color="group-hover:text-[var(--grafico-gold)]" />
                        <QuickLink href="/historial" title="ARCHIVO" icon={<History size={32} />} color="group-hover:text-green-600" />
                    </div>
                </section>

                {/* RIGHT: Ranking + Stats */}
                <aside className="lg:col-span-3 space-y-8">
                    {/* Chamigo de la Semana */}
                    <div className="card-magazine border-none shadow-none !p-0">
                        <h2 className="font-masthead text-2xl border-b-2 border-black pb-2 mb-4 uppercase">🏆 CHAMIGO DE LA SEMANA</h2>
                        {chamigoData.length > 0 ? (
                            <div className="space-y-3">
                                {chamigoData.map((c, idx) => (
                                    <div key={idx} className="flex items-center gap-4 group cursor-help">
                                        <span className={`font-masthead text-4xl ${idx === 0 ? 'text-[var(--grafico-gold)]' : idx === 1 ? 'text-gray-400' : 'text-amber-700'}`}>{idx + 1}</span>
                                        <div className="flex-1 border-b border-black/5 pb-2">
                                            <div className="font-bold uppercase tracking-tighter group-hover:text-[var(--grafico-cyan)]">{c.name}</div>
                                            <div className="text-[10px] opacity-40 uppercase">{c.count} {c.count === 1 ? 'vez' : 'veces'} Chamigo</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs font-serif italic text-black/40">&quot;Aún no hay Chamigos designados. ¡Jugá un partido!&quot;</p>
                        )}
                    </div>

                    {/* Top Goleadores */}
                    <div className="card-magazine border-none shadow-none !p-0">
                        <h2 className="font-masthead text-2xl border-b-2 border-black pb-2 mb-4 uppercase">⚽ GOLEADORES</h2>
                        {topGoleadores.length > 0 ? (
                            <div className="space-y-2">
                                {topGoleadores.map((g, idx) => (
                                    <div key={idx} className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-masthead text-lg ${idx === 0 ? 'text-[var(--grafico-gold)]' : 'text-black/40'}`}>{idx + 1}</span>
                                            <span className="font-bold uppercase text-xs">{g.name}</span>
                                        </div>
                                        <span className="font-masthead text-green-600">{'⚽'.repeat(Math.min(g.goals, 5))} {g.goals > 5 ? `+${g.goals - 5}` : ''}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs font-serif italic text-black/40">&quot;La tabla de goleadores espera sus héroes.&quot;</p>
                        )}
                    </div>

                    <div className="card-magazine !bg-[var(--grafico-cyan)] text-white p-6 border-none flex flex-col items-center text-center">
                        <Share2 className="mb-4 w-8 h-8 md:w-10 md:h-10" />
                        <h4 className="text-2xl font-masthead mb-2">LINK DE INVITACIÓN</h4>
                        <p className="text-[10px] md:text-xs opacity-80 mb-6 font-serif tracking-tight">&quot;Envíe este salvoconducto a los cracks que faltan en su plantel.&quot;</p>
                        <button className="w-full bg-white text-black font-masthead py-3 border-b-4 border-black/20 hover:scale-105 transition-all text-xs md:text-sm tracking-widest">
                            COPIAR CÓDIGO MÁGICO
                        </button>
                    </div>
                </aside>

            </div>
        </div>
    );
}

function QuickLink({ href, title, icon, color }: any) {
    return (
        <Link href={href} className="card-magazine !p-4 flex flex-col items-center justify-center hover:bg-black hover:text-white transition-all group">
            <div className={`mb-2 transition-transform group-hover:scale-110 ${color}`}>{icon}</div>
            <span className="font-masthead tracking-widest text-sm">{title}</span>
        </Link>
    );
}

function DashboardSkeleton() {
    return (
        <div className="max-w-7xl mx-auto p-12 space-y-12 animate-pulse">
            <div className="h-20 w-3/4 bg-gray-200"></div>
            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-3 h-96 bg-gray-100"></div>
                <div className="col-span-6 h-[500px] bg-gray-100"></div>
                <div className="col-span-3 h-96 bg-gray-100"></div>
            </div>
        </div>
    );
}
