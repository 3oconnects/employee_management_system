import React from 'react';

interface MiniBarChartProps {
    data: number[];
    color?: string;
    height?: number;
}

export const MiniBarChart: React.FC<MiniBarChartProps> = ({
    data,
    color = 'var(--color-primary-soft)',
    height = 48
}) => {
    if (!data.length) return null;
    const max = Math.max(...data, 1);
    const w = 100 / data.length;
    
    return (
        <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
            {data.map((v, i) => {
                const barH = (v / max) * (height - 4);
                return (
                    <rect 
                        key={i} 
                        x={i * w + 0.5} 
                        y={height - barH} 
                        width={w - 1} 
                        height={barH}
                        rx={1.5} 
                        fill={color} 
                        className="opacity-80 hover:opacity-100 transition-opacity" 
                    />
                );
            })}
        </svg>
    );
};
