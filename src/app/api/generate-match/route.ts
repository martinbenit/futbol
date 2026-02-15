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
    // Use Math.round to ensure integer seed, preventing arr[1.5] => undefined
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

    // Arquero — protagonist
    if (gk) {
        pizarra += `En el arco, ${gk.name} garantiza seguridad bajo los tres palos. `;
    }

    // Referencia — top player
    if (topPlayer && topPlayer !== gk) {
        pizarra += `La referencia es ${topPlayer.name} (★${(Number(topPlayer.scouting) || 3).toFixed(1)}), quien marca la diferencia con su jerarquía. `;
    }

    // Defensores — protagonist
    if (defenders.length > 0) {
        pizarra += `En el fondo, ${defenders.map(p => p.name).join(' y ')} aportan marca y solidez. `;
    }

    // Mediocampistas — protagonist
    if (mids.length > 0) {
        pizarra += `En el medio, ${mids.map(p => p.name).join(' y ')} manejan los hilos del juego con creatividad y despliegue. `;
    }

    // Delanteros — protagonist
    if (attackers.length > 0) {
        pizarra += `Arriba, ${attackers.map(p => p.name).join(' y ')} tienen el gol y la gambeta para desequilibrar. `;
    }

    // Polivalentes — protagonist
    if (polivalentes.length > 0) {
        pizarra += `Como cartas todoterreno, ${polivalentes.map(p => p.name).join(' y ')} aportan versatilidad y sacrificio donde haga falta. `;
    }

    pizarra += `La clave contra ${otherTeamName} será no darles espacio en el medio y aprovechar las transiciones.`;

    return pizarra;
}

// ── Smart fallback balancer with 2 options ──
function fallbackBalance(players: any[], perTeam: number) {
    function generateOption(seed: number) {
        const shuffled = [...players];

        // Randomization: swap adjacent pairs with similar scouting
        for (let i = 0; i < shuffled.length - 1; i++) {
            const swapChance = ((seed * (i + 7)) % 100) / 100;
            const scoutDiff = Math.abs((shuffled[i].scouting || 3) - (shuffled[i + 1].scouting || 3));
            if (swapChance > 0.5 && scoutDiff < 0.6) {
                [shuffled[i], shuffled[i + 1]] = [shuffled[i + 1], shuffled[i]];
            }
        }

        const sorted = [...shuffled].sort((a, b) => (b.scouting || 3) - (a.scouting || 3));

        const gks = sorted.filter(p => p.isGoalkeeper || (p.skills?.goalkeeping && p.skills.goalkeeping >= 3.5));
        const nonGks = sorted.filter(p => !gks.includes(p));

        const teamA: any[] = [];
        const teamB: any[] = [];

        if (gks.length >= 2) {
            if (seed % 2 === 0) { teamA.push(gks[0]); teamB.push(gks[1]); }
            else { teamA.push(gks[1]); teamB.push(gks[0]); }
            nonGks.push(...gks.slice(2));
        } else if (gks.length === 1) {
            (seed % 2 === 0 ? teamA : teamB).push(gks[0]);
        }

        const remaining = nonGks.sort((a, b) => (b.scouting || 3) - (a.scouting || 3));
        if (seed % 3 === 1) {
            for (let i = 0; i < remaining.length - 1; i += 2) {
                [remaining[i], remaining[i + 1]] = [remaining[i + 1], remaining[i]];
            }
        }

        for (const p of remaining) {
            const sumA = teamA.reduce((s, x) => s + (x.scouting || 3), 0);
            const sumB = teamB.reduce((s, x) => s + (x.scouting || 3), 0);
            const maxA = perTeam + Math.ceil((players.length - perTeam * 2) / 2);
            const maxB = perTeam + Math.floor((players.length - perTeam * 2) / 2);

            if (teamA.length >= maxA) teamB.push(p);
            else if (teamB.length >= maxB) teamA.push(p);
            else if (sumA <= sumB) teamA.push(p);
            else teamB.push(p);
        }

        const sumA = +(teamA.reduce((s, p) => s + (p.scouting || 3), 0).toFixed(1));
        const sumB = +(teamB.reduce((s, p) => s + (p.scouting || 3), 0).toFixed(1));
        const delta = Math.abs(sumA - sumB).toFixed(1);

        // Personalized contributions
        const contributions: Record<string, string> = {};
        teamA.forEach((p, i) => { contributions[p.id] = getPersonalizedContribution(p, i + seed); });
        teamB.forEach((p, i) => { contributions[p.id] = getPersonalizedContribution(p, i + seed + 100); });

        return { teamA, teamB, sumA, sumB, delta, contributions };
    }

    const now = Date.now();
    const nameIdx1 = now % TEAM_NAMES_POOL.length;
    const nameIdx2 = (nameIdx1 + 1 + (now % (TEAM_NAMES_POOL.length - 1))) % TEAM_NAMES_POOL.length;
    const names1 = TEAM_NAMES_POOL[nameIdx1];
    const names2 = TEAM_NAMES_POOL[nameIdx2];

    const opt1 = generateOption(now);
    const opt2 = generateOption(now + 7);

    const pizarraA1 = buildPizarra(opt1.teamA, names1[0], names1[1]);
    const pizarraB1 = buildPizarra(opt1.teamB, names1[1], names1[0]);
    const pizarraA2 = buildPizarra(opt2.teamA, names2[0], names2[1]);
    const pizarraB2 = buildPizarra(opt2.teamB, names2[1], names2[0]);

    return {
        options: [
            {
                teamA: opt1.teamA,
                teamB: opt1.teamB,
                names: { a: names1[0], b: names1[1] },
                sumA: opt1.sumA,
                sumB: opt1.sumB,
                justification: `Equilibrio calculado por el Motor Paniquesoapp. Σ ${opt1.sumA} vs ${opt1.sumB} (Δ ${opt1.delta}). Equipo A: ${analyzeTeam(opt1.teamA).summary}. Equipo B: ${analyzeTeam(opt1.teamB).summary}.`,
                motivation: `¡Hoy no se guarda nadie! Los dos equipos están parejos — la Σ difiere en apenas ${opt1.delta} puntos. El que gane, gana con el corazón. ¡A dejarlo todo en la cancha!`,
                contributions: opt1.contributions,
                pizarraA: pizarraA1,
                pizarraB: pizarraB1,
            },
            {
                teamA: opt2.teamA,
                teamB: opt2.teamB,
                names: { a: names2[0], b: names2[1] },
                sumA: opt2.sumA,
                sumB: opt2.sumB,
                justification: `Variante alternativa. Σ ${opt2.sumA} vs ${opt2.sumB} (Δ ${opt2.delta}). Equipo A: ${analyzeTeam(opt2.teamA).summary}. Equipo B: ${analyzeTeam(opt2.teamB).summary}.`,
                motivation: `¡Acá no hay equipo chico! Los dos tienen gol, marca y cerebro. El que gane, gana con el alma. ¡A la cancha!`,
                contributions: opt2.contributions,
                pizarraA: pizarraA2,
                pizarraB: pizarraB2,
            },
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
        const { players, teamSize, extraInstructions } = await request.json();
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

        const prompt = `
            Sos un DT de barrio argentino, apasionado y con ojo táctico de potrero.
            Tu misión es armar el fulbito más parejo y competitivo de todos.

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
            4. isGoalkeeper: true VA AL ARCO obligatoriamente. Repartí un arquero por equipo.
            5. Cada equipo necesita: seguridad en el arco, solidez defensiva, creatividad en medio, peligro en ataque.

            GENERÁ EXACTAMENTE 2 OPCIONES DE VERSUS DIFERENTES (equipos distintos entre sí).

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
                { ... segunda opción ... }
              ]
            }

            ${extraInstructions ? `\nINSTRUCCIONES EXTRA DEL ORGANIZADOR:\n${extraInstructions}\n` : ''}

            NO incluir \`\`\`json ni \`\`\`. Solo el JSON puro.
        `;

        const geminiResult = await callGeminiWithFallback(prompt, players);
        if (geminiResult) return NextResponse.json(geminiResult);

        console.log('All Gemini models exhausted, using fallback');
        return NextResponse.json(fallbackBalance(players, perTeam));
    } catch (err: any) {
        console.error('API route error:', err);
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
    }
}
