import React, { createContext, forwardRef, useContext, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// ============================================================================
// OZOFI NEXUS — FORM PRIMITIVES (docs/nexus/DESIGN_SYSTEM.md)
// ============================================================================
// <FormField> owns the label, hint and error and wires them to its control:
// label[htmlFor] → input[id], hint/error → aria-describedby, error → aria-invalid.
//
//   <FormField label="Email" error={err}>
//       <TextInput type="email" autoComplete="email" />
//   </FormField>
// ============================================================================

interface FieldContextValue {
    id: string;
    describedBy?: string;
    invalid: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

interface FormFieldProps {
    label: React.ReactNode;
    /** Optional element aligned to the right of the label (e.g. "Forgot password?"). */
    labelAside?: React.ReactNode;
    hint?: React.ReactNode;
    error?: string | null;
    required?: boolean;
    className?: string;
    children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({ label, labelAside, hint, error, required, className = '', children }) => {
    const id = useId();
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

    return (
        <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error) }}>
            <div className={`font-nx ${className}`}>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <label htmlFor={id} className="text-sm font-medium text-nx-fg">
                        {label}
                        {required && <span className="text-nx-danger ml-0.5" aria-hidden>*</span>}
                    </label>
                    {labelAside}
                </div>
                {children}
                {hint && !error && <p id={hintId} className="mt-1.5 text-xs text-nx-fg-subtle">{hint}</p>}
                {error && <p id={errorId} className="mt-1.5 text-xs text-nx-danger" role="alert">{error}</p>}
            </div>
        </FieldContext.Provider>
    );
};

const inputBase =
    'block w-full h-10 rounded-lg border bg-nx-surface px-3 text-sm text-nx-fg font-nx ' +
    'placeholder:text-nx-fg-subtle transition-colors ' +
    'focus:outline-none focus:ring-2 focus:ring-nx-primary/25 focus:border-nx-primary ' +
    'disabled:bg-nx-surface-muted disabled:text-nx-fg-subtle disabled:cursor-not-allowed';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /** Icon rendered inside the field on the left. Decorative. */
    leadingIcon?: React.ReactNode;
    /** Element rendered inside the field on the right (e.g. a toggle button). */
    trailing?: React.ReactNode;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
    ({ leadingIcon, trailing, className = '', id, ...props }, ref) => {
        const field = useContext(FieldContext);
        const invalid = field?.invalid ?? false;
        return (
            <div className="relative">
                {leadingIcon && (
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-nx-fg-subtle" aria-hidden>
                        {leadingIcon}
                    </span>
                )}
                <input
                    ref={ref}
                    id={id ?? field?.id}
                    aria-describedby={field?.describedBy}
                    aria-invalid={invalid || undefined}
                    className={`${inputBase} ${invalid ? 'border-nx-danger' : 'border-nx-border-strong'} ${leadingIcon ? 'pl-9' : ''} ${trailing ? 'pr-10' : ''} ${className}`}
                    {...props}
                />
                {trailing && <span className="absolute right-1 top-1/2 -translate-y-1/2">{trailing}</span>}
            </div>
        );
    }
);
TextInput.displayName = 'TextInput';

type PasswordInputProps = Omit<TextInputProps, 'type' | 'trailing'>;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>((props, ref) => {
    const [visible, setVisible] = useState(false);
    return (
        <TextInput
            ref={ref}
            type={visible ? 'text' : 'password'}
            trailing={
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? 'Hide password' : 'Show password'}
                    aria-pressed={visible}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-nx-fg-subtle hover:text-nx-fg hover:bg-nx-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-primary"
                >
                    {visible ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                </button>
            }
            {...props}
        />
    );
});
PasswordInput.displayName = 'PasswordInput';
