'use client';

import { useState } from 'react';
import { useGroups } from '@/context/GroupContext';
import { supabase } from '@/lib/supabase';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Shield, Plus, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ConfigurarGrupo() {
    const { user } = useUser();
    const { refreshGroups } = useGroups();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !user) return;

        setLoading(true);
        try {
            // 1. Create the Group
            const groupId = crypto.randomUUID();
            const inviteCode = groupId.split('-')[0].toUpperCase();
            const now = new Date().toISOString();

            const { error: groupError } = await supabase
                .from('Group')
                .insert([{
                    id: groupId,
                    name: name.trim(),
                    ownerId: user.id,
                    inviteCode,
                    createdAt: now
                }]);

            if (groupError) throw groupError;

            // 2. Add the creator as a GroupMember with ADMIN role
            //    (NOT into Player — Player is for the scouting/fichados system)
            const { error: memberError } = await supabase
                .from('GroupMember')
                .insert([{
                    id: crypto.randomUUID(),
                    clerkId: user.id,
                    groupId,
                    role: 'ADMIN',
                    name: user.fullName || user.username || 'Capitán',
                    joinedAt: now
                }]);

            if (memberError) throw memberError;

            await refreshGroups();
            router.push('/');
        } catch (err: any) {
            console.error('Error creating group:', err);
            alert('Error creando el grupo: ' + (err?.message || 'Reintentá.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="max-w-xl mx-auto p-6 md:p-20 animate-in fade-in slide-in-from-bottom-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm opacity-50 hover:opacity-100 transition-opacity mb-8">
                <ArrowLeft size={16} /> VOLVER
            </Link>

            <header className="text-center mb-12">
                <Shield className="mx-auto mb-4 text-[var(--grafico-red)]" size={64} />
                <h1 className="text-5xl md:text-6xl mb-2">FUNDAR EQUIPO</h1>
                <p className="font-serif italic text-gray-600">
                    &quot;Ponga nombre a su escuadra y empiece a forjar la leyenda del barrio.&quot;
                </p>
            </header>

            <form onSubmit={handleCreateGroup} className="card-magazine space-y-8">
                <div>
                    <label className="block text-xs font-bold uppercase mb-2 tracking-widest opacity-50">
                        NOMBRE DEL GRUPO / EQUIPO
                    </label>
                    <input
                        type="text"
                        required
                        maxLength={40}
                        placeholder="Ej: Los Cracks de Mataderos"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-4 border-2 border-black/10 focus:border-black text-2xl font-masthead transition-all"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !name.trim()}
                    className="btn-primary w-full !scale-100 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                    FUNDAR GRUPO
                </button>
            </form>
        </main>
    );
}
