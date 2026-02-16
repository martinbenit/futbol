import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { groupId, clerkId } = await req.json();

        if (!groupId || !clerkId) {
            return NextResponse.json({ error: 'Faltan datos (groupId, clerkId)' }, { status: 400 });
        }

        // 1. Verify user is ADMIN of this group
        const { data: member, error: memberErr } = await supabase
            .from('GroupMember')
            .select('role')
            .eq('groupId', groupId)
            .eq('clerkId', clerkId)
            .single();

        if (memberErr || !member || member.role !== 'ADMIN') {
            return NextResponse.json({ error: 'No tienes permisos de administrador' }, { status: 403 });
        }

        // 2. Get all matches for this group
        const { data: matches } = await supabase
            .from('Match')
            .select('id')
            .eq('groupId', groupId);

        const matchIds = (matches || []).map((m: any) => m.id);

        // 3. Delete all participations for those matches
        if (matchIds.length > 0) {
            for (const matchId of matchIds) {
                await supabase.from('Participation').delete().eq('matchId', matchId);
            }
        }

        // 4. Delete all matches
        const { error: matchErr } = await supabase.from('Match').delete().eq('groupId', groupId);
        if (matchErr) console.error('Error deleting matches:', matchErr);

        // 5. Get all players for this group
        const { data: players } = await supabase
            .from('Player')
            .select('id')
            .eq('groupId', groupId);

        const playerIds = (players || []).map((p: any) => p.id);

        // 6. Delete all skill ratings for those players
        if (playerIds.length > 0) {
            for (const playerId of playerIds) {
                await supabase.from('SkillRating').delete().eq('playerId', playerId);
            }
        }

        // 7. Delete all players
        const { error: playerErr } = await supabase.from('Player').delete().eq('groupId', groupId);
        if (playerErr) console.error('Error deleting players:', playerErr);

        // 8. Delete all group members
        const { error: memberDelErr } = await supabase.from('GroupMember').delete().eq('groupId', groupId);
        if (memberDelErr) console.error('Error deleting members:', memberDelErr);

        // 9. Finally delete the group itself
        const { error: groupError } = await supabase.from('Group').delete().eq('id', groupId);

        if (groupError) {
            console.error('Error deleting group:', groupError);
            return NextResponse.json({ error: 'Error eliminando el grupo: ' + groupError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Grupo eliminado exitosamente' });

    } catch (error: any) {
        console.error('Delete group error:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
