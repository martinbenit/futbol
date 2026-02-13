import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

export interface BalancerPlayer {
    id: string;
    name: string;
    scouting: number;
}

export interface BalancedTeams {
    teamA: BalancerPlayer[];
    teamB: BalancerPlayer[];
    justification: string;
    motivation: string;
    names: { a: string; b: string };
}

export const balanceTeamsWithAI = async (players: BalancerPlayer[]): Promise<BalancedTeams> => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    Eres un experto en fútbol argentino, con la mística de la revista "El Gráfico".
    Tu tarea es armar dos equipos de fútbol 5/11 (dependiendo de la cantidad) lo más equilibrados y competitivos posible basados en la puntuación de scouting (1-5).
    
    Lista de jugadores disponibles:
    ${players.map(p => `${p.name} (ID: ${p.id}, Scouting: ${p.scouting})`).join("\n")}
    
    Reglas:
    1. Divide a los jugadores en dos equipos: Equipo A y Equipo B.
    2. El promedio de scouting de ambos equipos debe ser lo más cercano posible.
    3. Genera un nombre creativo y retro para cada equipo (ej: "Los Forzosos de Almagro", "La Máquina del 40").
    4. Escribe una fundamentación táctica del porqué de este versus con lenguaje futbolero argentino (picante pero profesional).
    5. Escribe un párrafo motivacional corto al estilo editorial de "El Gráfico" para el partido de hoy.
    
    Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
    {
      "teamAIds": ["id1", "id2", ...],
      "teamBIds": ["idX", "idY", ...],
      "justification": "...",
      "motivation": "...",
      "names": { "a": "Nombre A", "b": "Nombre B" }
    }
  `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
        const data = JSON.parse(text.replace(/```json|```/g, ""));
        return {
            teamA: players.filter(p => data.teamAIds.includes(p.id)),
            teamB: players.filter(p => data.teamBIds.includes(p.id)),
            justification: data.justification,
            motivation: data.motivation,
            names: data.names
        };
    } catch (e) {
        console.error("Error parsing AI response:", e);
        // Fallback: Simple alternate split if AI fails
        const sorted = [...players].sort((a, b) => b.scouting - a.scouting);
        const teamA: BalancerPlayer[] = [];
        const teamB: BalancerPlayer[] = [];
        sorted.forEach((p, i) => (i % 2 === 0 ? teamA.push(p) : teamB.push(p)));

        return {
            teamA,
            teamB,
            justification: "Equilibrio manual por falta de respuesta del agente IA.",
            motivation: "¡Hoy se juega con el corazón!",
            names: { a: "Equipo 1", b: "Equipo 2" }
        };
    }
};
