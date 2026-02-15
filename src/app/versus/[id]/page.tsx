'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
    ArrowLeft, Shield, Zap, Trophy, Star, Copy, CheckCircle2,
    Loader2, MessageSquare, Target, Calendar, MapPin, Clock,
    Award, Share2, ChevronDown, ChevronUp, Save,
    Minus, Plus
} from 'lucide-react';

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
    justification: string | null;
    status: string;
    hora: string | null;
    cancha: string | null;
    pizarraA: string | null;
    pizarraB: string | null;
    contributions: string | null;
    chamigo: string | null;
    goleadores: string | null;
    awards: string | null;
}

// Fun Argentine awards
const PREMIOS = [
    { key: 'poste', emoji: '🧱', name: 'El Poste', desc: 'Mejor defensor' },
    { key: 'rayo', emoji: '⚡', name: 'El Rayo', desc: 'Más rápido' },
    { key: 'cerebrito', emoji: '🧠', name: 'El Cerebrito', desc: 'Mejor asistidor / creatividad' },
    { key: 'comico', emoji: '🎭', name: 'El Cómico', desc: 'Momento más gracioso' },
];

// Journalist quotes pool
const JOURNALIST_QUOTES = [
    'Se viene un partido para no pestañear. Los dos equipos llegan afilados, con ganas de dejar todo en la cancha. Va a ser una batalla de tácticas y corazón.',
    'El versus está servido. Hay equilibrio en los números pero el fútbol se define con la pelota. Hoy alguien se lleva la gloria... o el asado gratis.',
    'Las estadísticas dicen que están parejos. Pero en el potrero las estadísticas no juegan. Acá vale la garra, el ingenio y esa cuota de picardía que solo tiene el fútbol argentino.',
    'Está todo dado para un partidazo. La IA armó los equipos, pero el resultado lo escriben los cracks en la cancha. Yo ya saqué mi boleta: va a ser un clásico.',
    'Mirando las formaciones, hay para todos los gustos: marca, gol, y ese toque de creatividad que puede cambiar el rumbo en cualquier momento.'
];

export default function VersusDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [match, setMatch] = useState<MatchData | null>(null);
    const [loading, setLoading] = useState(true);
    const [copySuccess, setCopySuccess] = useState(false);

    // Post match state
    const [editMode, setEditMode] = useState(false);
    const [scoreA, setScoreA] = useState<number>(0);
    const [scoreB, setScoreB] = useState<number>(0);
    const [chamigo, setChamigo] = useState<string>('');
    const [goleadores, setGoleadores] = useState<{ playerId: string; goals: number }[]>([]);
    const [awards, setAwards] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [showPostMatch, setShowPostMatch] = useState(false);

    useEffect(() => {
        fetchMatch();
    }, [id]);

    const fetchMatch = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('Match')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (data) {
            setMatch(data);
            setScoreA(data.scoreA ?? 0);
            setScoreB(data.scoreB ?? 0);
            setChamigo(data.chamigo || '');
            if (data.goleadores) { try { setGoleadores(JSON.parse(data.goleadores)); } catch { } }
            if (data.awards) { try { setAwards(JSON.parse(data.awards)); } catch { } }
            if (data.status === 'completed') setShowPostMatch(true);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <Loader2 className="animate-spin text-[var(--grafico-red)]" size={64} />
                <p className="font-masthead text-2xl tracking-widest text-black/30">CARGANDO VERSUS...</p>
            </div>
        );
    }

    if (!match) {
        return (
            <div className="max-w-4xl mx-auto p-12 text-center space-y-6">
                <h1 className="text-5xl font-masthead">VERSUS NO ENCONTRADO</h1>
                <Link href="/" className="btn-primary">VOLVER AL INICIO</Link>
            </div>
        );
    }

    let teamA: any[] = [];
    let teamB: any[] = [];
    let contributions: Record<string, string> = {};
    try { teamA = JSON.parse(match.teamA_JSON || '[]'); } catch { }
    try { teamB = JSON.parse(match.teamB_JSON || '[]'); } catch { }
    try { contributions = JSON.parse(match.contributions || '{}'); } catch { }

    const allPlayers = [...teamA.map(p => ({ ...p, team: 'A' })), ...teamB.map(p => ({ ...p, team: 'B' }))];
    const journalistQuote = JOURNALIST_QUOTES[match.id.charCodeAt(0) % JOURNALIST_QUOTES.length];

    const handleSavePostMatch = async () => {
        setSaving(true);
        try {
            await fetch('/api/update-match', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matchId: match.id,
                    scoreA, scoreB,
                    chamigo: chamigo || null,
                    goleadores,
                    awards,
                    status: 'completed',
                }),
            });
            await fetchMatch();
            setEditMode(false);
        } catch (err) { console.error(err); }
        setSaving(false);
    };

    const addGoleador = (playerId: string) => {
        const existing = goleadores.find(g => g.playerId === playerId);
        if (existing) {
            setGoleadores(goleadores.map(g => g.playerId === playerId ? { ...g, goals: g.goals + 1 } : g));
        } else {
            setGoleadores([...goleadores, { playerId, goals: 1 }]);
        }
    };
    const removeGoleador = (playerId: string) => {
        const existing = goleadores.find(g => g.playerId === playerId);
        if (existing && existing.goals > 1) {
            setGoleadores(goleadores.map(g => g.playerId === playerId ? { ...g, goals: g.goals - 1 } : g));
        } else {
            setGoleadores(goleadores.filter(g => g.playerId !== playerId));
        }
    };

    const copyMotivation = () => {
        if (!match.motivation) return;
        let text = `⚽ *${match.teamA_Name} vs ${match.teamB_Name}* ⚽\n\n`;
        text += `🔥 _"${match.motivation}"_\n\n`;
        text += `🗓️ ${new Date(match.date).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}\n`;
        if (match.hora) text += `🕐 ${match.hora}\n`;
        if (match.cancha) text += `📍 ${match.cancha}\n`;
        text += `\n🔗 _PaniquesoApp_`;
        navigator.clipboard.writeText(text);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    return (
        <main className="max-w-5xl mx-auto p-4 md:p-8 mb-20 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/" className="p-2 hover:bg-black/5 rounded-full transition-colors"><ArrowLeft /></Link>
                <div>
                    <div className="text-[10px] font-bold uppercase text-black/30 tracking-widest">CRÓNICA DEL VERSUS</div>
                    <h1 className="text-3xl md:text-5xl uppercase tracking-tighter font-masthead">{match.teamA_Name} vs {match.teamB_Name}</h1>
                </div>
            </div>

            {/* Match info bar */}
            <div className="bg-[var(--ink-black)] text-white p-4 mb-6 flex flex-wrap items-center justify-center gap-4 sm:gap-8 border-4 border-black">
                <div className="flex items-center gap-2 text-sm">
                    <Calendar size={14} className="text-[var(--grafico-gold)]" />
                    <span className="font-masthead tracking-wider">{new Date(match.date).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long', day: '2-digit', month: 'short' }).toUpperCase()}</span>
                </div>
                {match.hora && (
                    <div className="flex items-center gap-2 text-sm">
                        <Clock size={14} className="text-[var(--grafico-cyan)]" />
                        <span className="font-masthead tracking-wider">{match.hora}</span>
                    </div>
                )}
                {match.cancha && (
                    <div className="flex items-center gap-2 text-sm">
                        <MapPin size={14} className="text-[var(--grafico-red)]" />
                        <span className="font-masthead tracking-wider">{match.cancha}</span>
                    </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                    <Target size={14} className="text-green-400" />
                    <span className="font-masthead tracking-wider">{teamA.length} VS {teamB.length}</span>
                </div>
            </div>

            {/* ═══ VS SCORE HEADER ═══ */}
            {match.status === 'completed' && (
                <div className="bg-[var(--grafico-red)] text-white p-6 sm:p-8 mb-6 border-4 border-black text-center">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">RESULTADO FINAL</div>
                    <div className="flex items-center justify-center gap-6 sm:gap-12">
                        <div className="text-center">
                            <div className="font-masthead text-lg sm:text-2xl truncate max-w-[120px] sm:max-w-[200px]">{match.teamA_Name}</div>
                        </div>
                        <div className="bg-black text-white px-6 sm:px-10 py-3 sm:py-4 font-masthead text-4xl sm:text-6xl shadow-[4px_4px_0px_rgba(0,0,0,0.3)]">
                            {match.scoreA ?? '?'} - {match.scoreB ?? '?'}
                        </div>
                        <div className="text-center">
                            <div className="font-masthead text-lg sm:text-2xl truncate max-w-[120px] sm:max-w-[200px]">{match.teamB_Name}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ JOURNALIST AVATAR ═══ */}
            <div className="bg-white border-4 border-black p-4 sm:p-6 mb-6 flex gap-4 items-start">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[var(--ink-black)] border-2 border-[var(--grafico-gold)] flex items-center justify-center shrink-0">
                    <span className="text-2xl sm:text-3xl">🎙️</span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-masthead text-sm tracking-wider text-[var(--grafico-red)]">EL RELATOR</span>
                        <span className="text-[8px] bg-[var(--grafico-gold)] text-black font-bold px-1.5 py-0.5">PANIQUESOAPP</span>
                    </div>
                    <p className="font-serif italic text-sm sm:text-base leading-relaxed text-black/70">&quot;{journalistQuote}&quot;</p>
                </div>
            </div>

            {/* ═══ FORMATIONS ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {[
                    { team: teamA, name: match.teamA_Name, color: 'var(--grafico-red)', pizarra: match.pizarraA, icon: <Shield size={16} /> },
                    { team: teamB, name: match.teamB_Name, color: 'var(--grafico-cyan)', pizarra: match.pizarraB, icon: <Zap size={16} /> },
                ].map(({ team, name, color, pizarra, icon }, tIdx) => (
                    <div key={tIdx} className="border-4 border-black overflow-hidden">
                        <div style={{ backgroundColor: color }} className="text-white px-4 py-3 font-masthead tracking-widest text-sm flex items-center justify-between">
                            <span>{name}</span>{icon}
                        </div>
                        <div className="divide-y divide-black/5 bg-white">
                            {team.map((p: any) => (
                                <div key={p.id} className="px-4 py-3 flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-8 h-8 border-2 border-black/20 flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden">
                                            {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" /> : p.name?.[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-sm uppercase truncate">{p.name} {p.isGoalkeeper ? '👐' : ''}</div>
                                            <div className="text-[10px] font-serif italic truncate" style={{ color }}>&quot;{contributions[p.id] || 'Presencia y compromiso'}&quot;</div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-black/30 shrink-0">★{(p.scouting || 3).toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                        {pizarra && (
                            <div className="bg-black/5 p-4 border-t-2 border-black/10">
                                <div className="text-[10px] font-bold uppercase text-black/40 tracking-widest mb-2 flex items-center gap-1">🧠 LA PIZARRA DEL MÍSTER</div>
                                <p className="font-serif italic text-xs leading-relaxed text-black/70">&quot;{pizarra}&quot;</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* ═══ JUSTIFICATION ═══ */}
            {match.justification && (
                <div className="bg-white border-2 border-dashed border-black/10 p-4 sm:p-6 mb-6">
                    <div className="text-[10px] font-bold uppercase text-black/30 tracking-widest mb-2">📊 FUNDAMENTO TÁCTICO</div>
                    <p className="font-serif italic text-sm leading-relaxed text-black/70">&quot;{match.justification}&quot;</p>
                </div>
            )}

            {/* ═══ MOTIVATION + WHATSAPP ═══ */}
            {match.motivation && (
                <div className="bg-[var(--grafico-gold)] p-4 sm:p-6 mb-6 border-4 border-black">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2"><MessageSquare size={18} /><span className="font-masthead text-sm tracking-widest">LA MÍSTICA</span></div>
                        <button onClick={copyMotivation}
                            className={`text-xs font-bold flex items-center gap-1 px-3 py-1.5 transition-all ${copySuccess ? 'bg-green-600 text-white' : 'bg-black text-white hover:bg-[var(--grafico-red)]'}`}>
                            {copySuccess ? <><CheckCircle2 size={12} /> ¡COPIADO!</> : <><Share2 size={12} /> COMPARTIR</>}
                        </button>
                    </div>
                    <p className="font-serif italic text-base sm:text-xl leading-tight">&quot;{match.motivation}&quot;</p>
                </div>
            )}

            {/* ═══ POST-MATCH SECTION ═══ */}
            <div className="border-4 border-black overflow-hidden mb-6">
                <button onClick={() => setShowPostMatch(!showPostMatch)}
                    className="w-full bg-[var(--ink-black)] text-white p-4 font-masthead text-sm tracking-widest flex items-center justify-between">
                    <span className="flex items-center gap-2"><Trophy size={18} className="text-[var(--grafico-gold)]" /> RESULTADO Y PREMIOS POST-MATCH</span>
                    {showPostMatch ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {showPostMatch && (
                    <div className="bg-white p-4 sm:p-6 space-y-6">
                        {!editMode && match.status !== 'completed' && (
                            <button onClick={() => setEditMode(true)}
                                className="w-full py-3 border-4 border-[var(--grafico-gold)] bg-[var(--grafico-gold)]/10 font-masthead text-sm tracking-wider hover:bg-[var(--grafico-gold)] hover:text-black transition-colors flex items-center justify-center gap-2">
                                <Award size={16} /> CARGAR RESULTADOS
                            </button>
                        )}

                        {(editMode || match.status === 'completed') && (
                            <>
                                {/* Score */}
                                <div>
                                    <div className="text-[10px] font-bold uppercase text-black/40 tracking-widest mb-3">⚽ MARCADOR FINAL</div>
                                    <div className="flex items-center justify-center gap-4 sm:gap-8">
                                        <div className="text-center">
                                            <div className="font-masthead text-sm text-[var(--grafico-red)] truncate max-w-[100px]">{match.teamA_Name}</div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <button onClick={() => setScoreA(Math.max(0, scoreA - 1))} disabled={!editMode} className="p-1 border border-black/20 hover:bg-black/5 disabled:opacity-30"><Minus size={14} /></button>
                                                <span className="font-masthead text-4xl w-12 text-center">{scoreA}</span>
                                                <button onClick={() => setScoreA(scoreA + 1)} disabled={!editMode} className="p-1 border border-black/20 hover:bg-black/5 disabled:opacity-30"><Plus size={14} /></button>
                                            </div>
                                        </div>
                                        <span className="font-masthead text-2xl text-black/10">—</span>
                                        <div className="text-center">
                                            <div className="font-masthead text-sm text-[var(--grafico-cyan)] truncate max-w-[100px]">{match.teamB_Name}</div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <button onClick={() => setScoreB(Math.max(0, scoreB - 1))} disabled={!editMode} className="p-1 border border-black/20 hover:bg-black/5 disabled:opacity-30"><Minus size={14} /></button>
                                                <span className="font-masthead text-4xl w-12 text-center">{scoreB}</span>
                                                <button onClick={() => setScoreB(scoreB + 1)} disabled={!editMode} className="p-1 border border-black/20 hover:bg-black/5 disabled:opacity-30"><Plus size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Chamigo de la Fecha */}
                                <div>
                                    <div className="text-[10px] font-bold uppercase text-black/40 tracking-widest mb-3">🏆 CHAMIGO DE LA FECHA</div>
                                    <p className="text-[10px] text-black/30 mb-2 font-serif italic">El jugador más destacado del partido</p>
                                    {editMode ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                            {allPlayers.map(p => (
                                                <button key={p.id} onClick={() => setChamigo(p.id)}
                                                    className={`flex items-center gap-2 p-2 border-2 text-xs text-left transition-all ${chamigo === p.id ? 'border-[var(--grafico-gold)] bg-[var(--grafico-gold)]/20 font-bold' : 'border-black/10 hover:border-black/30'}`}>
                                                    <div className="w-5 h-5 border border-black/10 flex items-center justify-center text-[8px] font-bold shrink-0 overflow-hidden">
                                                        {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" /> : p.name?.[0]}
                                                    </div>
                                                    <span className="truncate uppercase">{p.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-[var(--grafico-gold)]/10 border-2 border-[var(--grafico-gold)] p-3 text-center">
                                            <span className="text-2xl mr-2">🏆</span>
                                            <span className="font-masthead text-lg">{allPlayers.find(p => p.id === chamigo)?.name || 'Sin designar'}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Goleadores */}
                                <div>
                                    <div className="text-[10px] font-bold uppercase text-black/40 tracking-widest mb-3">⚽ GOLEADORES</div>
                                    {editMode && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-3">
                                            {allPlayers.map(p => {
                                                const goals = goleadores.find(g => g.playerId === p.id)?.goals || 0;
                                                return (
                                                    <div key={p.id} className={`flex items-center justify-between p-2 border-2 text-xs transition-all ${goals > 0 ? 'border-green-500 bg-green-50' : 'border-black/10'}`}>
                                                        <span className="truncate uppercase font-bold flex-1">{p.name}</span>
                                                        <div className="flex items-center gap-1">
                                                            {goals > 0 && <button onClick={() => removeGoleador(p.id)} className="p-0.5 text-red-400 hover:text-red-600"><Minus size={12} /></button>}
                                                            <span className="font-masthead text-sm w-4 text-center">{goals || ''}</span>
                                                            <button onClick={() => addGoleador(p.id)} className="p-0.5 text-green-600 hover:text-green-800"><Plus size={12} /></button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {goleadores.length > 0 && (
                                        <div className="space-y-1">
                                            {goleadores.map(g => {
                                                const p = allPlayers.find(pl => pl.id === g.playerId);
                                                return p ? (
                                                    <div key={g.playerId} className="flex items-center justify-between px-3 py-1.5 bg-green-50 border border-green-200 text-sm">
                                                        <span className="font-bold uppercase">{p.name}</span>
                                                        <span className="font-masthead text-green-600">{'⚽'.repeat(g.goals)}</span>
                                                    </div>
                                                ) : null;
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Fun Awards */}
                                <div>
                                    <div className="text-[10px] font-bold uppercase text-black/40 tracking-widest mb-3">🏅 PREMIOS DE LA FECHA</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {PREMIOS.map(premio => (
                                            <div key={premio.key} className="border-2 border-black/10 p-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xl">{premio.emoji}</span>
                                                    <div>
                                                        <div className="font-masthead text-xs tracking-wider">{premio.name}</div>
                                                        <div className="text-[10px] text-black/40">{premio.desc}</div>
                                                    </div>
                                                </div>
                                                {editMode ? (
                                                    <select value={awards[premio.key] || ''} onChange={e => setAwards({ ...awards, [premio.key]: e.target.value })}
                                                        className="w-full p-2 border border-black/20 text-xs bg-white">
                                                        <option value="">— Seleccionar —</option>
                                                        {allPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                ) : (
                                                    <div className="font-bold text-sm uppercase text-center py-1.5 bg-black/5">
                                                        {allPlayers.find(p => p.id === awards[premio.key])?.name || '—'}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Save Button */}
                                {editMode && (
                                    <button onClick={handleSavePostMatch} disabled={saving}
                                        className="w-full py-4 bg-gradient-to-r from-[var(--grafico-red)] to-[var(--grafico-cyan)] text-white font-masthead text-lg tracking-wider border-4 border-black shadow-[3px_3px_0px_black] hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                        {saving ? <><Loader2 className="animate-spin" size={20} /> GUARDANDO...</> : <><Save size={20} /> GUARDAR RESULTADO FINAL</>}
                                    </button>
                                )}

                                {match.status === 'completed' && !editMode && (
                                    <button onClick={() => setEditMode(true)}
                                        className="w-full py-2 border-2 border-black/10 font-masthead text-xs tracking-wider text-black/40 hover:text-black hover:border-black transition-colors">
                                        EDITAR RESULTADOS
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
