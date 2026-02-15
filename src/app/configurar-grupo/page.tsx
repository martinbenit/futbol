'use client';

import { useState } from 'react';
import { useGroups } from '@/context/GroupContext';
import { supabase } from '@/lib/supabase';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Shield, Plus, Loader2 } from 'lucide-react';

export default function ConfigurarGrupo() {
    const { user } = useUser();
    const { refreshGroups } = useGroups();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !user) return;

        setLoading(true);
        try {
            // 1. Create the Group with generated IDs and timestamps
            const groupId = crypto.randomUUID();
            const inviteCode = groupId.split('-')[0].toUpperCase();
            const now = new Date().toISOString();

            const { data: groupData, error: groupError } = await supabase
                .from('Group')
                .insert([{
                    id: groupId,
                    name,
                    ownerId: user.id,
                    inviteCode: inviteCode,
                    createdAt: now
                }])
                .select()
                .single();

            if (groupError) throw groupError;

            // 2. Create the Owner as a Player with ADMIN role and timestamps
            const { error: playerError } = await supabase
                .from('Player')
                .insert([{
                    id: crypto.randomUUID(),
                    name: user.fullName || user.username || 'Capitán',
                    clerkId: user.id,
                    groupId: groupId,
                    role: 'ADMIN',
                    scouting: 5,
                    createdAt: now,
                    updatedAt: now
                }]);

            if (playerError) throw playerError;

            await refreshGroups();
            router.push('/');
        } catch (err) {
            console.error('Error creating group:', err);
            alert('Error creando el grupo. Reintentá.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="max-w-xl mx-auto p-6 md:p-20 animate-in fade-in slide-in-from-bottom-4">
            <header className="text-center mb-12">
                <Shield className="mx-auto mb-4 text-[var(--grafico-red)]" size={64} />
                <h1 className="text-6xl mb-2">FUNDAR EQUIPO</h1>
                <p className="font-serif italic text-gray-600">
                    "Ponga nombre a su escuadra y empiece a forjar la leyenda del barrio."
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
                        placeholder="Ej: Los Cracks de Mataderos"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-4 border-2 border-black/10 focus:border-black text-2xl font-masthead transition-all"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !name}
                    className="btn-primary w-full !scale-100 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                    FUNDAR GRUPO
                </button>
            </form>
        </main>
    );
}
