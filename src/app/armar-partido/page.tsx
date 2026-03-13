'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SKILLS, PlayerSkills, emptySkills, averageSkillScore } from '@/lib/skills';
import {
    Users, Loader2, Sparkles, ArrowLeft, Copy, CheckCircle2,
    Zap, Target, ClipboardList, PlusCircle, Info,
    MessageSquare, Shield, Share2, X, UserPlus,
    Swords, RotateCcw, AlertCircle, MessageCircle,
    Trophy, Clipboard, ArrowRight, ArrowLeft as ArrowLeftIcon, Cpu, Hand, Edit2
} from 'lucide-react';
import Link from 'next/link';
import { useGroups } from '@/context/GroupContext';
import { useRouter } from 'next/navigation';

interface MatchPlayer {
    id: string;
    name: string;
    scouting: number;
    skills: PlayerSkills;
    isGuest?: boolean;
    similarTo?: string;
    photoUrl?: string;
    isGoalkeeper?: boolean;
}

interface TeamOption {
    teamA: MatchPlayer[];
    teamB: MatchPlayer[];
    names: { a: string; b: string };
    sumA?: number;
    sumB?: number;
    justification: string;
    motivation: string;
    contributions: { [playerId: string]: string };
    pizarraA?: string;
    pizarraB?: string;
}

// ── Name normalization for fuzzy matching ──
function normalize(s: string): string {
    return s.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function fuzzyMatch(input: string, candidates: { name: string; id: string }[]): { name: string; id: string } | null {
    const norm = normalize(input);
    if (!norm) return null;

    let match = candidates.find(c => normalize(c.name) === norm);
    if (match) return match;
    match = candidates.find(c => normalize(c.name).startsWith(norm));
    if (match) return match;
    match = candidates.find(c => normalize(c.name).includes(norm));
    if (match) return match;
    match = candidates.find(c => norm.includes(normalize(c.name)));
    if (match) return match;

    const ALIASES: Record<string, string> = {
        'marcos': 'Marquitos', 'marquitos': 'Marquitos',
        'nestor': 'Nestor El Flaco', 'el flaco': 'Nestor El Flaco', 'nestor el flaco': 'Nestor El Flaco',
        'sergio crack': 'Sergio (El Negro)', 'sergio el negro': 'Sergio (El Negro)', 'el negro': 'Sergio (El Negro)',
        'sergio cardiologo': 'Sergio (El Cardiólogo)', 'el cardiologo': 'Sergio (El Cardiólogo)',
        'el cura': 'Daniel "El Cura"', 'daniel el cura': 'Daniel "El Cura"', 'daniel': 'Daniel "El Cura"',
        'dr potente': 'Dr Potente', 'doctor potente': 'Dr Potente',
        'ariel': 'Ariel Van O.', 'ariel van o': 'Ariel Van O.',
        'gaston': 'Gaston (Saturno)', 'saturno': 'Gaston (Saturno)',
        'gustavo pero': 'Gustavo Pero',
    };
    const alias = ALIASES[norm];
    if (alias) {
        match = candidates.find(c => normalize(c.name) === normalize(alias));
        if (match) return match;
    }
    return null;
}

function parseWhatsAppList(text: string): { name: string; isGoalkeeper: boolean }[] {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    const results: { name: string; isGoalkeeper: boolean }[] = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (/^(buenas|viernes|sabado|domingo|lunes|martes|miercoles|jueves|que sea|dame|⚽)/i.test(trimmed)) continue;
        if (/^[⚽️🏆💪🏽⚽]+$/.test(trimmed)) continue;
        if (trimmed.length < 2) continue;
        const isGK = /[🧤👐🧤]/.test(trimmed);
        let nameWithParens = trimmed
            .replace(/^\d+[.\-)\s]+/, '')
            .replace(/[🧤👐🧤⚽️💪🏽🏆⚡🔥🧠⚙️🌶️🧱]/g, '')
            .trim();
        if (nameWithParens.length >= 2) {
            results.push({ name: nameWithParens, isGoalkeeper: isGK });
        }
    }
    return results;
}

export default function ArmarPartido() {
    const { activeGroup } = useGroups();
    const router = useRouter();
    const [dbPlayers, setDbPlayers] = useState<MatchPlayer[]>([]);
    const [selectedPlayers, setSelectedPlayers] = useState<MatchPlayer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [inputMode, setInputMode] = useState<'pick' | 'paste'>('pick');
    const [rawPaste, setRawPaste] = useState('');
    const [pasteExtra, setPasteExtra] = useState('');

    const [teamSize, setTeamSize] = useState<number | null>(null);
    const [customSize, setCustomSize] = useState('');

    const [showGuestModal, setShowGuestModal] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [guestSimilarTo, setGuestSimilarTo] = useState('');

    const [showResultsModal, setShowResultsModal] = useState(false);
    const [results, setResults] = useState<{ options: TeamOption[] } | null>(null);
    const [selectedOption, setSelectedOption] = useState<number>(0);
    const [copySuccess, setCopySuccess] = useState(false);

    // ── Manual Builder States ──
    const [showBuilderSelection, setShowBuilderSelection] = useState(false);
    const [showManualBuilder, setShowManualBuilder] = useState(false);
    const [manualTeamA, setManualTeamA] = useState<MatchPlayer[]>([]);
    const [manualTeamB, setManualTeamB] = useState<MatchPlayer[]>([]);
    const [teamAName, setTeamAName] = useState('Equipo A');
    const [teamBName, setTeamBName] = useState('Equipo B');

    useEffect(() => {
        if (activeGroup) fetchPlayers();
    }, [activeGroup]);

    const fetchPlayers = async () => {
        if (!activeGroup) return;
        const { data: playerData } = await supabase.from('Player').select('*').eq('groupId', activeGroup.id).order('name');
        if (!playerData) return;
        const { data: allRatings } = await supabase.from('SkillRating').select('*').eq('groupId', activeGroup.id);

        const players: MatchPlayer[] = playerData.map(p => {
            const playerRatings = (allRatings || []).filter((r: any) => r.playerId === p.id);
            const skills = emptySkills();
            for (const skillId of Object.keys(skills) as (keyof PlayerSkills)[]) {
                const ratingsForSkill = playerRatings.filter((r: any) => r.skill === skillId && r.score > 0);
                if (ratingsForSkill.length > 0) {
                    skills[skillId] = Math.round(ratingsForSkill.reduce((sum: number, r: any) => sum + r.score, 0) / ratingsForSkill.length * 100) / 100;
                }
            }
            return { id: p.id, name: p.name, scouting: p.scouting || averageSkillScore(skills) || 3, skills, photoUrl: p.photoUrl };
        });
        setDbPlayers(players);
    };

    const togglePlayer = (player: MatchPlayer) => {
        setSelectedPlayers(prev => prev.find(p => p.id === player.id) ? prev.filter(p => p.id !== player.id) : [...prev, player]);
    };
    const filteredDbPlayers = dbPlayers.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !selectedPlayers.some(sp => sp.id === p.id));

    const addGuest = () => {
        if (!guestName.trim()) return;
        const similarPlayer = dbPlayers.find(p => p.id === guestSimilarTo);
        const guest: MatchPlayer = {
            id: `guest-${Date.now()}`, name: guestName.trim(),
            scouting: similarPlayer?.scouting || 3, skills: similarPlayer?.skills || emptySkills(),
            isGuest: true, similarTo: similarPlayer?.name,
        };
        setSelectedPlayers(prev => [...prev, guest]);
        setGuestName(''); setGuestSimilarTo(''); setShowGuestModal(false);
    };
    const removePlayer = (id: string) => setSelectedPlayers(prev => prev.filter(p => p.id !== id));
    const selectAll = () => setSelectedPlayers([...dbPlayers]);
    const deselectAll = () => setSelectedPlayers(prev => prev.filter(p => p.isGuest));

    const handleParsePaste = () => {
        if (!rawPaste.trim()) return;
        const parsed = parseWhatsAppList(rawPaste);
        const candidates = dbPlayers.map(p => ({ name: p.name, id: p.id }));
        const matched: MatchPlayer[] = [];
        for (const { name, isGoalkeeper } of parsed) {
            const dbMatch = fuzzyMatch(name, candidates);
            if (dbMatch) {
                const full = dbPlayers.find(p => p.id === dbMatch.id);
                if (full && !matched.find(m => m.id === full.id)) matched.push({ ...full, isGoalkeeper });
            } else {
                matched.push({ id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name, scouting: 3, skills: emptySkills(), isGuest: true, isGoalkeeper });
            }
        }
        setSelectedPlayers(matched);
    };

    const effectiveTeamSize = teamSize || Math.floor(selectedPlayers.length / 2);
    const subs = Math.max(0, selectedPlayers.length - effectiveTeamSize * 2);

    const generateMatch = async () => {
        if (selectedPlayers.length < 2) return;
        setShowBuilderSelection(false);
        setLoading(true); setError(null);
        try {
            const res = await fetch('/api/generate-match', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ players: selectedPlayers, teamSize: effectiveTeamSize, extraInstructions: pasteExtra.trim() || undefined }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Error generando el partido'); setLoading(false); return; }
            setResults(data); setSelectedOption(0); setShowResultsModal(true);
        } catch (err: any) { setError(err.message || 'Error de conexión'); }
        setLoading(false);
    };

    const startManualBuilder = () => {
        setShowBuilderSelection(false);
        setManualTeamA([]);
        setManualTeamB([]);
        setTeamAName('Equipo A');
        setTeamBName('Equipo B');
        setShowManualBuilder(true);
    };

    const handleManualMove = (player: MatchPlayer, target: 'A' | 'B' | 'unassigned') => {
        setManualTeamA(prev => prev.filter(p => p.id !== player.id));
        setManualTeamB(prev => prev.filter(p => p.id !== player.id));
        if (target === 'A') setManualTeamA(prev => [...prev, player]);
        if (target === 'B') setManualTeamB(prev => [...prev, player]);
    };

    const saveManualMatch = async () => {
        if (!activeGroup || manualTeamA.length === 0 || manualTeamB.length === 0) return;
        setSaving(true);
        const sumA = manualTeamA.reduce((s, p) => s + p.scouting, 0);
        const sumB = manualTeamB.reduce((s, p) => s + p.scouting, 0);
        
        // Dummy contributions for API compatibility
        const contributions: Record<string, string> = {};
        [...manualTeamA, ...manualTeamB].forEach(p => contributions[p.id] = "Armado manualmente");

        try {
            const res = await fetch('/api/save-match', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: activeGroup.id,
                    teamA: manualTeamA, teamB: manualTeamB,
                    teamAName: teamAName || 'Equipo A', teamBName: teamBName || 'Equipo B',
                    sumA, sumB,
                    justification: 'Partido armado manualmente (estilo pan y queso).',
                    motivation: '¡A dejarlo todo en la cancha!',
                    contributions,
                    pizarraA: 'Armado de equipo clásico.',
                    pizarraB: 'Armado de equipo clásico.',
                }),
            });
            const data = await res.json();
            if (data.success) {
                router.push('/');
            } else {
                setError(data.error || 'Error guardando el partido manual');
            }
        } catch (err: any) { setError(err.message); }
        setSaving(false);
    };

    const regenerate = () => { setResults(null); setShowResultsModal(false); generateMatch(); };

    // ── Save chosen match ──
    const saveMatch = async (optionIdx: number) => {
        if (!results || !activeGroup) return;
        const opt = results.options[optionIdx];
        if (!opt) return;
        setSaving(true);
        try {
            const res = await fetch('/api/save-match', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: activeGroup.id,
                    teamA: opt.teamA, teamB: opt.teamB,
                    teamAName: opt.names.a, teamBName: opt.names.b,
                    sumA: opt.sumA, sumB: opt.sumB,
                    justification: opt.justification, motivation: opt.motivation,
                    contributions: opt.contributions,
                    pizarraA: opt.pizarraA, pizarraB: opt.pizarraB,
                }),
            });
            const data = await res.json();
            if (data.success) {
                router.push('/');
            } else {
                setError(data.error || 'Error guardando el partido');
            }
        } catch (err: any) { setError(err.message); }
        setSaving(false);
    };

    const copyToClipboard = () => {
        if (!results) return;
        const opt = results.options[selectedOption];
        if (!opt) return;

        let text = `⚽ *PAN Y QUESO — VERSUS PERFECTO* ⚽\n`;
        text += `📅 _${new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}_\n`;
        text += `📊 _${effectiveTeamSize} vs ${effectiveTeamSize}_\n\n`;

        // Team A
        text += `🛡️ *EQUIPO A: "${opt.names.a}"*\n`;
        opt.teamA.forEach(p => {
            text += `• ${p.name}${p.isGuest ? ' 🆕' : ''}${p.isGoalkeeper ? ' 👐' : ''} _(${opt.contributions[p.id] || 'Presencia'})_\n`;
        });
        if (opt.pizarraA) {
            text += `\n🧠 *La Pizarra del Míster:*\n_${opt.pizarraA}_\n`;
        }

        text += `\n`;

        // Team B
        text += `⚔️ *EQUIPO B: "${opt.names.b}"*\n`;
        opt.teamB.forEach(p => {
            text += `• ${p.name}${p.isGuest ? ' 🆕' : ''}${p.isGoalkeeper ? ' 👐' : ''} _(${opt.contributions[p.id] || 'Presencia'})_\n`;
        });
        if (opt.pizarraB) {
            text += `\n🧠 *La Pizarra del Míster:*\n_${opt.pizarraB}_\n`;
        }

        text += `\n🔥 _"${opt.motivation}"_\n`;
        text += `\n🔗 _Generado por PaniquesoApp_`;

        navigator.clipboard.writeText(text);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    return (
        <main className="max-w-6xl mx-auto p-4 md:p-8 mb-20 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/" className="p-2 hover:bg-black/5 rounded-full transition-colors"><ArrowLeft /></Link>
                <div>
                    <h1 className="text-3xl md:text-5xl uppercase tracking-tighter font-masthead">CONSTRUCTOR DE VERSUS</h1>
                    <p className="text-[var(--grafico-cyan)] font-accent uppercase text-[10px] md:text-xs tracking-widest">Motor de Inteligencia Futbolera v5.0 — Powered by Gemini AI</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT: INPUT */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="flex border-4 border-black overflow-hidden">
                        <button onClick={() => setInputMode('pick')} className={`flex-1 flex items-center justify-center gap-2 py-3 font-masthead text-xs tracking-wider transition-colors ${inputMode === 'pick' ? 'bg-[var(--ink-black)] text-white' : 'bg-white text-black hover:bg-gray-50'}`}>
                            <Users size={14} /> SELECCIONAR JUGADORES
                        </button>
                        <button onClick={() => setInputMode('paste')} className={`flex-1 flex items-center justify-center gap-2 py-3 font-masthead text-xs tracking-wider transition-colors ${inputMode === 'paste' ? 'bg-[var(--ink-black)] text-white' : 'bg-white text-black hover:bg-gray-50'}`}>
                            <MessageCircle size={14} /> PEGAR LISTA WHATSAPP
                        </button>
                    </div>

                    {inputMode === 'pick' && (
                        <>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="flex-1 relative">
                                    <input type="text" placeholder="Buscar jugador..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full p-3 pl-10 border-2 border-black/20 focus:border-black transition-colors font-sans text-sm" />
                                    <Users className="absolute left-3 top-3.5 text-black/30" size={16} />
                                </div>
                                <button onClick={selectAll} className="px-4 py-2 border-2 border-black/20 font-masthead text-xs tracking-wider hover:bg-black hover:text-white transition-colors">TODOS</button>
                                <button onClick={() => setShowGuestModal(true)} className="px-4 py-2 bg-[var(--grafico-red)] text-white font-masthead text-xs tracking-wider hover:bg-black transition-colors flex items-center gap-1.5"><UserPlus size={14} /> INVITADO</button>
                            </div>
                            <div className="border-2 border-black/10 bg-white max-h-[50vh] overflow-y-auto">
                                <div className="sticky top-0 bg-black text-white px-3 py-2 font-masthead text-xs tracking-widest flex justify-between items-center z-10">
                                    <span>PLANTILLA DISPONIBLE</span><span>{dbPlayers.length} jugadores</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2">
                                    {filteredDbPlayers.map(p => (
                                        <button key={p.id} onClick={() => togglePlayer(p)} className="flex items-center gap-3 p-3 hover:bg-blue-50 transition-colors text-left border-b border-black/5">
                                            <div className="w-8 h-8 border-2 border-black/20 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                                                {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" /> : p.name[0]}
                                            </div>
                                            <div className="flex-1 min-w-0"><div className="font-bold text-sm uppercase truncate">{p.name}</div><div className="text-[10px] text-black/40">★ {p.scouting.toFixed(2)}</div></div>
                                            <PlusCircle size={16} className="text-[var(--grafico-cyan)] shrink-0" />
                                        </button>
                                    ))}
                                    {filteredDbPlayers.length === 0 && <div className="col-span-2 p-8 text-center text-sm text-black/30 italic font-serif">{searchQuery ? 'No se encontraron jugadores' : 'Todos los jugadores están convocados'}</div>}
                                </div>
                            </div>
                        </>
                    )}

                    {inputMode === 'paste' && (
                        <div className="space-y-3">
                            <div className="bg-white border-4 border-black">
                                <div className="bg-[#25D366] text-white px-4 py-2 font-masthead text-xs tracking-widest flex items-center gap-2"><MessageCircle size={14} /> PEGAR LISTA DE WHATSAPP</div>
                                <textarea className="w-full h-56 p-4 font-sans text-sm leading-relaxed focus:outline-none bg-[var(--aged-paper)] resize-none"
                                    placeholder={`Pegá la lista del grupo. Ejemplo:\n\n1. Claudio\n2. Cali\n3. Ariel (👐)\n4. Dr. Potente\n...\n\nSe detectan automáticamente:\n• Nombres → se matchean a la base de datos\n• Emojis 🧤 👐 → se marcan como arqueros\n• Nombres desconocidos → se agregan como invitados`}
                                    value={rawPaste} onChange={e => setRawPaste(e.target.value)} />
                            </div>
                            <div className="bg-white border-2 border-black/10">
                                <div className="px-3 py-1.5 bg-black/5 text-[10px] font-bold uppercase text-black/40 tracking-widest">Instrucciones extra para la IA (opcional)</div>
                                <textarea className="w-full h-20 p-3 font-sans text-sm focus:outline-none resize-none" placeholder="Ej: Que sea bien competitivo, buscá el mejor arquero valorado para cada equipo..." value={pasteExtra} onChange={e => setPasteExtra(e.target.value)} />
                            </div>
                            <button onClick={handleParsePaste} disabled={!rawPaste.trim()} className="w-full py-3 border-4 border-black font-masthead text-sm tracking-wider hover:bg-black hover:text-white transition-colors disabled:opacity-30 flex items-center justify-center gap-2">
                                <ClipboardList size={16} /> ANALIZAR LISTA
                            </button>
                        </div>
                    )}
                </div>

                {/* RIGHT: CONVOCADOS + CONFIG */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="border-4 border-black bg-white">
                        <div className="bg-[var(--grafico-red)] text-white px-4 py-3 font-masthead tracking-widest text-sm flex items-center justify-between">
                            <span className="flex items-center gap-2"><ClipboardList size={16} /> CONVOCADOS</span>
                            <div className="flex items-center gap-2">
                                <span className="bg-white text-[var(--grafico-red)] px-2 py-0.5 text-xs font-bold">{selectedPlayers.length}</span>
                                {selectedPlayers.length > 0 && <button onClick={deselectAll} className="text-[10px] opacity-70 hover:opacity-100 underline">Limpiar</button>}
                            </div>
                        </div>
                        <div className="max-h-[40vh] overflow-y-auto divide-y divide-black/5">
                            {selectedPlayers.length === 0 ? (
                                <div className="p-6 text-center text-sm text-black/30 italic font-serif">{inputMode === 'paste' ? 'Pegá la lista y apretá ANALIZAR' : 'Seleccioná jugadores o agregá invitados'}</div>
                            ) : selectedPlayers.map((p, idx) => (
                                <div key={p.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors group">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[10px] font-bold text-black/20 w-4 shrink-0">{idx + 1}</span>
                                        <div className={`w-6 h-6 border-2 flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0 ${p.isGuest ? 'border-[var(--grafico-red)]' : 'border-black/20'}`}>
                                            {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" /> : p.isGuest ? '🆕' : p.name[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <span className="font-bold text-sm uppercase truncate block">{p.name}</span>
                                            <div className="flex gap-1 flex-wrap">
                                                {p.isGuest && <span className="text-[8px] font-bold text-[var(--grafico-red)] border border-[var(--grafico-red)] px-0.5">INV{p.similarTo ? ` ≈ ${p.similarTo}` : ''}</span>}
                                                {p.isGoalkeeper && <span className="text-[8px] font-bold text-green-600 border border-green-600 px-0.5">🧤 GK</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-black/40">★ {p.scouting.toFixed(2)}</span>
                                        <button onClick={() => removePlayer(p.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"><X size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {selectedPlayers.length > 0 && (
                            <button onClick={() => setShowGuestModal(true)} className="w-full py-2 border-t-2 border-black/10 text-[10px] font-bold uppercase text-black/30 hover:text-[var(--grafico-red)] hover:bg-red-50 transition-colors flex items-center justify-center gap-1">
                                <UserPlus size={10} /> Agregar invitado
                            </button>
                        )}
                    </div>

                    {/* Config */}
                    <div className="border-4 border-black bg-[var(--ink-black)] text-white p-4">
                        <label className="text-[var(--grafico-gold)] font-masthead text-sm tracking-widest block mb-3 uppercase">MODALIDAD DE PARTIDO</label>
                        <div className="grid grid-cols-5 gap-1.5 mb-3">
                            {[{ label: 'AUTO', value: null }, { label: '5v5', value: 5 }, { label: '6v6', value: 6 }, { label: '7v7', value: 7 }, { label: '8v8', value: 8 }].map(opt => (
                                <button key={opt.label} onClick={() => { setTeamSize(opt.value); setCustomSize(''); }}
                                    className={`py-2 border-2 font-masthead text-sm transition-all ${teamSize === opt.value && !customSize ? 'border-[var(--grafico-gold)] bg-white/10 text-[var(--grafico-gold)]' : 'border-white/10 opacity-50 hover:opacity-100'}`}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 items-center mb-3">
                            <span className="text-[10px] text-white/40 font-bold uppercase">O personalizado:</span>
                            <input type="number" min="1" max="20" placeholder="ej: 9" value={customSize}
                                onChange={e => { setCustomSize(e.target.value); const v = parseInt(e.target.value); setTeamSize(v > 0 ? v : null); }}
                                className="w-20 p-2 bg-white/10 border border-white/20 text-white text-center font-masthead text-sm focus:outline-none focus:border-[var(--grafico-gold)]" />
                            <span className="text-xs text-white/30">vs</span>
                            <span className="text-sm font-masthead text-[var(--grafico-gold)]">{customSize || '?'}</span>
                        </div>

                        <div className="bg-white/5 p-3 mb-4 border border-white/10 text-xs space-y-1">
                            <div className="flex justify-between"><span className="text-white/50">Convocados</span><span className="font-bold">{selectedPlayers.length}</span></div>
                            <div className="flex justify-between"><span className="text-white/50">Formato</span><span className="font-bold text-[var(--grafico-gold)]">{effectiveTeamSize} vs {effectiveTeamSize}</span></div>
                            {subs > 0 && <div className="flex justify-between text-yellow-300"><span>Suplentes</span><span className="font-bold">{subs}</span></div>}
                            <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
                                <span className="text-white/50">Σ Scouting promedio</span>
                                <span className="font-bold">{selectedPlayers.length > 0 ? (selectedPlayers.reduce((s, p) => s + p.scouting, 0) / selectedPlayers.length).toFixed(2) : '—'}</span>
                            </div>
                        </div>

                        <button onClick={() => setShowBuilderSelection(true)} disabled={selectedPlayers.length < 2 || loading}
                            className="w-full py-4 bg-gradient-to-r from-[var(--grafico-red)] to-[var(--grafico-cyan)] text-white font-masthead text-lg tracking-wider hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            <Sparkles size={20} /> CONFIRMAR CONVOCATORIA Y ARMAR VERSUS
                        </button>

                        {error && <div className="mt-3 bg-red-500/20 border border-red-400/30 p-2 text-xs text-red-300 flex items-start gap-2"><AlertCircle size={14} className="shrink-0 mt-0.5" />{error}</div>}
                    </div>

                    <div className="bg-[var(--aged-paper)] p-4 font-serif text-xs italic text-black/50 border border-black/10">
                        <Info size={14} className="inline mr-1 text-[var(--grafico-cyan)]" />
                        Nuestro agente IA analiza los <b>6 skills</b> y el <b>scouting promedio</b> de cada convocado. Los invitados reciben stats de un jugador &quot;parecido a...&quot;. Los 🧤 se detectan como arqueros.
                    </div>
                </div>
            </div>

            {/* BUILDER SELECTION MODAL */}
            {showBuilderSelection && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowBuilderSelection(false)}>
                    <div className="bg-white border-4 border-black max-w-lg w-full animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="bg-black text-white p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 font-masthead tracking-widest text-lg"><Swords size={20} /> ELEGIR MODO DE ARMADO</div>
                            <button onClick={() => setShowBuilderSelection(false)} className="p-1 hover:bg-white/20 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <button onClick={generateMatch} disabled={loading} className="w-full text-left p-4 border-4 border-black hover:bg-[var(--ink-black)] hover:text-white transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center bg-[var(--grafico-cyan)] text-white group-hover:border-white">
                                        <Cpu size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-masthead text-xl uppercase tracking-wider group-hover:text-[var(--grafico-gold)]">CONSTRUCTOR IA (GEMINI)</h3>
                                        <p className="font-sans text-xs text-black/60 group-hover:text-white/70 italic mt-1">La inteligencia artificial balancea meticulosamente los equipos usando los 6 skills y tus instrucciones extra.</p>
                                    </div>
                                </div>
                            </button>

                            <button onClick={startManualBuilder} className="w-full text-left p-4 border-4 border-black hover:bg-[var(--grafico-red)] hover:text-white transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center bg-white text-black group-hover:border-white">
                                        <Hand size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-masthead text-xl uppercase tracking-wider group-hover:text-[var(--grafico-gold)]">MANUAL (PAN Y QUESO)</h3>
                                        <p className="font-sans text-xs text-black/60 group-hover:text-white/70 italic mt-1">Vos sos el DT. Repartí los convocados uno por uno al estilo clásico. Mantenemos las stats para que evalúes el balance.</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MANUAL BUILDER MODAL */}
            {showManualBuilder && (
                <div className="fixed inset-0 z-[60] bg-black/80 flex items-start justify-center p-2 sm:p-4 animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-[var(--aged-paper)] border-4 border-black max-w-6xl w-full my-4 animate-in zoom-in-95 duration-500 min-h-[80vh] flex flex-col">
                        <div className="bg-black text-white p-4 sm:p-6 flex items-center justify-between shrink-0">
                            <div>
                                <div className="font-accent text-[var(--grafico-gold)] text-xs sm:text-sm uppercase tracking-widest mb-1">ARMADOR MANUAL</div>
                                <h2 className="font-masthead text-2xl sm:text-4xl tracking-tight">ESTILO PAN Y QUESO</h2>
                            </div>
                            <button onClick={() => setShowManualBuilder(false)} className="p-2 hover:bg-white/10 transition-colors"><X size={20} /></button>
                        </div>

                        {/* Unassigned Pool */}
                        {(() => {
                            const unassigned = selectedPlayers.filter(p => !manualTeamA.find(a => a.id === p.id) && !manualTeamB.find(b => b.id === p.id));
                            return (
                                <div className="p-4 bg-white border-b-4 border-black shrink-0">
                                    <h3 className="font-masthead text-sm tracking-widest mb-3 flex items-center gap-2">
                                        <Users size={16} /> JUGADORES DISPONIBLES ({unassigned.length})
                                    </h3>
                                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                        {unassigned.length === 0 && (
                                            <div className="text-xs italic text-black/50 py-2">Todos los jugadores han sido asignados.</div>
                                        )}
                                        {unassigned.map(p => (
                                            <div key={p.id} className="border-2 border-black p-2 min-w-[160px] flex flex-col gap-2 shrink-0 bg-gray-50">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 border-2 border-black flex items-center justify-center font-bold text-xs shrink-0 bg-white">
                                                        {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" /> : p.isGuest ? '🆕' : p.name[0]}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-xs uppercase truncate leading-tight">{p.name}</div>
                                                        <div className="text-[10px] text-black/50">★ {p.scouting.toFixed(2)} {p.isGoalkeeper ? '🧤' : ''}</div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 mt-auto">
                                                    <button onClick={() => handleManualMove(p, 'A')} className="flex-1 bg-[var(--grafico-red)] text-white text-[10px] font-bold py-1 hover:brightness-110 flex items-center justify-center gap-1">
                                                        <ArrowLeftIcon size={12} /> A
                                                    </button>
                                                    <button onClick={() => handleManualMove(p, 'B')} className="flex-1 bg-[var(--grafico-cyan)] text-white text-[10px] font-bold py-1 hover:brightness-110 flex items-center justify-center gap-1">
                                                        B <ArrowRight size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Teams */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-b-4 border-black flex-1">
                            {/* Team A */}
                            <div className="border-r-0 md:border-r-4 border-b-4 md:border-b-0 border-black bg-white flex flex-col">
                                <div className="bg-[var(--grafico-red)] text-white p-3 flex gap-2 items-center justify-between">
                                    <div className="relative flex-1 max-w-[70%] group">
                                        <input type="text" value={teamAName} onChange={e => setTeamAName(e.target.value)} 
                                            className="w-full bg-white/10 hover:bg-white/20 border-b-2 border-white/50 focus:border-white focus:bg-white/20 focus:outline-none font-masthead text-xl py-1 px-2 rounded-t transition-colors placeholder:text-white/50" 
                                            placeholder="Nombre Equipo A" />
                                        <Edit2 size={12} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 group-hover:opacity-100 pointer-events-none" />
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-xs opacity-80">{manualTeamA.length} jug.</div>
                                        <div className="text-sm font-bold">Σ {manualTeamA.reduce((s, p) => s + p.scouting, 0).toFixed(1)}</div>
                                    </div>
                                </div>
                                <div className="p-3 divide-y divide-black/5 flex-1 overflow-y-auto max-h-[40vh] md:max-h-full">
                                    {manualTeamA.length === 0 && <div className="text-center italic text-black/30 text-sm py-8">Vacío</div>}
                                    {manualTeamA.map(p => (
                                        <div key={p.id} className="flex items-center justify-between py-2 group">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleManualMove(p, 'unassigned')} className="text-red-500 hover:text-red-700 p-1 bg-red-50"><X size={14} /></button>
                                                <div className="font-bold text-sm uppercase">{p.name} {p.isGoalkeeper ? '🧤' : ''}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-black/40 font-bold">★ {p.scouting.toFixed(1)}</span>
                                                <button onClick={() => handleManualMove(p, 'B')} className="text-[10px] font-bold bg-[var(--grafico-cyan)] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">A EQUIPO B</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Team B */}
                            <div className="bg-white flex flex-col">
                                <div className="bg-[var(--grafico-cyan)] text-white p-3 flex gap-2 items-center justify-between">
                                    <div className="relative flex-1 max-w-[70%] group">
                                        <input type="text" value={teamBName} onChange={e => setTeamBName(e.target.value)} 
                                            className="w-full bg-white/10 hover:bg-white/20 border-b-2 border-white/50 focus:border-white focus:bg-white/20 focus:outline-none font-masthead text-xl py-1 px-2 rounded-t transition-colors placeholder:text-white/50" 
                                            placeholder="Nombre Equipo B" />
                                        <Edit2 size={12} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 group-hover:opacity-100 pointer-events-none" />
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-xs opacity-80">{manualTeamB.length} jug.</div>
                                        <div className="text-sm font-bold">Σ {manualTeamB.reduce((s, p) => s + p.scouting, 0).toFixed(1)}</div>
                                    </div>
                                </div>
                                <div className="p-3 divide-y divide-black/5 flex-1 overflow-y-auto max-h-[40vh] md:max-h-full">
                                    {manualTeamB.length === 0 && <div className="text-center italic text-black/30 text-sm py-8">Vacío</div>}
                                    {manualTeamB.map(p => (
                                        <div key={p.id} className="flex items-center justify-between py-2 group">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleManualMove(p, 'unassigned')} className="text-red-500 hover:text-red-700 p-1 bg-red-50"><X size={14} /></button>
                                                <div className="font-bold text-sm uppercase">{p.name} {p.isGoalkeeper ? '🧤' : ''}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-black/40 font-bold">★ {p.scouting.toFixed(1)}</span>
                                                <button onClick={() => handleManualMove(p, 'A')} className="text-[10px] font-bold bg-[var(--grafico-red)] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">A EQUIPO A</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Save Action */}
                        <div className="p-4 bg-white shrink-0">
                            <button onClick={saveManualMatch} disabled={saving || manualTeamA.length === 0 || manualTeamB.length === 0}
                                className="w-full py-4 bg-gradient-to-r from-[var(--grafico-gold)] via-yellow-500 to-[var(--grafico-gold)] text-black font-masthead text-lg tracking-wider border-4 border-black hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-[4px_4px_0px_black]">
                                {saving ? <><Loader2 className="animate-spin" size={20} /> GUARDANDO...</> : <><Trophy size={22} /> CONFIRMAR Y GUARDAR VERSUS MANUAL</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* GUEST MODAL */}
            {showGuestModal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowGuestModal(false)}>
                    <div className="bg-white border-4 border-black max-w-sm w-full animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="bg-[var(--grafico-red)] text-white p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 font-masthead tracking-widest text-sm"><UserPlus size={16} /> AGREGAR INVITADO</div>
                            <button onClick={() => setShowGuestModal(false)} className="p-1 hover:bg-white/20"><X size={16} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase mb-1 text-black/50">Nombre del invitado</label>
                                <input type="text" placeholder="Ej: El Tano" value={guestName} onChange={e => setGuestName(e.target.value)} className="w-full p-3 border-2 border-black/20 focus:border-black transition-all font-sans text-sm" autoFocus />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase mb-1 text-black/50">Juega parecido a...</label>
                                <select value={guestSimilarTo} onChange={e => setGuestSimilarTo(e.target.value)} className="w-full p-3 border-2 border-black/20 focus:border-black transition-all font-sans text-sm bg-white">
                                    <option value="">— Nivel intermedio (3.0) —</option>
                                    {dbPlayers.sort((a, b) => b.scouting - a.scouting).map(p => (<option key={p.id} value={p.id}>{p.name} (★ {p.scouting.toFixed(2)})</option>))}
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setShowGuestModal(false)} className="flex-1 py-2 border-2 border-black/20 font-masthead text-sm hover:bg-gray-50">CANCELAR</button>
                                <button onClick={addGuest} disabled={!guestName.trim()} className="flex-1 py-2 bg-[var(--grafico-red)] text-white font-masthead text-sm hover:bg-black transition-colors disabled:opacity-50">CONVOCAR</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ RESULTS MODAL ═══════════ */}
            {showResultsModal && results && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center p-2 sm:p-4 animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-[var(--aged-paper)] border-4 border-black max-w-4xl w-full my-4 animate-in zoom-in-95 duration-500">

                        <div className="bg-black text-white p-4 sm:p-6 flex items-center justify-between">
                            <div>
                                <div className="font-accent text-[var(--grafico-gold)] text-xs sm:text-sm uppercase tracking-widest mb-1">CRÓNICA DE LA INTELIGENCIA FUTBOLERA</div>
                                <h2 className="font-masthead text-2xl sm:text-4xl tracking-tight">EL VERSUS PERFECTO</h2>
                            </div>
                            <button onClick={() => setShowResultsModal(false)} className="p-2 hover:bg-white/10 transition-colors"><X size={20} /></button>
                        </div>

                        {results.options.length > 1 && (
                            <div className="flex border-b-4 border-black">
                                {results.options.map((_, idx) => (
                                    <button key={idx} onClick={() => setSelectedOption(idx)}
                                        className={`flex-1 py-3 font-masthead text-sm tracking-widest transition-colors ${selectedOption === idx ? 'bg-[var(--grafico-red)] text-white' : 'bg-white text-black hover:bg-gray-100'}`}>
                                        OPCIÓN {idx + 1}
                                    </button>
                                ))}
                            </div>
                        )}

                        {(() => {
                            const opt = results.options[selectedOption];
                            if (!opt) return null;
                            return (
                                <div className="p-4 sm:p-6 space-y-6">
                                    {/* VS Header */}
                                    <div className="flex items-center justify-center gap-4 sm:gap-8 py-4">
                                        <div className="flex-1 text-center">
                                            <h3 className="text-xl sm:text-3xl font-masthead text-[var(--grafico-red)] leading-tight">{opt.names.a}</h3>
                                            <div className="text-[10px] font-bold text-black/30 uppercase mt-1">{opt.teamA.length} jugadores</div>
                                            {opt.sumA != null && <div className="text-xs font-bold text-black/40">Σ {opt.sumA.toFixed(1)}</div>}
                                        </div>
                                        <div className="font-masthead text-3xl sm:text-5xl text-black/10 italic">VS</div>
                                        <div className="flex-1 text-center">
                                            <h3 className="text-xl sm:text-3xl font-masthead text-[var(--grafico-cyan)] leading-tight">{opt.names.b}</h3>
                                            <div className="text-[10px] font-bold text-black/30 uppercase mt-1">{opt.teamB.length} jugadores</div>
                                            {opt.sumB != null && <div className="text-xs font-bold text-black/40">Σ {opt.sumB.toFixed(1)}</div>}
                                        </div>
                                    </div>

                                    {/* Teams with personalized contributions */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { team: opt.teamA, name: opt.names.a, color: 'var(--grafico-red)', pizarra: opt.pizarraA, icon: <Shield size={16} /> },
                                            { team: opt.teamB, name: opt.names.b, color: 'var(--grafico-cyan)', pizarra: opt.pizarraB, icon: <Zap size={16} /> },
                                        ].map(({ team, name, color, pizarra, icon }, tIdx) => (
                                            <div key={tIdx} className="border-4 border-black overflow-hidden">
                                                <div style={{ backgroundColor: color }} className="text-white px-4 py-3 font-masthead tracking-widest text-sm flex items-center justify-between">
                                                    <span>{name}</span>{icon}
                                                </div>
                                                <div className="divide-y divide-black/5 bg-white">
                                                    {team.map(p => (
                                                        <div key={p.id} className="px-4 py-3 flex items-start justify-between gap-2">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <div className="w-7 h-7 border-2 border-black/20 flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden">
                                                                    {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" /> : p.name[0]}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="font-bold text-sm uppercase truncate">{p.name} {p.isGuest ? '🆕' : ''}</div>
                                                                    <div className="text-[10px] font-serif italic truncate" style={{ color }}>&quot;{opt.contributions[p.id] || 'Presencia'}&quot;</div>
                                                                </div>
                                                            </div>
                                                            <span className="text-[10px] text-black/30 shrink-0">★{p.scouting.toFixed(1)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Pizarra del Míster */}
                                                {pizarra && (
                                                    <div className="bg-black/5 p-4 border-t-2 border-black/10">
                                                        <div className="text-[10px] font-bold uppercase text-black/40 tracking-widest mb-2 flex items-center gap-1">🧠 LA PIZARRA DEL MÍSTER</div>
                                                        <p className="font-serif italic text-xs leading-relaxed text-black/70">&quot;{pizarra}&quot;</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Tactical Analysis */}
                                    <div className="bg-white border-2 border-dashed border-black/10 p-4 sm:p-6">
                                        <div className="text-[10px] font-bold uppercase text-black/30 tracking-widest mb-2">📊 ANÁLISIS TÁCTICO</div>
                                        <p className="font-serif italic text-sm sm:text-base leading-relaxed text-black/70">&quot;{opt.justification}&quot;</p>
                                    </div>

                                    {/* La Mística */}
                                    <div className="bg-[var(--grafico-gold)] p-4 sm:p-6 border-4 border-black">
                                        <div className="flex items-center gap-2 mb-2"><MessageSquare size={18} /><span className="font-masthead text-sm tracking-widest">LA MÍSTICA</span></div>
                                        <p className="font-serif italic text-base sm:text-xl leading-tight">&quot;{opt.motivation}&quot;</p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button onClick={regenerate} className="flex-1 py-3 border-4 border-black font-masthead text-sm tracking-wider hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-2">
                                            <RotateCcw size={16} /> REHACER MATCH
                                        </button>
                                        <button onClick={copyToClipboard}
                                            className={`flex-1 py-3 font-masthead text-sm tracking-wider flex items-center justify-center gap-2 transition-all ${copySuccess ? 'bg-green-600 text-white border-4 border-green-600' : 'bg-[var(--grafico-cyan)] text-white border-4 border-[var(--grafico-cyan)] hover:bg-black hover:border-black'}`}>
                                            {copySuccess ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                                            {copySuccess ? '¡COPIADO!' : 'COPIAR PARA WHATSAPP'}
                                        </button>
                                    </div>

                                    {/* ★ ELEGIR ESTE VERSUS ★ */}
                                    <button onClick={() => saveMatch(selectedOption)} disabled={saving}
                                        className="w-full py-4 bg-gradient-to-r from-[var(--grafico-gold)] via-yellow-500 to-[var(--grafico-gold)] text-black font-masthead text-lg tracking-wider border-4 border-black hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-[4px_4px_0px_black]">
                                        {saving ? <><Loader2 className="animate-spin" size={20} /> GUARDANDO...</> : <><Trophy size={22} /> ELEGIR ESTE VERSUS</>}
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* LOADING */}
            {loading && (
                <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="text-center space-y-6">
                        <Swords className="text-[var(--grafico-gold)] animate-pulse mx-auto" size={64} />
                        <div className="space-y-2">
                            <h3 className="font-masthead text-2xl sm:text-4xl text-white tracking-wider">CALCULANDO ECUACIONES</h3>
                            <h4 className="font-masthead text-xl sm:text-3xl text-[var(--grafico-gold)] tracking-wider">DEL BALOMPIÉ...</h4>
                        </div>
                        <Loader2 className="animate-spin text-white mx-auto" size={32} />
                        <p className="text-xs text-white/30 font-serif italic max-w-xs mx-auto">Gemini está analizando {selectedPlayers.length} jugadores, 6 skills cada uno...</p>
                    </div>
                </div>
            )}
        </main>
    );
}
