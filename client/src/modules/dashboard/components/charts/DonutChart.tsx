import React from 'react';

interface Segment {
    value: number;
    color: string;
    label: string;
}

interface DonutChartProps {
    segments: Segment[];
    size?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
    segments,
    size = 120
}) => {
    const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
    const r = (size - 12) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;
    let offset = 0;

    return (
        <svg width={size} height={size} className="overflow-visible">
            <circle 
                cx={cx} 
                cy={cy} 
                r={r} 
                fill="none" 
                stroke="var(--color-primary-light)" 
                strokeWidth={10} 
                className="opacity-20"
            />
            {segments.map((seg, i) => {
                const pct = seg.value / total;
                const dash = circumference * pct;
                const gap = circumference - dash;
                const el = (
                    <circle 
                        key={i} 
                        cx={cx} 
                        cy={cy} 
                        r={r} 
                        fill="none" 
                        stroke={seg.color}
                        strokeWidth={10} 
                        strokeDasharray={`${dash} ${gap}`}
                        strokeDashoffset={-offset} 
                        strokeLinecap="round"
                        transform={`rotate(-90 ${cx} ${cy})`}
                        className="transition-all duration-700 ease-out"
                    />
                );
                offset += dash;
                return el;
            })}
            <text x={cx} y={cy - 4} textAnchor="middle" className="fill-primary text-xl font-bold">{total}</text>
            <text x={cx} y={cy + 12} textAnchor="middle" className="fill-text-muted text-[9px] font-bold uppercase tracking-widest">Total</text>
        </svg>
    );
};
