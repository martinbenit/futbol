export interface SkillDef {
    id: string;
    name: string;
    emoji: string;
    desc: string;
    instruction: string;
    color: string;
}

export const SKILLS: SkillDef[] = [
    {
        id: 'defense',
        name: 'LA MURALLA',
        emoji: '🛡️',
        desc: 'Defensa',
        instruction: 'Puntúa la habilidad defensiva de cada jugador (1 = Un colador, 5 = Muralla tipo "Cuti")',
        color: '#0072BB',
    },
    {
        id: 'speed',
        name: 'EL MOTOR',
        emoji: '⚡',
        desc: 'Aguerrido / Físico',
        instruction: 'Puntúa la garra y el despliegue (1 = Juega parado, 5 = Un tractor, corre todo)',
        color: '#C41E3A',
    },
    {
        id: 'creativity',
        name: 'EL CEREBRO',
        emoji: '🧠',
        desc: 'Creatividad / Pase',
        instruction: 'Puntúa la claridad y la visión de juego (1 = La revienta, 5 = Pone pases tipo "El Bocha")',
        color: '#D4AF37',
    },
    {
        id: 'attack',
        name: 'EL PICANTE',
        emoji: '🔥',
        desc: 'Ataque / Definición',
        instruction: 'Puntúa la peligrosidad en ataque (1 = Le erra al arco, 5 = La clava en el ángulo)',
        color: '#E8511A',
    },
    {
        id: 'goalkeeping',
        name: 'VOY AL ARCO',
        emoji: '🧤',
        desc: 'Arquero',
        instruction: 'Puntúa qué tan bien ataja cada uno (1 = Manos de manteca, 5 = Nivel "Dibu")',
        color: '#2D8B46',
    },
    {
        id: 'sprint',
        name: 'EL RAYO',
        emoji: '💨',
        desc: 'Velocidad Pura',
        instruction: 'Puntúa la velocidad final del jugador (el pique corto, la explosión)',
        color: '#8B5CF6',
    },
];

export type SkillId = typeof SKILLS[number]['id'];

export interface PlayerSkills {
    defense: number;
    speed: number;
    creativity: number;
    attack: number;
    goalkeeping: number;
    sprint: number;
}

export const emptySkills = (): PlayerSkills => ({
    defense: 0,
    speed: 0,
    creativity: 0,
    attack: 0,
    goalkeeping: 0,
    sprint: 0,
});

export const averageSkillScore = (skills: PlayerSkills): number => {
    const vals = Object.values(skills);
    const nonZero = vals.filter(v => v > 0);
    if (nonZero.length === 0) return 0;
    return +(nonZero.reduce((a, b) => a + b, 0) / nonZero.length).toFixed(1);
};
