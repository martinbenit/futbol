import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            groupId,
            teamA, teamB,
            teamAName, teamBName,
            sumA, sumB,
            justification, motivation,
            contributions,
            pizarraA, pizarraB,
            date, hora, cancha,
        } = body;

        if (!groupId || !teamA || !teamB) {
            return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
        }

        // Mark any existing upcoming matches as completed
        await supabase
            .from('Match')
            .update({ status: 'replaced' })
            .eq('groupId', groupId)
            .eq('status', 'upcoming');

        // Create new match
        const matchId = crypto.randomUUID();
        const { error: matchError } = await supabase
            .from('Match')
            .insert({
                id: matchId,
                groupId,
                teamA_Name: teamAName,
                teamB_Name: teamBName,
                teamA_JSON: JSON.stringify(teamA),
                teamB_JSON: JSON.stringify(teamB),
                scoreA: null,
                scoreB: null,
                motivation,
                justification,
                status: 'upcoming',
                date: date || new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })).toISOString(),
                hora: hora || null,
                cancha: cancha || null,
                location: cancha || null,
                pizarraA: pizarraA || null,
                pizarraB: pizarraB || null,
                contributions: contributions ? JSON.stringify(contributions) : null,
            });

        if (matchError) {
            console.error('Match insert error:', matchError);
            return NextResponse.json({ error: matchError.message }, { status: 500 });
        }

        // Create participations
        const allPlayers = [
            ...teamA.map((p: any) => ({ ...p, team: 'A' })),
            ...teamB.map((p: any) => ({ ...p, team: 'B' })),
        ];

        const participations = allPlayers
            .filter((p: any) => !p.id.startsWith('guest-'))
            .map((p: any) => ({
                id: crypto.randomUUID(),
                matchId,
                playerId: p.id,
                team: p.team,
                isGuest: false,
            }));

        if (participations.length > 0) {
            const { error: partError } = await supabase
                .from('Participation')
                .insert(participations);

            if (partError) {
                console.error('Participation insert error:', partError);
            }
        }

        return NextResponse.json({ id: matchId, success: true });
    } catch (err: any) {
        console.error('Save match error:', err);
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
    }
}
