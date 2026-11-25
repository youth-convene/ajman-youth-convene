import headerImg from '../assets/header.png'
import { EVENT } from '../lib/constants'

export default function Header() {
  return (
    <header className="header">
      <img className="header-art" src={headerImg} alt={`RSC Ajman · ${EVENT.name}`} />
      <p className="header-meta">
        <span>{EVENT.dateText}</span>
        <span className="dot" aria-hidden="true" />
        <span>{EVENT.timeText}</span>
        <span className="venue">{EVENT.venue}</span>
      </p>
    </header>
  )
}
