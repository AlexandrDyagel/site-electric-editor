import type { CalculationResult, PanelProject } from '@/types'
import { getComponentDef } from '@/data/library'
import { downloadBlob, downloadDataUrl, downloadTextFile, serializeProject } from '@/services/projectSerialization'
import { formatDate, formatNumber, formatPower, formatRub } from '@/utils/format'

export function safeFileName(name: string, extension: string): string {
  const base = name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 80)
  return `${base || 'panel'}_${new Date().toISOString().slice(0, 10)}.${extension}`
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function styledClone(original: SVGSVGElement): { clone: SVGSVGElement; width: number; height: number } {
  const clone = original.cloneNode(true) as SVGSVGElement
  const width = Number(original.dataset.worldWidth ?? original.viewBox.baseVal.width ?? 900)
  const height = Number(original.dataset.worldHeight ?? original.viewBox.baseVal.height ?? 700)
  const world = clone.querySelector<SVGGElement>('[data-canvas-world]')
  if (world) world.removeAttribute('transform')

  const originals = original.querySelectorAll<SVGElement>('*')
  const clones = clone.querySelectorAll<SVGElement>('*')
  const styleProps = [
    'fill',
    'fill-opacity',
    'stroke',
    'stroke-width',
    'stroke-opacity',
    'stroke-dasharray',
    'stroke-linecap',
    'stroke-linejoin',
    'opacity',
    'font-family',
    'font-size',
    'font-weight',
    'letter-spacing',
    'text-anchor',
    'dominant-baseline',
  ]
  // Индексы совпадают, пока из clone не удалены служебные элементы.
  originals.forEach((node, index) => {
    const target = clones[index]
    if (!target) return
    const computed = window.getComputedStyle(node)
    const style = styleProps
      .map((property) => `${property}:${computed.getPropertyValue(property)}`)
      .join(';')
    target.setAttribute('style', style)
  })

  clone.querySelectorAll('[data-export="ignore"]').forEach((node) => node.remove())
  clone.querySelectorAll('[data-export="selection"]').forEach((node) => node.remove())
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`)
  clone.setAttribute('width', String(width * 2))
  clone.setAttribute('height', String(height * 2))
  return { clone, width, height }
}

export function canvasSvgString(svg: SVGSVGElement): { text: string; width: number; height: number } {
  const { clone, width, height } = styledClone(svg)
  const declaration = '<?xml version="1.0" encoding="UTF-8"?>\n'
  return {
    text: declaration + new XMLSerializer().serializeToString(clone),
    width,
    height,
  }
}

export function exportCanvasSvg(svg: SVGSVGElement, project: PanelProject): void {
  const { text } = canvasSvgString(svg)
  downloadTextFile(text, safeFileName(project.name, 'svg'), 'image/svg+xml;charset=utf-8')
}

export async function exportCanvasPng(
  svg: SVGSVGElement,
  project: PanelProject,
): Promise<void> {
  const { text, width, height } = canvasSvgString(svg)
  const scale = Math.min(2, 5000 / Math.max(width, height))
  const image = new Image()
  image.decoding = 'async'
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Не удалось отрисовать SVG'))
    image.src = dataUrl
  })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D недоступен')
  context.fillStyle = '#080b10'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const png = canvas.toDataURL('image/png')
  downloadDataUrl(png, safeFileName(project.name, 'png'))
}

/** Упрощённая однолинейная схема для печати и согласования. */
export function exportSingleLineSvg(project: PanelProject, calc: CalculationResult): void {
  const width = 1240
  const margin = 56
  const columns = 3
  const perRowHeight = 190
  const rows = Math.ceil(Math.max(1, calc.lines.length) / columns)
  const height = 380 + rows * perRowHeight + 100
  const lines = calc.lines
  const header = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#ffffff"/>
      <text x="${margin}" y="52" font-family="Arial, sans-serif" font-size="12" letter-spacing="2" fill="#7c8794">VOLT.LAB / ОДНОЛИНЕЙНАЯ СХЕМА</text>
      <text x="${margin}" y="88" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#101722">${escapeXml(project.name)}</text>
      <text x="${margin}" y="116" font-family="Arial, sans-serif" font-size="12" fill="#5b6875">${escapeXml(project.supply.phase === 3 ? 'Трёхфазный ввод' : 'Однофазный ввод')} · ${project.supply.voltage} В · ${project.supply.mainBreaker ? `вводной автомат ${project.supply.mainBreaker} А` : 'автомат не задан'} · ${formatPower(calc.totalInstalledPowerW)}</text>
      <text x="${width - margin}" y="52" text-anchor="end" font-family="Arial, sans-serif" font-size="12" fill="#5b6875">${formatDate(new Date().toISOString())}</text>
      <text x="${width - margin}" y="88" text-anchor="end" font-family="Arial, sans-serif" font-size="12" fill="#5b6875">Расчётный ток: ${formatNumber(calc.totalCurrentA, 1)} А</text>
      <line x1="${margin}" y1="136" x2="${width - margin}" y2="136" stroke="#d7dde4"/>
      <rect x="${margin}" y="164" width="${width - margin * 2}" height="58" rx="4" fill="#f5f7f9" stroke="#d7dde4"/>
      <text x="${margin + 18}" y="190" font-family="Arial, sans-serif" font-size="11" fill="#788492">ВВОД</text>
      <text x="${margin + 18}" y="210" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#101722">${project.supply.phase === 3 ? 'L1 · L2 · L3 · N · PE' : 'L · N · PE'}</text>
      <text x="${width - margin - 18}" y="198" text-anchor="end" font-family="Arial, sans-serif" font-size="12" fill="#5b6875">${project.supply.mainBreaker ? `QF ${project.supply.mainBreaker} А` : 'QF —'}</text>
      <line x1="${margin + 40}" y1="222" x2="${margin + 40}" y2="258" stroke="#101722" stroke-width="1.5"/>
      <line x1="${margin + 40}" y1="258" x2="${width - margin - 40}" y2="258" stroke="#101722" stroke-width="1.5"/>
      <text x="${margin + 40}" y="276" font-family="Arial, sans-serif" font-size="10" fill="#788492">РАСПРЕДЕЛИТЕЛЬНАЯ ШИНА</text>
  `
  const items = lines
    .map((line, index) => {
      const col = index % columns
      const row = Math.floor(index / columns)
      const cellWidth = (width - margin * 2) / columns
      const x = margin + col * cellWidth + cellWidth / 2
      const y = 330 + row * perRowHeight
      const statusColor = line.status === 'error' ? '#c2410c' : line.status === 'warning' ? '#a16207' : '#3f6212'
      return `
        <line x1="${x}" y1="258" x2="${x}" y2="${y - 12}" stroke="#101722" stroke-width="1.2"/>
        <rect x="${x - 46}" y="${y - 12}" width="92" height="42" rx="3" fill="#ffffff" stroke="#101722"/>
        <text x="${x}" y="${y + 6}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#101722">${line.tripCurve ?? 'C'}${line.ratedCurrent}</text>
        <text x="${x}" y="${y + 21}" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#788492">${line.phase === 3 ? '3P' : '1P'} · ${line.ratedCurrent} А</text>
        <line x1="${x}" y1="${y + 30}" x2="${x}" y2="${y + 64}" stroke="#101722" stroke-width="1.2"/>
        <rect x="${x - 84}" y="${y + 64}" width="168" height="62" rx="3" fill="#f7f9fb" stroke="#d7dde4"/>
        <text x="${x - 72}" y="${y + 84}" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#101722">${escapeXml(line.name.slice(0, 26))}</text>
        <text x="${x - 72}" y="${y + 101}" font-family="Arial, sans-serif" font-size="9" fill="#5b6875">${formatNumber(line.currentA, 1)} А · ${line.cableSection ?? '—'} мм² · ΔU ${formatNumber(line.voltageDropPct ?? 0, 1)}%</text>
        <text x="${x - 72}" y="${y + 116}" font-family="Arial, sans-serif" font-size="8" fill="${statusColor}">${line.status === 'ok' ? 'НОРМА' : line.status === 'warning' ? 'ВНИМАНИЕ' : 'ОШИБКА'}</text>
      `
    })
    .join('')
  const footer = `
      <line x1="${margin}" y1="${height - 76}" x2="${width - margin}" y2="${height - 76}" stroke="#d7dde4"/>
      <text x="${margin}" y="${height - 52}" font-family="Arial, sans-serif" font-size="9" fill="#788492">Схема упрощённая. Полная монтажная схема — в редакторе ВОЛЬТ.ЛАБ. Проверьте параметры перед монтажом.</text>
      <text x="${width - margin}" y="${height - 52}" text-anchor="end" font-family="Arial, sans-serif" font-size="9" fill="#788492">${calc.lines.length} линий · ${formatPower(calc.totalCalculatedPowerW)} расчётная</text>
    </svg>`
  downloadTextFile(
    header + items + footer,
    safeFileName(`${project.name}_однолинейная`, 'svg'),
    'image/svg+xml;charset=utf-8',
  )
}

export function exportSpecificationCsv(
  project: PanelProject,
  calc: CalculationResult,
): void {
  const rows = new Map<string, { name: string; brand: string; series: string; quantity: number; price: number }>()
  for (const placed of project.components) {
    const def = getComponentDef(placed.defId)
    if (!def) continue
    const row = rows.get(def.id)
    if (row) row.quantity += 1
    else rows.set(def.id, { name: def.name, brand: def.brand, series: def.series, quantity: 1, price: def.price })
  }
  const header = ['№', 'Наименование', 'Бренд', 'Серия / тип', 'Кол-во', 'Ед.', 'Цена, ₽', 'Сумма, ₽']
  const lines = [...rows.values()].map((row, index) => [
    String(index + 1),
    row.name,
    row.brand,
    row.series,
    String(row.quantity),
    'шт.',
    String(row.price),
    String(row.price * row.quantity),
  ])
  const total = [...rows.values()].reduce((sum, row) => sum + row.price * row.quantity, 0)
  const meta = [
    ['Проект', project.name],
    ['Сеть', `${project.supply.phase} фазы, ${project.supply.voltage} В`],
    ['Расчётная мощность', formatPower(calc.totalCalculatedPowerW)],
    ['Расчётный ток', `${formatNumber(calc.totalCurrentA, 1)} А`],
    ['Итого оборудование', formatRub(total)],
  ]
  const csv = [
    ...meta,
    [],
    header,
    ...lines,
    [],
    ['', '', '', '', '', '', 'ИТОГО', String(total)],
  ]
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
        .join(';'),
    )
    .join('\r\n')
  downloadTextFile(
    `\uFEFF${csv}`,
    safeFileName(`${project.name}_спецификация`, 'csv'),
    'text/csv;charset=utf-8',
  )
}

function reportMarkup(project: PanelProject, calc: CalculationResult): string {
  const grouped = new Map<string, { name: string; brand: string; series: string; quantity: number; price: number }>()
  for (const placed of project.components) {
    const def = getComponentDef(placed.defId)
    if (!def) continue
    const row = grouped.get(def.id)
    if (row) row.quantity += 1
    else grouped.set(def.id, { name: def.name, brand: def.brand, series: def.series, quantity: 1, price: def.price })
  }
  const rows = [...grouped.values()]
  const total = rows.reduce((sum, row) => sum + row.price * row.quantity, 0)
  const tr = rows
    .map(
      (row, index) => `
      <tr>
        <td style="padding:9px 8px;border-bottom:1px solid #e7ebef;color:#8a96a3;font:11px Arial">${index + 1}</td>
        <td style="padding:9px 8px;border-bottom:1px solid #e7ebef;font:11px Arial;color:#182230"><b>${escapeXml(row.name)}</b><br><span style="color:#8a96a3;font-size:9px">${escapeXml(row.brand)} · ${escapeXml(row.series)}</span></td>
        <td style="padding:9px 8px;border-bottom:1px solid #e7ebef;text-align:center;font:11px Arial;color:#182230">${row.quantity}</td>
        <td style="padding:9px 8px;border-bottom:1px solid #e7ebef;text-align:right;font:11px Arial;color:#182230">${formatRub(row.price)}</td>
        <td style="padding:9px 8px;border-bottom:1px solid #e7ebef;text-align:right;font:11px Arial;color:#182230"><b>${formatRub(row.price * row.quantity)}</b></td>
      </tr>`,
    )
    .join('')
  return `
    <div style="width:794px;box-sizing:border-box;padding:44px 48px;background:#fff;color:#182230;font-family:Arial,sans-serif">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #182230;padding-bottom:18px">
        <div>
          <div style="font-size:10px;letter-spacing:2px;color:#7b8794;text-transform:uppercase">ВОЛЬТ.ЛАБ / инженерная электрика</div>
          <h1 style="font-size:28px;margin:9px 0 4px;letter-spacing:-.6px">Спецификация щита</h1>
          <div style="font-size:13px;color:#5d6b79">${escapeXml(project.name)}</div>
        </div>
        <div style="text-align:right;font-size:10px;color:#7b8794;line-height:1.8">
          ${formatDate(new Date().toISOString())}<br>
          ${project.supply.phase} фазы · ${project.supply.voltage} В<br>
          Ввод: ${project.supply.mainBreaker ? `${project.supply.mainBreaker} А` : 'не задан'}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0 24px">
        <div style="border:1px solid #e2e8ee;padding:12px"><div style="font-size:9px;color:#8a96a3;text-transform:uppercase;letter-spacing:.7px">Оборудование</div><div style="font-size:20px;font-weight:700;margin-top:5px">${project.components.length} шт.</div></div>
        <div style="border:1px solid #e2e8ee;padding:12px"><div style="font-size:9px;color:#8a96a3;text-transform:uppercase;letter-spacing:.7px">Установленная</div><div style="font-size:20px;font-weight:700;margin-top:5px">${formatNumber(calc.totalInstalledPowerW / 1000, 2)} кВт</div></div>
        <div style="border:1px solid #e2e8ee;padding:12px"><div style="font-size:9px;color:#8a96a3;text-transform:uppercase;letter-spacing:.7px">Расчётный ток</div><div style="font-size:20px;font-weight:700;margin-top:5px">${formatNumber(calc.totalCurrentA, 1)} А</div></div>
        <div style="border:1px solid #e2e8ee;padding:12px"><div style="font-size:9px;color:#8a96a3;text-transform:uppercase;letter-spacing:.7px">Линий</div><div style="font-size:20px;font-weight:700;margin-top:5px">${calc.lines.length}</div></div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#f4f6f8">
          <th style="text-align:left;padding:9px 8px;font:9px Arial;letter-spacing:.7px;color:#7b8794;text-transform:uppercase">№</th>
          <th style="text-align:left;padding:9px 8px;font:9px Arial;letter-spacing:.7px;color:#7b8794;text-transform:uppercase">Наименование</th>
          <th style="text-align:center;padding:9px 8px;font:9px Arial;letter-spacing:.7px;color:#7b8794;text-transform:uppercase">Кол-во</th>
          <th style="text-align:right;padding:9px 8px;font:9px Arial;letter-spacing:.7px;color:#7b8794;text-transform:uppercase">Цена</th>
          <th style="text-align:right;padding:9px 8px;font:9px Arial;letter-spacing:.7px;color:#7b8794;text-transform:uppercase">Сумма</th>
        </tr></thead>
        <tbody>${tr}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-top:16px">
        <div style="min-width:260px;border-top:2px solid #182230;padding-top:10px;display:flex;justify-content:space-between;font-size:14px"><span>Итого оборудование</span><b>${formatRub(total)}</b></div>
      </div>
      <div style="margin-top:30px;border-top:1px solid #e2e8ee;padding-top:12px;font-size:9px;line-height:1.7;color:#8a96a3">
        Спецификация сформирована автоматически в редакторе ВОЛЬТ.ЛАБ. Цены являются ориентировочными и не являются публичной офертой.
        Перед закупкой проверьте актуальные артикулы и стоимость у поставщика. Расчётная документация требует проверки инженером.
      </div>
    </div>
  `
}

export async function exportSpecificationPdf(
  project: PanelProject,
  calc: CalculationResult,
): Promise<void> {
  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '-10000px'
  host.style.top = '0'
  host.style.width = '794px'
  host.style.background = '#ffffff'
  host.innerHTML = reportMarkup(project, calc)
  document.body.appendChild(host)
  try {
    if (document.fonts?.ready) await document.fonts.ready
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])
    const rendered = await html2canvas(host, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 794,
    })
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = 210
    const pageHeight = 297
    const margin = 9
    const contentWidth = pageWidth - margin * 2
    const contentHeight = pageHeight - margin * 2
    const pxPerMm = rendered.width / contentWidth
    const pageSliceHeight = Math.floor(contentHeight * pxPerMm)
    const pages = Math.max(1, Math.ceil(rendered.height / pageSliceHeight))
    for (let page = 0; page < pages; page += 1) {
      const sliceHeight = Math.min(pageSliceHeight, rendered.height - page * pageSliceHeight)
      const slice = document.createElement('canvas')
      slice.width = rendered.width
      slice.height = sliceHeight
      const context = slice.getContext('2d')
      if (!context) continue
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, slice.width, slice.height)
      context.drawImage(
        rendered,
        0,
        page * pageSliceHeight,
        rendered.width,
        sliceHeight,
        0,
        0,
        rendered.width,
        sliceHeight,
      )
      if (page > 0) pdf.addPage()
      pdf.addImage(
        slice.toDataURL('image/jpeg', 0.94),
        'JPEG',
        margin,
        margin,
        contentWidth,
        sliceHeight / pxPerMm,
      )
      pdf.setFontSize(8)
      pdf.setTextColor(140, 150, 160)
      pdf.text(`VOLT.LAB · page ${page + 1} / ${pages}`, pageWidth / 2, pageHeight - 4, {
        align: 'center',
      })
    }
    pdf.save(safeFileName(`${project.name}_спецификация`, 'pdf'))
  } finally {
    host.remove()
  }
}

export function exportProjectJson(project: PanelProject): void {
  downloadTextFile(serializeProject(project), safeFileName(project.name, 'json'))
}

export function downloadBlobFile(blob: Blob, fileName: string): void {
  downloadBlob(blob, fileName)
}
