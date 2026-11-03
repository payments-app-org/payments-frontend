import { FileText } from 'lucide-react'
import { documents } from '../data/mock'

export default function InfoBlock() {
  return (
    <section className="panel info">
      <h2>Информация об оказываемых услугах</h2>
      <div className="docs">
        {documents.map((d) => (
          <a key={d} className="doc" href="#">
            <FileText size={22} strokeWidth={1.5} />
            <span>{d}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
