'use client';

import { SkillDef } from '@/lib/skills';
import { useState } from 'react';
import { Info } from 'lucide-react';

interface SkillSliderProps {
    skill: SkillDef;
    value: number;
    onChange: (value: number) => void;
    compact?: boolean;
}

export default function SkillSlider({ skill, value, onChange, compact = false }: SkillSliderProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div className={`${compact ? 'py-2' : 'py-3'}`}>
            {/* Label row with tooltip */}
            <div className="flex items-center gap-2 mb-1.5">
                <span className={compact ? 'text-lg' : 'text-2xl'}>{skill.emoji}</span>
                <span
                    className={`font-masthead tracking-wider uppercase ${compact ? 'text-xs' : 'text-sm'}`}
                    style={{ color: skill.color }}
                >
                    {skill.name}
                </span>
                <span className="text-[10px] text-black/40 font-serif italic hidden sm:inline">— {skill.desc}</span>
                {/* Info tooltip trigger */}
                <button
                    type="button"
                    className="ml-auto p-1 rounded-full hover:bg-black/5 transition-colors relative"
                    onClick={() => setShowTooltip(!showTooltip)}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    aria-label={`Info sobre ${skill.name}`}
                >
                    <Info size={14} className="text-black/40 hover:text-black/70 transition-opacity" />
                </button>
            </div>

            {/* Tooltip */}
            {showTooltip && (
                <div className="mb-2 px-3 py-2 bg-[var(--ink-black)] text-white text-xs font-serif italic rounded-sm animate-in fade-in duration-200 relative">
                    "{skill.instruction}"
                    <div className="absolute -top-1 right-4 w-2 h-2 bg-[var(--ink-black)] rotate-45" />
                </div>
            )}

            {/* Segmented bar */}
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                    <button
                        key={n}
                        type="button"
                        onClick={() => onChange(n)}
                        className={`
              flex-1 relative group transition-all duration-200
              ${compact ? 'h-8' : 'h-10'}
              border-2 rounded-sm
              ${n <= value
                                ? 'border-transparent'
                                : 'border-black/10 bg-white hover:border-black/30'
                            }
            `}
                        style={n <= value ? { backgroundColor: skill.color, borderColor: skill.color } : {}}
                        title={`${n}/5`}
                    >
                        <span
                            className={`
                absolute inset-0 flex items-center justify-center font-masthead text-sm
                transition-all
                ${n <= value ? 'text-white' : 'text-black/30 group-hover:text-black/60'}
              `}
                        >
                            {n}
                        </span>

                        {/* Active glow effect */}
                        {n === value && (
                            <span
                                className="absolute inset-0 rounded-sm animate-pulse opacity-30"
                                style={{ boxShadow: `0 0 12px ${skill.color}` }}
                            />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
