import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../../../services/api', () => ({ default: api }));

import { buildOrgTree, filterOrgTree, countNodes } from './orgTree';
import { TreeForest } from './OrgTreeLayout';
import EmployeeTreeWidget from './EmployeeTreeWidget';
import DeptTreeWidget from './DeptTreeWidget';

// reporting_manager_id is a USER id; employees are linked to it through user_id
const people = [
    { id: 'E1', user_id: 1, name: 'Sridhar', position: 'CEO', department_name: 'Management', reporting_manager_id: null },
    { id: 'E2', user_id: 2, name: 'Jegan', position: 'Marketing Head', department_name: 'Marketing', reporting_manager_id: null },
    { id: 'E3', user_id: 3, name: 'System Admin', position: 'Admin', department_name: 'Management', reporting_manager_id: 1 },
    { id: 'E4', user_id: 4, name: 'Harsha', position: 'Engineer', department_name: 'Engineering', reporting_manager_id: 3 },
    { id: 'E5', user_id: 5, name: 'Sridhar S', position: 'Data', department_name: 'Engineering', reporting_manager_id: 3 },
    { id: 'E6', user_id: 6, name: 'Ann', position: 'Engineer', department_name: 'Engineering', reporting_manager_id: 5 },
    { id: 'E7', user_id: 7, name: 'Bo', position: 'Engineer', department_name: 'Engineering', reporting_manager_id: 5 },
];

describe('buildOrgTree', () => {
    it('links people to their manager through the manager\'s user id', () => {
        const roots = buildOrgTree(people);
        expect(roots.map(r => r.name)).toEqual(['Sridhar', 'Jegan']);
        const admin = roots[0].children[0];
        expect(admin.name).toBe('System Admin');
        expect(admin.children.map(c => c.name)).toEqual(['Harsha', 'Sridhar S']);
        expect(admin.children[1].children.map(c => c.name)).toEqual(['Ann', 'Bo']);
        expect(countNodes(roots)).toBe(people.length);
    });

    it('groups people whose manager is not in the list under one stand-in manager (or leaves them at the top when told to)', () => {
        const orphans = [
            { id: 'A', user_id: 10, name: 'A', reporting_manager_id: 99, manager_name: 'Boss' },
            { id: 'B', user_id: 11, name: 'B', reporting_manager_id: 99, manager_name: 'Boss' },
        ];
        const withStandIn = buildOrgTree(orphans);
        expect(withStandIn).toHaveLength(1);
        expect(withStandIn[0].name).toBe('Boss');
        expect(withStandIn[0].children.map(c => c.name)).toEqual(['A', 'B']);
        expect(buildOrgTree(orphans, { standInManagers: false }).map(n => n.name)).toEqual(['A', 'B']);
    });

    it('survives a reporting loop and a person who reports to themselves (nobody disappears)', () => {
        const loop = [
            { id: 'A', user_id: 1, name: 'A', reporting_manager_id: 2 },
            { id: 'B', user_id: 2, name: 'B', reporting_manager_id: 1 },
            { id: 'C', user_id: 3, name: 'C', reporting_manager_id: 3 },
        ];
        const roots = buildOrgTree(loop, { standInManagers: false });
        expect(countNodes(roots)).toBe(3);
        expect(roots.length).toBeGreaterThan(0);
    });

    it('filter keeps a match and the people above it', () => {
        const out = filterOrgTree(buildOrgTree(people), 'ann');
        expect(out.map(n => n.name)).toEqual(['Sridhar']);
        expect(countNodes(out)).toBe(4);   // Sridhar > System Admin > Sridhar S > Ann
    });
});

describe('TreeForest layout', () => {
    const render1 = (n: any) => <div>{n.name}</div>;

    it('lays top-level people and siblings out in a row, not stacked', () => {
        const { container } = render(<TreeForest roots={buildOrgTree(people)} render={render1} />);
        expect(screen.getByTestId('forest').className).toMatch(/flex-row/);
        expect(screen.getByTestId('forest').className).not.toMatch(/flex-col|flex-wrap/);
        // the children of System Admin sit in one non-wrapping row
        const row = screen.getByTestId('branch-E3').querySelector(':scope > div.flex-row');
        expect(row).toBeTruthy();
        expect(row!.className).toMatch(/flex-nowrap/);
        expect(row!.children).toHaveLength(2);
        expect(container).toBeTruthy();
    });

    it('draws a bar only between siblings: first child has no left half, last has no right half, an only child a plain stub', () => {
        render(<TreeForest roots={buildOrgTree(people)} render={render1} />);
        const cells = Array.from(screen.getByTestId('branch-E3').querySelectorAll(':scope > div.flex-row > div')) as HTMLElement[];
        const bars = (el: HTMLElement) => Array.from(el.children).filter(c => (c as HTMLElement).style.height === '1px').map(c => (c as HTMLElement).style.left === '0px' ? 'left' : 'right');
        expect(bars(cells[0])).toEqual(['right']);
        expect(bars(cells[1])).toEqual(['left']);
        const only = screen.getByTestId('branch-E1').querySelector(':scope > div.flex-row > div') as HTMLElement;
        expect(bars(only)).toEqual([]);
    });
});

describe('EmployeeTreeWidget', () => {
    beforeEach(() => { api.get.mockReset(); api.get.mockResolvedValue({ data: { items: people } }); });

    it('shows every top-level person side by side and expands/collapses a branch', async () => {
        render(<EmployeeTreeWidget />);
        await waitFor(() => expect(screen.getByText('Jegan')).toBeTruthy());
        expect(screen.getByTestId('forest').children).toHaveLength(2);
        expect(screen.getByText('Harsha')).toBeTruthy();
        fireEvent.click(screen.getByText('System Admin'));
        expect(screen.queryByText('Harsha')).toBeNull();
    });

    it('search narrows to the matching path', async () => {
        render(<EmployeeTreeWidget />);
        await waitFor(() => expect(screen.getByText('Jegan')).toBeTruthy());
        fireEvent.change(screen.getByPlaceholderText('Search people…'), { target: { value: 'jegan' } });
        expect(screen.queryByText('Sridhar')).toBeNull();
        expect(screen.getByText('Jegan')).toBeTruthy();
    });
});

describe('DeptTreeWidget', () => {
    beforeEach(() => {
        api.get.mockReset();
        api.get.mockImplementation(async (url: string) => url.startsWith('/reports/departments')
            ? { data: { items: [{ name: 'Engineering', count: 4, percentage: 57 }, { name: 'Marketing', count: 1, percentage: 14 }] } }
            : { data: { items: people } });
    });

    it('finds each department\'s head from the reporting lines (it never could before)', async () => {
        render(<DeptTreeWidget />);
        await waitFor(() => expect(screen.getByText('Engineering')).toBeTruthy());
        // Engineering: Sridhar S manages Ann and Bo; Harsha reports to someone outside the department
        expect(screen.getAllByText('Head').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Marketing')).toBeTruthy();
    });

    it('opening a department shows its members as a left-to-right reporting tree', async () => {
        render(<DeptTreeWidget />);
        await waitFor(() => expect(screen.getByText('Engineering')).toBeTruthy());
        fireEvent.click(screen.getByText('Engineering'));
        expect(screen.getByText('Ann')).toBeTruthy();
        expect(screen.getByText('Bo')).toBeTruthy();
        const forest = screen.getByTestId('forest');
        expect(forest.className).toMatch(/flex-row/);
        const branch = screen.getByTestId('branch-E5');            // Sridhar S with Ann and Bo beside each other
        expect(branch.querySelector(':scope > div.flex-row')!.children).toHaveLength(2);
    });
});
