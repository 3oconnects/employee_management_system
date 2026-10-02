import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormField, PasswordInput, TextInput } from './form'

describe('FormField', () => {
    it('associates the label with its input', () => {
        render(
            <FormField label="Email">
                <TextInput type="email" />
            </FormField>
        )
        expect(screen.getByLabelText('Email')).toHaveProperty('type', 'email')
    })

    it('wires the error to the input for assistive technology', () => {
        render(
            <FormField label="Email" error="Enter a valid email address.">
                <TextInput type="email" />
            </FormField>
        )
        const input = screen.getByLabelText('Email')
        expect(input.getAttribute('aria-invalid')).toBe('true')
        const error = screen.getByRole('alert')
        expect(error.textContent).toBe('Enter a valid email address.')
        expect(input.getAttribute('aria-describedby')).toContain(error.id)
    })

    it('shows the hint only while there is no error', () => {
        const { rerender } = render(
            <FormField label="Password" hint="At least 8 characters.">
                <TextInput />
            </FormField>
        )
        expect(screen.getByText('At least 8 characters.')).toBeTruthy()
        rerender(
            <FormField label="Password" hint="At least 8 characters." error="Too short.">
                <TextInput />
            </FormField>
        )
        expect(screen.queryByText('At least 8 characters.')).toBeNull()
    })
})

describe('PasswordInput', () => {
    it('toggles visibility with an accessible control', async () => {
        render(
            <FormField label="Password">
                <PasswordInput />
            </FormField>
        )
        const input = screen.getByLabelText('Password')
        expect(input.getAttribute('type')).toBe('password')

        await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
        expect(input.getAttribute('type')).toBe('text')

        const hide = screen.getByRole('button', { name: 'Hide password' })
        expect(hide.getAttribute('aria-pressed')).toBe('true')
    })
})
