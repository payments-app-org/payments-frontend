import { useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { Navigate, useParams } from 'react-router-dom'
import Breadcrumbs from '../../components/Breadcrumbs'
import { serviceDocuments } from '../../data/documents'
import { saveElementAsPdf } from '../../pdf'

// Документ из блока «Информация об оказываемых услугах»: страница в стиле приложения и «Скачать PDF»
export default function DocumentPage() {
  const { slug } = useParams()
  const doc = serviceDocuments.find((d) => d.slug === slug)
  const ref = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  if (!doc) return <Navigate to="/" replace />

  const download = async () => {
    setSaving(true)
    try {
      await saveElementAsPdf(ref.current!, `${doc.slug}.pdf`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Breadcrumbs items={[['Главная', '/'], [doc.title]]} />
      <section className="panel doc-page">
        <div className="doc-actions">
          <button type="button" className="btn-secondary" onClick={download} disabled={saving}>
            <Download size={18} /> {saving ? 'Готовим PDF…' : 'Скачать PDF'}
          </button>
        </div>
        <div ref={ref} className="doc-paper">
          <div className="doc-head">
            <span className="logo">Pay</span>
            <span className="muted small">Действует с 1 ноября 2026 года</span>
          </div>
          <h1>{doc.title}</h1>
          <p className="doc-lead">{doc.lead}</p>
          {doc.sections.map((s, i) => (
            <section key={s.title} className="doc-section">
              <h2><span>{i + 1}</span>{s.title}</h2>
              {s.text?.map((t) => <p key={t}>{t}</p>)}
              {s.table && (
                <table className="doc-table">
                  <thead>
                    <tr>{s.table.head.map((h, c) => <th key={h} style={c === 0 && s.table!.firstColWidth ? { width: s.table!.firstColWidth } : undefined}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {s.table.rows.map((r) => (
                      <tr key={r[0]}>{r.map((cell, c) => <td key={c} className={cell === '—' || cell === 'нет' ? 'muted' : undefined}>{cell}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              )}
              {s.items && <ul>{s.items.map((t) => <li key={t}>{t}</li>)}</ul>}
              {s.note && <p className="doc-note">{s.note}</p>}
            </section>
          ))}
          {doc.footnotes && (
            <div className="doc-footnotes">{doc.footnotes.map((f) => <p key={f}>{f}</p>)}</div>
          )}
          <div className="doc-foot muted small">Pay · Платежи и переводы</div>
        </div>
      </section>
    </>
  )
}
