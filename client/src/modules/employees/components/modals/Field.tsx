import React from 'react';
import { labelCls } from './shared';

/** Labelled field wrapper used across all modal tabs */
const Field: React.FC<{ label: string; children: React.ReactNode; col?: string }> = ({
    label, children, col = ''
}) => (
    <div className={col}>
        <label className={labelCls}>{label}</label>
        {children}
    </div>
);

export default Field;
