import type { Metadata } from "next";
import Image from "next/image";
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { esES } from '@clerk/localizations'
import { Inter, Bebas_Neue, Anton } from 'next/font/google'
import { GroupProvider } from "@/context/GroupContext";
import "./globals.css";
import Link from 'next/link';
import GroupSwitcher from "@/components/GroupSwitcher";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-masthead' })
const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-accent' })

export const metadata: Metadata = {
  title: "PaniquesoApp - La Mística del Fútbol",
  description: "Organiza tus partidos con la esencia de El Gráfico",
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={esES}>
      <GroupProvider>
        <html lang="es" className={`${inter.variable} ${bebasNeue.variable} ${anton.variable}`}>
          <body className="font-sans">
            <div className="grain-overlay"></div>

            <nav className="bg-[var(--ink-black)] text-white py-4 px-3 md:px-6 flex justify-between items-center z-50 relative border-b border-white/10 overflow-hidden">
              <div className="flex items-center gap-2 md:gap-6 min-w-0">
                <Link href="/" className="hover:opacity-80 transition-opacity flex-shrink-0">
                  <Image
                    src="/logo.webp"
                    alt="PAN Y QUESO"
                    width={180}
                    height={40}
                    className="h-8 md:h-10 w-auto object-contain"
                    priority
                  />
                </Link>

                <SignedIn>
                  <div className="h-6 w-[1px] bg-white/20 hidden sm:block flex-shrink-0"></div>
                  <GroupSwitcher />
                </SignedIn>
              </div>

              <div className="hidden md:flex gap-8 font-masthead text-sm tracking-widest items-center">
                <Link href="/armar-partido" className="hover:text-[var(--grafico-cyan)] transition-colors">VERSUS</Link>
                <Link href="/jugadores" className="hover:text-[var(--grafico-cyan)] transition-colors">SCOUTING</Link>
                <Link href="/historial" className="hover:text-[var(--grafico-cyan)] transition-colors">ARCHIVO</Link>
              </div>

              <div className="flex items-center gap-4">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="bg-[var(--grafico-cyan)] px-4 py-1 font-masthead text-sm border border-white hover:bg-white hover:text-black transition-all">
                      ENTRAR
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <UserButton appearance={{ elements: { userButtonAvatarBox: "w-10 h-10 border-2 border-[var(--grafico-gold)]" } }} />
                </SignedIn>
              </div>
            </nav>

            {children}

            <footer className="text-center p-12 mt-16 border-t-2 border-[var(--ink-black)] opacity-80 font-serif">
              <p className="font-masthead text-xl">© 2026 PAN Y QUESO APP - UNA PRODUCCIÓN DE ÉPOCA</p>
              <div className="flex justify-center gap-4 mt-4 text-2xl">
                <span>⚽</span><span>🥅</span><span>👟</span><span>🍺</span>
              </div>
            </footer>
          </body>
        </html>
      </GroupProvider>
    </ClerkProvider>
  );
}
