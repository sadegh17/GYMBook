import React, { useState } from 'react'
import { fa, calcKcal } from '../lib/calc.js'

export default function ExerciseCard({ item, exercise, index, done, check, weightKg, onToggle }) {
  const [failed, setFailed] = useState(false)
  const predicted = weightKg != null ? calcKcal(exercise, item, weightKg) : null
  const kcalText = done
    ? `${fa(check ? check.kcal : (predicted ?? 0))} کیلوکالری`
    : (predicted != null ? `≈${fa(predicted)} کیلوکالری` : '')
  return (
    <div className={'ex' + (done ? ' done' : '')}>
      <div className="row">
        <div className="num">{fa(index)}</div>
        <div className="meta">
          <h3>{exercise?.name_fa ?? ''}</h3>
          {exercise?.name_en ? <p className="en">{exercise?.name_en}</p> : null}
          <div className="tags">
            <span className="tag g">{fa(item.sets)} ست</span>
            <span className="tag">{fa(item.reps)} تکرار</span>
            <span className="tag y">استراحت {fa(item.rest_sec)} ثانیه</span>
          </div>
          {kcalText && <div className="kcal">{kcalText}</div>}
        </div>
        <button type="button" className="check" aria-label="تکمیل شد" onClick={onToggle}>✓</button>
      </div>
      <div className={'gifbox' + (failed ? ' failed' : '')}>
        <img src={exercise?.gif_url} alt={exercise?.name_fa ?? ''} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
        <div className="ph">
          تصویر متحرک بارگذاری نشد.<br />
          <a href={exercise?.page_url} target="_blank" rel="noopener">مشاهده حرکت در سایت ↗</a>
        </div>
      </div>
      {exercise?.how_to ? (
        <div className="how">
          <span dangerouslySetInnerHTML={{ __html: exercise.how_to }} />
          {exercise.tip ? <p className="tip">نکته: {exercise.tip}</p> : null}
        </div>
      ) : null}
    </div>
  )
}