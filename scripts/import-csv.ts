/**
 * CSV Import for Google Form scouting data.
 * Reads the actual CSV and creates SkillRating records.
 * 
 * Run: npx -y tsx scripts/import-csv.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
    'https://atyiovotcolasdwjaxch.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eWlvdm90Y29sYXNkd2pheGNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjAyMTgsImV4cCI6MjA4NjU5NjIxOH0.blX16-TT42hCbOAi39KP2iMEog4uP48cgRLvY905-G4'
);

const GROUP_ID = '31f1870a-9fe5-431d-968f-2174e90d1e50';

// ── Column header player name → DB player name ──
const PLAYER_NAME_MAP: Record<string, string> = {
    'Ale': 'Ale', 'Griego': 'Griego', 'Diego': 'Diego', 'Gustavo': 'Gustavo',
    'Dr Potente': 'Dr Potente', 'Sergio': 'Sergio (El Negro)', 'Manija': 'Manija',
    'Roberto': 'Roberto', 'Claudio': 'Claudio', 'Cali': 'Cali', 'Martin': 'Martin',
    'Yaro': 'Yaro', 'Tony': 'Tony', 'Fabian': 'Fabian',
    'Daniel "El Cura"': 'Daniel "El Cura"',
    'Daniel ""El Cura""': 'Daniel "El Cura"',
    'El Flaco (Néstor)': 'Nestor El Flaco',
    'El Flaco (Néstor (': 'Nestor El Flaco',
    'El Flaco (Arquero)': 'Nestor El Flaco',
    'Fernandinho': 'Fernandinho', 'Gustavo Pero': 'Gustavo Pero', 'Edy': 'Edy',
    'Ariel Van O. (Arquero)': 'Ariel Van O.',
    'Matafuego': 'Matafuego', 'Faria': 'Faria', 'Marquitos': 'Marquitos',
    'Facundo': 'Facundo', 'Marcelo (Arquero)': 'Marcelo', 'Ricky': 'Ricky',
    'Fran': 'Fran', 'Leo': 'Leo',
    'Gaston (Saturno)': 'Gaston (Saturno)',
    'Sergio (El Cardiólogo)': 'Sergio (El Cardiólogo)',
};

// ── Header skill pattern → DB skill ID ──
const SKILL_PATTERNS = [
    { pattern: 'LA MURALLA', skillId: 'defense' },
    { pattern: 'EL MOTOR', skillId: 'speed' },
    { pattern: 'EL CEREBRO', skillId: 'creativity' },
    { pattern: 'EL PICANTE', skillId: 'attack' },
    { pattern: 'VOY AL ARCO', skillId: 'goalkeeping' },
    { pattern: 'EL RAYO', skillId: 'sprint' },
];

// ── Rater CSV name → DB player name (for raterId = csv_XXX) ──
const RATER_NAME_MAP: Record<string, string> = {
    'Martín': 'Martin', 'Martin': 'Martin',
    'Yaro': 'Yaro', 'Claudio': 'Claudio', 'Diego': 'Diego',
    'Daniel': 'Daniel "El Cura"', 'Daniel ': 'Daniel "El Cura"',
    'Tony': 'Tony',
    'Fabián': 'Fabian', 'Fabián ': 'Fabian', 'Fabian': 'Fabian',
    'Cali': 'Cali', 'Ale': 'Ale',
    'dr potente miguel': 'Dr Potente', 'Dr Potente Miguel': 'Dr Potente',
    'Dr Potente': 'Dr Potente',
};

// ── Parse CSV with proper quote handling ──
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                cell += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            result.push(cell.trim());
            cell = '';
        } else {
            cell += ch;
        }
    }
    result.push(cell.trim());
    return result;
}

// ── Extract player name from header like: [Ale] ──
function extractPlayerName(header: string): string | null {
    const match = header.match(/\[([^\]]+)\]/);
    return match ? match[1].trim() : null;
}

// ── Extract skill ID from header ──
function extractSkillId(header: string): string | null {
    for (const { pattern, skillId } of SKILL_PATTERNS) {
        if (header.includes(pattern)) return skillId;
    }
    return null;
}

// ── Extract numeric score from cell like "5 (Muralla)" → 5, "3 (Cumple)" → 3 ──
function extractScore(cell: string): number | null {
    if (!cell || cell.trim() === '') return null;
    const match = cell.trim().match(/^(\d)/);
    if (match) return parseInt(match[1], 10);
    const num = parseInt(cell.trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= 5) return num;
    return null;
}

async function main() {
    // Find the CSV file
    const scriptsDir = path.join(__dirname);
    const files = fs.readdirSync(scriptsDir);
    const csvFile = files.find(f => f.endsWith('.csv'));

    if (!csvFile) {
        console.error('❌ No CSV file found in scripts/ directory');
        process.exit(1);
    }

    const csvPath = path.join(scriptsDir, csvFile);
    console.log(`📂 Found CSV: ${csvFile}\n`);

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

    if (lines.length < 2) {
        console.error('❌ CSV needs at least header + 1 data row');
        process.exit(1);
    }

    const headers = parseCSVLine(lines[0]);
    console.log(`📋 ${headers.length} columns, ${lines.length - 1} data rows\n`);

    // ── Build column map: { colIndex → skillId + playerCsvName } ──
    const colMap: { col: number; skillId: string; playerCsvName: string }[] = [];
    for (let i = 2; i < headers.length; i++) {
        const h = headers[i];
        const playerCsvName = extractPlayerName(h);
        const skillId = extractSkillId(h);
        if (playerCsvName && skillId) {
            colMap.push({ col: i, skillId, playerCsvName });
        }
    }
    console.log(`📊 ${colMap.length} skill×player cells mapped\n`);

    // ── Get DB players ──
    const { data: dbPlayers } = await supabase
        .from('Player')
        .select('id, name')
        .eq('groupId', GROUP_ID);

    if (!dbPlayers || dbPlayers.length === 0) {
        console.error('❌ No players in group!');
        process.exit(1);
    }

    console.log(`👥 ${dbPlayers.length} players in DB\n`);
    const playerLookup = new Map(dbPlayers.map(p => [p.name.toLowerCase(), p.id]));

    function resolvePlayerId(csvName: string): string | null {
        const mapped = PLAYER_NAME_MAP[csvName] || csvName;
        return playerLookup.get(mapped.toLowerCase()) || null;
    }

    let totalInserted = 0;
    const unmapped = new Set<string>();

    for (let row = 1; row < lines.length; row++) {
        const cells = parseCSVLine(lines[row]);
        const raterRaw = cells[1]?.trim();
        if (!raterRaw) continue;

        const mappedRater = RATER_NAME_MAP[raterRaw] || RATER_NAME_MAP[raterRaw.trim()] || raterRaw;
        const raterId = `csv_${mappedRater}`;

        console.log(`\n👤 Row ${row}: "${raterRaw}" → raterId: "${raterId}"`);

        const ratings: { playerId: string; skill: string; score: number }[] = [];

        for (const { col, skillId, playerCsvName } of colMap) {
            const rawCell = cells[col] || '';
            const score = extractScore(rawCell);
            if (score === null || score < 1 || score > 5) continue;

            const playerId = resolvePlayerId(playerCsvName);
            if (!playerId) {
                unmapped.add(playerCsvName);
                continue;
            }

            ratings.push({ playerId, skill: skillId, score });
        }

        if (ratings.length === 0) {
            console.log(`   ⚠️ No valid ratings in this row`);
            continue;
        }

        // Delete existing for this raterId
        await supabase
            .from('SkillRating')
            .delete()
            .eq('raterId', raterId)
            .eq('groupId', GROUP_ID);

        const now = new Date().toISOString();
        const inserts = ratings.map(r => ({
            id: crypto.randomUUID(),
            raterId,
            playerId: r.playerId,
            skill: r.skill,
            score: r.score,
            groupId: GROUP_ID,
            createdAt: now,
            updatedAt: now,
        }));

        // Insert in batches of 50
        for (let i = 0; i < inserts.length; i += 50) {
            const batch = inserts.slice(i, i + 50);
            const { error } = await supabase.from('SkillRating').insert(batch);
            if (error) {
                console.error(`   ❌ Error batch:`, error.message);
            } else {
                totalInserted += batch.length;
            }
        }

        console.log(`   ✅ ${ratings.length} ratings saved`);
    }

    if (unmapped.size > 0) {
        console.log(`\n⚠️ Unmapped player names (not found in DB):`);
        unmapped.forEach(n => console.log(`   • "${n}"`));
    }

    console.log(`\n🏆 Import complete: ${totalInserted} total ratings inserted`);

    // Verify
    const { data: verifyData } = await supabase
        .from('SkillRating')
        .select('raterId')
        .eq('groupId', GROUP_ID)
        .like('raterId', 'csv_%');

    const raterCounts: Record<string, number> = {};
    (verifyData || []).forEach(r => {
        raterCounts[r.raterId] = (raterCounts[r.raterId] || 0) + 1;
    });

    console.log(`\n📊 Verification — CSV ratings by rater:`);
    Object.entries(raterCounts).forEach(([r, c]) => {
        console.log(`   ${r}: ${c} ratings (${Math.floor(c / 6)} players)`);
    });
}

main();
