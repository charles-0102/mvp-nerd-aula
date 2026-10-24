import QRCode from 'qrcode'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// Executar depois de publicar, usando a URL pública real da página do solicitante.
const input = process.argv[2]
let url
try { url = new URL(input) } catch { /* a mensagem abaixo cobre entrada ausente/inválida */ }
if (!url || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
    url.pathname !== '/' || !url.hostname.includes('.') || /(^|\.)(localhost|local|internal|test|invalid|example)$/.test(url.hostname) ||
    /^[\d.]+$/.test(url.hostname) || url.hostname.includes(':')) {
  console.error('Informe a URL HTTPS pública real da raiz do solicitante, sem credenciais, parâmetros, fragmentos ou endereço local. Exemplo de uso: npm run qr -- https://SEU-DOMINIO-PUBLICADO/')
  process.exit(1)
}
const folder = resolve('artifacts')
await mkdir(folder, { recursive: true })
const options = { errorCorrectionLevel: 'M', margin: 4, width: 1024 }
await QRCode.toFile(resolve(folder, 'qr-code.png'), url.href, options)
await QRCode.toFile(resolve(folder, 'qr-code.svg'), url.href, { ...options, type: 'svg' })
await writeFile(resolve(folder, 'link-da-aula.txt'), `${url.href}\n`, 'utf8')
console.log(`QR code PNG/SVG e link escrito salvos em ${folder}. Confirme a leitura em um celular antes da aula.`)
