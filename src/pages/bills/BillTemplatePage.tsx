import { useEffect, useState, type FormEvent } from 'react'
import { Info } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ApiError, deleteSubscription, fetchProvider, fetchSubscription, fetchSubscriptions, saveSubscription, useProfile,
  type ProviderDetails, type ProviderField,
} from '../../api'
import ProviderLayout from '../../components/ProviderLayout'
import ProviderLogo from '../../components/ProviderLogo'
import { Field } from '../../components/transfer'

const NAME_MAX = 50

// Шаблон «Счета на оплату»: создание (/bills/new/:code) и редактирование (/bills/:id/edit).
// Поля — те, по которым поставщик находит счета (stage SEARCH и BOTH).
export default function BillTemplatePage() {
  const { code, id } = useParams()
  const navigate = useNavigate()
  const profile = useProfile()
  const [details, setDetails] = useState<ProviderDetails | null>(null)
  const [name, setName] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Редактирование — данные шаблона; создание — поставщик и имя «ЖКХ Москвы 2»
  useEffect(() => {
    const load = async () => {
      try {
        if (id) {
          const { subscription } = await fetchSubscription(id)
          setName(subscription.name)
          setValues(subscription.fields)
          setDetails(await fetchProvider(subscription.provider.code))
        } else if (code) {
          const [d, existing] = await Promise.all([fetchProvider(code), fetchSubscriptions()])
          setDetails(d)
          setName(`${d.provider.name} ${existing.filter((s) => s.provider.code === code).length + 1}`.slice(0, NAME_MAX))
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Не удалось загрузить')
      }
    }
    load()
  }, [code, id])

  const fields = details?.fields.filter((f) => f.stage !== 'PAY') ?? []

  // ФИО плательщика — из профиля, если поле пустое
  useEffect(() => {
    if (!profile || id) return
    const fullName = [profile.lastName, profile.firstName, profile.middleName].filter(Boolean).join(' ')
    setValues((s) => {
      const next = { ...s }
      for (const f of fields) if (!next[f.key] && f.prefill === 'USER_FULL_NAME') next[f.key] = fullName
      return next
    })
  }, [profile, details])

  if (!details) {
    return <section className="panel transfer"><div className="transfer-body muted">{error ?? 'Загружаем…'}</div></section>
  }
  const p = details.provider
  const errors = Object.fromEntries(fields.map((f) => [f.key, fieldError(f, values[f.key] ?? '')]))
  const nameErr = !name.trim() ? 'Обязательное поле' : undefined
  const valid = !nameErr && Object.values(errors).every((e) => !e)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      const clean = Object.fromEntries(fields.filter((f) => (values[f.key] ?? '').trim())
        .map((f) => [f.key, f.type === 'DIGITS' ? values[f.key].replace(/\D/g, '') : values[f.key].trim()]))
      const saved = await saveSubscription(id ?? null, { providerCode: id ? undefined : p.code, name: name.trim(), fields: clean })
      navigate(`/bills/${saved.subscription.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось сохранить шаблон')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!id || saving) return
    setSaving(true)
    try {
      await deleteSubscription(id)
      navigate('/bills', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось удалить шаблон')
      setSaving(false)
    }
  }

  return (
    <ProviderLayout logo={<ProviderLogo big name={p.name} domain={p.domain} color={p.color} country={p.countryCode} />}
      title={id ? 'Редактирование' : 'Создать новый'} subtitle={p.name}
      back={id ? [`/bills/${id}`, 'Назад'] : ['/bills', 'Счета на оплату']}>
      <form className="form" onSubmit={submit}>
        <Field label="Название шаблона" error={tried ? nameErr : undefined} hint={`${name.length}/${NAME_MAX}`}>
          <input className="input" value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} />
        </Field>
        {fields.map((f) => (
          <Field key={f.key} label={f.label} error={tried ? errors[f.key] : undefined} hint={f.hint ?? undefined}>
            <span className="input-wrap">
              <input className="input" placeholder={f.placeholder ?? undefined} inputMode={f.type === 'DIGITS' ? 'numeric' : 'text'}
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((s) => ({ ...s, [f.key]: f.type === 'DIGITS' ? e.target.value.replace(/\D/g, '').slice(0, 25) : e.target.value }))} />
              {f.info && <span className="input-help" title={f.info}><Info size={20} /></span>}
            </span>
          </Field>
        ))}
        {error && <div className="form-error">{error}</div>}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Сохраняем…' : id ? 'Сохранить' : 'Сохранить и найти счета'}
        </button>
        {id && <button type="button" className="btn-secondary" onClick={remove} disabled={saving}>Удалить</button>}
      </form>
    </ProviderLayout>
  )
}

function fieldError(f: ProviderField, raw: string) {
  const v = raw.trim()
  if (!v) return f.required ? 'Обязательное поле' : undefined
  if (f.pattern && !new RegExp(`^(?:${f.pattern})$`).test(f.type === 'DIGITS' ? v.replace(/\D/g, '') : v.replace(/\s/g, ''))) {
    return f.hint && f.hint.length < 40 ? `Проверьте поле: ${f.hint}` : 'Проверьте значение'
  }
  return undefined
}
