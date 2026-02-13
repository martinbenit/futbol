import Link from 'next/link';
import { Trophy, Users, Megaphone, FileText } from 'lucide-react';

export default function Home() {
  return (
    <div className="vintage-container" style={{ textAlign: 'center' }}>
      <div style={{
        border: '3px solid var(--primary)',
        padding: '2rem',
        marginBottom: '2rem',
        background: 'white'
      }}>
        <h2 style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
          ¡VUELVE EL FÚTBOL!
        </h2>
        <div style={{ height: '4px', background: 'var(--foreground)', width: '60px', margin: '0 auto 1.5rem' }}></div>
        <p style={{ fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
          La aplicación definitiva para terminar con la discordia de los viernes.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '3rem' }}>
        <Link href="/armar-partido" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="match-card" style={{ cursor: 'pointer', textAlign: 'left' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Megaphone size={24} color="var(--primary)" /> ARMAR PARTIDO
            </h3>
            <p>Pegá la lista de WhatsApp y que la IA decida la suerte.</p>
          </div>
        </Link>

        <Link href="/jugadores" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="match-card" style={{ borderLeftColor: 'var(--accent)', cursor: 'pointer', textAlign: 'left' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={24} color="var(--accent)" /> SCOUTING
            </h3>
            <p>Gestioná el plantel y las puntuaciones de los muchachos.</p>
          </div>
        </Link>

        <Link href="/historial" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="match-card" style={{ borderLeftColor: 'var(--foreground)', cursor: 'pointer', textAlign: 'left' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={24} color="var(--foreground)" /> HISTORIAL
            </h3>
            <p>Resultados, goleadores y el "Chamigo" de la fecha.</p>
          </div>
        </Link>
      </div>

      <div style={{ marginTop: '4rem', padding: '1rem', border: '1px dashed var(--muted-foreground)' }}>
        <p style={{ fontStyle: 'italic', color: 'var(--muted-foreground)' }}>
          "En la cancha se ven los pingos, pero en Paniqueso se arman los equipos."
        </p>
      </div>
    </div>
  );
}
