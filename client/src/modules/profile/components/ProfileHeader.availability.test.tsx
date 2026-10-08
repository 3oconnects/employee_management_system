import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileHeader from './ProfileHeader';

const show = (status?: string) =>
    render(<ProfileHeader emp={{ name: 'Sridhar', position: 'CEO', department: 'Management', email: 's@x.test', availability_status: status }} user={{ id: 1, name: 'Sridhar' }} />);

describe('ProfileHeader availability', () => {
    it.each([
        ['busy', 'Busy'], ['available', 'Available'], ['lunch', 'At Lunch'], ['dnd', 'Do Not Disturb'], ['offline', 'Offline'],
    ])('spells out %s', (key, label) => {
        show(key);
        expect(screen.getByTestId('profile-availability').textContent).toBe(label);
    });

    it('a missing status is shown as Available, and the name row still holds name, badge and status', () => {
        show(undefined);
        expect(screen.getByTestId('profile-availability').textContent).toBe('Available');
        expect(screen.getByText('Sridhar')).toBeTruthy();
    });
});
