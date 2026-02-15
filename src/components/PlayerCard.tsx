'use client';

import SkillRadar from './SkillRadar';
import { PlayerSkills, averageSkillScore, SKILLS } from '@/lib/skills';
import { Star, Trash2 } from 'lucide-react';

interface PlayerCardProps {
    name: string;
    skills: PlayerSkills;
    voteCount: number;
    photoUrl?: string | null;
    onClick?: () => void;
    isSelected?: boolean;
    isAdmin?: boolean;
    onDelete?: () => void;
}

export default function PlayerCard({ name, skills, voteCount, photoUrl, onClick, isSelected, isAdmin, onDelete }: PlayerCardProps) {
    const avg = averageSkillScore(skills);
    const hasData = Object.values(skills).some(v => v > 0);

    return (
        <div
            onClick={onClick}
            className={`
        card-magazine !p-0 overflow-hidden cursor-pointer group
        transition-all duration-300
        ${isSelected
                    ? 'border-[var(--grafico-red)] shadow-[8px_8px_0px_var(--ink-black)] -translate-y-2'
                    : 'hover:-translate-y-1'
                }
      `}
        >
            {/* Header with initial/photo */}
            <div className="bg-[var(--ink-black)] text-white p-3 flex items-center gap-3 relative">
                {photoUrl ? (
                    <img
                        src={photoUrl}
                        alt={name}
                        className="w-10 h-10 object-cover border-2 border-[var(--grafico-red)] flex-shrink-0"
                    />
                ) : (
                    <div className="w-10 h-10 bg-[var(--grafico-red)] flex items-center justify-center font-masthead text-xl flex-shrink-0">
                        {name.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <div className="font-masthead text-lg tracking-wider truncate uppercase">
                        {name}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-white/60">
                        {voteCount > 0 ? (
                            <>{voteCount} voto{voteCount !== 1 ? 's' : ''}</>
                        ) : (
                            <>Sin evaluar</>
                        )}
                    </div>
                </div>
                {hasData && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <Star size={12} fill="var(--grafico-gold)" className="text-[var(--grafico-gold)]" />
                        <span className="font-masthead text-lg text-[var(--grafico-gold)]">{avg}</span>
                    </div>
                )}

                {/* Admin delete */}
                {isAdmin && onDelete && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                        title="Eliminar jugador"
                    >
                        <Trash2 size={12} />
                    </button>
                )}
            </div>

            {/* Radar chart */}
            <div className="p-3 flex items-center justify-center bg-white">
                <SkillRadar skills={skills} size={110} showLabels />
            </div>

            {/* Skill mini-bars */}
            <div className="px-3 pb-3 grid grid-cols-6 gap-0.5">
                {SKILLS.map(skill => {
                    const val = skills[skill.id as keyof PlayerSkills] || 0;
                    return (
                        <div key={skill.id} className="flex flex-col items-center" title={`${skill.name}: ${val || '—'}`}>
                            <div
                                className="w-full h-1 rounded-full"
                                style={{ backgroundColor: val > 0 ? skill.color : '#d1d5db' }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
