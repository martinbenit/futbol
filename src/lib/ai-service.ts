import { GoogleGenerativeAI } from "@google/generative-ai";

export interface PlayerSkillsData {
    defense: number;
    speed: number;
    creativity: number;
    attack: number;
    goalkeeping: number;
    sprint: number;
}

export interface BalancerPlayer {
    id: string;
    name: string;
    scouting: number;
    isGuest?: boolean;
    skills?: PlayerSkillsData;
}

export interface TeamOption {
    teamA: BalancerPlayer[];
    teamB: BalancerPlayer[];
    names: { a: string; b: string };
    justification: string;
    contributions: { [playerId: string]: string };
    motivation: string;
}

export interface BalancedTeams {
    options: TeamOption[];
}

class AIService {
    private geminiAI: GoogleGenerativeAI | null = null;

    constructor() {
        const key = process.env.GOOGLE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
        if (key) {
            this.geminiAI = new GoogleGenerativeAI(key);
        }
    }

    async balanceTeams(players: BalancerPlayer[]): Promise<BalancedTeams> {
        if (!this.geminiAI) return this.fallbackBalance(players);

        try {
            return await this.callGemini(players);
        } catch (error) {
            console.error("Gemini Error:", error);
            return this.fallbackBalance(players);
        }
    }

    private async callGemini(players: BalancerPlayer[]): Promise<BalancedTeams> {
        const model = this.geminiAI!.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = this.getBalancerPrompt(players);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const data = JSON.parse(text.replace(/```json|```/g, ""));

        return {
            options: data.options.map((opt: any) => ({
                teamA: players.filter(p => opt.teamAIds.includes(p.id)),
                teamB: players.filter(p => opt.teamBIds.includes(p.id)),
                justification: opt.justification,
                motivation: opt.motivation,
                names: opt.names,
                contributions: opt.contributions
            }))
        };
    }

    private getBalancerPrompt(players: BalancerPlayer[]): string {
        const hasSkills = players.some(p => p.skills && Object.values(p.skills).some(v => v > 0));

        const playerData = players.map(p => {
            const base: any = { id: p.id, name: p.name, scouting: p.scouting };
            if (hasSkills && p.skills) {
                base.skills = p.skills;
            }
            return base;
        });

        const skillContext = hasSkills
            ? `Cada jugador tiene habilidades desglosadas:
            - defense: capacidad defensiva (1-5)
            - speed: despliegue y velocidad (1-5)
            - creativity: creatividad y pase (1-5)
            - attack: ataque y definición (1-5)
            - goalkeeping: habilidad de arquero (1-5)
            - sprint: pique corto y explosión (1-5)
            
            IMPORTANTE: Usá estas habilidades para equilibrar los equipos. No pongas a todos los rápidos o a todos los defensores en el mismo equipo. Buscá diversidad táctica en cada equipo.`
            : `Cada jugador tiene un nivel de scouting general del 1 al 5.`;

        return `
            Actuá como un editor experto de la revista 'El Gráfico' de los años 70.
            Tu misión es balancear un partido de fútbol amateur.
            
            ${skillContext}
            
            JUGADORES DISPONIBLES:
            ${JSON.stringify(playerData)}

            REQUERIMIENTOS:
            1. Generá exactamente 2 OPCIONES de versus equilibrados (Opción 1 y Opción 2).
            2. Inventá nombres de equipos épicos y futboleros para cada opción (Ej: "La Máquina de Caballito", "Los Gladiadores del Asfalto").
            3. Para cada opción, escribí una JUSTIFICACIÓN táctica de por qué los equipos están parejos.
            4. Para cada opción, escribí una MOTIVACIÓN corta y pasional estilo argentino para enviar por WhatsApp.
            5. Para cada jugador en cada opción, definí su APORTE INDIVIDUAL conciso (Ej: "Corte y distribución", "Garra en el fondo", "Olfato de gol").

            DEVOLVER ÚNICAMENTE JSON CON ESTE FORMATO:
            {
              "options": [
                {
                  "teamAIds": ["id1", "id2"],
                  "teamBIds": ["id3", "id4"],
                  "names": { "a": "Nombre A", "b": "Nombre B" },
                  "justification": "...",
                  "motivation": "...",
                  "contributions": { "id1": "aporte", "id2": "aporte"... }
                },
                ... (2da opción)
              ]
            }
        `;
    }

    private fallbackBalance(players: BalancerPlayer[]): BalancedTeams {
        const sorted = [...players].sort((a, b) => b.scouting - a.scouting);
        const opt1A: BalancerPlayer[] = [];
        const opt1B: BalancerPlayer[] = [];
        sorted.forEach((p, i) => (i % 2 === 0 ? opt1A.push(p) : opt1B.push(p)));

        const option: TeamOption = {
            teamA: opt1A,
            teamB: opt1B,
            justification: "Equilibrio manual (Fallabck Engine). Basado puramente en promedios numéricos.",
            motivation: "¡La pelota no se mancha! ¡A la cancha!",
            names: { a: "Combinado Local", b: "Resto del Mundo" },
            contributions: players.reduce((acc: any, p) => ({ ...acc, [p.id]: "Presencia y despliegue" }), {})
        };

        return { options: [option] };
    }
}

export const aiService = new AIService();
