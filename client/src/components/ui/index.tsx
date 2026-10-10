// ============================================================================
// EMS FRONTEND — REUSABLE UI COMPONENTS
// ============================================================================
// Shared components for consistent UI across all modules:
//   1. DataTable     — Sortable, filterable table with pagination
//   2. Modal         — Overlay dialog
//   3. Card          — Dashboard card with icon & trend
//   4. Badge         — Status badges
//   5. Button        — Themed button variants
//   6. EmptyState    — "No data" placeholders
//   7. LoadingSpinner— Consistent loading indicator
//   8. Toast         — Notification toast container (white card + icon + progress)
//   Form primitives (FormField, TextInput, PasswordInput) and Alert live in
//   ./form.tsx and ./Alert.tsx and are re-exported below.
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
    X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
    Loader2, CheckCircle2, XCircle, Info, AlertTriangle
} from 'lucide-react';
import { addToastListener, showToast } from '../../hooks';

export * from './form';
export * from './Alert';
export { ConfirmDialog } from './ConfirmDialog';

export const toast = {
    success: (msg: string) => showToast('success', msg),
    error:   (msg: string) => showToast('error', msg),
    info:    (msg: string) => showToast('info', msg),
    warning: (msg: string) => showToast('warning', msg),
};

// ─── BUTTON ─────────────────────────────────────────────────────────────────
// Ozofi UI & Color Flow Brand Bundle button primitives.

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'destructive' | 'ghost' | 'outline' | 'success' | 'warning' | 'purple' | 'ai';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    fullWidth = false,
    className = '',
    disabled,
    type = 'button',
    ...props
}) => {
    const variants: Record<string, string> = {
        primary:     'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs',
        secondary:   'border border-slate-200/90 bg-white text-slate-800 hover:bg-[#F5F7FB] shadow-xs',
        outline:     'border border-slate-200/90 bg-transparent text-slate-700 hover:bg-slate-50',
        ghost:       'text-slate-600 hover:bg-[#F5F7FB] hover:text-slate-900',
        success:     'bg-[#65B814] hover:bg-[#529610] text-white shadow-xs',
        warning:     'bg-[#FFAA0A] hover:bg-[#D98E06] text-white shadow-xs',
        danger:      'bg-[#EF3434] hover:bg-[#DC2626] text-white shadow-xs',
        destructive: 'bg-[#EF3434] hover:bg-[#DC2626] text-white shadow-xs',
        purple:      'bg-[#8B3DFF] hover:bg-[#7828E8] text-white shadow-xs',
        ai:          'bg-[#8B3DFF] hover:bg-[#7828E8] text-white shadow-xs',
    };

    const sizes = {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-3.5 text-xs font-semibold',
        lg: 'h-10 px-4 text-sm font-semibold',
    };

    return (
        <button
            type={type}
            className={`
                inline-flex items-center justify-center gap-2 rounded-lg font-semibold
                transition-colors duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${fullWidth ? 'w-full' : ''} ${variants[variant] || variants.primary} ${sizes[size]} ${className}
            `}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            {...props}
        >
            {loading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : icon}
            {children}
        </button>
    );
};

// ─── BADGE ──────────────────────────────────────────────────────────────────

interface BadgeProps {
    status: string;
    className?: string;
}

const statusColors: Record<string, string> = {
    active:      'bg-emerald-50 text-emerald-700 border-emerald-200',
    approved:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    paid:        'bg-emerald-50 text-emerald-700 border-emerald-200',
    present:     'bg-emerald-50 text-emerald-700 border-emerald-200',
    completed:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending:     'bg-amber-50 text-amber-800 border-amber-200',
    late:        'bg-amber-50 text-amber-800 border-amber-200',
    submitted:   'bg-blue-50 text-blue-700 border-blue-200',
    draft:       'bg-slate-50 text-slate-600 border-slate-200',
    inactive:    'bg-slate-50 text-slate-500 border-slate-200',
    cancelled:   'bg-slate-50 text-slate-500 border-slate-200',
    rejected:    'bg-rose-50 text-rose-700 border-rose-200',
    terminated:  'bg-rose-50 text-rose-700 border-rose-200',
    absent:      'bg-rose-50 text-rose-700 border-rose-200',
    onboarding:  'bg-purple-50 text-purple-700 border-purple-200',
    ai:          'bg-purple-50 text-purple-700 border-purple-200',
    leave:       'bg-sky-50 text-sky-700 border-sky-200',
    regularized: 'bg-teal-50 text-teal-700 border-teal-200',
    half_day:    'bg-orange-50 text-orange-700 border-orange-200',
};

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
    const color = statusColors[status.toLowerCase()] || 'bg-slate-50 text-slate-600 border-slate-200';
    return (
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize border ${color} ${className}`}>
            {status}
        </span>
    );
};

// ─── CARD ───────────────────────────────────────────────────────────────────

interface CardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    trend?: { value: number; label: string };
    className?: string;
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ title, value, subtitle, icon, trend, className = '', onClick }) => {
    return (
        <div
            className={`
                bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs
                transition-all duration-200
                ${onClick ? 'cursor-pointer hover:shadow-sm hover:border-slate-300 hover:-translate-y-0.5' : ''}
                ${className}
            `}
            onClick={onClick}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 tracking-tight truncate">{value}</p>
                    {subtitle && <p className="mt-1 text-xs text-slate-400 font-medium">{subtitle}</p>}
                    {trend && (
                        <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${trend.value >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {trend.value >= 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {Math.abs(trend.value)}% {trend.label}
                        </div>
                    )}
                </div>
                {icon && (
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── MODAL ──────────────────────────────────────────────────────────────────

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', footer }) => {
    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
            <div className={`relative bg-white rounded-xl shadow-xl border border-slate-200/80 w-full ${sizes[size]} max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80">
                    <div className="flex items-center gap-2.5">
                        <div className="w-1 h-5 bg-[#2563EB] rounded-full" />
                        <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
                {footer && (
                    <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-end gap-2.5">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── DATA TABLE ─────────────────────────────────────────────────────────────

export interface Column<T> {
    key: string;
    header: string;
    render?: (row: T) => React.ReactNode;
    sortable?: boolean;
    width?: string;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    emptyMessage?: string;
    // Pagination
    page?: number;
    totalPages?: number;
    totalItems?: number;
    onPageChange?: (page: number) => void;
    // Sorting
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    onSort?: (column: string) => void;
    // Row actions
    onRowClick?: (row: T) => void;
    rowKey?: (row: T) => string;
}

export function DataTable<T extends Record<string, any>>({
    columns, data, loading, emptyMessage = 'No data found.',
    page, totalPages, totalItems, onPageChange,
    sortBy, sortOrder, onSort,
    onRowClick, rowKey,
}: DataTableProps<T>) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-indigo-500" size={28} />
            </div>
        );
    }

    if (!data.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-50/50 rounded-2xl border border-slate-100 my-2 mx-1">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                    <Info size={20} className="text-slate-300" />
                </div>
                <p className="text-[13px] font-semibold text-slate-500">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="bg-slate-50 border-b-2 border-slate-100">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={`
                                    text-left px-4 py-3 text-[11px] font-bold text-slate-400
                                    uppercase tracking-wider whitespace-nowrap
                                    ${col.sortable ? 'cursor-pointer select-none hover:text-slate-600 transition-colors' : ''}
                                `}
                                style={col.width ? { width: col.width } : undefined}
                                onClick={() => col.sortable && onSort?.(col.key)}
                            >
                                <span className="flex items-center gap-1">
                                    {col.header}
                                    {col.sortable && sortBy === col.key && (
                                        sortOrder === 'ASC' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                    )}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {data.map((row, idx) => (
                        <tr
                            key={rowKey ? rowKey(row) : idx}
                            className={`
                                transition-colors duration-100
                                ${idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}
                                hover:bg-indigo-50/30
                                ${onRowClick ? 'cursor-pointer' : ''}
                            `}
                            onClick={() => onRowClick?.(row)}
                        >
                            {columns.map((col) => (
                                <td key={col.key} className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                                    {col.render ? col.render(row) : (row as any)[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Pagination */}
            {page && totalPages && totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/30">
                    <p className="text-[11px] text-slate-400 font-medium">
                        Page {page} of {totalPages}{totalItems ? ` · ${totalItems} total` : ''}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            disabled={page <= 1}
                            onClick={() => onPageChange?.(page - 1)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 border border-slate-200 hover:bg-white disabled:opacity-30 transition-all"
                        >
                            <ChevronLeft size={14} /> Prev
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => onPageChange?.(page + 1)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 border border-slate-200 hover:bg-white disabled:opacity-30 transition-all"
                        >
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── LOADING SPINNER ────────────────────────────────────────────────────────

export const LoadingSpinner: React.FC<{ text?: string; className?: string }> = ({ text, className = '' }) => (
    <div className={`flex flex-col items-center justify-center py-12 gap-3 ${className}`}>
        <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-slate-100" />
            <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
        </div>
        {text && <p className="text-[13px] text-slate-400 font-medium">{text}</p>}
    </div>
);

// ─── EMPTY STATE ────────────────────────────────────────────────────────────

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-50/50 rounded-2xl border border-slate-100">
        {icon && <div className="mb-4 text-slate-300 opacity-60">{icon}</div>}
        <h3 className="text-[14px] font-semibold text-slate-600">{title}</h3>
        {description && <p className="mt-1 text-[12px] text-slate-400 max-w-sm">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
    </div>
);

// ─── TOAST CONTAINER ────────────────────────────────────────────────────────

interface ToastItem {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration: number;
}

const TOAST_ICONS = {
    success: CheckCircle2,
    error:   XCircle,
    info:    Info,
    warning: AlertTriangle,
};

const TOAST_STYLES = {
    success: { border: 'border-l-emerald-500', icon: 'text-emerald-500', bg: 'bg-emerald-50', progress: 'bg-emerald-500' },
    error:   { border: 'border-l-rose-500',    icon: 'text-rose-500',    bg: 'bg-rose-50',    progress: 'bg-rose-500'    },
    info:    { border: 'border-l-sky-500',      icon: 'text-sky-500',     bg: 'bg-sky-50',     progress: 'bg-sky-500'     },
    warning: { border: 'border-l-amber-500',   icon: 'text-amber-500',   bg: 'bg-amber-50',   progress: 'bg-amber-500'   },
};

const ToastCard: React.FC<{ item: ToastItem; onClose: () => void }> = ({ item, onClose }) => {
    const style = TOAST_STYLES[item.type];
    const Icon = TOAST_ICONS[item.type];
    const [width, setWidth] = useState(100);

    useEffect(() => {
        const start = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - start;
            const pct = Math.max(0, 100 - (elapsed / item.duration) * 100);
            setWidth(pct);
            if (pct === 0) clearInterval(interval);
        }, 50);
        return () => clearInterval(interval);
    }, [item.duration]);

    return (
        <div className={`
            relative bg-white border border-slate-200 border-l-4 ${style.border}
            rounded-xl shadow-lg overflow-hidden w-80 max-w-sm pointer-events-auto
            animate-in slide-in-from-bottom-3 fade-in duration-300
        `}>
            <div className="flex items-start gap-3 px-4 py-3.5">
                <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon size={16} className={style.icon} />
                </div>
                <p className="text-[13px] font-medium text-slate-700 flex-1 leading-snug pt-1">{item.message}</p>
                <button
                    onClick={onClose}
                    className="p-1 text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0"
                >
                    <X size={14} />
                </button>
            </div>
            <div className="h-0.5 bg-slate-100">
                <div
                    className={`h-full ${style.progress} transition-all duration-75 ease-linear`}
                    style={{ width: `${width}%` }}
                />
            </div>
        </div>
    );
};

export const ToastContainer: React.FC = () => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    useEffect(() => {
        const unsub = addToastListener((toast) => {
            setToasts(prev => [...prev, toast]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== toast.id));
            }, toast.duration);
        });
        return unsub;
    }, []);

    const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5 pointer-events-none">
            {toasts.map(t => (
                <ToastCard key={t.id} item={t} onClose={() => dismiss(t.id)} />
            ))}
        </div>
    );
};
