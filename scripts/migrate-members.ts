
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

console.log('CWD:', process.cwd());
console.log('Supabase URL present:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Or SERVICE_ROLE_KEY if RLS blocks

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Starting migration...');

    // 1. Get all players with clerkId
    const { data: players, error } = await supabase
        .from('Player')
        .select('*')
        .not('clerkId', 'is', null);

    if (error) {
        console.error('Error fetching players:', error);
        return;
    }

    if (!players || players.length === 0) {
        console.log('No players to migrate');
        return;
    }

    console.log(`Found ${players.length} players to migrate.`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

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
                console.error(`Error migrating ${p.name}:`, insertError.message);
                errors++;
            } else {
                console.log(`Migrated: ${p.name}`);
                migrated++;
            }
        } else {
            skipped++;
        }
    }

    console.log(`Migration complete. Migrated: ${migrated}, Skipped: ${skipped}, Errors: ${errors}`);
}

migrate();
