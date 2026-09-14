import React from 'react'

export default function Field({ id, label, hint, hintClass, error, children }) {
  return (
    <div className="field">
      <label className="lbl" htmlFor={id}>{label}</label>
      {children}
      {error
        ? <p id={`${id}-error`} className="ferr" role="alert">{error}</p>
        : hint ? <p id={`${id}-hint`} className={hintClass || 'hint'}>{hint}</p> : null}
    </div>
  )
}
