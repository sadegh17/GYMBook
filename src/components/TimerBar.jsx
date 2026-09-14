import React, { useEffect, useState } from 'react'
import { fa } from '../lib/calc.js'

export default function TimerBar({ defaultLen }) {
  const [len, setLen] = useState(45)
  const [left, setLeft] = useState(45)
  const [running, setRunning] = useState(false)
  const [manual, setManual] = useState(false)

  useEffect(() => {
    if (manual || !defaultLen || defaultLen <= 0) return
    setLen(defaultLen)
    if (!running) setLeft(defaultLen)
  }, [defaultLen, manual, running])

  useEffect(() => {
    if (!running) return undefined
    const id = setInterval(() => setLeft((l) => (l > 0 ? l - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    if (!running || left > 0) return
    setRunning(false)
    if (navigator.vibrate) navigator.vibrate([200, 100, 200])
    // eslint-disable-next-line no-alert
    alert('زمان استراحت تمام شد — ست بعدی!')
    setLeft(len)
  }, [running, left, len])

  const toggle = () => {
    if (running) {
      setRunning(false)
      return
    }
    if (left === 0) setLeft(len)
    setRunning(true)
  }
  const reset = () => {
    setRunning(false)
    setLeft(len)
  }
  const cycleLen = () => {
    const next = len === 45 ? 60 : len === 60 ? 30 : 45
    setManual(true)
    setLen(next)
    setRunning(false)
    setLeft(next)
  }

  const m = String(Math.floor(left / 60)).padStart(2, '0')
  const s = String(left % 60).padStart(2, '0')

  return (
    <div className="timerbar">
      <div className="in">
        <div id="clock" className={running ? 'run' : undefined}>{fa(`${m}:${s}`)}</div>
        <button type="button" className="main" onClick={toggle}>{running ? 'توقف' : 'شروع'}</button>
        <button type="button" onClick={reset}>ریست</button>
        <button type="button" onClick={cycleLen}>{fa(len)} ثانیه</button>
      </div>
    </div>
  )
}
