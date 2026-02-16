import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const user = await currentUser();

        if (!user) {
            return NextResponse.json({ error: 'Debes iniciar sesión primero' }, { status: 401 });
        }

        const email = user.emailAddresses.find(e => e.emailAddress === 'mrtnbenitez@gmail.com');

        if (!email) {
            return NextResponse.json({ error: 'Este endpoint es solo para el administrador (mrtnbenitez@gmail.com)' }, { status: 403 });
        }

        // 1. Find the target group
        const { data: group, error: groupError } = await supabase
            .from('Group')
            .select('id')
            .ilike('name', 'FUTBOLDELOSVIERNES%') // Fuzzy match just in case
            .maybeSingle();

        if (groupError) {
            return NextResponse.json({ error: 'Error buscando grupo: ' + groupError.message }, { status: 500 });
        }

        if (!group) {
            // Create the group if it doesn't exist? Or fail? User said "respetar el grupo que se creo".
            // Since I don't know the exact ID, I'll try to find any group created by previous admins or create one.
            // But let's assume it exists. If not found via name, we can't proceed safely.
            // Wait, maybe the name is exactly "FUTBOLDELOSVIERNES".
            const { data: exactGroup } = await supabase
                .from('Group')
                .select('id')
                .eq('name', 'FUTBOLDELOSVIERNES')
                .maybeSingle();

            if (!exactGroup) return NextResponse.json({ error: 'No se encontró el grupo FUTBOLDELOSVIERNES' }, { status: 404 });

            // Use exact group
            return await assignAdmin(user.id, exactGroup.id, user.firstName + ' ' + user.lastName);
        }

        return await assignAdmin(user.id, group.id, (user.firstName || '') + ' ' + (user.lastName || ''));

    } catch (error: any) {
        console.error('Recovery error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function assignAdmin(clerkId: string, groupId: string, name: string) {
    // Check if member exists
    const { data: existingMember } = await supabase
        .from('GroupMember')
        .select('id')
        .eq('groupId', groupId)
        .eq('clerkId', clerkId)
        .maybeSingle();

    if (existingMember) {
        // Update to ADMIN
        const { error } = await supabase
            .from('GroupMember')
            .update({ role: 'ADMIN' })
            .eq('id', existingMember.id);

        if (error) return NextResponse.json({ error: 'Error actualizando rol: ' + error.message }, { status: 500 });
        return NextResponse.json({ success: true, message: 'Ya eras miembro. Ahora eres ADMIN de FUTBOLDELOSVIERNES.' });
    } else {
        // Insert as ADMIN
        const { error } = await supabase
            .from('GroupMember')
            .insert({
                groupId,
                clerkId,
                role: 'ADMIN',
                name: name.trim() || 'Admin'
            });

        if (error) return NextResponse.json({ error: 'Error creando miembro: ' + error.message }, { status: 500 });
        return NextResponse.json({ success: true, message: 'Te has unido como ADMIN al grupo FUTBOLDELOSVIERNES.' });
    }
}
