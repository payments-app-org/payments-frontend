import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { serviceDocuments } from '../data/documents'

export default function InfoBlock() {
  return (
    <section className="panel info">
      <h2>Информация об оказываемых услугах</h2>
      <div className="docs">
        {serviceDocuments.map((d) => (
          <Link key={d.slug} className="doc" to={`/docs/${d.slug}`}>
            <FileText size={22} strokeWidth={1.5} />
            <span>{d.title}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
