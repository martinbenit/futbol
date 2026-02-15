import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { matchId, groupId, clerkId } = await request.json();

        if (!matchId || !groupId || !clerkId) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
        }

        // 1. Verify Admin Role
        const { data: member, error: memberError } = await supabase
            .from('GroupMember')
            .select('role')
            .eq('groupId', groupId)
            .eq('clerkId', clerkId)
            .single();

        if (memberError || !member || member.role !== 'ADMIN') {
            return NextResponse.json({ error: 'No tienes permisos de administrador' }, { status: 403 });
        }

        // 2. Delete Participations first (Manual cascade if FK doesn't handle it, safe to do)
        const { error: partError } = await supabase
            .from('Participation')
            .delete()
            .eq('matchId', matchId);

        if (partError) {
            console.error('Error deleting participations:', partError);
            return NextResponse.json({ error: 'Error al eliminar participaciones' }, { status: 500 });
        }

        // 3. Delete Match
        const { error: matchError } = await supabase
            .from('Match')
            .delete()
            .eq('id', matchId);

        if (matchError) {
            console.error('Error deleting match:', matchError);
            return NextResponse.json({ error: 'Error al eliminar el partido' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Delete match error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
