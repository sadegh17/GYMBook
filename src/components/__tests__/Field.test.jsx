import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Field from '../Field.jsx'

describe('Field', () => {
  it('renders a label linked to the control via htmlFor', () => {
    render(
      <Field id="x" label="نام">
        <input id="x" />
      </Field>
    )
    expect(screen.getByLabelText('نام').id).toBe('x')
  })

  it('shows error with alert role and error id, hiding the hint', () => {
    render(
      <Field id="x" label="نام" hint="راهنما" error="خطای تست">
        <input id="x" />
      </Field>
    )
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('خطای تست')
    expect(alert.id).toBe('x-error')
    expect(screen.queryByText('راهنما')).toBeNull()
  })

  it('shows hint (not error) when no error', () => {
    render(
      <Field id="x" label="نام" hint="راهنما">
        <input id="x" />
      </Field>
    )
    const hint = screen.getByText('راهنما')
    expect(hint.id).toBe('x-hint')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('applies hintClass to the hint element', () => {
    render(
      <Field id="x" label="نام" hint="✓ یکسان" hintClass="match good">
        <input id="x" />
      </Field>
    )
    expect(screen.getByText('✓ یکسان').className).toBe('match good')
  })
})
