'use client';

import { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useGroups } from '@/context/GroupContext';
import { useUser } from '@clerk/nextjs';
import { SKILLS, PlayerSkills, emptySkills, averageSkillScore } from '@/lib/skills';
import SkillRadar from '@/components/SkillRadar';
import SkillSlider from '@/components/SkillSlider';
import PlayerCard from '@/components/PlayerCard';
import {
    Users, UserPlus, Zap, ArrowLeft, ArrowRight, Star,
    Cloud, CloudOff, CheckCircle2, SkipForward, Trophy, Upload,
    ChevronLeft, X, Loader2, BarChart3, Link as LinkIcon,
    Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';

type Tab = 'fichar' | 'puntear' | 'plantel';

interface PlayerWithSkills {
    id: string;
    name: string;
    alias: string | null;
    clerkId: string | null;
    photoUrl: string | null;
    scouting: number;
    skills: PlayerSkills;
    voteCount: number;
    role: string;
    hasMyRating: boolean; // whether current user already rated this player
}

export default function Scouting() {
    const { activeGroup } = useGroups();
    const { user } = useUser();
    const [tab, setTab] = useState<Tab>('fichar');
    const [players, setPlayers] = useState<PlayerWithSkills[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCloud, setIsCloud] = useState(false);

    // Admin check
    const isAdmin = activeGroup?.role === 'ADMIN';

    // Fichar state
    const [newName, setNewName] = useState('');

    // Puntear state
    const [ratingIndex, setRatingIndex] = useState(0);
    const [currentRatings, setCurrentRatings] = useState<Record<string, number>>({});
    const [saving, setSaving] = useState(false);
    const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
    const [ratingComplete, setRatingComplete] = useState(false);
    const [completedCount, setCompletedCount] = useState(0);

    // Detail modal
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithSkills | null>(null);

    // Photo modal
    const [photoPlayer, setPhotoPlayer] = useState<PlayerWithSkills | null>(null);
    const [photoUrl, setPhotoUrl] = useState('');
    const [savingPhoto, setSavingPhoto] = useState(false);
    const [photoMode, setPhotoMode] = useState<'upload' | 'url'>('upload');
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Admin metrics modal
    const [showMetrics, setShowMetrics] = useState(false);
    const [metricsData, setMetricsData] = useState<{ raterId: string; count: number }[]>([]);

    // Players to rate (exclude self + already rated)
    const unratedPlayers = players.filter(
        p => p.clerkId !== user?.id && !p.hasMyRating
    );

    useEffect(() => {
        if (activeGroup) {
            fetchPlayersWithSkills();
        }
    }, [activeGroup]);

    const fetchPlayersWithSkills = async () => {
        if (!activeGroup || !user) return;
        setLoading(true);
        try {
            const { data: playerData, error: playerError } = await supabase
                .from('Player')
                .select('*')
                .eq('groupId', activeGroup.id)
                .order('name');

            if (playerError || !playerData) {
                setIsCloud(false);
                setLoading(false);
                return;
            }
            setIsCloud(true);

            // Fetch ALL ratings for the group (to compute aggregates)
            const { data: allRatingData } = await supabase
                .from('SkillRating')
                .select('*')
                .eq('groupId', activeGroup.id);

            // Track which playerIds the current user has rated
            const myRatedPlayerIds = new Set(
                (allRatingData || []).filter(r => r.raterId === user.id).map(r => r.playerId)
            );

            const playersWithSkills: PlayerWithSkills[] = playerData.map(p => {
                const playerRatings = (allRatingData || []).filter(r => r.playerId === p.id);
                const skills = emptySkills();

                // Compute average per skill across ALL raters
                const skillIds = Object.keys(skills) as (keyof PlayerSkills)[];
                for (const skillId of skillIds) {
                    const ratingsForSkill = playerRatings.filter(r => r.skill === skillId && r.score > 0);
                    if (ratingsForSkill.length > 0) {
                        const avg = ratingsForSkill.reduce((sum, r) => sum + r.score, 0) / ratingsForSkill.length;
                        skills[skillId] = Math.round(avg * 10) / 10; // 1 decimal
                    }
                }

                const uniqueRaters = new Set(
                    playerRatings.map(r => r.raterId)
                );

                return {
                    ...p,
                    skills,
                    voteCount: uniqueRaters.size,
                    hasMyRating: myRatedPlayerIds.has(p.id),
                };
            });

            setPlayers(playersWithSkills);
        } catch (e) {
            console.error('Error fetching data:', e);
            setIsCloud(false);
        } finally {
            setLoading(false);
        }
    };

    // Start PUNTEAR — only show unrated players
    const startRating = useCallback(async () => {
        if (!user || !activeGroup) return;

        // Refresh data first to get accurate hasMyRating
        await fetchPlayersWithSkills();
        setRatingIndex(0);
        setRatingComplete(false);
        setSkippedIds(new Set());
        setCompletedCount(0);
        setCurrentRatings({});
        setTab('puntear');
    }, [user, activeGroup]);

    const currentPlayer = unratedPlayers[ratingIndex];

    const getRatingKey = (playerId: string, skill: string) => `${playerId}_${skill}`;

    const handleSkillRate = (skill: string, score: number) => {
        if (!currentPlayer) return;
        setCurrentRatings(prev => ({
            ...prev,
            [getRatingKey(currentPlayer.id, skill)]: score,
        }));
    };

    const saveAndNext = async () => {
        if (!currentPlayer || !user || !activeGroup) return;
        setSaving(true);

        try {
            const now = new Date().toISOString();
            const upserts = SKILLS.map(skill => ({
                id: crypto.randomUUID(),
                raterId: user.id,
                playerId: currentPlayer.id,
                skill: skill.id,
                score: currentRatings[getRatingKey(currentPlayer.id, skill.id)] || 0,
                groupId: activeGroup.id,
                createdAt: now,
                updatedAt: now,
            })).filter(u => u.score > 0);

            if (upserts.length > 0) {
                await supabase
                    .from('SkillRating')
                    .delete()
                    .eq('raterId', user.id)
                    .eq('playerId', currentPlayer.id);

                const { error } = await supabase
                    .from('SkillRating')
                    .insert(upserts);

                if (error) {
                    console.error('Error saving ratings:', error);
                } else {
                    setCompletedCount(prev => prev + 1);
                }
            }
        } catch (err) {
            console.error('Error saving:', err);
        }

        setSaving(false);
        goToNext();
    };

    const skipPlayer = () => {
        if (!currentPlayer) return;
        setSkippedIds(prev => new Set(prev).add(currentPlayer.id));
        goToNext();
    };

    const goToNext = () => {
        if (ratingIndex < unratedPlayers.length - 1) {
            setRatingIndex(prev => prev + 1);
        } else {
            setRatingComplete(true);
            fetchPlayersWithSkills();
        }
    };

    const goToPrev = () => {
        if (ratingIndex > 0) {
            setRatingIndex(prev => prev - 1);
        }
    };

    const exitRating = () => {
        setTab('fichar');
        fetchPlayersWithSkills();
    };

    const addPlayer = async () => {
        if (!newName.trim() || !activeGroup) return;
        const now = new Date().toISOString();
        const { error } = await supabase
            .from('Player')
            .insert([{
                id: crypto.randomUUID(),
                name: newName.trim(),
                groupId: activeGroup.id,
                scouting: 0,
                createdAt: now,
                updatedAt: now,
            }]);

        if (!error) {
            setNewName('');
            fetchPlayersWithSkills();
        }
    };

    const deletePlayer = async (playerId: string) => {
        if (!confirm('¿Estás seguro de eliminar este jugador? Se borrarán todos sus datos de scouting.')) return;
        await supabase.from('SkillRating').delete().eq('playerId', playerId);
        await supabase.from('Player').delete().eq('id', playerId);
        fetchPlayersWithSkills();
    };

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { alert('Solo se permiten imágenes'); return; }
        if (file.size > 2 * 1024 * 1024) { alert('Máximo 2MB'); return; }
        const reader = new FileReader();
        reader.onload = () => setPhotoPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const savePhoto = async () => {
        if (!photoPlayer) return;
        setSavingPhoto(true);
        try {
            if (photoMode === 'upload' && fileInputRef.current?.files?.[0]) {
                const formData = new FormData();
                formData.append('file', fileInputRef.current.files[0]);
                formData.append('playerId', photoPlayer.id);
                const res = await fetch('/api/upload-photo', { method: 'POST', body: formData });
                const json = await res.json();
                if (!res.ok) { alert(json.error || 'Error subiendo foto'); setSavingPhoto(false); return; }
            } else if (photoMode === 'url' && photoUrl.trim()) {
                const { error } = await supabase
                    .from('Player')
                    .update({ photoUrl: photoUrl.trim() })
                    .eq('id', photoPlayer.id);
                if (error) { alert(error.message); setSavingPhoto(false); return; }
            } else {
                setSavingPhoto(false);
                return;
            }
            setPhotoPlayer(null);
            setPhotoUrl('');
            setPhotoPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchPlayersWithSkills();
        } catch (err: any) {
            alert(err.message || 'Error');
        }
        setSavingPhoto(false);
    };

    // Admin metrics
    const loadMetrics = async () => {
        if (!activeGroup) return;
        const { data } = await supabase
            .from('SkillRating')
            .select('raterId')
            .eq('groupId', activeGroup.id);

        const raterCounts: Record<string, number> = {};
        (data || []).forEach(r => {
            raterCounts[r.raterId] = (raterCounts[r.raterId] || 0) + 1;
        });

        const metrics = Object.entries(raterCounts).map(([raterId, count]) => ({
            raterId,
            count: Math.floor(count / 6), // 6 skills per player = 1 "vote"
        }));

        setMetricsData(metrics.sort((a, b) => b.count - a.count));
        setShowMetrics(true);
    };

    const getSkillValue = (skill: string): number => {
        if (!currentPlayer) return 0;
        return currentRatings[getRatingKey(currentPlayer.id, skill)] || 0;
    };

    const currentPlayerHasRatings = currentPlayer
        ? SKILLS.some(s => (currentRatings[getRatingKey(currentPlayer.id, s.id)] || 0) > 0)
        : false;

    const totalPlayers = players.filter(p => p.clerkId !== user?.id).length;
    const ratedPlayers = players.filter(p => p.hasMyRating).length;

    if (loading) return <ScoutingSkeleton />;

    return (
        <main className="max-w-6xl mx-auto p-4 md:p-8 mb-20 animate-in fade-in duration-300">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-6 border-b-4 border-[var(--grafico-red)] pb-4">
                <div className="flex items-center gap-3">
                    <Link href="/" className="p-2 hover:bg-black/5 rounded-full transition-colors">
                        <ChevronLeft />
                    </Link>
                    <div>
                        <h1 className="text-3xl md:text-5xl">CENTRO DE SCOUTING</h1>
                        <p className="text-xs font-serif italic text-black/50 mt-1">
                            {ratedPlayers}/{totalPlayers} jugadores evaluados por vos
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <button
                            onClick={loadMetrics}
                            className="flex items-center gap-1.5 border-2 border-black px-3 py-1 font-masthead text-xs bg-white hover:bg-[var(--grafico-gold)] hover:text-white transition-colors"
                            title="Métricas de admin"
                        >
                            <BarChart3 size={14} /> MÉTRICAS
                        </button>
                    )}
                    <div className="hidden md:flex items-center gap-2 border-2 border-black px-3 py-1 font-masthead text-xs bg-white">
                        {isCloud ? <Cloud size={14} className="text-[var(--grafico-cyan)]" /> : <CloudOff size={14} className="text-orange-500" />}
                        {isCloud ? 'CLOUD OK' : 'LOCAL'}
                    </div>
                </div>
            </div>

            {/* TAB BAR */}
            <div className="flex gap-0 mb-8 border-4 border-black overflow-hidden">
                {[
                    { id: 'fichar' as Tab, label: 'FICHAR', icon: <UserPlus size={16} /> },
                    { id: 'puntear' as Tab, label: 'PUNTEAR', icon: <Zap size={16} />, badge: unratedPlayers.length > 0 ? unratedPlayers.length : undefined },
                    { id: 'plantel' as Tab, label: 'PLANTEL', icon: <Users size={16} />, count: players.length },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => t.id === 'puntear' ? startRating() : setTab(t.id)}
                        className={`
                            flex-1 flex items-center justify-center gap-2 py-3 font-masthead text-sm tracking-widest
                            transition-all duration-200
                            ${tab === t.id
                                ? 'bg-[var(--ink-black)] text-white'
                                : 'bg-white hover:bg-gray-100 text-black'
                            }
                        `}
                    >
                        {t.icon}
                        <span className="hidden sm:inline">{t.label}</span>
                        {t.count !== undefined && (
                            <span className={`text-[10px] px-1.5 py-0.5 ${tab === t.id ? 'bg-[var(--grafico-red)]' : 'bg-black/10'}`}>
                                {t.count}
                            </span>
                        )}
                        {t.badge !== undefined && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-[var(--grafico-red)] text-white animate-pulse">
                                {t.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ═══════════ TAB: FICHAR ═══════════ */}
            {tab === 'fichar' && (
                <div className="max-w-lg mx-auto animate-in fade-in duration-300">
                    <div className="card-magazine !p-0 overflow-hidden border-l-8 border-l-[var(--grafico-cyan)]">
                        <div className="bg-[var(--grafico-cyan)] text-white p-3 font-masthead text-sm tracking-widest flex items-center gap-2">
                            <UserPlus size={16} /> NUEVA INCORPORACIÓN AL PLANTEL
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase mb-1 text-black/50">NOMBRE / ALIAS</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Juan Román"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                                    className="w-full p-3 border-2 border-black/20 focus:border-black transition-all font-sans text-lg min-h-[48px]"
                                />
                            </div>
                            <button
                                className="btn-primary w-full !scale-100 !py-3 justify-center"
                                onClick={addPlayer}
                                disabled={!newName.trim()}
                            >
                                FICHAR 👕
                            </button>
                        </div>
                    </div>

                    {/* Player list */}
                    <div className="mt-8">
                        <h3 className="font-masthead text-xl mb-4 border-b-2 border-black pb-2">
                            PLANTEL ACTUAL ({players.length})
                        </h3>
                        <div className="space-y-2">
                            {players.map(p => (
                                <div key={p.id} className="flex items-center gap-3 p-3 bg-white border border-black/10 hover:border-black/20 transition-colors group">
                                    {p.photoUrl ? (
                                        <img src={p.photoUrl} alt={p.name} className="w-8 h-8 object-cover border-2 border-black" />
                                    ) : (
                                        <div className="w-8 h-8 bg-[var(--aged-paper)] border-2 border-black flex items-center justify-center font-masthead text-lg text-[var(--grafico-red)]">
                                            {p.name.charAt(0)}
                                        </div>
                                    )}
                                    <span className="font-bold uppercase text-sm flex-1 text-black">{p.name}</span>
                                    {p.hasMyRating && (
                                        <CheckCircle2 size={14} className="text-green-500" />
                                    )}
                                    <div className="flex gap-0.5">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                size={10}
                                                fill={i < Math.round(averageSkillScore(p.skills)) ? 'var(--grafico-gold)' : 'none'}
                                                className={i < Math.round(averageSkillScore(p.skills)) ? 'text-[var(--grafico-gold)]' : 'text-gray-300'}
                                            />
                                        ))}
                                    </div>
                                    {isAdmin && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={() => { setPhotoPlayer(p); setPhotoUrl(p.photoUrl || ''); }}
                                                className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                title="Agregar foto"
                                            >
                                                <ImageIcon size={14} />
                                            </button>
                                            <button
                                                onClick={() => deletePlayer(p.id)}
                                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="Eliminar jugador"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ TAB: PUNTEAR ═══════════ */}
            {tab === 'puntear' && (
                <div className="animate-in fade-in duration-300">
                    {ratingComplete || unratedPlayers.length === 0 ? (
                        <div className="card-magazine !p-0 overflow-hidden max-w-lg mx-auto animate-in zoom-in-95 duration-500">
                            <div className="bg-[var(--grafico-gold)] p-8 text-center">
                                <Trophy className="mx-auto mb-4 text-white" size={64} />
                                <h2 className="text-4xl text-white">
                                    {unratedPlayers.length === 0 && !ratingComplete
                                        ? '¡YA PUNTUASTE A TODOS!'
                                        : '¡SCOUTING COMPLETO!'}
                                </h2>
                            </div>
                            <div className="p-8 text-center space-y-6">
                                {ratingComplete && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-100 p-4 border-2 border-black/10">
                                            <div className="text-4xl font-masthead text-[var(--grafico-cyan)]">{completedCount}</div>
                                            <div className="text-[10px] uppercase font-bold text-black/40">Evaluados</div>
                                        </div>
                                        <div className="bg-gray-100 p-4 border-2 border-black/10">
                                            <div className="text-4xl font-masthead text-[var(--grafico-gold)]">{skippedIds.size}</div>
                                            <div className="text-[10px] uppercase font-bold text-black/40">Salteados</div>
                                        </div>
                                    </div>
                                )}
                                <p className="font-serif italic text-lg text-black/50">
                                    {unratedPlayers.length === 0 && !ratingComplete
                                        ? '"Ya evaluaste a todos los cracks del plantel. ¡Volvé cuando haya nuevas incorporaciones!"'
                                        : '"Tu voto ya está registrado en los archivos del club."'}
                                </p>
                                <button
                                    onClick={() => { setTab('plantel'); fetchPlayersWithSkills(); }}
                                    className="btn-primary !scale-100 w-full justify-center"
                                >
                                    VER PLANTEL ACTUALIZADO
                                </button>
                            </div>
                        </div>
                    ) : currentPlayer ? (
                        <div className="max-w-xl mx-auto space-y-6">
                            {/* Progress bar */}
                            <div className="relative">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-bold uppercase text-black/40">
                                        PENDIENTES DE EVALUAR
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <span className="font-masthead text-sm text-[var(--grafico-cyan)]">
                                            {ratingIndex + 1} / {unratedPlayers.length}
                                        </span>
                                        <button
                                            onClick={exitRating}
                                            className="p-1.5 border-2 border-black/20 hover:border-red-400 hover:bg-red-50 transition-colors rounded-sm"
                                            title="Salir del modo puntear"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="h-2 bg-gray-200 border border-black/10 overflow-hidden">
                                    <div
                                        className="h-full bg-[var(--grafico-red)] transition-all duration-500"
                                        style={{ width: `${((ratingIndex + 1) / unratedPlayers.length) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Player header */}
                            <div
                                className="card-magazine !p-0 overflow-hidden animate-in slide-in-from-right-8 duration-300"
                                key={currentPlayer.id}
                            >
                                <div className="bg-[var(--ink-black)] text-white p-6 flex items-center gap-4">
                                    {currentPlayer.photoUrl ? (
                                        <img src={currentPlayer.photoUrl} alt={currentPlayer.name} className="w-16 h-16 object-cover border-2 border-[var(--grafico-red)] flex-shrink-0" />
                                    ) : (
                                        <div className="w-16 h-16 bg-[var(--grafico-red)] flex items-center justify-center font-masthead text-4xl flex-shrink-0">
                                            {currentPlayer.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-3xl md:text-4xl leading-none truncate">{currentPlayer.name}</h2>
                                        <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                                            ¿Cómo juega este crack?
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 md:p-6 space-y-1 bg-white">
                                    {SKILLS.map(skill => (
                                        <SkillSlider
                                            key={skill.id}
                                            skill={skill}
                                            value={getSkillValue(skill.id)}
                                            onChange={(val) => handleSkillRate(skill.id, val)}
                                        />
                                    ))}
                                </div>

                                <div className="border-t-2 border-black/10 p-4 flex gap-3">
                                    {ratingIndex > 0 && (
                                        <button
                                            onClick={goToPrev}
                                            className="flex items-center gap-2 px-4 py-3 border-2 border-black/20 font-masthead text-sm tracking-wider hover:bg-gray-50 transition-colors text-black/70"
                                        >
                                            <ArrowLeft size={16} /> ANTERIOR
                                        </button>
                                    )}
                                    <button
                                        onClick={skipPlayer}
                                        className="flex items-center gap-2 px-4 py-3 border-2 border-black/20 font-masthead text-sm tracking-wider hover:bg-gray-50 transition-colors text-black/50 hover:text-black"
                                    >
                                        <SkipForward size={16} /> <span className="hidden sm:inline">NO LO CONOZCO</span><span className="sm:hidden">SKIP</span>
                                    </button>
                                    <button
                                        onClick={saveAndNext}
                                        disabled={saving || !currentPlayerHasRatings}
                                        className={`
                                            flex-1 flex items-center justify-center gap-2 py-3 font-masthead text-lg tracking-wider
                                            transition-all duration-200 text-white
                                            ${currentPlayerHasRatings
                                                ? 'bg-[var(--grafico-red)] hover:bg-[var(--grafico-cyan)] hover:-translate-y-0.5'
                                                : 'bg-gray-300 cursor-not-allowed'
                                            }
                                        `}
                                    >
                                        {saving ? (
                                            <Loader2 className="animate-spin" size={18} />
                                        ) : ratingIndex < unratedPlayers.length - 1 ? (
                                            <>SIGUIENTE <ArrowRight size={18} /></>
                                        ) : (
                                            <>FINALIZAR <CheckCircle2 size={18} /></>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <p className="text-center text-[10px] uppercase font-bold text-black/30 tracking-widest">
                                Tocá los bloques del 1 al 5 · Tocá ℹ️ para ver la descripción
                            </p>
                        </div>
                    ) : null}
                </div>
            )}

            {/* ═══════════ TAB: PLANTEL ═══════════ */}
            {tab === 'plantel' && (
                <div className="animate-in fade-in duration-300">
                    <p className="text-xs font-serif italic text-center text-black/40 mb-6">
                        Puntajes promedio de todos los evaluadores
                    </p>
                    {players.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {players.map(p => (
                                <PlayerCard
                                    key={p.id}
                                    name={p.name}
                                    skills={p.skills}
                                    voteCount={p.voteCount}
                                    photoUrl={p.photoUrl}
                                    onClick={() => setSelectedPlayer(p)}
                                    isSelected={selectedPlayer?.id === p.id}
                                    isAdmin={isAdmin}
                                    onDelete={() => deletePlayer(p.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-16 text-black/30 font-serif italic text-xl">
                            "Las tribunas están vacías. No hay cracks en el archivo."
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════ PLAYER DETAIL MODAL ═══════════ */}
            {selectedPlayer && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedPlayer(null)}>
                    <div
                        className="bg-[var(--aged-paper)] border-4 border-black max-w-md w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-[var(--ink-black)] text-white p-6 flex items-center justify-between sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                {selectedPlayer.photoUrl ? (
                                    <img src={selectedPlayer.photoUrl} alt={selectedPlayer.name} className="w-14 h-14 object-cover border-2 border-[var(--grafico-red)]" />
                                ) : (
                                    <div className="w-14 h-14 bg-[var(--grafico-red)] flex items-center justify-center font-masthead text-3xl">
                                        {selectedPlayer.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-3xl leading-none truncate">{selectedPlayer.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Star size={12} fill="var(--grafico-gold)" className="text-[var(--grafico-gold)]" />
                                        <span className="font-masthead text-[var(--grafico-gold)]">{averageSkillScore(selectedPlayer.skills)}</span>
                                        <span className="text-[10px] text-white/40">• {selectedPlayer.voteCount} evaluador{selectedPlayer.voteCount !== 1 ? 'es' : ''}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isAdmin && (
                                    <button
                                        onClick={() => { setPhotoPlayer(selectedPlayer); setPhotoUrl(selectedPlayer.photoUrl || ''); }}
                                        className="p-2 hover:bg-white/10 transition-colors"
                                        title="Agregar/cambiar foto"
                                    >
                                        <ImageIcon size={16} />
                                    </button>
                                )}
                                <button onClick={() => setSelectedPlayer(null)} className="p-2 hover:bg-white/10 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="text-center py-2 bg-black/5 text-[10px] font-bold uppercase text-black/40 tracking-widest">
                            Puntaje promedio de {selectedPlayer.voteCount} evaluador{selectedPlayer.voteCount !== 1 ? 'es' : ''}
                        </div>

                        <div className="p-6 flex justify-center bg-white border-b-2 border-black/10">
                            <SkillRadar skills={selectedPlayer.skills} size={200} showLabels />
                        </div>

                        <div className="p-6 space-y-3">
                            <h4 className="font-masthead text-lg tracking-widest mb-3 text-black/50">DESGLOSE DE HABILIDADES</h4>
                            {SKILLS.map(skill => {
                                const val = selectedPlayer.skills[skill.id as keyof PlayerSkills] || 0;
                                return (
                                    <div key={skill.id} className="flex items-center gap-3">
                                        <span className="text-xl">{skill.emoji}</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <div>
                                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: skill.color }}>
                                                        {skill.name}
                                                    </span>
                                                    <span className="text-[10px] text-black/30 ml-2 font-serif italic">{skill.desc}</span>
                                                </div>
                                                <span className="font-masthead text-lg text-black">{val || '—'}</span>
                                            </div>
                                            <div className="h-2.5 bg-gray-200 overflow-hidden">
                                                <div
                                                    className="h-full transition-all duration-500"
                                                    style={{
                                                        width: `${(val / 5) * 100}%`,
                                                        backgroundColor: skill.color,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ PHOTO URL MODAL ═══════════ */}
            {photoPlayer && (
                <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => { setPhotoPlayer(null); setPhotoPreview(null); }}>
                    <div
                        className="bg-white border-4 border-black max-w-sm w-full animate-in zoom-in-95 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-[var(--grafico-cyan)] text-white p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 font-masthead tracking-widest text-sm">
                                <ImageIcon size={16} /> FOTO DE {photoPlayer.name.toUpperCase()}
                            </div>
                            <button onClick={() => { setPhotoPlayer(null); setPhotoPreview(null); }} className="p-1 hover:bg-white/20 transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Preview */}
                            {(photoPreview || photoUrl) && (
                                <div className="flex justify-center">
                                    <img
                                        src={photoPreview || photoUrl}
                                        alt={photoPlayer.name}
                                        className="w-24 h-24 object-cover border-4 border-black"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                </div>
                            )}

                            {/* Mode tabs */}
                            <div className="flex border-2 border-black overflow-hidden">
                                <button
                                    onClick={() => setPhotoMode('upload')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 font-masthead text-xs tracking-wider transition-colors ${photoMode === 'upload' ? 'bg-[var(--ink-black)] text-white' : 'bg-white text-black hover:bg-gray-50'
                                        }`}
                                >
                                    <Upload size={12} /> SUBIR FOTO
                                </button>
                                <button
                                    onClick={() => setPhotoMode('url')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 font-masthead text-xs tracking-wider transition-colors ${photoMode === 'url' ? 'bg-[var(--ink-black)] text-white' : 'bg-white text-black hover:bg-gray-50'
                                        }`}
                                >
                                    <LinkIcon size={12} /> PEGAR URL
                                </button>
                            </div>

                            {/* Upload mode */}
                            {photoMode === 'upload' && (
                                <div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        id="photo-upload"
                                    />
                                    <label
                                        htmlFor="photo-upload"
                                        className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-black/20 hover:border-[var(--grafico-cyan)] cursor-pointer transition-colors bg-gray-50 hover:bg-blue-50"
                                    >
                                        <Upload size={24} className="text-black/30" />
                                        <span className="text-xs font-bold uppercase text-black/50">Tocá para elegir una foto</span>
                                        <span className="text-[10px] text-black/30 font-serif italic">JPG, PNG, WEBP — máx 2MB</span>
                                    </label>
                                    {photoPreview && (
                                        <p className="text-[10px] mt-2 text-green-600 font-bold">✅ Foto seleccionada</p>
                                    )}
                                </div>
                            )}

                            {/* URL mode */}
                            {photoMode === 'url' && (
                                <div>
                                    <label className="block text-[10px] font-bold uppercase mb-1 text-black/50">
                                        URL DE LA FOTO
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="https://..."
                                        value={photoUrl}
                                        onChange={(e) => setPhotoUrl(e.target.value)}
                                        className="w-full p-3 border-2 border-black/20 focus:border-black transition-all font-sans text-sm"
                                    />
                                    <p className="text-[10px] text-black/30 mt-1 font-serif italic">
                                        Pegá un link a una foto (Google Drive, Instagram, etc.)
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setPhotoPlayer(null); setPhotoPreview(null); }}
                                    className="flex-1 py-2 border-2 border-black/20 font-masthead text-sm hover:bg-gray-50"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    onClick={savePhoto}
                                    disabled={savingPhoto || (photoMode === 'upload' ? !photoPreview : !photoUrl.trim())}
                                    className="flex-1 py-2 bg-[var(--grafico-cyan)] text-white font-masthead text-sm hover:bg-[var(--grafico-red)] transition-colors disabled:opacity-50"
                                >
                                    {savingPhoto ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'GUARDAR'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ ADMIN METRICS MODAL ═══════════ */}
            {showMetrics && (
                <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowMetrics(false)}>
                    <div
                        className="bg-white border-4 border-black max-w-md w-full max-h-[80vh] overflow-y-auto animate-in zoom-in-95 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-[var(--grafico-gold)] text-white p-4 flex items-center justify-between sticky top-0">
                            <div className="flex items-center gap-2 font-masthead tracking-widest text-sm">
                                <BarChart3 size={16} /> MÉTRICAS DE SCOUTING
                            </div>
                            <button onClick={() => setShowMetrics(false)} className="p-1 hover:bg-white/20 transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Overview */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-gray-100 p-3 text-center border-2 border-black/10">
                                    <div className="text-3xl font-masthead text-[var(--grafico-red)]">{players.length}</div>
                                    <div className="text-[9px] uppercase font-bold text-black/40">Jugadores</div>
                                </div>
                                <div className="bg-gray-100 p-3 text-center border-2 border-black/10">
                                    <div className="text-3xl font-masthead text-[var(--grafico-cyan)]">{metricsData.length}</div>
                                    <div className="text-[9px] uppercase font-bold text-black/40">Evaluadores</div>
                                </div>
                                <div className="bg-gray-100 p-3 text-center border-2 border-black/10">
                                    <div className="text-3xl font-masthead text-[var(--grafico-gold)]">
                                        {metricsData.length > 0
                                            ? Math.round((metricsData.reduce((a, b) => a + b.count, 0) / metricsData.length / players.length) * 100)
                                            : 0}%
                                    </div>
                                    <div className="text-[9px] uppercase font-bold text-black/40">Cobertura</div>
                                </div>
                            </div>

                            {/* Who rated */}
                            <div>
                                <h4 className="font-masthead text-sm tracking-widest text-black/50 mb-3">
                                    ¿QUIÉN YA PUNTUÓ?
                                </h4>
                                {metricsData.length > 0 ? (
                                    <div className="space-y-2">
                                        {metricsData.map(m => {
                                            const raterPlayer = players.find(p => p.clerkId === m.raterId);
                                            const name = raterPlayer?.name || m.raterId.startsWith('csv_') ? `📋 ${m.raterId.replace('csv_', '')}` : m.raterId.substring(0, 12) + '...';
                                            const pct = Math.round((m.count / players.length) * 100);

                                            return (
                                                <div key={m.raterId} className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-black/70 w-32 truncate">{raterPlayer?.name || name}</span>
                                                    <div className="flex-1 h-4 bg-gray-200 overflow-hidden">
                                                        <div
                                                            className="h-full bg-[var(--grafico-cyan)] transition-all"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-masthead text-sm text-black/70 w-16 text-right">
                                                        {m.count}/{players.length}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="font-serif italic text-black/30 text-sm">Nadie puntuó todavía.</p>
                                )}
                            </div>

                            {/* Players most/least rated */}
                            <div>
                                <h4 className="font-masthead text-sm tracking-widest text-black/50 mb-3">
                                    JUGADORES MÁS Y MENOS EVALUADOS
                                </h4>
                                <div className="space-y-1.5">
                                    {[...players]
                                        .sort((a, b) => b.voteCount - a.voteCount)
                                        .slice(0, 10)
                                        .map(p => (
                                            <div key={p.id} className="flex items-center gap-2 text-sm">
                                                <span className="font-bold text-black/70 flex-1 truncate">{p.name}</span>
                                                <div className="flex gap-0.5">
                                                    {[...Array(Math.max(p.voteCount, 0))].map((_, i) => (
                                                        <div key={i} className="w-2 h-4 bg-[var(--grafico-red)]" />
                                                    ))}
                                                </div>
                                                <span className="font-masthead text-xs text-black/40 w-8 text-right">{p.voteCount}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

function ScoutingSkeleton() {
    return (
        <div className="max-w-6xl mx-auto p-8 space-y-8 animate-pulse">
            <div className="h-14 w-2/3 bg-gray-200" />
            <div className="h-12 bg-gray-100 border-4 border-gray-200" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-48 bg-gray-100 border-4 border-gray-200" />
                ))}
            </div>
        </div>
    );
}
