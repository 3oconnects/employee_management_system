import React from 'react';

interface LeaveBalance {
    leave_type_id: string;
    name: string;
    annual_quota: number;
    used: number;
    available: number;
}

interface LeaveBalancesProps {
    balances: LeaveBalance[];
}

export const LeaveBalances: React.FC<LeaveBalancesProps> = ({ balances }) => {
    const defaultBalances = [
        { name: 'Casual Leave', used: 0, annual_quota: 12, available: 12 },
        { name: 'Sick Leave', used: 0, annual_quota: 10, available: 10 },
        { name: 'Earned Leave', used: 0, annual_quota: 15, available: 15 },
    ];

    const displayBalances = balances.length > 0 ? balances : defaultBalances;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayBalances.map(b => {
                const colorMap: Record<string, {text: string; bar: string}> = {
                    'Casual Leave':  { text: 'text-indigo-600', bar: 'bg-indigo-600' },
                    'Sick Leave':    { text: 'text-rose-600', bar: 'bg-rose-600' },
                    'Earned Leave':  { text: 'text-emerald-600', bar: 'bg-emerald-600' },
                };
                const style = colorMap[b.name] || { text: 'text-slate-600', bar: 'bg-slate-600' };
                
                return (
                    <div key={b.name} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">{b.name}</p>
                                <p className={`text-2xl font-black ${style.text} tracking-tight`}>{b.available}</p>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1.5 py-0.5 bg-slate-50 rounded-md">
                                    {b.used} / {b.annual_quota} USED
                                </span>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full ${style.bar} rounded-full transition-all duration-1000 ease-out`} 
                                    style={{ width: `${b.annual_quota > 0 ? (b.available/b.annual_quota)*100 : 0}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between items-center px-0.5">
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Remaining Balance</p>
                                <p className="text-[9px] text-slate-600 font-black tracking-widest">{Math.round((b.available/b.annual_quota)*100)}%</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
