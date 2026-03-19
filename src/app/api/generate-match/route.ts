import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_KEY = process.env.GOOGLE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;

// ── Models to try in order ──
const GEMINI_MODELS = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-pro',
    'gemini-1.5-flash-8b',
];

// ── Argentine barrio team names for fallback ──
const TEAM_NAMES_POOL = [
    ['Los Mismos de Siempre', 'Los que Faltan'],
    ['La Banda del Gol', 'Los Troncos FC'],
    ['Los Cracks del Potrero', 'Los Guerreros del Pozo'],
    ['La Pesada del Barrio', 'Los Pibes de la Esquina'],
    ['Los Inventados por Dios', 'Los Hijos del Rigor'],
    ['La Máquina del Pueblo', 'Los Gladiadores del Asfalto'],
    ['Los que Corren Siempre', 'Los que Piensan con los Pies'],
    ['El Rejunte Letal', 'La Cooperativa del Gol'],
    ['Los Fenómenos del Fulbito', 'Los Imparables del Potrero'],
    ['Los Muñecos del Barrio', 'Los Grosos de la Cuadra'],
    ['Los Capos de la Pelota', 'Los Picantes del Fondo'],
    ['La Topadora del Oeste', 'Los Atómicos del Sur'],
    ['Los Rústicos FC', 'Los Elegantes del Pasto'],
    ['La Scaloneta del Barrio', 'Los Bravos del Potrero'],
    ['Los Vikingos del Pasto', 'Los Titanes del Asfalto'],
    ['La Dinastía del Gol', 'Los Forjadores del Triunfo'],
];

// ── Argentine-flavored nicknames pool for fallback ──
const APODOS_GK = ['La Muralla', 'El Pulpo', 'Manos de Piedra', 'El Candado', 'San Martín del Arco'];
const APODOS_DEF = ['El Mariscal', 'El Caudillo', 'La Roca', 'El Escudero', 'El Mastín', 'El Sheriff'];
const APODOS_MID = ['El Cerebro', 'El General', 'El Motor', 'El Reloj', 'La Brújula', 'El Equilibrio'];
const APODOS_FWD = ['El As de Espadas', 'El Verdugo', 'El Peligro', 'El Oportunista', 'El Puñal', 'El Tanque'];
const APODOS_WILD = ['El Todoterreno', 'El Soldado', 'El Socio', 'El Comodín del Técnico', 'El Multiuso', 'El Camaleón'];

const FRASES_GK = ['Garantía absoluta bajo los tres palos', 'Achica y se agranda cuando importa', 'Seguridad y reflejos en el arco', 'El último bastión del equipo'];
const FRASES_DEF = ['Impasable en la cueva', 'Orden y marca en el fondo', 'Cierra todo atrás con autoridad', 'No pasa ni el viento', 'La cueva está cerrada con candado'];
const FRASES_MID = ['Maneja los tiempos del equipo', 'Ida y vuelta constante', 'Pases gol quirúrgicos', 'Distribuye como nadie', 'Rueda de auxilio en el medio'];
const FRASES_FWD = ['Olfato goleador letal', 'Gol y velocidad', 'Peligro constante en el ataque', 'No perdona frente al arco', 'Definición y gambeta'];
const FRASES_WILD = ['Aporta en todos lados', 'Apoyo constante para el equipo', 'Entrega y actitud siempre', 'Corazón y compromiso'];

// ── Differentiation strategy labels ──
const STRATEGY_PAIRS = [
    ['BALANCE DEFENSIVO: Priorizá que cada equipo tenga solidez atrás. Repartí los mejores defensores y arqueros equilibradamente.', 
     'BALANCE OFENSIVO: Priorizá que cada equipo tenga capacidad de ataque. Repartí los mejores delanteros y creativos equilibradamente.'],
    ['SERPENTEO POR RATING: Ordená los jugadores por scouting de mayor a menor y hacé serpenteo (1,4,5,8 vs 2,3,6,7) pero adaptando por posición.', 
     'REPARTO POR POSICIÓN: Primero agrupá por posición natural (arquero, defensor, mediocampista, delantero) y repartí equitativamente cada grupo.'],
    ['SOCIEDADES MIXTAS: Mezclá al mejor defensor con el mejor atacante en cada equipo. Buscá que cada equipo sea completo en todas las líneas.', 
     'POLOS OPUESTOS: Armá un equipo más sólido atrás con creatividad al medio, y otro más vertical con velocidad y ataque. Ambos competitivos.'],
    ['EQUILIBRIO PURO: Buscá la menor diferencia posible de Σ scouting entre equipos. Priorizá paridad numérica absoluta.', 
     'DINAMISMO TÁCTICO: Cada equipo con una identidad táctica diferente pero competitiva. Uno más de posesión, otro más de contra.'],
];

function pick<T>(arr: T[], seed: number): T {
    const idx = Math.floor(Math.abs(seed)) % arr.length;
    return arr[idx] ?? arr[0];
}

// ── Position analysis ──
function getPositionRole(p: any): 'arquero' | 'defensor' | 'mediocampista' | 'delantero' | 'polivalente' {
    const s = p.skills || {};
    const gk = Number(s.goalkeeping) || 0;
    const def = Number(s.defense) || 0;
    const cre = Number(s.creativity) || 0;
    const atk = Number(s.attack) || 0;
    const spd = Number(s.speed) || 0;
    const spr = Number(s.sprint) || 0;

    if (p.isGoalkeeper || gk >= 4) return 'arquero';
    if (gk >= 3.5 && gk > atk && gk > cre) return 'arquero';
    if (def >= 3.5 && def > atk) return 'defensor';
    if (cre >= 3.5 || (spd >= 3.5 && cre >= 3)) return 'mediocampista';
    if (atk >= 3.5 || spr >= 3.5) return 'delantero';
    if (def >= 3) return 'defensor';
    return 'polivalente';
}

function getPersonalizedContribution(p: any, idx: number): string {
    const role = getPositionRole(p);
    const seed = Math.round((p.name?.length || 5) * 7 + idx * 13 + (Number(p.scouting) || 3) * 11);

    let apodo: string;
    let frase: string;

    switch (role) {
        case 'arquero':
            apodo = pick(APODOS_GK, seed);
            frase = pick(FRASES_GK, seed + 3);
            break;
        case 'defensor':
            apodo = pick(APODOS_DEF, seed);
            frase = pick(FRASES_DEF, seed + 3);
            break;
        case 'mediocampista':
            apodo = pick(APODOS_MID, seed);
            frase = pick(FRASES_MID, seed + 3);
            break;
        case 'delantero':
            apodo = pick(APODOS_FWD, seed);
            frase = pick(FRASES_FWD, seed + 3);
            break;
        default:
            apodo = pick(APODOS_WILD, seed);
            frase = pick(FRASES_WILD, seed + 3);
    }

    return `${apodo || 'El Crack'}. ${frase || 'Entrega total en la cancha'}`;
}

function analyzeTeam(team: any[]): { gks: number; defs: number; mids: number; fwds: number; wilds: number; summary: string } {
    const roles = team.map(p => getPositionRole(p));
    const gks = roles.filter(r => r === 'arquero').length;
    const defs = roles.filter(r => r === 'defensor').length;
    const mids = roles.filter(r => r === 'mediocampista').length;
    const fwds = roles.filter(r => r === 'delantero').length;
    const wilds = roles.filter(r => r === 'polivalente').length;

    const parts: string[] = [];
    if (gks > 0) parts.push(`${gks} arquero${gks > 1 ? 's' : ''}`);
    if (defs > 0) parts.push(`${defs} defensor${defs > 1 ? 'es' : ''}`);
    if (mids > 0) parts.push(`${mids} medio${mids > 1 ? 's' : ''}`);
    if (fwds > 0) parts.push(`${fwds} delantero${fwds > 1 ? 's' : ''}`);
    if (wilds > 0) parts.push(`${wilds} polivalente${wilds > 1 ? 's' : ''}`);
    return { gks, defs, mids, fwds, wilds, summary: parts.join(', ') };
}

// ── Build pizarra del míster for fallback ──
function buildPizarra(team: any[], teamName: string, otherTeamName: string): string {
    const analysis = analyzeTeam(team);
    const totalScouting = team.reduce((s, p) => s + (Number(p.scouting) || 3), 0);
    const avg = (totalScouting / team.length).toFixed(2);
    const topPlayer = [...team].sort((a, b) => (Number(b.scouting) || 3) - (Number(a.scouting) || 3))[0];
    const gk = team.find(p => getPositionRole(p) === 'arquero');
    const defenders = team.filter(p => getPositionRole(p) === 'defensor');
    const mids = team.filter(p => getPositionRole(p) === 'mediocampista');
    const attackers = team.filter(p => getPositionRole(p) === 'delantero');
    const polivalentes = team.filter(p => getPositionRole(p) === 'polivalente');

    let pizarra = `${teamName} se planta con ${analysis.summary}. `;
    pizarra += `Promedio del equipo: ${avg}. `;

    if (gk) {
        pizarra += `En el arco, ${gk.name} garantiza seguridad bajo los tres palos. `;
    }

    if (topPlayer && topPlayer !== gk) {
        pizarra += `La referencia es ${topPlayer.name} (★${(Number(topPlayer.scouting) || 3).toFixed(1)}), quien marca la diferencia con su jerarquía. `;
    }

    if (defenders.length > 0) {
        pizarra += `En el fondo, ${defenders.map(p => p.name).join(' y ')} aportan marca y solidez. `;
    }

    if (mids.length > 0) {
        pizarra += `En el medio, ${mids.map(p => p.name).join(' y ')} manejan los hilos del juego con creatividad y despliegue. `;
    }

    if (attackers.length > 0) {
        pizarra += `Arriba, ${attackers.map(p => p.name).join(' y ')} tienen el gol y la gambeta para desequilibrar. `;
    }

    if (polivalentes.length > 0) {
        pizarra += `Como cartas todoterreno, ${polivalentes.map(p => p.name).join(' y ')} aportan versatilidad y sacrificio donde haga falta. `;
    }

    pizarra += `La clave contra ${otherTeamName} será no darles espacio en el medio y aprovechar las transiciones.`;

    return pizarra;
}

// ── Fisher-Yates shuffle ──
function shuffle<T>(arr: T[], seed: number): T[] {
    const result = [...arr];
    let s = Math.abs(seed);
    for (let i = result.length - 1; i > 0; i--) {
        s = (s * 1664525 + 1013904223) & 0x7fffffff; // LCG pseudo-random
        const j = s % (i + 1);
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// ── Smart fallback balancer with 2 truly different options ──
function fallbackBalance(players: any[], perTeam: number, seed?: number) {
    const now = seed || Date.now();

    // Option 1: Greedy serpenteo by rating (classic)
    function generateGreedyOption(randomSeed: number) {
        const sorted = [...players].sort((a, b) => (b.scouting || 3) - (a.scouting || 3));

        const gks = sorted.filter(p => p.isGoalkeeper || (p.skills?.goalkeeping && p.skills.goalkeeping >= 3.5));
        const nonGks = sorted.filter(p => !gks.includes(p));

        const teamA: any[] = [];
        const teamB: any[] = [];

        // Distribute GKs
        if (gks.length >= 2) {
            if (randomSeed % 2 === 0) { teamA.push(gks[0]); teamB.push(gks[1]); }
            else { teamA.push(gks[1]); teamB.push(gks[0]); }
            nonGks.push(...gks.slice(2));
        } else if (gks.length === 1) {
            (randomSeed % 2 === 0 ? teamA : teamB).push(gks[0]);
        }

        // Serpenteo: 1st to A, 2nd to B, 3rd to B, 4th to A, ...
        const remaining = nonGks.sort((a, b) => (b.scouting || 3) - (a.scouting || 3));
        let toA = true;
        for (let i = 0; i < remaining.length; i++) {
            const p = remaining[i];
            const maxA = perTeam + Math.ceil((players.length - perTeam * 2) / 2);
            const maxB = perTeam + Math.floor((players.length - perTeam * 2) / 2);

            if (teamA.length >= maxA) { teamB.push(p); continue; }
            if (teamB.length >= maxB) { teamA.push(p); continue; }

            if (toA) teamA.push(p);
            else teamB.push(p);

            // Serpenteo pattern: A, B, B, A, A, B, B, A ...
            if (i % 2 === 1) toA = !toA;
        }

        return { teamA, teamB };
    }

    // Option 2: Position-based distribution (alternate by role)
    function generatePositionOption(randomSeed: number) {
        const gks = players.filter(p => p.isGoalkeeper || (p.skills?.goalkeeping && p.skills.goalkeeping >= 3.5));
        const defs = players.filter(p => !gks.includes(p) && getPositionRole(p) === 'defensor')
            .sort((a, b) => (b.scouting || 3) - (a.scouting || 3));
        const mids = players.filter(p => !gks.includes(p) && getPositionRole(p) === 'mediocampista')
            .sort((a, b) => (b.scouting || 3) - (a.scouting || 3));
        const fwds = players.filter(p => !gks.includes(p) && getPositionRole(p) === 'delantero')
            .sort((a, b) => (b.scouting || 3) - (a.scouting || 3));
        const wilds = players.filter(p => !gks.includes(p) && getPositionRole(p) === 'polivalente')
            .sort((a, b) => (b.scouting || 3) - (a.scouting || 3));

        const teamA: any[] = [];
        const teamB: any[] = [];

        // Distribute GKs
        if (gks.length >= 2) {
            if (randomSeed % 2 === 0) { teamA.push(gks[0]); teamB.push(gks[1]); }
            else { teamA.push(gks[1]); teamB.push(gks[0]); }
        } else if (gks.length === 1) {
            (randomSeed % 2 === 0 ? teamA : teamB).push(gks[0]);
        }

        // For each position group, alternate between teams
        for (const group of [defs, mids, fwds, wilds]) {
            const shuffled = shuffle(group, randomSeed + group.length);
            shuffled.forEach((p, i) => {
                const maxA = perTeam + Math.ceil((players.length - perTeam * 2) / 2);
                const maxB = perTeam + Math.floor((players.length - perTeam * 2) / 2);
                if (teamA.length >= maxA) { teamB.push(p); return; }
                if (teamB.length >= maxB) { teamA.push(p); return; }

                if (i % 2 === 0) teamA.push(p);
                else teamB.push(p);
            });
        }

        return { teamA, teamB };
    }

    // Option 3: Full random shuffle with balance correction
    function generateShuffledOption(randomSeed: number) {
        const gks = players.filter(p => p.isGoalkeeper || (p.skills?.goalkeeping && p.skills.goalkeeping >= 3.5));
        const nonGks = shuffle(players.filter(p => !gks.includes(p)), randomSeed);

        const teamA: any[] = [];
        const teamB: any[] = [];

        // Distribute GKs
        if (gks.length >= 2) {
            if (randomSeed % 2 === 0) { teamA.push(gks[0]); teamB.push(gks[1]); }
            else { teamA.push(gks[1]); teamB.push(gks[0]); }
        } else if (gks.length === 1) {
            (randomSeed % 2 === 0 ? teamA : teamB).push(gks[0]);
        }

        // Fill by greedy sum-balance from shuffled order
        for (const p of nonGks) {
            const sumA = teamA.reduce((s, x) => s + (x.scouting || 3), 0);
            const sumB = teamB.reduce((s, x) => s + (x.scouting || 3), 0);
            const maxA = perTeam + Math.ceil((players.length - perTeam * 2) / 2);
            const maxB = perTeam + Math.floor((players.length - perTeam * 2) / 2);

            if (teamA.length >= maxA) teamB.push(p);
            else if (teamB.length >= maxB) teamA.push(p);
            else if (sumA <= sumB) teamA.push(p);
            else teamB.push(p);
        }

        return { teamA, teamB };
    }

    // Generate options using different strategies
    const strategies = [generateGreedyOption, generatePositionOption, generateShuffledOption];
    const strat1Idx = now % strategies.length;
    let strat2Idx = (strat1Idx + 1 + (now % 2)) % strategies.length;
    if (strat2Idx === strat1Idx) strat2Idx = (strat1Idx + 1) % strategies.length;

    const opt1 = strategies[strat1Idx](now);
    const opt2 = strategies[strat2Idx](now + 9999);

    // Build enriched outputs
    function buildOption(result: { teamA: any[]; teamB: any[] }, namePairIdx: number, contributionSeed: number) {
        const nameIdx = namePairIdx % TEAM_NAMES_POOL.length;
        const names = TEAM_NAMES_POOL[nameIdx];

        const sumA = +(result.teamA.reduce((s, p) => s + (p.scouting || 3), 0).toFixed(1));
        const sumB = +(result.teamB.reduce((s, p) => s + (p.scouting || 3), 0).toFixed(1));
        const delta = Math.abs(sumA - sumB).toFixed(1);

        const contributions: Record<string, string> = {};
        result.teamA.forEach((p, i) => { contributions[p.id] = getPersonalizedContribution(p, i + contributionSeed); });
        result.teamB.forEach((p, i) => { contributions[p.id] = getPersonalizedContribution(p, i + contributionSeed + 100); });

        const pizarraA = buildPizarra(result.teamA, names[0], names[1]);
        const pizarraB = buildPizarra(result.teamB, names[1], names[0]);

        return {
            teamA: result.teamA,
            teamB: result.teamB,
            names: { a: names[0], b: names[1] },
            sumA, sumB,
            justification: `Equilibrio calculado por el Motor Paniquesoapp. Σ ${sumA} vs ${sumB} (Δ ${delta}). Equipo A: ${analyzeTeam(result.teamA).summary}. Equipo B: ${analyzeTeam(result.teamB).summary}.`,
            motivation: `¡Hoy no se guarda nadie! Los dos equipos están parejos — la Σ difiere en apenas ${delta} puntos. El que gane, gana con el corazón. ¡A dejarlo todo en la cancha!`,
            contributions,
            pizarraA,
            pizarraB,
        };
    }

    const nameIdx1 = now % TEAM_NAMES_POOL.length;
    const nameIdx2 = (nameIdx1 + 3 + (now % (TEAM_NAMES_POOL.length - 1))) % TEAM_NAMES_POOL.length;

    return {
        options: [
            buildOption(opt1, nameIdx1, now),
            buildOption(opt2, nameIdx2, now + 50),
        ],
    };
}

// ── Try multiple Gemini models ──
async function callGeminiWithFallback(prompt: string, players: any[]) {
    if (!GEMINI_KEY) return null;

    const genAI = new GoogleGenerativeAI(GEMINI_KEY);

    for (const modelName of GEMINI_MODELS) {
        try {
            console.log(`Trying model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().replace(/```json|```/g, '').trim();

            let data;
            try {
                data = JSON.parse(text);
            } catch {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) data = JSON.parse(jsonMatch[0]);
                else { console.warn(`${modelName}: invalid JSON`); continue; }
            }

            if (!data?.options?.length) { console.warn(`${modelName}: empty options`); continue; }
            console.log(`✅ Success with ${modelName}`);

            return {
                options: data.options.map((opt: any) => {
                    const teamA = players.filter((p: any) => opt.teamAIds?.includes(p.id));
                    const teamB = players.filter((p: any) => opt.teamBIds?.includes(p.id));
                    // Sanitize contributions: ensure every player has a valid string
                    const rawContribs = opt.contributions || {};
                    const safeContribs: Record<string, string> = {};
                    [...teamA, ...teamB].forEach((p: any, i: number) => {
                        const val = rawContribs[p.id];
                        safeContribs[p.id] = (typeof val === 'string' && val.trim() && !val.includes('undefined'))
                            ? val
                            : getPersonalizedContribution(p, i);
                    });
                    return {
                        teamA, teamB,
                        names: opt.names,
                        sumA: opt.sumA,
                        sumB: opt.sumB,
                        justification: opt.justification,
                        motivation: opt.motivation,
                        contributions: safeContribs,
                        pizarraA: opt.pizarraA || buildPizarra(teamA, opt.names?.a || 'Equipo A', opt.names?.b || 'Equipo B'),
                        pizarraB: opt.pizarraB || buildPizarra(teamB, opt.names?.b || 'Equipo B', opt.names?.a || 'Equipo A'),
                    };
                }),
            };
        } catch (err: any) {
            const msg = err?.message || '';
            if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
                console.warn(`${modelName}: Rate limited, trying next...`);
                await new Promise(r => setTimeout(r, 1000));
            } else if (msg.includes('404') || msg.includes('not found')) {
                console.warn(`${modelName}: Not found, trying next...`);
            } else {
                console.error(`${modelName}: Error:`, msg);
            }
            continue;
        }
    }
    return null;
}

export async function POST(request: Request) {
    try {
        const { players, teamSize, extraInstructions, regenerationSeed, previousTeamAIds, previousTeamBIds } = await request.json();
        if (!players || players.length < 2) {
            return NextResponse.json({ error: 'Se necesitan al menos 2 jugadores' }, { status: 400 });
        }

        const totalPlayers = players.length;
        const perTeam = teamSize || Math.floor(totalPlayers / 2);

        const playerData = players.map((p: any) => ({
            id: p.id,
            name: p.name,
            scouting: p.scouting,
            skills: p.skills || undefined,
            isGuest: p.isGuest || false,
            isGoalkeeper: p.isGoalkeeper || false,
            similarTo: p.similarTo || undefined,
        }));

        const subs = totalPlayers - perTeam * 2;
        const subsClause = subs > 0
            ? `Hay ${subs} jugador(es) que sobra(n), repartilos como suplentes. En contributions agregales "(Suplente)" al final.`
            : '';

        // Pick differentiation strategies for the two options
        const seed = regenerationSeed || Date.now();
        const stratPairIdx = seed % STRATEGY_PAIRS.length;
        const stratPair = STRATEGY_PAIRS[stratPairIdx];

        // Build previous teams exclusion clause
        const previousTeamsClause = (previousTeamAIds?.length && previousTeamBIds?.length)
            ? `\nIMPORTANTE — FORMACIÓN PREVIA A EVITAR:
En la generación anterior, el Equipo A tenía: [${previousTeamAIds.join(', ')}] y Equipo B: [${previousTeamBIds.join(', ')}].
PROHIBIDO repetir esta misma distribución. Debés mover AL MENOS el 50% de los jugadores de campo (no arqueros) a equipos diferentes.
Generá formaciones TOTALMENTE NUEVAS y distintas.\n`
            : '';

        const prompt = `
            Sos un DT de barrio argentino, apasionado y con ojo táctico de potrero.
            Tu misión es armar el fulbito más parejo y competitivo de todos.

            ${extraInstructions ? `
⚠️ INSTRUCCIONES PRIORITARIAS DEL ORGANIZADOR (OBLIGATORIAS):
${extraInstructions}
Estas instrucciones DEBEN respetarse por encima de cualquier otra regla de balance. 
Aplicalas en TODAS las opciones generadas. Si el organizador pide jugadores juntos en un equipo, respetalo SIEMPRE.
` : ''}

            ${previousTeamsClause}

            SEMILLA DE CREATIVIDAD: ${seed}
            Usá esta semilla como inspiración para explorar formaciones creativas y distintas.

            HABILIDADES DE CADA JUGADOR (1 a 5):
            - defense: muralla, capacidad defensiva
            - speed: motor, garra y despliegue  
            - creativity: cerebro, visión y pase
            - attack: picante, definición y gol
            - goalkeeping: manos, reflejos bajo los 3 palos
            - sprint: rayo, pique corto y explosión
            - scouting: promedio general

            JUGADORES CONVOCADOS (${totalPlayers} en total, partido ${perTeam} vs ${perTeam}):
            ${JSON.stringify(playerData, null, 2)}

            ${subsClause}

            REGLAS CRÍTICAS:
            1. Σ scouting de cada equipo lo más pareja posible (diferencia ideal < 0.5, máximo 1.0).
            2. Variedad en cada equipo: defensa, medio y ataque bien repartidos.
            3. isGuest: true usa stats de "similarTo", tratalos como normales.
            4. isGoalkeeper: true VA AL ARCO obligatoriamente. Repartí un arquero por equipo si hay al menos 2.
            5. Cada equipo necesita: seguridad en el arco, solidez defensiva, creatividad en medio, peligro en ataque.

            ═══ GENERÁ EXACTAMENTE 2 OPCIONES DE VERSUS ═══
            
            🔴 REGLA DE DIFERENCIACIÓN OBLIGATORIA:
            Las dos opciones DEBEN ser SIGNIFICATIVAMENTE DIFERENTES entre sí.
            - Al menos el 50% de los jugadores de campo (no arqueros) deben cambiar de equipo entre la Opción 1 y la Opción 2.
            - NO es válido simplemente intercambiar 1 o 2 jugadores entre opciones.
            - Cada opción debe seguir un CRITERIO TÁCTICO DISTINTO:

            OPCIÓN 1 — CRITERIO: ${stratPair[0]}
            OPCIÓN 2 — CRITERIO: ${stratPair[1]}

            ${extraInstructions ? `RECORDATORIO: Las instrucciones del organizador ("${extraInstructions.substring(0, 100)}...") son PRIORITARIAS y deben cumplirse en AMBAS opciones.` : ''}

            Para cada opción:
            - NOMBRES: Estilo barrio argentino bien de potrero. Ej: "Los Mismos de Siempre", "La Pesada del Barrio", "El Rejunte Letal"
            - CONTRIBUTIONS: Un objeto con { "idJugador": "Apodo personalizado. Frase descriptiva única" }
              IMPORTANTE: Cada jugador DEBE tener un apodo ÚNICO y una frase PERSONALIZADA según sus skills.
              Ejemplo: "La Muralla. Garantía absoluta bajo los tres palos", "El Mariscal. Orden en el fondo", "El As de Espadas. Gol y velocidad"
              NO repetir frases entre jugadores. Cada descripción debe reflejar las habilidades destacadas de ESE jugador específico.
            - JUSTIFICATION: Análisis táctico de por qué están parejos. Mencioná sumas, distribución defensa/medio/ataque.
            - MOTIVATION: Frase motivacional de barrio + mini-análisis del versus.
            - PIZARRA_A: "La Pizarra del Míster" para el equipo A. Un párrafo táctico estilo crónica deportiva explicando:
              cómo se estructura el equipo, quién es la referencia, sociedades clave, debilidades y cómo explotarlas,
              y qué necesita para ganar. Como si fuera un comentarista de TyC Sports o ESPN.
            - PIZARRA_B: Lo mismo para equipo B.

            DEVOLVER ÚNICAMENTE JSON VÁLIDO:
            {
              "options": [
                {
                  "teamAIds": ["id1", "id2", ...],
                  "teamBIds": ["id3", "id4", ...],
                  "names": { "a": "Nombre A", "b": "Nombre B" },
                  "sumA": 25.3,
                  "sumB": 24.8,
                  "justification": "...",
                  "motivation": "...",
                  "contributions": { "id1": "Apodo. Frase personalizada", "id2": "...", ... },
                  "pizarraA": "Párrafo táctico equipo A...",
                  "pizarraB": "Párrafo táctico equipo B..."
                },
                { ... segunda opción con CRITERIO DISTINTO y AL MENOS 50% de jugadores en equipos diferentes ... }
              ]
            }

            NO incluir \`\`\`json ni \`\`\`. Solo el JSON puro.
        `;

        const geminiResult = await callGeminiWithFallback(prompt, players);
        if (geminiResult) return NextResponse.json(geminiResult);

        console.log('All Gemini models exhausted, using fallback');
        return NextResponse.json(fallbackBalance(players, perTeam, seed));
    } catch (err: any) {
        console.error('API route error:', err);
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
    }
}
