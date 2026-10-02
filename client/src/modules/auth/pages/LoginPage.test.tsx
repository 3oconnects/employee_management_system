import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('../../../services/api', () => ({ default: { post, get: vi.fn() } }))

import LoginPage from './LoginPage'

const renderLogin = () =>
    render(
        <MemoryRouter>
            <LoginPage />
        </MemoryRouter>
    )

describe('LoginPage', () => {
    it('presents the Ozofi Nexus identity and no legacy branding', () => {
        const { container } = renderLogin()
        expect(screen.getByText('Workforce Management Platform')).toBeTruthy()
        expect(container.textContent).toContain('Ozofi')
        expect(container.textContent).toContain('Nexus')
        expect(container.textContent).not.toMatch(/AURA|PRECISIONHUB|auracore/i)
        expect(document.title).toBe('Sign in · Ozofi Nexus')
    })

    it('labels its fields and exposes the forgot-password action', () => {
        renderLogin()
        expect(screen.getByLabelText('Email')).toBeTruthy()
        expect(screen.getByLabelText('Password')).toBeTruthy()
        expect(screen.getByRole('button', { name: 'Forgot password?' })).toBeTruthy()
    })

    it('validates inline without calling the API', async () => {
        renderLogin()
        await userEvent.clear(screen.getByLabelText('Email'))
        await userEvent.clear(screen.getByLabelText('Password'))
        await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

        expect(screen.getByText('Enter your email address.')).toBeTruthy()
        expect(screen.getByText('Enter your password.')).toBeTruthy()
        expect(post).not.toHaveBeenCalled()
    })

    it('shows the server message when sign-in fails', async () => {
        post.mockRejectedValueOnce({ response: { data: { message: 'Invalid credentials.' } } })
        renderLogin()
        await userEvent.clear(screen.getByLabelText('Email'))
        await userEvent.type(screen.getByLabelText('Email'), 'someone@company.com')
        await userEvent.clear(screen.getByLabelText('Password'))
        await userEvent.type(screen.getByLabelText('Password'), 'wrong-password')
        await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

        expect(post).toHaveBeenCalledWith('/auth/login', { email: 'someone@company.com', password: 'wrong-password' })
        const alert = await screen.findByRole('alert')
        expect(alert.textContent).toContain('Invalid credentials.')
    })
})
