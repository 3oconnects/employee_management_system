import React from 'react';
import { Users, Clock, CalendarCheck, Wallet } from 'lucide-react';
import { NexusLogo, NexusMark } from '../../../components/brand/NexusLogo';
import { BRAND, copyright } from '../../../config/brand';

// Shared frame for signed-out and account-activation screens.
// Desktop: brand panel (left) + form (right). Mobile: logo, form, footer.
// The panel only describes modules that exist in the product; no metrics,
// testimonials or claims the system cannot back up.

const MODULES = [
    { icon: Users, title: 'People', text: 'Employee records, profiles and organization structure.' },
    { icon: Clock, title: 'Time', text: 'Attendance check-in and weekly timesheets.' },
    { icon: CalendarCheck, title: 'Leave and approvals', text: 'Leave requests and approval workflows.' },
    { icon: Wallet, title: 'Payroll', text: 'Salary profiles and payroll processing.' },
];

interface AuthLayoutProps {
    children: React.ReactNode;
    /** Rendered below the card (e.g. development-only helpers). */
    after?: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, after }) => (
    <div className="min-h-screen bg-nx-canvas font-nx text-nx-fg lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* ── Brand panel (desktop) ── */}
        <aside className="hidden lg:flex flex-col justify-between bg-nx-primary-hover px-12 py-10 text-white xl:px-16">
            <div className="flex items-center gap-3">
                <NexusMark size={40} inverse decorative />
                <div className="leading-tight">
                    <p className="text-lg font-semibold">{BRAND.productName}</p>
                    <p className="text-sm text-white/75">{BRAND.tagline}</p>
                </div>
            </div>

            <div className="max-w-md py-12">
                <h2 className="text-3xl font-semibold leading-tight tracking-tight">
                    Your people operations, in one place.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/85">
                    {BRAND.productName} brings employee records, time, leave, approvals and payroll together for HR
                    teams, managers and employees.
                </p>

                <ul className="mt-10 space-y-6">
                    {MODULES.map(({ icon: Icon, title, text }) => (
                        <li key={title} className="flex gap-4">
                            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15" aria-hidden>
                                <Icon size={18} />
                            </span>
                            <div>
                                <p className="text-sm font-semibold">{title}</p>
                                <p className="mt-0.5 text-sm text-white/85">{text}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <p className="text-xs text-white/75">{copyright()} · {BRAND.productName}</p>
        </aside>

        {/* ── Form column ── */}
        <div className="flex min-h-screen flex-col">
            <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
                <div className="w-full max-w-[420px]">
                    <NexusLogo size="lg" showTagline className="mb-8 justify-center lg:hidden" />
                    <div className="rounded-xl border border-nx-border bg-nx-surface p-6 shadow-nx-md sm:p-8">
                        {children}
                    </div>
                    {after}
                </div>
            </main>
            <footer className="py-6 text-center text-xs text-nx-fg-subtle lg:hidden">
                {copyright()} · {BRAND.productName}
            </footer>
        </div>
    </div>
);
