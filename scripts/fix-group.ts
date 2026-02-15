/**
 * Fix group: Move 30 seeded players from wrong group to correct group.
 * Also handles duplicate Martin (overwrite the existing one).
 * Run: npx tsx scripts/fix-group.ts
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://atyiovotcolasdwjaxch.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eWlvdm90Y29sYXNkd2pheGNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjAyMTgsImV4cCI6MjA4NjU5NjIxOH0.blX16-TT42hCbOAi39KP2iMEog4uP48cgRLvY905-G4'
);

const WRONG_GROUP = '34d76848-80a9-4c7a-8fcb-a34f16ea45ce';
const CORRECT_GROUP = '31f1870a-9fe5-431d-968f-2174e90d1e50';

async function main() {
    console.log('🔧 Fixing group assignment...\n');

    // 1. Get existing players in correct group
    const { data: correctPlayers } = await supabase
        .from('Player')
        .select('id, name')
        .eq('groupId', CORRECT_GROUP);

    console.log(`📋 Correct group has ${(correctPlayers || []).length} players:`);
    (correctPlayers || []).forEach(p => console.log(`   • ${p.name} (${p.id})`));

    // 2. Get players in wrong group (the 30 seeded ones)
    const { data: wrongPlayers } = await supabase
        .from('Player')
        .select('id, name')
        .eq('groupId', WRONG_GROUP);

    console.log(`\n📋 Wrong group has ${(wrongPlayers || []).length} players:`);
    (wrongPlayers || []).forEach(p => console.log(`   • ${p.name} (${p.id})`));

    if (!wrongPlayers || wrongPlayers.length === 0) {
        console.log('\n✅ No players to move.');
        return;
    }

    const existingNames = new Map((correctPlayers || []).map(p => [p.name.toLowerCase(), p]));

    let moved = 0;
    let merged = 0;
    let deleted = 0;

    for (const wp of wrongPlayers) {
        const existing = existingNames.get(wp.name.toLowerCase());

        if (existing) {
            // Name exists in correct group — this is a duplicate (e.g. Martin)
            // Delete the one from the wrong group, keep the one in correct group
            console.log(`   🔀 Duplicate "${wp.name}" — deleting from wrong group, keeping existing`);

            // First delete any ratings pointing to the wrong player
            await supabase.from('SkillRating').delete().eq('playerId', wp.id);
            // Delete the wrong player
            await supabase.from('Player').delete().eq('id', wp.id);
            merged++;
        } else {
            // Move to correct group
            const { error } = await supabase
                .from('Player')
                .update({ groupId: CORRECT_GROUP })
                .eq('id', wp.id);

            if (error) {
                console.error(`   ❌ Error moving ${wp.name}:`, error);
            } else {
                console.log(`   ✅ Moved "${wp.name}"`);
                moved++;
            }
        }
    }

    console.log(`\n📊 Results: ${moved} moved, ${merged} merged (duplicates removed)`);

    // 3. Delete the wrong/empty group
    const { data: remainingInWrong } = await supabase
        .from('Player')
        .select('id')
        .eq('groupId', WRONG_GROUP);

    if (!remainingInWrong || remainingInWrong.length === 0) {
        console.log(`\n🗑️  Deleting empty group ${WRONG_GROUP}...`);
        const { error } = await supabase
            .from('Group')
            .delete()
            .eq('id', WRONG_GROUP);
        if (error) {
            console.error('   ❌ Could not delete group:', error);
        } else {
            console.log('   ✅ Empty group deleted!');
        }
    }

    // 4. Final count
    const { data: finalPlayers } = await supabase
        .from('Player')
        .select('name')
        .eq('groupId', CORRECT_GROUP)
        .order('name');

    console.log(`\n🏆 Final roster (${(finalPlayers || []).length} players):`);
    (finalPlayers || []).forEach(p => console.log(`   ⚽ ${p.name}`));
}

main();
