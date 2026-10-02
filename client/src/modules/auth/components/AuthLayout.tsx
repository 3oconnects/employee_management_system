import React from 'react';
import { NexusLogo } from '../../../components/brand/NexusLogo';
import { BRAND, copyright } from '../../../config/brand';

// Shared frame for signed-out and account-activation screens: product identity
// on top, one focused card, quiet footer. Light, no decoration.

interface AuthLayoutProps {
    children: React.ReactNode;
    /** Rendered below the card (e.g. development-only helpers). */
    after?: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, after }) => (
    <div className="min-h-screen bg-nx-canvas font-nx text-nx-fg flex flex-col">
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-16">
            <div className="w-full max-w-[400px]">
                <NexusLogo size="lg" showTagline className="justify-center mb-8" />
                <div className="bg-nx-surface border border-nx-border rounded-xl shadow-nx-md p-6 sm:p-8">
                    {children}
                </div>
                {after}
            </div>
        </main>
        <footer className="py-6 text-center text-xs text-nx-fg-subtle">
            {copyright()} · {BRAND.productName}
        </footer>
    </div>
);
