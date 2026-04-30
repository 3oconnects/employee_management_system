// ============================================================================
// EMS FRONTEND — REUSABLE UI COMPONENTS
// ============================================================================
// Shared, Zoho-inspired components for consistent UI across all modules:
//   1. DataTable     — Sortable, filterable table with pagination
//   2. Modal         — Overlay dialog
//   3. Card          — Dashboard card with icon & trend
//   4. Badge         — Status badges
//   5. Button        — Themed button variants
//   6. EmptyState    — "No data" placeholders
//   7. LoadingSpinner— Consistent loading indicator
//   8. Toast         — Notification toast container
// ============================================================================

import React, { useState, useEffect, Fragment } from 'react';
import { X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { addToastListener, showToast } from '../../hooks';

export const toast = {
    success: (msg: string) => showToast('success', msg),
    error: (msg: string) => showToast('error', msg),
    info: (msg: string) => showToast('info', msg),
    warning: (msg: string) => showToast('warning', msg),
};

// ─── BUTTON ─────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    className = '',
    disabled,
    ...props
}) => {
    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20',
        secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600',
        danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/20',
        ghost: 'hover:bg-slate-100 text-slate-600 dark:hover:bg-slate-700 dark:text-slate-300',
        outline: 'border border-slate-300 hover:bg-slate-50 text-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-2.5 text-base',
    };

    return (
        <button
            className={`
                inline-flex items-center justify-center gap-2 rounded-lg font-medium
                transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                ${variants[variant]} ${sizes[size]} ${className}
            `}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
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
    active:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    approved:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    paid:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    present:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    pending:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    draft:     'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    rejected:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    inactive:  'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
    onboarding:'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    terminated:'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-slate-100 text-slate-500',
};

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
    const color = statusColors[status.toLowerCase()] || 'bg-slate-100 text-slate-600';
    return (
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${color} ${className}`}>
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
                bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200/60
                dark:border-slate-700/50 transition-all duration-200
                ${onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800' : ''}
                ${className}
            `}
            onClick={onClick}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white truncate">{value}</p>
                    {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
                    {trend && (
                        <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {trend.value >= 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {Math.abs(trend.value)}% {trend.label}
                        </div>
                    )}
                </div>
                {icon && (
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
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
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
                {footer && (
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
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
                <Loader2 className="animate-spin text-blue-500" size={28} />
            </div>
        );
    }

    if (!data.length) {
        return (
            <div className="text-center py-16">
                <p className="text-slate-400 dark:text-slate-500 text-sm">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={`
                                    text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400
                                    uppercase tracking-wider whitespace-nowrap
                                    ${col.sortable ? 'cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200' : ''}
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {data.map((row, idx) => (
                        <tr
                            key={rowKey ? rowKey(row) : idx}
                            className={`
                                hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors
                                ${onRowClick ? 'cursor-pointer' : ''}
                            `}
                            onClick={() => onRowClick?.(row)}
                        >
                            {columns.map((col) => (
                                <td key={col.key} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                    {col.render ? col.render(row) : (row as any)[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Pagination */}
            {page && totalPages && totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Page {page} of {totalPages} {totalItems ? `(${totalItems} items)` : ''}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            disabled={page <= 1}
                            onClick={() => onPageChange?.(page - 1)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-500"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => onPageChange?.(page + 1)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-500"
                        >
                            <ChevronRight size={16} />
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
        <Loader2 className="animate-spin text-blue-500" size={28} />
        {text && <p className="text-sm text-slate-400">{text}</p>}
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
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        {icon && <div className="mb-4 text-slate-300 dark:text-slate-600">{icon}</div>}
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
        {description && <p className="mt-1 text-sm text-slate-400 dark:text-slate-500 max-w-sm">{description}</p>}
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

    const colors = {
        success: 'bg-emerald-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-amber-500',
    };

    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`
                        ${colors[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg
                        text-sm font-medium pointer-events-auto
                        animate-in slide-in-from-right-5 fade-in duration-300
                    `}
                >
                    {toast.message}
                </div>
            ))}
        </div>
    );
};
