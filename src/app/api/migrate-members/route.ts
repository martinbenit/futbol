import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        // 1. Get all players with clerkId
        const { data: players, error } = await supabase
            .from('Player')
            .select('*')
            .not('clerkId', 'is', null);

        if (error) throw error;
        if (!players) return NextResponse.json({ message: 'No players to migrate' });

        let migrated = 0;
        const errors = [];

        for (const p of players) {
            // Check if already exists
            const { data: existing } = await supabase
                .from('GroupMember')
                .select('id')
                .eq('clerkId', p.clerkId)
                .eq('groupId', p.groupId)
                .maybeSingle();

            if (!existing) {
                const { error: insertError } = await supabase
                    .from('GroupMember')
                    .insert({
                        id: crypto.randomUUID(),
                        clerkId: p.clerkId,
                        groupId: p.groupId,
                        role: p.role, // Maintain role (ADMIN/PLAYER)
                        name: p.name,
                        joinedAt: p.createdAt
                    });

                if (insertError) {
                    errors.push({ player: p.name, error: insertError.message });
                } else {
                    migrated++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            totalPlayers: players.length,
            migrated,
            errors
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
