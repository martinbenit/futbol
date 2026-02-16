'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ArrowRight, Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function InviteEntryPage() {
    const [code, setCode] = useState('');
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = code.trim().toUpperCase();
        if (trimmed) {
            router.push(`/invite/${trimmed}`);
        }
    };

    return (
        <main className="max-w-xl mx-auto p-6 md:p-20 animate-in fade-in slide-in-from-bottom-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm opacity-50 hover:opacity-100 transition-opacity mb-8">
                <ArrowLeft size={16} /> VOLVER
            </Link>

            <header className="text-center mb-12">
                <div className="w-20 h-20 bg-[var(--grafico-cyan)] text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <KeyRound size={40} />
                </div>
                <h1 className="text-4xl md:text-5xl mb-2">CÓDIGO DE INVITACIÓN</h1>
                <p className="font-serif italic text-gray-600">
                    &quot;Ingresá el código que te compartieron para unirte al equipo.&quot;
                </p>
            </header>

            <form onSubmit={handleSubmit} className="card-magazine space-y-8">
                <div>
                    <label className="block text-xs font-bold uppercase mb-2 tracking-widest opacity-50">
                        CÓDIGO DEL EQUIPO
                    </label>
                    <input
                        type="text"
                        required
                        placeholder="Ej: 31F1870A"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        className="w-full p-4 border-2 border-black/10 focus:border-black text-2xl font-masthead tracking-widest text-center transition-all uppercase"
                        maxLength={20}
                        autoFocus
                    />
                </div>

                <button
                    type="submit"
                    disabled={!code.trim()}
                    className="btn-primary w-full !scale-100 disabled:opacity-50"
                >
                    <ArrowRight className="mr-2" /> BUSCAR EQUIPO
                </button>
            </form>

            <div className="text-center mt-8">
                <Link href="/configurar-grupo" className="text-xs font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Shield size={14} /> O FUNDAR MI PROPIO EQUIPO
                </Link>
            </div>
        </main>
    );
}
