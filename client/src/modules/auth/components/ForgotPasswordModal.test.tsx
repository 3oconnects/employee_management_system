import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const { post, get } = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }))
vi.mock('../../../services/api', () => ({ default: { post, get } }))

import { ForgotPasswordModal } from './ForgotPasswordModal'
import LoginPage from '../pages/LoginPage'
import { readResetTokenFromHash } from '../utils/resetToken'

const GENERIC = 'If an account exists for that email, we have sent a password reset link. It is valid for 30 minutes.'
const TOKEN = 'abcDEF0123456789_-abcDEF0123456789_-abc'

beforeEach(() => {
    post.mockReset()
    get.mockReset()
    window.history.replaceState(null, '', '/')
})

const renderModal = (props: Partial<React.ComponentProps<typeof ForgotPasswordModal>> = {}) =>
    render(<ForgotPasswordModal isOpen onClose={() => undefined} {...props} />)

describe('ForgotPasswordModal: request step', () => {
    it('sends only the email and shows the generic confirmation', async () => {
        post.mockResolvedValueOnce({ data: { success: true, message: GENERIC } })
        renderModal()
        await userEvent.type(screen.getByLabelText('Work email'), 'someone@company.com')
        await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

        expect(post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'someone@company.com' })
        expect((await screen.findByRole('status')).textContent).toContain('If an account exists')
    })

    it('never polls a status endpoint, and offers no "reason" or approval wording', async () => {
        post.mockResolvedValueOnce({ data: { success: true, message: GENERIC } })
        const { container } = renderModal()
        expect(container.textContent).not.toMatch(/approv|administrator|reason/i)
        await userEvent.type(screen.getByLabelText('Work email'), 'someone@company.com')
        await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
        await screen.findByRole('status')
        expect(get).not.toHaveBeenCalled()
    })

    it('does not call the API without an email', async () => {
        renderModal()
        await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
        expect(post).not.toHaveBeenCalled()
        expect((await screen.findByRole('alert')).textContent).toContain('Enter your work email')
    })
})

describe('ForgotPasswordModal: reset step (opened from the emailed link)', () => {
    it('opens on the reset step and posts the token with the new password', async () => {
        post.mockResolvedValueOnce({ data: { success: true } })
        renderModal({ resetToken: TOKEN })
        expect(screen.getByRole('heading', { name: 'Set a new password' })).toBeTruthy()

        await userEvent.type(screen.getByLabelText('New password'), 'Brand-New-1!')
        await userEvent.type(screen.getByLabelText('Confirm new password'), 'Brand-New-1!')
        await userEvent.click(screen.getByRole('button', { name: 'Save new password' }))

        expect(post).toHaveBeenCalledWith('/auth/reset-password', { token: TOKEN, newPassword: 'Brand-New-1!' })
        expect(await screen.findByRole('heading', { name: 'Password updated' })).toBeTruthy()
    })

    it('rejects mismatched passwords locally without calling the API', async () => {
        renderModal({ resetToken: TOKEN })
        await userEvent.type(screen.getByLabelText('New password'), 'Brand-New-1!')
        await userEvent.type(screen.getByLabelText('Confirm new password'), 'Different-1!')
        await userEvent.click(screen.getByRole('button', { name: 'Save new password' }))
        expect(post).not.toHaveBeenCalled()
        expect((await screen.findByRole('alert')).textContent).toContain('do not match')
    })

    it('shows the server message for an invalid or expired link and offers a new link', async () => {
        post.mockRejectedValueOnce({ message: 'This password reset link is invalid or has expired. Please request a new one.' })
        renderModal({ resetToken: TOKEN })
        await userEvent.type(screen.getByLabelText('New password'), 'Brand-New-1!')
        await userEvent.type(screen.getByLabelText('Confirm new password'), 'Brand-New-1!')
        await userEvent.click(screen.getByRole('button', { name: 'Save new password' }))

        expect((await screen.findByRole('alert')).textContent).toContain('invalid or has expired')
        await userEvent.click(screen.getByRole('button', { name: 'Request a new link' }))
        expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeTruthy()
    })
})

describe('reset link handling on the login page', () => {
    it('reads a well-formed token from the URL fragment and ignores anything else', () => {
        expect(readResetTokenFromHash(`#reset_token=${TOKEN}`)).toBe(TOKEN)
        expect(readResetTokenFromHash('')).toBeNull()
        expect(readResetTokenFromHash('#reset_token=short')).toBeNull()
        expect(readResetTokenFromHash('#reset_token=<script>alert(1)</script>')).toBeNull()
        expect(readResetTokenFromHash('#other=1')).toBeNull()
    })

    it('opens the reset step from the link and removes the token from the address bar', async () => {
        window.history.replaceState(null, '', `/login#reset_token=${TOKEN}`)
        render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>,
        )
        expect(await screen.findByRole('heading', { name: 'Set a new password' })).toBeTruthy()
        expect(window.location.hash).toBe('')
        expect(window.location.href).not.toContain(TOKEN)
    })

    it('forgets the token once the dialog is closed (a link token is single-use)', async () => {
        window.history.replaceState(null, '', `/login#reset_token=${TOKEN}`)
        render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>,
        )
        await screen.findByRole('heading', { name: 'Set a new password' })
        await userEvent.click(screen.getByRole('button', { name: 'Close' }))
        await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }))
        expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeTruthy()
    })
})
