import React from 'react';
import { Sun, Briefcase, HeartPulse, Clock, Sparkles } from 'lucide-react';

interface LeaveBalance {
    leave_type_id: string;
    name: string;
    annual_quota: number;
    used: number;
    pending?: number;
    available: number;
}

interface LeaveBalancesProps {
    balances: LeaveBalance[];
}

export const LeaveBalances: React.FC<LeaveBalancesProps> = ({ balances }) => {
    const defaultBalances = [
        { name: 'Casual Leave', used: 0, pending: 0, annual_quota: 12, available: 12 },
        { name: 'Sick Leave', used: 0, pending: 0, annual_quota: 10, available: 10 },
        { name: 'Earned Leave', used: 0, pending: 0, annual_quota: 15, available: 15 },
    ];

    const displayBalances = balances.length > 0 ? balances : defaultBalances;

    const totalQuota = displayBalances.reduce((acc, b) => acc + (Number(b.annual_quota) || 0), 0);
    const totalUsed = displayBalances.reduce((acc, b) => acc + (Number(b.used) || 0), 0);
    const totalPending = displayBalances.reduce((acc, b) => acc + (Number(b.pending) || 0), 0);
    const totalAvailable = displayBalances.reduce((acc, b) => acc + (Number(b.available) || 0), 0);
    const overallPct = totalQuota > 0 ? Math.round((totalAvailable / totalQuota) * 100) : 100;

    const getMeta = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('casual')) {
            return {
                icon: Sun,
                color: 'text-indigo-600',
                bg: 'bg-indigo-50 text-indigo-600',
                solid: 'bg-indigo-500',
                bar: 'from-indigo-500 to-indigo-600',
                border: 'hover:border-indigo-200',
                tag: 'Casual Balance',
            };
        }
        if (lower.includes('sick')) {
            return {
                icon: HeartPulse,
                color: 'text-rose-600',
                bg: 'bg-rose-50 text-rose-600',
                solid: 'bg-rose-500',
                bar: 'from-rose-400 to-red-500',
                border: 'hover:border-rose-200',
                tag: 'Health & Medical',
            };
        }
        if (lower.includes('earned') || lower.includes('privilege') || lower.includes('annual')) {
            return {
                icon: Briefcase,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50 text-emerald-600',
                solid: 'bg-emerald-500',
                bar: 'from-emerald-400 to-teal-500',
                border: 'hover:border-emerald-200',
                tag: 'Paid Vacation',
            };
        }
        return {
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50 text-amber-600',
            solid: 'bg-amber-500',
                bar: 'from-amber-400 to-orange-500',
            border: 'hover:border-amber-200',
            tag: 'Leave Quota',
        };
    };

    const Card: React.FC<{
        title: string; subtitle: string; value: number; unit: string; pct: number;
        Icon: React.ElementType; iconCls: string; valueCls: string; barCls: string;
    }> = ({ title, subtitle, value, unit, pct, Icon, iconCls, valueCls, barCls }) => (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconCls}`}>
                    <Icon size={18} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{title}</p>
                    <p className="text-xs text-slate-500">{subtitle}</p>
                </div>
            </div>
            <div className="flex items-baseline gap-1.5">
                <span className={`text-3xl font-bold leading-none tabular-nums ${valueCls}`}>{value}</span>
                <span className="text-sm text-slate-500">{unit}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${barCls}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
                title="Total allowance"
                subtitle={totalPending > 0 ? `${totalUsed} of ${totalQuota} used • ${totalPending} pending` : `${totalUsed} of ${totalQuota} days used`}
                value={totalAvailable}
                unit="days left"
                pct={overallPct}
                Icon={Sparkles}
                iconCls="bg-slate-100 text-slate-700"
                valueCls="text-slate-900"
                barCls="bg-slate-700"
            />
            {displayBalances.map(b => {
                const meta = getMeta(b.name);
                const available = Number(b.available) || 0;
                const quota = Number(b.annual_quota) || 0;
                const used = Number(b.used) || 0;
                const pending = Number(b.pending) || 0;
                const pct = quota > 0 ? Math.round((available / quota) * 100) : 0;
                return (
                    <Card
                        key={b.name}
                        title={b.name}
                        subtitle={pending > 0 ? `${used} of ${quota} used • ${pending} pending` : `${used} of ${quota} days used`}
                        value={available}
                        unit="days available"
                        pct={pct}
                        Icon={meta.icon}
                        iconCls={meta.bg}
                        valueCls={meta.color}
                        barCls={meta.solid}
                    />
                );
            })}
        </div>
    );
};
