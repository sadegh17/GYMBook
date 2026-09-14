import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminTabs from '../AdminTabs.jsx'

const at = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <AdminTabs />
  </MemoryRouter>
)

describe('AdminTabs', () => {
  it('renders the three admin tabs', () => {
    at('/admin/users')
    expect(screen.getByRole('link', { name: 'کاربران' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'حرکات' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'برنامه‌ها' })).toBeTruthy()
  })

  it('marks the current section active via aria-current', () => {
    at('/admin/exercises')
    expect(screen.getByRole('link', { name: 'حرکات' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'کاربران' }).hasAttribute('aria-current')).toBe(false)
  })
})
