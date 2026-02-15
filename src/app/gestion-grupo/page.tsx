'use client';

import { useGroups } from "@/context/GroupContext";
import {
    Users, Share2, Shield, Trash2,
    ArrowLeft, Copy, CheckCircle2,
    Settings
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function GestionGrupo() {
    const { activeGroup, refreshGroups } = useGroups();
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [copySuccess, setCopySuccess] = useState(false);

    const router = useRouter();

    useEffect(() => {
        if (activeGroup) {
            if (activeGroup.role !== 'ADMIN') {
                router.push('/');
                return;
            }
            fetchPlayers();
        }
    }, [activeGroup, router]);

    const fetchPlayers = async () => {
        if (!activeGroup) return;
        setLoading(true);
        const { data } = await supabase
            .from('GroupMember')
            .select('*')
            .eq('groupId', activeGroup.id)
            .order('name');

        setPlayers(data || []);
        setLoading(false);
    };

    const copyInviteLink = () => {
        if (!activeGroup) return;
        const link = `${window.location.origin}/invite/${activeGroup.inviteCode}`;
        navigator.clipboard.writeText(link);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const promotePlayer = async (id: string) => {
        await supabase
            .from('GroupMember')
            .update({ role: 'ADMIN' })
            .eq('id', id);
        fetchPlayers();
    };

    const removePlayer = async (id: string) => {
        if (!confirm('¿Seguro quieres expulsar a este miembro del grupo?')) return;
        await supabase
            .from('GroupMember')
            .delete()
            .eq('id', id);
        fetchPlayers();
    };

    if (!activeGroup) return null;

    return (
        <main className="max-w-6xl mx-auto p-6 md:p-12 mb-20 animate-in fade-in duration-300">
            <div className="flex items-center gap-4 mb-12">
                <Link href="/" className="p-2 hover:bg-black/5 rounded-full transition-colors">
                    <ArrowLeft />
                </Link>
                <div>
                    <h1 className="text-3xl md:text-5xl">GESTIÓN DEL EQUIPO</h1>
                    <p className="text-[var(--grafico-cyan)] font-accent uppercase text-[10px] md:text-sm tracking-widest">{activeGroup.name}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* INVITACIONES */}
                <section className="lg:col-span-12">
                    <div className="card-magazine !bg-[var(--ink-black)] text-white border-none p-4 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
                        <div className="flex-1 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-2 text-[var(--grafico-gold)] mb-2">
                                <Share2 size={24} />
                                <span className="font-masthead text-lg md:text-xl tracking-widest">SALVOCONDUCTO PARA CRACKS</span>
                            </div>
                            <h3 className="text-2xl md:text-3xl mb-4 leading-tight">INVITÁ A TU GRUPO DE WHATSAPP</h3>
                            <p className="font-serif italic opacity-70 text-sm md:text-lg">
                                "Cualquiera con este link podrá sumarse al vestuario de {activeGroup.name}."
                            </p>
                        </div>
                        <div className="w-full md:w-auto">
                            <button
                                onClick={copyInviteLink}
                                className={`btn-primary !scale-100 !px-12 !py-6 w-full md:w-auto flex items-center justify-center gap-4 ${copySuccess ? '!bg-green-600' : ''}`}
                            >
                                {copySuccess ? <CheckCircle2 size={24} /> : <Copy size={24} />}
                                <span className="text-xl tracking-widest">
                                    {copySuccess ? "COPIADO AL PORTAPAPELES" : "COPIAR LINK MÁGICO"}
                                </span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* LISTADO Y ROLES */}
                <section className="lg:col-span-8">
                    <div className="card-magazine !p-0 overflow-hidden">
                        <div className="bg-[var(--grafico-red)] text-white p-4 font-masthead text-sm tracking-widest flex justify-between items-center">
                            <span>MIEMBROS DEL GRUPO</span>
                            <span>{players.length} MIEMBROS</span>
                        </div>
                        <div className="divide-y-2 divide-black/5">
                            {players.map(p => (
                                <div key={p.id} className="p-6 flex items-center justify-between group hover:bg-gray-50 transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-14 h-14 border-4 border-black flex items-center justify-center text-2xl font-masthead ${p.role === 'ADMIN' ? 'bg-[var(--grafico-gold)]' : 'bg-[var(--aged-paper)]'}`}>
                                            {p.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-2xl font-bold">{p.name}</h4>
                                                {p.role === 'ADMIN' && <Shield size={16} className="text-[var(--grafico-gold)]" />}
                                            </div>
                                            <div className="text-xs text-gray-500 font-serif italic">
                                                Miembro desde {new Date(p.joinedAt || new Date()).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                        {p.role !== 'ADMIN' && (
                                            <button
                                                onClick={() => promotePlayer(p.id)}
                                                className="text-[10px] font-bold uppercase tracking-widest hover:text-[var(--grafico-gold)] transition-colors underline md:no-underline"
                                            >
                                                HACER ADMIN
                                            </button>
                                        )}
                                        <button
                                            onClick={() => removePlayer(p.id)}
                                            className="p-2 text-red-300 md:text-red-300 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ESTADÍSTICAS RÁPIDAS (Keep visible but maybe remove specific stats if valid?) */}
                <aside className="lg:col-span-4 space-y-8">
                    <div className="card-magazine !bg-[var(--aged-paper)] border-none">
                        <Settings className="text-[var(--grafico-red)] mb-4" size={40} />
                        <h4 className="text-2xl font-masthead mb-4">AJUSTES DEL EQUIPO</h4>
                        <div className="space-y-4 font-serif italic text-sm">
                            <div className="flex justify-between border-b border-black/10 pb-2">
                                <span>Partidos Jugados</span>
                                <span className="font-bold font-sans">12</span>
                            </div>
                            <div className="flex justify-between border-b border-black/10 pb-2">
                                <span>Mística Acumulada</span>
                                <span className="font-bold font-sans text-[var(--grafico-gold)]">ALTA</span>
                            </div>
                            <div className="p-4 bg-yellow-50 text-[10px] text-yellow-800 border border-yellow-200">
                                Los jugadores convocados para partidos se administran en la sección PLANTELES.
                            </div>
                        </div>
                        <button className="w-full mt-8 py-3 border-2 border-red-200 text-red-400 text-xs font-bold uppercase tracking-widest hover:bg-red-50 transition-all">
                            ELIMINAR ESTE GRUPO
                        </button>
                    </div>
                </aside>
            </div>
        </main>
    );
}
