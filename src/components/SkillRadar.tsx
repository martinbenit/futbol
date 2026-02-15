'use client';

import { SKILLS, PlayerSkills } from '@/lib/skills';

interface SkillRadarProps {
    skills: PlayerSkills;
    size?: number;
    showLabels?: boolean;
    className?: string;
}

export default function SkillRadar({ skills, size = 120, showLabels = false, className = '' }: SkillRadarProps) {
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2 - (showLabels ? 24 : 8);
    const angleStep = (Math.PI * 2) / SKILLS.length;

    // Generate polygon points for a given set of values (0-5)
    const getPolygonPoints = (values: number[]) => {
        return values.map((val, i) => {
            const angle = angleStep * i - Math.PI / 2;
            const r = (val / 5) * maxR;
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(' ');
    };

    const skillValues = SKILLS.map(s => skills[s.id as keyof PlayerSkills] || 0);
    const hasData = skillValues.some(v => v > 0);

    return (
        <svg width={size} height={size} className={className} viewBox={`0 0 ${size} ${size}`}>
            {/* Background grid rings */}
            {[1, 2, 3, 4, 5].map(ring => (
                <polygon
                    key={ring}
                    points={SKILLS.map((_, i) => {
                        const angle = angleStep * i - Math.PI / 2;
                        const r = (ring / 5) * maxR;
                        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
                    }).join(' ')}
                    fill="none"
                    stroke={ring === 5 ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.06)'}
                    strokeWidth={ring === 5 ? 1.5 : 0.5}
                />
            ))}

            {/* Axis lines */}
            {SKILLS.map((skill, i) => {
                const angle = angleStep * i - Math.PI / 2;
                return (
                    <line
                        key={skill.id}
                        x1={cx}
                        y1={cy}
                        x2={cx + maxR * Math.cos(angle)}
                        y2={cy + maxR * Math.sin(angle)}
                        stroke="rgba(0,0,0,0.08)"
                        strokeWidth={0.5}
                    />
                );
            })}

            {/* Data polygon */}
            {hasData && (
                <>
                    <polygon
                        points={getPolygonPoints(skillValues)}
                        fill="rgba(196, 30, 58, 0.15)"
                        stroke="var(--grafico-red)"
                        strokeWidth={2}
                        strokeLinejoin="round"
                    />
                    {/* Dots on vertices */}
                    {skillValues.map((val, i) => {
                        if (val === 0) return null;
                        const angle = angleStep * i - Math.PI / 2;
                        const r = (val / 5) * maxR;
                        return (
                            <circle
                                key={i}
                                cx={cx + r * Math.cos(angle)}
                                cy={cy + r * Math.sin(angle)}
                                r={3}
                                fill={SKILLS[i].color}
                                stroke="white"
                                strokeWidth={1.5}
                            />
                        );
                    })}
                </>
            )}

            {/* Labels */}
            {showLabels && SKILLS.map((skill, i) => {
                const angle = angleStep * i - Math.PI / 2;
                const labelR = maxR + 16;
                const x = cx + labelR * Math.cos(angle);
                const y = cy + labelR * Math.sin(angle);
                return (
                    <text
                        key={skill.id}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="text-[8px] font-bold uppercase fill-current opacity-50"
                        style={{ fontSize: showLabels ? 8 : 6 }}
                    >
                        {skill.emoji}
                    </text>
                );
            })}

            {/* No data state */}
            {!hasData && (
                <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-current opacity-20"
                    style={{ fontSize: 10, fontFamily: 'var(--font-masthead)' }}
                >
                    SIN DATA
                </text>
            )}
        </svg>
    );
}
