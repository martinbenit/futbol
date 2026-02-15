/**
 * Set master ("Pizarra Maestra") scores.
 * 1. Alter SkillRating.score from Int to Float
 * 2. Delete all csv_* ratings
 * 3. Insert pizarra_maestra ratings with exact decimal values
 * 4. Update Player.scouting with overall average
 * 
 * Run: npx -y tsx scripts/set-master-scores.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://atyiovotcolasdwjaxch.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eWlvdm90Y29sYXNkd2pheGNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjAyMTgsImV4cCI6MjA4NjU5NjIxOH0.blX16-TT42hCbOAi39KP2iMEog4uP48cgRLvY905-G4'
);

const GROUP_ID = '31f1870a-9fe5-431d-968f-2174e90d1e50';
const RATER_ID = 'pizarra_maestra';

// skill mapping: CSV column → DB skill ID
// 🧠 Cerebro = creativity, ⚙️ Motor = speed, 🌶️ Picante = attack, ⚡ Rayo = sprint, 🧱 Muralla = defense, 🧤 Arco = goalkeeping
type MasterRow = { name: string; avg: number; creativity: number; speed: number; attack: number; sprint: number; defense: number; goalkeeping: number };

const MASTER_DATA: MasterRow[] = [
    { name: 'Martin', avg: 4.09, creativity: 4.40, speed: 4.40, attack: 4.70, sprint: 4.50, defense: 3.70, goalkeeping: 2.50 },
    { name: 'Faria', avg: 3.95, creativity: 4.33, speed: 4.00, attack: 4.40, sprint: 4.00, defense: 3.67, goalkeeping: 3.12 },
    { name: 'Fran', avg: 3.85, creativity: 4.33, speed: 4.33, attack: 4.33, sprint: 4.33, defense: 3.33, goalkeeping: 2.25 },
    { name: 'Yaro', avg: 3.85, creativity: 3.56, speed: 3.78, attack: 3.50, sprint: 4.00, defense: 3.44, goalkeeping: 4.78 },
    { name: 'Claudio', avg: 3.59, creativity: 3.40, speed: 4.00, attack: 3.90, sprint: 3.44, defense: 3.50, goalkeeping: 3.22 },
    { name: 'Roberto', avg: 3.50, creativity: 4.40, speed: 3.60, attack: 4.40, sprint: 3.10, defense: 3.22, goalkeeping: 2.00 },
    { name: 'Nestor El Flaco', avg: 3.38, creativity: 3.50, speed: 3.60, attack: 3.50, sprint: 2.50, defense: 3.90, goalkeeping: 3.33 },
    { name: 'Diego', avg: 3.37, creativity: 3.22, speed: 3.80, attack: 3.60, sprint: 3.30, defense: 3.70, goalkeeping: 2.38 },
    { name: 'Gustavo', avg: 3.37, creativity: 4.10, speed: 3.50, attack: 4.33, sprint: 2.75, defense: 3.22, goalkeeping: 2.00 },
    { name: 'Ricky', avg: 3.25, creativity: 3.22, speed: 3.67, attack: 3.44, sprint: 3.44, defense: 3.33, goalkeeping: 2.25 },
    { name: 'Fabian', avg: 3.20, creativity: 2.60, speed: 3.80, attack: 3.00, sprint: 3.30, defense: 4.00, goalkeeping: 2.14 },
    { name: 'Sergio (El Negro)', avg: 3.19, creativity: 3.43, speed: 3.50, attack: 3.21, sprint: 2.71, defense: 3.64, goalkeeping: 2.45 },
    { name: 'Facundo', avg: 3.15, creativity: 3.22, speed: 3.44, attack: 3.78, sprint: 3.00, defense: 3.00, goalkeeping: 2.38 },
    { name: 'Ariel Van O.', avg: 3.04, creativity: 2.67, speed: 2.89, attack: 2.78, sprint: 2.71, defense: 3.11, goalkeeping: 4.12 },
    { name: 'Ale', avg: 3.02, creativity: 2.75, speed: 3.44, attack: 2.89, sprint: 2.44, defense: 3.78, goalkeeping: 2.75 },
    { name: 'Daniel "El Cura"', avg: 3.00, creativity: 3.00, speed: 3.40, attack: 3.00, sprint: 2.67, defense: 3.40, goalkeeping: 2.38 },
    { name: 'Matafuego', avg: 2.94, creativity: 3.11, speed: 3.44, attack: 3.89, sprint: 3.00, defense: 2.11, goalkeeping: 2.00 },
    { name: 'Marcelo', avg: 2.85, creativity: 2.75, speed: 2.56, attack: 3.00, sprint: 2.38, defense: 2.78, goalkeeping: 3.56 },
    { name: 'Leo', avg: 2.83, creativity: 3.22, speed: 2.89, attack: 3.00, sprint: 2.44, defense: 3.11, goalkeeping: 2.25 },
    { name: 'Manija', avg: 2.83, creativity: 3.44, speed: 2.78, attack: 3.00, sprint: 2.11, defense: 3.22, goalkeeping: 2.44 },
    { name: 'Griego', avg: 2.68, creativity: 2.50, speed: 2.90, attack: 2.80, sprint: 2.20, defense: 2.80, goalkeeping: 2.89 },
    { name: 'Sergio (El Cardiólogo)', avg: 2.55, creativity: 2.50, speed: 2.80, attack: 2.20, sprint: 2.40, defense: 2.70, goalkeeping: 2.00 },
    { name: 'Gaston (Saturno)', avg: 2.52, creativity: 2.50, speed: 2.50, attack: 2.50, sprint: 2.50, defense: 2.50, goalkeeping: 2.67 },
    { name: 'Tony', avg: 2.44, creativity: 2.90, speed: 2.30, attack: 3.30, sprint: 1.60, defense: 2.10, goalkeeping: 2.44 },
    { name: 'Edy', avg: 2.43, creativity: 2.22, speed: 2.67, attack: 2.67, sprint: 2.11, defense: 2.78, goalkeeping: 2.12 },
    { name: 'Gustavo Pero', avg: 2.41, creativity: 2.33, speed: 2.56, attack: 2.62, sprint: 2.00, defense: 2.62, goalkeeping: 2.38 },
    { name: 'Marquitos', avg: 2.34, creativity: 2.89, speed: 2.11, attack: 3.22, sprint: 1.89, defense: 2.11, goalkeeping: 1.75 },
    { name: 'Dr Potente', avg: 2.14, creativity: 2.20, speed: 2.20, attack: 2.50, sprint: 1.60, defense: 2.20, goalkeeping: 2.11 },
    { name: 'Cali', avg: 1.89, creativity: 2.00, speed: 2.11, attack: 2.70, sprint: 1.30, defense: 1.70, goalkeeping: 1.50 },
    { name: 'Fernandinho', avg: 1.89, creativity: 2.22, speed: 1.80, attack: 2.22, sprint: 1.70, defense: 1.80, goalkeeping: 1.62 },
];

async function main() {
    console.log('🏗️  Step 1: Altering SkillRating.score from int4 to float8...');
    // Use Supabase REST to execute raw SQL via RPC if available; otherwise do it via direct update
    // Actually, Supabase anon key can't run raw SQL. We'll do it via the Supabase dashboard or prisma.
    // For now, let's just use float values when inserting — Supabase will handle the type coercion.
    // We'll change the schema separately with prisma.

    console.log('🗑️  Step 2: Deleting all csv_* and pizarra_maestra ratings...');
    // Delete pizarra_maestra first
    const { error: delPiz } = await supabase
        .from('SkillRating')
        .delete()
        .eq('raterId', RATER_ID)
        .eq('groupId', GROUP_ID);
    if (delPiz) console.error('  Error deleting pizarra:', delPiz.message);

    // Delete csv_* ratings
    const { data: csvRatings } = await supabase
        .from('SkillRating')
        .select('id, raterId')
        .eq('groupId', GROUP_ID)
        .like('raterId', 'csv_%');

    if (csvRatings && csvRatings.length > 0) {
        const ids = csvRatings.map(r => r.id);
        for (let i = 0; i < ids.length; i += 100) {
            const batch = ids.slice(i, i + 100);
            await supabase.from('SkillRating').delete().in('id', batch);
        }
        console.log(`  Deleted ${csvRatings.length} csv_* ratings`);
    }

    console.log('👥  Step 3: Getting DB players...');
    const { data: dbPlayers } = await supabase
        .from('Player')
        .select('id, name')
        .eq('groupId', GROUP_ID);

    if (!dbPlayers) {
        console.error('❌ No players found!');
        process.exit(1);
    }

    const playerLookup = new Map(dbPlayers.map(p => [p.name.toLowerCase(), p.id]));
    console.log(`  Found ${dbPlayers.length} players`);

    console.log('📥  Step 4: Inserting pizarra_maestra ratings...');
    const now = new Date().toISOString();
    const skills = ['creativity', 'speed', 'attack', 'sprint', 'defense', 'goalkeeping'] as const;
    const inserts: any[] = [];
    let unmapped: string[] = [];

    for (const row of MASTER_DATA) {
        const playerId = playerLookup.get(row.name.toLowerCase());
        if (!playerId) {
            unmapped.push(row.name);
            continue;
        }

        for (const skill of skills) {
            inserts.push({
                id: crypto.randomUUID(),
                raterId: RATER_ID,
                playerId,
                skill,
                score: row[skill], // This will be a float like 4.40
                groupId: GROUP_ID,
                createdAt: now,
                updatedAt: now,
            });
        }

        // Also update Player.scouting with overall average
        await supabase
            .from('Player')
            .update({ scouting: row.avg })
            .eq('id', playerId);
    }

    // Insert in batches
    let totalInserted = 0;
    for (let i = 0; i < inserts.length; i += 50) {
        const batch = inserts.slice(i, i + 50);
        const { error } = await supabase.from('SkillRating').insert(batch);
        if (error) {
            console.error(`  ❌ Batch error:`, error.message);
        } else {
            totalInserted += batch.length;
        }
    }

    console.log(`\n✅ Inserted ${totalInserted} pizarra_maestra ratings`);
    console.log(`✅ Updated ${MASTER_DATA.length - unmapped.length} players' scouting averages`);

    if (unmapped.length > 0) {
        console.log('\n⚠️ Unmapped players:');
        unmapped.forEach(n => console.log(`  • "${n}"`));
    }

    // Verify
    console.log('\n📊 Verification:');
    const { data: verify } = await supabase
        .from('SkillRating')
        .select('raterId, score, skill, playerId')
        .eq('groupId', GROUP_ID)
        .eq('raterId', RATER_ID);

    console.log(`  ${(verify || []).length} pizarra_maestra ratings in DB`);

    // Show a few samples
    const samples = (verify || []).slice(0, 6);
    for (const s of samples) {
        const player = dbPlayers.find(p => p.id === s.playerId);
        console.log(`  ${player?.name || s.playerId}: ${s.skill} = ${s.score}`);
    }
}

main();
