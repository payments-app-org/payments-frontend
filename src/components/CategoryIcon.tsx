import {
  ArrowLeftRight, Banknote, Briefcase, Bus, CarTaxiFront, Clapperboard, Coffee, CreditCard, Ellipsis, Gift, House,
  Package, Pill, Plane, Repeat, Shirt, ShoppingCart, Smartphone, Wifi, type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, [LucideIcon, string]> = {
  SBP_TRANSFER: [ArrowLeftRight, '#5b6cf0'],
  CARD_TRANSFER: [CreditCard, '#3b8ef0'],
  OWN_TRANSFER: [Repeat, '#7884a8'],
  SALARY: [Briefcase, '#2fa84f'],
  REWARD: [Gift, '#7884a8'],
  SUPERMARKETS: [ShoppingCart, '#f59f00'],
  CAFE: [Coffee, '#c2703d'],
  CLOTHES: [Shirt, '#d6336c'],
  MARKETPLACES: [Package, '#7048e8'],
  PHARMACY: [Pill, '#3b8ef0'],
  MOBILE: [Smartphone, '#3fb6e8'],
  INTERNET: [Wifi, '#1c7ed6'],
  UTILITIES: [House, '#868e96'],
  TAXI: [CarTaxiFront, '#fab005'],
  TRANSPORT: [Bus, '#e8590c'],
  ENTERTAINMENT: [Clapperboard, '#ae3ec9'],
  TRAVEL: [Plane, '#0ca678'],
  CASH: [Banknote, '#37b24d'],
  OTHER: [Ellipsis, '#7884a8'],
}

export default function CategoryIcon({ category }: { category: string }) {
  const [Icon, color] = ICONS[category] ?? ICONS.OTHER
  return <span className="avatar" style={{ background: color }}><Icon size={20} strokeWidth={2} /></span>
}
