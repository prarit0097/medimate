import { cn } from '@/lib/utils';

interface AdherenceRingProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { dimension: 48, stroke: 4, fontSize: 'text-xs' },
  md: { dimension: 80, stroke: 6, fontSize: 'text-lg' },
  lg: { dimension: 120, stroke: 8, fontSize: 'text-2xl' },
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'hsl(var(--success))';
  if (score >= 60) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

export function AdherenceRing({ score, size = 'md', showLabel = true, className }: AdherenceRingProps) {
  const config = sizeConfig[size];
  const radius = (config.dimension - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div className="relative" style={{ width: config.dimension, height: config.dimension }}>
        <svg width={config.dimension} height={config.dimension} className="-rotate-90">
          <circle cx={config.dimension / 2} cy={config.dimension / 2} r={radius}
            fill="none" stroke="hsl(var(--muted))" strokeWidth={config.stroke} />
          <circle cx={config.dimension / 2} cy={config.dimension / 2} r={radius}
            fill="none" stroke={getScoreColor(score)} strokeWidth={config.stroke}
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" className="transition-all duration-700 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold', config.fontSize)}>{score}%</span>
        </div>
      </div>
      {showLabel && <span className="text-xs text-muted-foreground font-medium">Adherence</span>}
    </div>
  );
}
