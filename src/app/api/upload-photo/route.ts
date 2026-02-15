import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const playerId = formData.get('playerId') as string;

        if (!file || !playerId) {
            return NextResponse.json({ error: 'Missing file or playerId' }, { status: 400 });
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
        }

        // Max 2MB
        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 });
        }

        // Convert to base64 data URL for storage in the DB directly
        // This avoids needing Supabase Storage bucket setup
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;

        // Update player with photo
        const { error } = await supabase
            .from('Player')
            .update({ photoUrl: dataUrl })
            .eq('id', playerId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, photoUrl: dataUrl });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
    }
}
