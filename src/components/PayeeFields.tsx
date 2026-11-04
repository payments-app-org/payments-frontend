import { useEffect, useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import { useProfile, type ProviderDetails, type ProviderField } from '../api'
import { flag } from '../abroad'
import { formatRub } from '../format'
import { fieldError, normalize } from '../pages/payments/BillPaymentPage'
import { formatPhone } from '../pages/payments/MobilePaymentPage'
import { Field } from './transfer'

// У операторов связи своих полей в biller нет — только номер телефона
const MOBILE_PHONE: ProviderField = {
  key: 'phone', label: 'Номер телефона', type: 'PHONE', required: true, placeholder: '+7', hint: '10 цифр', info: null,
  pattern: null, dependsOn: null, options: [], stage: 'PAY', prefill: null,
}

// Поля для шаблона и автоплатежа: платим сумму плательщика без поиска счёта. У ЖКХ Москвы («Оплатить») — поля оплаты,
// у остальных — все поля поставщика (у госуслуг и ГИС ЖКХ это данные, по которым находится плательщик)
export function payFields(details: ProviderDetails): ProviderField[] {
  if (details.provider.groupCode === 'MOBILE') return [MOBILE_PHONE]
  if (details.utility?.directPay) return details.fields.filter((f) => f.stage !== 'SEARCH')
  return details.fields
}

// Обычная форма оплаты поставщика сумму из шаблона не примет (госуслуги, поставщики с поиском счёта) —
// шаблон открываем на своей странице оплаты
export function needsTemplatePayPage(details: ProviderDetails) {
  return details.provider.groupCode === 'GOV'
    || (details.fields.some((f) => f.stage === 'SEARCH') && !details.utility?.directPay)
}

// Значения полей поставщика: подстановка из профиля, номинал, проверка и то, что уйдёт в payment
export function usePayee(details: ProviderDetails, initial?: Record<string, string>) {
  const fields = useMemo(() => payFields(details), [details])
  const profile = useProfile()
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {}
    for (const f of fields) {
      if (f.type === 'CHOICE' && f.options.length) v[f.key] = f.options[0].value
      if (f.type === 'MONTH') v[f.key] = new Date().toISOString().slice(0, 7)
    }
    for (const [k, raw] of Object.entries(initial ?? {})) {
      const f = fields.find((x) => x.key === k)
      v[k] = f?.type === 'PHONE' ? formatPhone(raw) : raw
    }
    return v
  })

  useEffect(() => {
    if (!profile) return
    const fullName = [profile.lastName, profile.firstName, profile.middleName].filter(Boolean).join(' ')
    setValues((s) => {
      const next = { ...s }
      for (const f of fields) {
        if (next[f.key]) continue
        if (f.prefill === 'USER_FULL_NAME') next[f.key] = fullName
        if (f.prefill === 'USER_PHONE' && profile.phone) next[f.key] = formatPhone(profile.phone)
      }
      return next
    })
  }, [profile, fields])

  const nominalField = fields.find((f) => f.type === 'NOMINAL') ?? null
  const nominals = nominalField
    ? details.nominals.filter((n) => !nominalField.dependsOn || n.region === values[nominalField.dependsOn]) : []
  const nominal = nominalField ? nominals.find((n) => String(n.id) === values[nominalField.key]) ?? null : null
  const errors = Object.fromEntries(fields.map((f) => [f.key, fieldError(f, values[f.key] ?? '', details.foreignMobile)]))
  const valid = Object.values(errors).every((e) => !e)

  const set = (key: string, v: string) => setValues((s) => ({ ...s, [key]: v }))
  // Что отдаём поставщику: телефон — +7XXXXXXXXXX, цифры — без пробелов
  const output = () => Object.fromEntries(fields.filter((f) => (values[f.key] ?? '').trim()).map((f) => {
    const v = values[f.key].trim()
    return [f.key, f.type === 'PHONE' ? `+${v.replace(/\D/g, '')}` : f.type === 'LOCAL_PHONE' || f.type === 'DIGITS' ? v.replace(/\D/g, '') : v]
  }))
  return { fields, values, set, errors, valid, nominalField, nominals, nominal, output, profile }
}

// Поля поставщика на форме: ввод, выбор, номиналы, месяц, телефон страны
export function PayeeFieldInputs({ payee, details, show }: {
  payee: ReturnType<typeof usePayee>; details: ProviderDetails; show: (key: string) => boolean
}) {
  const { fields, values, set, errors, nominals } = payee
  const fm = details.foreignMobile
  return (
    <>
      {fields.map((f) => {
        const err = show(f.key) ? errors[f.key] : undefined
        if (f.type === 'CHOICE' || f.type === 'NOMINAL') {
          const options = f.type === 'CHOICE'
            ? f.options.map((o) => ({ value: o.value, label: o.label, country: o.countryCode, price: null as number | null }))
            : nominals.map((n) => ({ value: String(n.id), label: n.name, country: null, price: n.price }))
          return (
            <div className="field" key={f.key}>
              <span className="field-label">{f.label}</span>
              <div className="chips">
                {options.map((o) => (
                  <button type="button" key={o.value} onClick={() => set(f.key, o.value)}
                    className={`chip-option${o.price !== null ? ' nominal' : ''}${values[f.key] === o.value ? ' active' : ''}`}>
                    {o.country && <span className="chip-flag">{flag(o.country)}</span>}
                    <span>{o.label}</span>
                    {o.price !== null && <span className="chip-price">{formatRub(o.price)}</span>}
                  </button>
                ))}
              </div>
              {err ? <span className="field-error">{err}</span> : f.hint && <span className="field-hint">{f.hint}</span>}
            </div>
          )
        }
        if (f.type === 'MONTH') {
          return (
            <Field key={f.key} label={f.label} error={err} hint={f.hint ?? undefined}>
              <input className="input" type="month" value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
            </Field>
          )
        }
        return (
          <Field key={f.key} label={f.label} error={err} hint={f.hint ?? undefined}>
            <span className={f.type === 'LOCAL_PHONE' ? 'input-wrap with-prefix' : 'input-wrap'}>
              {f.type === 'LOCAL_PHONE' && fm && <span className="input-prefix">+{fm.dialCode}</span>}
              <input className="input" placeholder={f.placeholder ?? undefined}
                inputMode={f.type === 'DIGITS' || f.type === 'LOCAL_PHONE' ? 'numeric' : f.type === 'PHONE' ? 'tel' : f.type === 'EMAIL' ? 'email' : 'text'}
                value={values[f.key] ?? ''}
                onFocus={() => { if (f.type === 'PHONE' && !values[f.key]) set(f.key, '+7') }}
                onChange={(e) => set(f.key, normalize(f, e.target.value, fm?.numberLength))} />
              {f.info && <span className="input-help" title={f.info}><Info size={20} /></span>}
            </span>
          </Field>
        )
      })}
    </>
  )
}
