import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { groupId } = await req.json();
        if (!groupId) {
            return NextResponse.json({ error: 'Falta groupId' }, { status: 400 });
        }

        // 1. Verify user is ADMIN of this group
        const { data: member } = await supabase
            .from('GroupMember')
            .select('role')
            .eq('groupId', groupId)
            .eq('clerkId', user.id)
            .single();

        if (!member || member.role !== 'ADMIN') {
            return NextResponse.json({ error: 'No tienes permisos de administrador' }, { status: 403 });
        }

        // 2. Get all matches for this group
        const { data: matches } = await supabase
            .from('Match')
            .select('id')
            .eq('groupId', groupId);

        const matchIds = (matches || []).map(m => m.id);

        // 3. Delete all participations for those matches
        if (matchIds.length > 0) {
            for (const matchId of matchIds) {
                await supabase.from('Participation').delete().eq('matchId', matchId);
            }
        }

        // 4. Delete all matches
        await supabase.from('Match').delete().eq('groupId', groupId);

        // 5. Get all players for this group
        const { data: players } = await supabase
            .from('Player')
            .select('id')
            .eq('groupId', groupId);

        const playerIds = (players || []).map(p => p.id);

        // 6. Delete all skill ratings for those players
        if (playerIds.length > 0) {
            for (const playerId of playerIds) {
                await supabase.from('SkillRating').delete().eq('playerId', playerId);
            }
        }

        // 7. Delete all players
        await supabase.from('Player').delete().eq('groupId', groupId);

        // 8. Delete all group members
        await supabase.from('GroupMember').delete().eq('groupId', groupId);

        // 9. Finally delete the group itself
        const { error: groupError } = await supabase.from('Group').delete().eq('id', groupId);

        if (groupError) {
            console.error('Error deleting group:', groupError);
            return NextResponse.json({ error: 'Error eliminando el grupo: ' + groupError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Grupo eliminado exitosamente' });

    } catch (error: any) {
        console.error('Delete group error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
