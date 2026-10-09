// Ícones simples desenhados em SVG, para não depender de nada externo.

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const IconeLista = () => (
  <svg {...base}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />
  </svg>
)

export const IconeCatalogo = () => (
  <svg {...base}>
    <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" />
    <path d="M8 7h6M8 11h6" />
  </svg>
)

export const IconeSeccoes = () => (
  <svg {...base}>
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <rect x="3" y="10" width="18" height="4" rx="1" />
    <rect x="3" y="16" width="18" height="4" rx="1" />
  </svg>
)

export const IconeConta = () => (
  <svg {...base}>
    <path d="M20 17.6A5 5 0 0 0 18 8h-1.3A8 8 0 1 0 4 16.3" />
    <path d="M12 12v9M8 17l4 4 4-4" />
  </svg>
)

export const IconeVisto = () => (
  <svg {...base} strokeWidth={3} width="18" height="18">
    <path d="M5 12l5 5 9-10" />
  </svg>
)

export const IconePega = () => (
  <svg {...base} width="22" height="22">
    <path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" strokeWidth={3} />
  </svg>
)
