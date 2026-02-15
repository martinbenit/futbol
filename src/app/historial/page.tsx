'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useGroups } from '@/context/GroupContext';
import { Trophy, Calendar, Loader2, ArrowLeft, Share2, CheckCircle2, Eye } from 'lucide-react';

interface Match {
    id: string;
    date: string;
    teamA_Name: string | null;
    teamB_Name: string | null;
    scoreA: number | null;
    scoreB: number | null;
    motivation: string | null;
    status: string;
    hora: string | null;
    cancha: string | null;
}

export default function Historial() {
    const { activeGroup } = useGroups();
    const [history, setHistory] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        if (activeGroup) fetchHistory();
    }, [activeGroup]);

    const fetchHistory = async () => {
        if (!activeGroup) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('Match')
                .select('*')
                .eq('groupId', activeGroup.id)
                .in('status', ['completed', 'upcoming'])
                .order('date', { ascending: false });

            if (data && !error) {
                setHistory(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const copyChronicle = (match: Match, e: React.MouseEvent) => {
        e.preventDefault(); // Prevent navigation
        e.stopPropagation();

        const dateStr = new Date(match.date).toLocaleDateString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            weekday: 'long', day: '2-digit', month: 'short', year: 'numeric'
        });

        let text = `⚽ *${match.teamA_Name || 'EQUIPO A'} vs ${match.teamB_Name || 'EQUIPO B'}* ⚽\n\n`;
        text += `🗓️ ${dateStr}\n`;
        if (match.hora) text += `🕐 ${match.hora}\n`;
        if (match.cancha) text += `📍 ${match.cancha}\n`;
        text += `\n`;

        if (match.status === 'completed' && match.scoreA != null && match.scoreB != null) {
            text += `🏆 *RESULTADO FINAL*\n`;
            text += `${match.teamA_Name || 'EQUIPO A'} ${match.scoreA} - ${match.scoreB} ${match.teamB_Name || 'EQUIPO B'}\n\n`;

            const diff = match.scoreA - match.scoreB;
            if (diff > 0) text += `✅ Victoria para *${match.teamA_Name}*\n`;
            else if (diff < 0) text += `✅ Victoria para *${match.teamB_Name}*\n`;
            else text += `🤝 *Empate*\n`;
            text += `\n`;
        }

        if (match.motivation) {
            text += `🔥 _"${match.motivation}"_\n\n`;
        }

        text += `🔗 _Generado por PaniquesoApp_`;

        navigator.clipboard.writeText(text);
        setCopiedId(match.id);
        setTimeout(() => setCopiedId(null), 2500);
    };

    return (
        <main className="max-w-6xl mx-auto p-4 md:p-12 mb-20 animate-in fade-in duration-300">
            {/* Header UX */}
            <div className="flex items-center justify-between mb-12 border-b-4 border-black pb-4">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-black/5 rounded-full transition-colors">
                        <ArrowLeft />
                    </Link>
                    <h1 className="text-5xl">EL ARCHIVO DE LA GLORIA</h1>
                </div>
                <Trophy className="text-[var(--grafico-gold)]" size={48} />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-6">
                    <Loader2 className="animate-spin text-[var(--grafico-red)]" size={64} />
                    <p className="font-masthead text-2xl tracking-widest text-black/40">REVOLVIENDO LOS CAJONES DE LA HISTORIA...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {history.length > 0 ? history.map(match => (
                        <Link
                            key={match.id}
                            href={`/versus/${match.id}`}
                            className="card-magazine !p-0 flex flex-col group overflow-hidden border-t-8 !border-t-[var(--ink-black)] hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                        >
                            <div className="p-4 border-b border-black/5 flex justify-between items-center bg-[var(--aged-paper)] font-masthead text-xs tracking-widest">
                                <span className="flex items-center gap-2">
                                    <Calendar size={14} className="text-[var(--grafico-cyan)]" />
                                    {new Date(match.date).toLocaleDateString('es-AR', {
                                        timeZone: 'America/Argentina/Buenos_Aires',
                                        day: '2-digit', month: 'short', year: 'numeric'
                                    }).toUpperCase()}
                                </span>
                                <span>EDICIÓN Nº {match.id.slice(0, 4).toUpperCase()}</span>
                            </div>

                            <div className="p-6 flex flex-col items-center justify-center space-y-4">
                                <div className="w-full flex justify-between items-center px-4">
                                    <div className="flex-1 text-center">
                                        <div className="text-[10px] font-bold uppercase opacity-40 mb-1">TEAM A</div>
                                        <h3 className="text-2xl text-[var(--grafico-red)] line-clamp-1">{match.teamA_Name || 'COMBINADO A'}</h3>
                                    </div>

                                    <div className="bg-black text-white p-4 font-masthead text-4xl shadow-[6px_6px_0px_var(--grafico-red)]">
                                        {match.scoreA ?? '?'} - {match.scoreB ?? '?'}
                                    </div>

                                    <div className="flex-1 text-center">
                                        <div className="text-[10px] font-bold uppercase opacity-40 mb-1">TEAM B</div>
                                        <h3 className="text-2xl text-[var(--grafico-cyan)] line-clamp-1">{match.teamB_Name || 'COMBINADO B'}</h3>
                                    </div>
                                </div>

                                {match.motivation && (
                                    <p className="font-serif italic text-center p-4 border-y-2 border-black/5 w-full text-gray-600">
                                        &quot;{match.motivation}&quot;
                                    </p>
                                )}

                                <div className="flex items-center gap-4 w-full justify-center">
                                    <button
                                        onClick={(e) => copyChronicle(match, e)}
                                        className={`flex items-center gap-2 text-[10px] font-bold uppercase transition-colors ${copiedId === match.id
                                                ? 'text-green-600'
                                                : 'hover:text-[var(--grafico-cyan)] opacity-60 hover:opacity-100'
                                            }`}
                                    >
                                        {copiedId === match.id ? (
                                            <><CheckCircle2 size={12} /> ¡COPIADO AL PORTAPAPELES!</>
                                        ) : (
                                            <><Share2 size={12} /> COMPARTIR CRÓNICA</>
                                        )}
                                    </button>
                                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-[var(--grafico-cyan)] opacity-60 group-hover:opacity-100">
                                        <Eye size={12} /> VER DETALLE
                                    </span>
                                </div>
                            </div>
                        </Link>
                    )) : (
                        <div className="md:col-span-2 card-magazine !bg-transparent !border-dashed !border-black/20 flex flex-col items-center py-20 text-center">
                            <p className="font-serif italic text-2xl mb-8 text-black/40">&quot;Las páginas están en blanco. Es hora de hacer historia.&quot;</p>
                            <Link href="/armar-partido" className="btn-primary">EMPEZAR AHORA 👟</Link>
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
