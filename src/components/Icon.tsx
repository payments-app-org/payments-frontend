import {
  ArrowLeftRight, Bath, Bus, Coins, CreditCard, Ellipsis, File, FileText, Flag, Gamepad2,
  Globe, GraduationCap, HeartHandshake, MessageSquare, Percent, Phone, Plane, Radio,
  ShieldCheck, ShoppingBasket, Smartphone, Video, Wallet, type LucideIcon,
} from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  ArrowLeftRight, Bath, Bus, Coins, CreditCard, Ellipsis, File, FileText, Flag, Gamepad2,
  Globe, GraduationCap, HeartHandshake, MessageSquare, Percent, Phone, Plane, Radio,
  ShieldCheck, ShoppingBasket, Smartphone, Video, Wallet,
}

export default function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const Cmp = icons[name] ?? Ellipsis
  return <Cmp size={size} strokeWidth={1.8} />
}
