import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import InfoBlock from '../../components/InfoBlock'
import ProviderSearch from '../../components/ProviderSearch'
import RegionSelect from '../../components/RegionSelect'

// Страница категории платежей: «‹ Назад», заголовок, регион, поиск по всем поставщикам, плитки поставщиков
export default function CategoryPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Link to="/" className="back"><ChevronLeft size={18} /> Назад</Link>
      <h1>{title}</h1>
      <RegionSelect />
      <ProviderSearch />
      {children}
      <InfoBlock />
    </>
  )
}
