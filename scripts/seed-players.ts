/**
 * Seed script: Insert 30 players into the group.
 * Run: npx tsx scripts/seed-players.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://atyiovotcolasdwjaxch.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eWlvdm90Y29sYXNkd2pheGNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjAyMTgsImV4cCI6MjA4NjU5NjIxOH0.blX16-TT42hCbOAi39KP2iMEog4uP48cgRLvY905-G4'
);

const PLAYERS = [
    'Ale',
    'Ariel Van O.',
    'Cali',
    'Claudio',
    'Daniel "El Cura"',
    'Diego',
    'Dr Potente',
    'Edy',
    'Nestor El Flaco',
    'Fabian',
    'Facundo',
    'Faria',
    'Fernandinho',
    'Fran',
    'Gaston (Saturno)',
    'Griego',
    'Gustavo',
    'Gustavo Pero',
    'Leo',
    'Manija',
    'Marcelo',
    'Marquitos',
    'Martin',
    'Matafuego',
    'Ricky',
    'Roberto',
    'Sergio (El Negro)',
    'Sergio (El Cardiólogo)',
    'Tony',
    'Yaro',
];

async function main() {
    // 1. Find the group
    const { data: groups, error: gErr } = await supabase
        .from('Group')
        .select('id, name');

    if (gErr || !groups || groups.length === 0) {
        console.error('❌ No groups found:', gErr);
        return;
    }

    console.log('📋 Groups found:');
    groups.forEach(g => console.log(`   • ${g.name} (${g.id})`));

    const groupId = groups[0].id;
    console.log(`\n🎯 Using group: ${groups[0].name} (${groupId})`);

    // 2. Get existing players
    const { data: existing } = await supabase
        .from('Player')
        .select('name, id')
        .eq('groupId', groupId);

    const existingNames = new Set((existing || []).map(p => p.name.toLowerCase()));
    console.log(`\n📊 ${(existing || []).length} players already exist.`);

    // 3. Insert new players (skip duplicates)
    const now = new Date().toISOString();
    const toInsert = PLAYERS
        .filter(name => !existingNames.has(name.toLowerCase()))
        .map(name => ({
            id: crypto.randomUUID(),
            name,
            groupId,
            scouting: 0,
            createdAt: now,
            updatedAt: now,
        }));

    if (toInsert.length === 0) {
        console.log('\n✅ All 30 players already exist. Nothing to do.');
        return;
    }

    console.log(`\n🌱 Inserting ${toInsert.length} new players...`);
    const { data, error } = await supabase
        .from('Player')
        .insert(toInsert)
        .select();

    if (error) {
        console.error('❌ Error:', error);
    } else {
        console.log(`✅ Created ${data.length} players:`);
        data.forEach(p => console.log(`   ⚽ ${p.name}`));
    }
}

main();
