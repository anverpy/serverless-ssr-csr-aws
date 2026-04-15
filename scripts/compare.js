#!/usr/bin/env node
/**
 * compare.js — SSR vs CSR: Análisis desde perspectiva de Crawler / SEO
 * Uso: node compare.js [API_GATEWAY_URL]
 * Por defecto apunta a LocalStack en localhost:4566
 */

const BASE_URL = process.argv[2] || 'http://localhost:4566/restapis'

// ─── Configuración ────────────────────────────────────────────────────────────
// Ajusta estos valores tras ejecutar setup.sh (el script imprime los IDs)
const CONFIG_FILE = '.localstack-config.json'
import { readFileSync, existsSync, writeFileSync } from 'fs'

let config = {}
if (existsSync(CONFIG_FILE)) {
  config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'))
}

const API_ID    = config.apiId    || process.env.API_ID    || 'REPLACE_API_ID'
const STAGE     = config.stage    || process.env.STAGE     || 'dev'
const S3_BUCKET = config.bucket   || process.env.S3_BUCKET || 'csr-app'
const LS_PORT   = config.port     || process.env.LS_PORT   || '4566'

const SSR_URL = `http://localhost:${LS_PORT}/restapis/${API_ID}/${STAGE}/_user_request_/ssr`
const CSR_URL = `http://localhost:${LS_PORT}/${S3_BUCKET}/index.html`
const API_URL = `http://localhost:${LS_PORT}/restapis/${API_ID}/${STAGE}/_user_request_/api/products`

// ─── Utilidades ───────────────────────────────────────────────────────────────
const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'
const GREEN  = '\x1b[32m'
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN   = '\x1b[36m'
const DIM    = '\x1b[2m'

const ok   = (msg) => console.log(`  ${GREEN}✔${RESET} ${msg}`)
const warn = (msg) => console.log(`  ${YELLOW}⚠${RESET} ${msg}`)
const fail = (msg) => console.log(`  ${RED}✘${RESET} ${msg}`)
const info = (msg) => console.log(`  ${DIM}${msg}${RESET}`)
const section = (title) => {
  console.log(`\n${BOLD}${CYAN}── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}${RESET}`)
}

async function fetchWithTiming(url, userAgent = 'Googlebot/2.1') {
  const t0 = performance.now()
  let res, body, error
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(8000),
    })
    body = await res.text()
  } catch (e) {
    error = e.message
  }
  const ttfb = Math.round(performance.now() - t0)
  return { res, body, ttfb, error, url }
}

function analyzeHTML(html, label) {
  const results = {
    totalBytes: Buffer.byteLength(html, 'utf8'),
    hasH1: /<h1[\s>]/i.test(html),
    h1Count: (html.match(/<h1[\s>]/gi) || []).length,
    hasH2: /<h2[\s>]/i.test(html),
    h2Count: (html.match(/<h2[\s>]/gi) || []).length,
    hasMetaDescription: /<meta[^>]+name=["']description["']/i.test(html),
    hasRobotsMeta: /<meta[^>]+name=["']robots["']/i.test(html),
    hasSchemaOrg: /itemscope|itemtype.*schema\.org/i.test(html),
    visibleText: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length,
    productCards: (html.match(/class=["']product-card["']/g) || []).length,
    rootEmpty: /<div id=["']root["']\s*><\/div>/i.test(html),
    hasTitleTag: /<title>[^<]+<\/title>/i.test(html),
  }
  return results
}

function printAnalysis(label, r, ttfb) {
  section(`Análisis: ${label}`)

  // Tamaño y velocidad
  console.log(`\n  ${BOLD}📦 Payload & Rendimiento${RESET}`)
  info(`URL: ${r.url}`)
  info(`TTFB: ${ttfb}ms`)
  info(`Tamaño HTML: ${(r.totalBytes / 1024).toFixed(2)} KB (${r.totalBytes} bytes)`)
  info(`Texto visible (sin tags): ${r.visibleText} chars`)

  // SEO Semántico
  console.log(`\n  ${BOLD}🔍 SEO Semántico${RESET}`)
  r.hasTitleTag    ? ok(`<title> presente`)          : fail(`<title> ausente`)
  r.hasMetaDescription ? ok(`meta description presente`) : warn(`meta description ausente`)
  r.hasRobotsMeta  ? ok(`meta robots presente`)      : warn(`meta robots ausente`)
  r.hasH1          ? ok(`H1 presente (${r.h1Count})`)     : fail(`H1 ausente — crítico para SEO`)
  r.hasH2          ? ok(`H2 presente (${r.h2Count})`)     : warn(`H2 ausente`)
  r.hasSchemaOrg   ? ok(`Schema.org / microdata detectado`) : warn(`Sin Schema.org`)

  // Contenido indexable
  console.log(`\n  ${BOLD}📄 Contenido Indexable${RESET}`)
  r.productCards > 0
    ? ok(`${r.productCards} product-cards en el HTML inicial`)
    : fail(`0 product-cards — el crawler no verá productos`)

  if (r.rootEmpty) {
    fail(`div#root vacío — JS no ejecutado = sin contenido para Googlebot`)
  } else if (label.includes('CSR')) {
    warn(`div#root tiene contenido (¿SSR hidratado? revisar)`)
  }
}

function printComparison(ssrStats, csrStats, ssrTTFB, csrTTFB) {
  section('Comparativa SSR vs CSR')

  const rows = [
    ['Métrica', 'SSR', 'CSR', 'Ganador'],
    ['─'.repeat(20), '─'.repeat(12), '─'.repeat(12), '─'.repeat(10)],
    ['TTFB', `${ssrTTFB}ms`, `${csrTTFB}ms`, ssrTTFB < csrTTFB ? '⚡ SSR' : '⚡ CSR'],
    ['Tamaño HTML', `${(ssrStats.totalBytes/1024).toFixed(1)}KB`, `${(csrStats.totalBytes/1024).toFixed(1)}KB`,
      ssrStats.totalBytes > csrStats.totalBytes ? '📦 CSR (más ligero)' : '📦 SSR'],
    ['Productos visibles', `${ssrStats.productCards}`, `${csrStats.productCards}`,
      ssrStats.productCards > csrStats.productCards ? '👁 SSR' : ssrStats.productCards === csrStats.productCards ? 'Empate' : '👁 CSR'],
    ['H1 para crawler', ssrStats.hasH1 ? '✔' : '✘', csrStats.hasH1 ? '✔' : '✘',
      ssrStats.hasH1 && !csrStats.hasH1 ? '✔ SSR' : !ssrStats.hasH1 && csrStats.hasH1 ? '✔ CSR' : 'Empate'],
    ['Schema.org', ssrStats.hasSchemaOrg ? '✔' : '✘', csrStats.hasSchemaOrg ? '✔' : '✘',
      ssrStats.hasSchemaOrg && !csrStats.hasSchemaOrg ? '✔ SSR' : 'Empate'],
    ['Meta description', ssrStats.hasMetaDescription ? '✔' : '✘', csrStats.hasMetaDescription ? '✔' : '✘', 'Ver config'],
  ]

  const widths = [22, 14, 14, 20]
  rows.forEach(row => {
    console.log(
      '  ' + row.map((cell, i) => cell.toString().padEnd(widths[i])).join(' │ ')
    )
  })
}

function printSEORecommendations(ssrStats, csrStats) {
  section('Recomendaciones SEO')

  const recs = []

  if (csrStats.rootEmpty) {
    recs.push({
      icon: '🔴', priority: 'CRÍTICO',
      text: 'El HTML del CSR tiene #root vacío. Googlebot sin JS verá una página en blanco. ' +
            'Soluciones: prerendering (Vite SSG), SSR híbrido, o Dynamic Rendering (este proyecto).'
    })
  }

  if (ssrStats.productCards > 0 && csrStats.productCards === 0) {
    recs.push({
      icon: '🔴', priority: 'CRÍTICO',
      text: `SSR expone ${ssrStats.productCards} productos al crawler. CSR expone 0. ` +
            'Para e-commerce o catálogos, SSR es esencial para indexación de productos.'
    })
  }

  if (ssrStats.hasSchemaOrg && !csrStats.hasSchemaOrg) {
    recs.push({
      icon: '🟡', priority: 'IMPORTANTE',
      text: 'SSR incluye microdata Schema.org (Product). CSR no. Los rich snippets en Google ' +
            'requieren datos estructurados en el HTML inicial.'
    })
  }

  if (!csrStats.hasMetaDescription) {
    recs.push({
      icon: '🟡', priority: 'IMPORTANTE',
      text: 'CSR no tiene meta description en el HTML inicial. Para SPA, usa React Helmet / ' +
            'react-helmet-async para gestionar el <head> con SSR/prerender.'
    })
  }

  recs.push({
    icon: '🟢', priority: 'INFO',
    text: 'La arquitectura híbrida de este proyecto (detectar bot → SSR, usuario → CSR) es ' +
          'la solución de "Dynamic Rendering" que recomienda Google para SPA complejas.'
  })

  recs.forEach(r => {
    console.log(`\n  ${r.icon} ${BOLD}[${r.priority}]${RESET}`)
    console.log(`  ${r.text}`)
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${BOLD}╔══════════════════════════════════════════════════════╗`)
  console.log(`║       SSR vs CSR — Análisis de Crawler / SEO        ║`)
  console.log(`╚══════════════════════════════════════════════════════╝${RESET}`)
  console.log(`\n  ${DIM}Ejecutando como Googlebot...${RESET}\n`)

  // 1. Fetch SSR
  section('Fetching SSR')
  info(`GET ${SSR_URL}`)
  const ssrResult = await fetchWithTiming(SSR_URL, 'Googlebot/2.1 (+http://www.google.com/bot.html)')
  if (ssrResult.error) {
    fail(`SSR request falló: ${ssrResult.error}`)
    info('¿Está LocalStack corriendo? ¿La Lambda desplegada? Revisa setup.sh')
  } else {
    ok(`SSR respondió en ${ssrResult.ttfb}ms · HTTP ${ssrResult.res.status}`)
  }

  // 2. Fetch CSR
  section('Fetching CSR')
  info(`GET ${CSR_URL}`)
  const csrResult = await fetchWithTiming(CSR_URL, 'Googlebot/2.1 (+http://www.google.com/bot.html)')
  if (csrResult.error) {
    fail(`CSR request falló: ${csrResult.error}`)
    info('¿El build de React está desplegado en S3 de LocalStack? Revisa setup.sh')
  } else {
    ok(`CSR respondió en ${csrResult.ttfb}ms · HTTP ${csrResult.res.status}`)
  }

  // Si alguno falló, no podemos comparar
  if (ssrResult.error || csrResult.error) {
    console.log(`\n${RED}${BOLD}No se puede comparar — hay errores de conexión.${RESET}`)
    console.log(`Ejecuta primero: ${BOLD}bash setup.sh${RESET}\n`)
    process.exit(1)
  }

  // 3. Analizar
  const ssrStats = analyzeHTML(ssrResult.body, 'SSR')
  const csrStats = analyzeHTML(csrResult.body, 'CSR')

  printAnalysis('SSR (Lambda)', ssrStats, ssrResult.ttfb)
  printAnalysis('CSR (S3 React)', csrStats, csrResult.ttfb)

  // 4. Comparativa
  printComparison(ssrStats, csrStats, ssrResult.ttfb, csrResult.ttfb)

  // 5. Recomendaciones
  printSEORecommendations(ssrStats, csrStats)

  // 6. Guardar reporte JSON
  const report = {
    timestamp: new Date().toISOString(),
    ssr: { url: SSR_URL, ttfb: ssrResult.ttfb, ...ssrStats },
    csr: { url: CSR_URL, ttfb: csrResult.ttfb, ...csrStats },
  }
  writeFileSync('/home/andv/js_proj/seo-report/report.json', JSON.stringify(report, null, 2))

  section('Reporte guardado')
  ok(`seo-report/report.json generado con todos los datos.`)
  console.log()
}

main().catch(e => {
  console.error(`\n${RED}Error inesperado: ${e.message}${RESET}`)
  process.exit(1)
})
