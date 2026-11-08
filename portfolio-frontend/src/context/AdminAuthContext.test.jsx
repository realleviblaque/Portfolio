import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from './ThemeContext.jsx'
import { AdminAuthProvider } from './AdminAuthContext.jsx'
import { AdminLoginPage } from '../pages/admin/AdminLoginPage.jsx'
import { AdminLayout } from '../layouts/AdminLayout.jsx'

const admin = { id: 'admin-1', name: 'Levi Blaque', email: 'levi@example.test', role: 'superadmin' }

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function renderAdmin(initialEntry = '/admin/login') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<AdminAuthProvider />}>
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<h1>Private dashboard content</h1>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe('admin authentication UI', () => {
  it('does not show protected content before checking the session', async () => {
    let resolveMe
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => { resolveMe = resolve })))
    renderAdmin('/admin')

    expect(screen.getByRole('status')).toHaveTextContent('Verifying administrator session')
    expect(screen.queryByText('Private dashboard content')).not.toBeInTheDocument()

    resolveMe(jsonResponse(401, { error: { message: 'Sign in to continue.' } }))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('shows backend login errors and prevents duplicate submits while loading', async () => {
    const user = userEvent.setup()
    let finishLogin
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (url === '/api/auth/me') return jsonResponse(401, { error: { message: 'Sign in to continue.' } })
      if (url === '/api/auth/csrf') return jsonResponse(200, { csrfToken: 'csrf' })
      return new Promise((resolve) => { finishLogin = resolve })
    }))
    renderAdmin()

    const submit = await screen.findByRole('button', { name: 'Sign in' })
    await user.type(screen.getByLabelText('Email'), 'levi@example.test')
    await user.type(screen.getByLabelText('Password'), 'bad-password')
    await user.click(submit)
    expect(await screen.findByRole('button', { name: 'Signing in…' })).toBeDisabled()
    finishLogin(jsonResponse(401, { error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.')
    expect(fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ credentials: 'same-origin' }))
    expect(window.localStorage.getItem('token')).toBeNull()
    expect(window.localStorage.getItem('sessionId')).toBeNull()
    expect(window.localStorage.getItem('password')).toBeNull()
    expect(window.sessionStorage.length).toBe(0)
  })

  it('signs in, loads protected content, and performs a CSRF-protected logout', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
      if (url === '/api/auth/me') return jsonResponse(401, { error: { message: 'Sign in to continue.' } })
      if (url === '/api/auth/csrf') return jsonResponse(200, { csrfToken: 'csrf-token' })
      if (url === '/api/auth/login') {
        expect(options.headers['X-CSRF-Token']).toBe('csrf-token')
        return jsonResponse(200, { admin, csrfToken: 'new-token' })
      }
      if (url === '/api/auth/logout') {
        expect(options.headers['X-CSRF-Token']).toBe('csrf-token')
        return jsonResponse(200, { message: 'Signed out.' })
      }
      throw new Error(`Unexpected request: ${url}`)
    }))
    renderAdmin()

    await screen.findByRole('button', { name: 'Sign in' })
    await user.type(screen.getByLabelText('Email'), admin.email)
    await user.type(screen.getByLabelText('Password'), 'correct-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('heading', { name: 'Private dashboard content' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST', credentials: 'same-origin' }))
  })

  it('keeps the admin view available and reports logout failure so it can be retried', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (url === '/api/auth/me') return jsonResponse(200, { admin })
      if (url === '/api/auth/csrf') return jsonResponse(200, { csrfToken: 'csrf-token' })
      return jsonResponse(503, { error: { message: 'Backend is unavailable.' } })
    }))
    renderAdmin('/admin')

    expect(await screen.findByRole('heading', { name: 'Private dashboard content' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Backend is unavailable.')
    expect(screen.getByRole('heading', { name: 'Private dashboard content' })).toBeInTheDocument()
  })

  it('clears auth state and redirects when a previously valid session expires', async () => {
    let sessionValid = true
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (url !== '/api/auth/me') return jsonResponse(200, { csrfToken: 'csrf' })
      if (sessionValid) return jsonResponse(200, { admin })
      return jsonResponse(401, { error: { message: 'Sign in to continue.' } })
    }))
    renderAdmin('/admin')

    expect(await screen.findByRole('heading', { name: 'Private dashboard content' })).toBeInTheDocument()
    sessionValid = false
    window.dispatchEvent(new Event('focus'))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByText('Private dashboard content')).not.toBeInTheDocument()
  })
})
