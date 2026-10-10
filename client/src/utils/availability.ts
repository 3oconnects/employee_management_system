// The availability statuses, defined once. A person's status is stored on the server per account;
// nothing here (or anywhere in the browser) remembers it.

export const AVAILABILITY = [
    { key: 'available', label: 'Available',      color: '#10b981', dot: 'bg-emerald-500', pulse: true,  selectable: true  },
    { key: 'busy',      label: 'Busy',           color: '#ef4444', dot: 'bg-red-500',     pulse: false, selectable: true  },
    { key: 'away',      label: 'Away',           color: '#f59e0b', dot: 'bg-amber-400',   pulse: false, selectable: false },
    { key: 'lunch',     label: 'At Lunch',       color: '#f59e0b', dot: 'bg-amber-400',   pulse: false, selectable: true  },
    { key: 'break',     label: 'On Break',       color: '#f97316', dot: 'bg-orange-400',  pulse: false, selectable: true  },
    { key: 'dnd',       label: 'Do Not Disturb', color: '#8b5cf6', dot: 'bg-violet-500',  pulse: false, selectable: true  },
    { key: 'offline',   label: 'Offline',        color: '#64748b', dot: 'bg-slate-400',   pulse: false, selectable: true  },
    { key: 'onboarding', label: 'Onboarding',    color: '#f59e0b', dot: 'bg-amber-400',   pulse: false, selectable: false },
] as const;

export type AvailabilityKey = typeof AVAILABILITY[number]['key'];

/** The presentation for a stored status; an unknown or missing value is shown as Available. */
export function availabilityOf(key?: string | null) {
    return AVAILABILITY.find((s) => s.key === key) ?? AVAILABILITY[0];
}
