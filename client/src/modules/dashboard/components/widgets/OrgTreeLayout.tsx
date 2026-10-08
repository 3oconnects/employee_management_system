import React, { useState } from 'react';
import type { OrgNode } from './orgTree';

// A top-down tree where every level is laid out left to right. Each child draws its own piece of the
// connector (a stub up to the bar, and the bar's left/right half), so the lines always meet the cards
// exactly, whatever their width. Nothing wraps, so a wide level scrolls sideways instead of stacking.

const LINE = '#cbd5e1';
const GAP = 24;      // space between sibling subtrees (px)
const DROP = 22;     // length of the vertical connectors (px)

export interface RenderState { open: boolean; toggle: () => void; hasChildren: boolean; depth: number }

interface BranchProps {
    node: OrgNode;
    depth: number;
    render: (node: OrgNode, state: RenderState) => React.ReactNode;
    openDepth?: number;
}

export const TreeBranch: React.FC<BranchProps> = ({ node, depth, render, openDepth = 2 }) => {
    const [open, setOpen] = useState(depth < openDepth);
    const hasChildren = node.children.length > 0;
    return (
        <div className="flex flex-col items-center" data-testid={`branch-${node.id}`}>
            {render(node, { open, toggle: () => hasChildren && setOpen((o) => !o), hasChildren, depth })}
            {hasChildren && open && (
                <>
                    <div style={{ width: 1, height: DROP, background: LINE }} />
                    <div className="flex flex-row flex-nowrap items-start">
                        {node.children.map((child, i) => {
                            const only = node.children.length === 1;
                            const first = i === 0, last = i === node.children.length - 1;
                            return (
                                <div key={child.id} className="relative flex flex-col items-center" style={{ paddingTop: DROP, paddingLeft: GAP / 2, paddingRight: GAP / 2 }}>
                                    {/* stub from the bar down to this card */}
                                    {!only && <div style={{ position: 'absolute', top: 0, left: '50%', width: 1, height: DROP, background: LINE }} />}
                                    {/* this child's half(s) of the bar */}
                                    {!only && !first && <div style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: 1, background: LINE }} />}
                                    {!only && !last && <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: 1, background: LINE }} />}
                                    {only && <div style={{ position: 'absolute', top: 0, left: '50%', width: 1, height: DROP, background: LINE }} />}
                                    <TreeBranch node={child} depth={depth + 1} render={render} openDepth={openDepth} />
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

/** Several unconnected trees (people with no manager) side by side. */
export const TreeForest: React.FC<{ roots: OrgNode[]; render: BranchProps['render']; openDepth?: number }> = ({ roots, render, openDepth }) => (
    <div className="flex flex-row flex-nowrap items-start justify-center gap-10 w-max min-w-full" data-testid="forest">
        {roots.map((r) => <TreeBranch key={r.id} node={r} depth={0} render={render} openDepth={openDepth} />)}
    </div>
);
