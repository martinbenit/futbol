import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PaniquesoApp - La Mística del Fútbol",
  description: "Organiza tus partidos con la esencia de El Gráfico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Inter:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <header style={{
          backgroundColor: 'var(--primary)',
          color: 'white',
          padding: '1rem',
          textAlign: 'center',
          boxShadow: '0 4px 0 rgba(0,0,0,0.2)'
        }}>
          <h1 style={{ fontSize: '2.5rem', margin: 0 }}>PANIQUESO</h1>
          <p style={{ margin: 0, textTransform: 'uppercase', fontStyle: 'italic', opacity: 0.8 }}>Fundado en 2026 - El deporte por excelencia</p>
        </header>
        <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
          {children}
        </main>
        <footer style={{
          textAlign: 'center',
          padding: '2rem',
          marginTop: '4rem',
          borderTop: '2px solid var(--primary)',
          opacity: 0.6
        }}>
          <p className="el-grafico-text">PaniquesoApp © {new Date().getFullYear()}</p>
        </footer>
      </body>
    </html>
  );
}
