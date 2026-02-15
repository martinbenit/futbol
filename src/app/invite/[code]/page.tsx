'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser, SignInButton } from '@clerk/nextjs';
import { useGroups } from '@/context/GroupContext';
import { Users, Loader2, ShieldCheck, ArrowRight, UserPlus } from 'lucide-react';

export default function InvitePage() {
    const { code } = useParams();
    const { user, isLoaded: userLoaded } = useUser();
    const { refreshGroups, groups } = useGroups();
    const [group, setGroup] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [joining, setJoining] = useState(false);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (code) {
            fetchGroup();
        }
    }, [code]);

    const fetchGroup = async () => {
        const { data, error: groupError } = await supabase
            .from('Group')
            .select('id, name')
            .eq('inviteCode', code)
            .single();

        if (groupError || !data) {
            setError("Este salvoconducto no es válido o ha expirado.");
        } else {
            setGroup(data);
            // Check if user is already in group
            if (userLoaded && user && groups.find(g => g.id === data.id)) {
                setSuccess(true);
            }
        }
        setLoading(false);
    };

    const handleJoin = async () => {
        if (!user || !group) return;
        setJoining(true);
        try {
            const now = new Date().toISOString();
            const { error: joinError } = await supabase
                .from('GroupMember')
                .insert([{
                    id: crypto.randomUUID(),
                    name: user.fullName || user.username || 'Crack',
                    clerkId: user.id,
                    groupId: group.id,
                    role: 'PLAYER',
                    joinedAt: now
                }]);

            if (joinError) throw joinError;

            await refreshGroups();
            setSuccess(true);
        } catch (err) {
            console.error('Error joining group:', err);
            setError("No pudimos sumarte al equipo. Reintentá.");
        } finally {
            setJoining(false);
        }
    };

    if (loading || !userLoaded) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center animate-pulse">
                <Loader2 className="animate-spin text-[var(--grafico-cyan)] mb-4" size={48} />
                <p className="font-masthead text-2xl tracking-widest">VERIFICANDO SALVOCONDUCTO...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-xl mx-auto p-12 text-center card-magazine mt-20">
                <h1 className="text-4xl text-[var(--grafico-red)] mb-4">ERROR DE ACCESO</h1>
                <p className="font-serif italic text-lg mb-8">{error}</p>
                <button onClick={() => router.push('/')} className="btn-primary w-full !scale-100">VOLVER AL INICIO</button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 md:p-20 animate-in fade-in slide-in-from-bottom-4">
            <header className="text-center mb-12">
                <div className="w-20 h-20 bg-[var(--grafico-cyan)] text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <UserPlus size={40} />
                </div>
                <h1 className="text-6xl mb-2">HAS SIDO CONVOCADO</h1>
                <p className="font-serif italic text-xl text-gray-600">
                    Te invitan a formar parte de <span className="text-[var(--grafico-red)] font-bold px-1">{group.name}</span>
                </p>
            </header>

            <div className="card-magazine bg-white relative overflow-hidden">
                {success ? (
                    <div className="text-center py-12">
                        <ShieldCheck className="mx-auto mb-4 text-green-500" size={64} />
                        <h3 className="text-3xl font-masthead mb-2 text-green-700">¡YA SOS PARTE DEL PLANTEL!</h3>
                        <p className="font-serif italic mb-8">Tus botines ya están en el vestuario.</p>
                        <button
                            onClick={() => router.push('/')}
                            className="btn-primary !bg-[var(--ink-black)] w-full !scale-100"
                        >
                            IR AL DASHBOARD <ArrowRight className="ml-2" />
                        </button>
                    </div>
                ) : (
                    <div className="p-4">
                        {!user ? (
                            <div className="text-center space-y-6">
                                <p className="font-serif italic text-lg leading-tight">
                                    "Para entrar al vestuario y registrar tus estadísticas, necesitás identificarte ante el referí."
                                </p>
                                <SignInButton mode="modal">
                                    <button className="btn-primary w-full !scale-100 !bg-[var(--grafico-cyan)] !border-none">
                                        ENTRAR CON GOOGLE
                                    </button>
                                </SignInButton>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <p className="font-serif italic text-lg text-center">
                                    ¿Aceptás el desafío de defender los colores de <strong>{group.name}</strong>?
                                </p>
                                <button
                                    onClick={handleJoin}
                                    disabled={joining}
                                    className="btn-primary w-full !scale-100 !py-6 text-2xl"
                                >
                                    {joining ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2" />}
                                    ACEPTAR CONVOCATORIA
                                </button>
                                <button
                                    onClick={() => router.push('/configurar-grupo')}
                                    className="w-full text-center text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
                                >
                                    O PREFIERO FUNDAR MI PROPIO EQUIPO
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
