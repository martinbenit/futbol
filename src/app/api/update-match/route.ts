import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { matchId, scoreA, scoreB, chamigo, goleadores, awards, status } = body;

        if (!matchId) {
            return NextResponse.json({ error: 'matchId es obligatorio' }, { status: 400 });
        }

        const updates: any = {};
        if (scoreA !== undefined) updates.scoreA = scoreA;
        if (scoreB !== undefined) updates.scoreB = scoreB;
        if (chamigo !== undefined) updates.chamigo = chamigo;
        if (goleadores !== undefined) updates.goleadores = JSON.stringify(goleadores);
        if (awards !== undefined) updates.awards = JSON.stringify(awards);
        if (status !== undefined) updates.status = status;

        const { error } = await supabase
            .from('Match')
            .update(updates)
            .eq('id', matchId);

        if (error) {
            console.error('Update match error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Update match error:', err);
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
    }
}
