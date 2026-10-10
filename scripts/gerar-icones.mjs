// Gera os ícones PNG da aplicação (fundo azul com um visto amarelo claro), sem
// depender de programas de imagem. Correr com: npm run icones
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const AZUL = [0x07, 0x2a, 0x5e]
const AMARELO = [0xff, 0xfe, 0xfa]

function distanciaSegmento(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function desenhar(tamanho, cantoArredondado) {
  const s = tamanho
  const raio = cantoArredondado ? s * 0.22 : 0
  const traco = s * 0.075
  // Visto: dois segmentos, em coordenadas relativas.
  const p1 = [0.27 * s, 0.52 * s]
  const p2 = [0.43 * s, 0.68 * s]
  const p3 = [0.74 * s, 0.34 * s]
  const linhas = []
  for (let y = 0; y < s; y++) {
    const linha = Buffer.alloc(1 + s * 4)
    for (let x = 0; x < s; x++) {
      const cx = x + 0.5
      const cy = y + 0.5
      // Fora dos cantos arredondados fica transparente.
      let dentro = true
      if (raio > 0) {
        const qx = Math.max(raio - cx, 0, cx - (s - raio))
        const qy = Math.max(raio - cy, 0, cy - (s - raio))
        dentro = Math.hypot(qx, qy) <= raio
      }
      const d = Math.min(distanciaSegmento(cx, cy, ...p1, ...p2), distanciaSegmento(cx, cy, ...p2, ...p3))
      const cobertura = Math.max(0, Math.min(1, traco - d + 0.5))
      const cor = AZUL.map((v, i) => Math.round(v + (AMARELO[i] - v) * cobertura))
      linha.set([...cor, dentro ? 255 : 0], 1 + x * 4)
    }
    linhas.push(linha)
  }
  return png(s, s, Buffer.concat(linhas))
}

function png(largura, altura, dados) {
  const tabela = new Int32Array(256).map((_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c
  })
  const crc = (buf) => {
    let c = -1
    for (const b of buf) c = tabela[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ -1) >>> 0
  }
  const bloco = (tipo, conteudo) => {
    const t = Buffer.from(tipo)
    const tam = Buffer.alloc(4)
    tam.writeUInt32BE(conteudo.length)
    const c = Buffer.alloc(4)
    c.writeUInt32BE(crc(Buffer.concat([t, conteudo])))
    return Buffer.concat([tam, t, conteudo, c])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(largura, 0)
  ihdr.writeUInt32BE(altura, 4)
  ihdr.set([8, 6, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', deflateSync(dados)),
    bloco('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync('public/icone-192.png', desenhar(192, false))
writeFileSync('public/icone-512.png', desenhar(512, false))
// O iPhone arredonda os cantos sozinho, por isso o ícone vai quadrado.
writeFileSync('public/apple-touch-icon.png', desenhar(180, false))
console.log('Ícones gerados em public/')
