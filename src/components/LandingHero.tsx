'use client';

import { SignInButton } from "@clerk/nextjs";
import { ArrowRight, Trophy, Users, ShieldCheck } from "lucide-react";
import Image from "next/image";

export default function LandingHero() {
    return (
        <div className="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
            {/* Background Hero Image - B&W Vintage */}
            <div
                className="absolute inset-0 z-0 opacity-20 grayscale"
                style={{
                    backgroundImage: 'url("https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=2000")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            ></div>

            <div className="relative z-10 max-w-4xl mx-auto py-12">
                <header className="mb-8 flex flex-col items-center">
                    <div className="w-full max-w-4xl mb-4 relative h-64 md:h-96">
                        <Image
                            src="/isologo.png"
                            alt="PAN Y QUESO"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <p className="font-accent text-2xl text-[var(--grafico-cyan)] border-y-2 border-black py-2 tracking-tight">
                        LA INTELIGENCIA ARTIFICIAL QUE DEFINE EL HONOR EN EL POTRERO
                    </p>
                </header>

                <p className="text-xl mb-12 max-w-2xl mx-auto leading-tight font-serif italic text-gray-700">
                    "No más discusiones por quién elige primero. Deje que nuestra tecnología de época balancee su plantel mientras usted se preocupa por el asado."
                </p>

                <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
                    <SignInButton mode="modal">
                        <button className="btn-primary scale-110 !px-12 !py-5">
                            ENTRÁ A TU EQUIPO CON GOOGLE <ArrowRight className="ml-2" />
                        </button>
                    </SignInButton>
                </div>

                <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12 border-t-2 border-black/10 pt-12">
                    <Feature icon={<Trophy className="text-[var(--grafico-gold)]" />} title="EQUIPOS JUSTOS" desc="IA entrenada con la mística del 46." />
                    <Feature icon={<Users className="text-[var(--grafico-cyan)]" />} title="GESTIÓN DE GRUPO" desc="Invita a tus cracks por WhatsApp." />
                    <Feature icon={<ShieldCheck className="text-[var(--grafico-red)]" />} title="ARCHIVO HISTÓRICO" desc="Resultados y deudas, nada se borra." />
                </div>
            </div>
        </div>
    );
}

function Feature({ icon, title, desc }: any) {
    return (
        <div className="flex flex-col items-center text-center">
            <div className="mb-4">{icon}</div>
            <h3 className="font-masthead text-xl mb-1">{title}</h3>
            <p className="text-sm opacity-70 px-4">{desc}</p>
        </div>
    );
}
