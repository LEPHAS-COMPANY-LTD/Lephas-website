import PDFDocument from 'pdfkit'
import { POPPINS_BOLD, POPPINS_REGULAR, POPPINS_SEMIBOLD } from './assets/fonts.js'
import { LOGO_PNG } from './assets/logo.js'
import { formatMoney } from './billing.js'

const SLATE = '#3A4650'
const SKY = '#5f9cc8'
const ICE = '#EEF5FB'
const SILVER = '#D6DADD'
const MUTED = '#6b7782'
const RED = '#b4544a'

const PAYMENT_LABELS = { bank_transfer: 'Bank transfer', mobile_money: 'Mobile money', card: 'Card', cash: 'Cash', other: 'Other' }
const STAMPS = { paid: 'PAID', void: 'VOID', accepted: 'ACCEPTED', declined: 'DECLINED', overdue: 'OVERDUE', expired: 'EXPIRED', draft: 'DRAFT' }

function longDate(value) {
  if (!value) return ''
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export function documentFilename(doc) {
  const label = doc.kind === 'quote' ? 'Quotation' : 'Invoice'
  return `Lephas-${label}-${doc.number || 'draft'}.pdf`.replace(/[^\w.-]/g, '-')
}

export function renderDocumentPdf(doc, settings = {}) {
  return new Promise((resolve, reject) => {
    const isQuote = doc.kind === 'quote'
    const title = isQuote ? 'QUOTATION' : 'INVOICE'
    const money = (cents) => formatMoney(cents, doc.currency)
    const pdf = new PDFDocument({
      size: 'A4',
      margins: { top: 48, bottom: 56, left: 48, right: 48 },
      info: { Title: `${isQuote ? 'Quotation' : 'Invoice'} ${doc.number ?? ''}`.trim(), Author: 'Lephas Company Ltd' },
      bufferPages: true,
      font: POPPINS_REGULAR,
    })
    pdf.registerFont('Regular', POPPINS_REGULAR)
    pdf.registerFont('Semibold', POPPINS_SEMIBOLD)
    pdf.registerFont('Bold', POPPINS_BOLD)
    const chunks = []
    pdf.on('data', (chunk) => chunks.push(chunk))
    pdf.on('end', () => resolve(Buffer.concat(chunks)))
    pdf.on('error', reject)

    const left = pdf.page.margins.left
    const width = pdf.page.width - left - pdf.page.margins.right
    const right = left + width
    const bottomLimit = () => pdf.page.height - pdf.page.margins.bottom
    const ensureSpace = (height) => {
      if (pdf.y + height > bottomLimit()) pdf.addPage()
    }
    const label = (text, x, y, options = {}) =>
      pdf.font('Bold').fontSize(7).fillColor(SKY).text(text.toUpperCase(), x, y, { characterSpacing: 1.2, ...options })

    // Header
    pdf.image(LOGO_PNG, left, 44, { width: 58, height: 58 })
    pdf.font('Bold').fontSize(13).fillColor(SLATE).text('LEPHAS COMPANY LTD', left + 70, 58, { characterSpacing: 0.5 })
    pdf.font('Regular').fontSize(7.5).fillColor(MUTED).text('TRANSFORMING THE FUTURE', left + 70, 76, { characterSpacing: 1.5 })
    pdf.font('Bold').fontSize(24).fillColor(SLATE).text(title, left, 52, { width, align: 'right', characterSpacing: 2.5 })
    pdf.font('Bold').fontSize(10).text(doc.number ?? 'Draft', left, 82, { width, align: 'right' })
    pdf.moveTo(left, 114).lineTo(right, 114).lineWidth(1.5).strokeColor(SLATE).stroke()

    // Parties and dates
    const colWidth = (width - 24) / 3
    const top = 130
    const company = [settings.office_address, settings.contact_email, settings.contact_phone, settings.tax_number && `Tax / Reg. No: ${settings.tax_number}`].filter(Boolean)
    const client = [doc.client.company, doc.client.address, doc.client.email, doc.client.phone].filter(Boolean)

    label('From', left, top)
    pdf.font('Bold').fontSize(9.5).fillColor(SLATE).text('Lephas Company Ltd', left, top + 13, { width: colWidth })
    pdf.font('Regular').fontSize(9).fillColor(MUTED).text(company.join('\n'), { width: colWidth })
    const fromBottom = pdf.y

    const midX = left + colWidth + 12
    label(isQuote ? 'Prepared for' : 'Bill to', midX, top)
    pdf.font('Bold').fontSize(9.5).fillColor(SLATE).text(doc.client.name, midX, top + 13, { width: colWidth })
    pdf.font('Regular').fontSize(9).fillColor(MUTED).text(client.join('\n'), { width: colWidth })
    const toBottom = pdf.y

    const rightX = left + 2 * (colWidth + 12)
    let dy = top
    const dateRow = (name, value) => {
      label(name, rightX, dy, { width: colWidth, align: 'right' })
      pdf.font('Bold').fontSize(9.5).fillColor(SLATE).text(value, rightX, dy + 11, { width: colWidth, align: 'right' })
      dy += 30
    }
    dateRow('Date issued', longDate(doc.issue_date))
    if (doc.due_date) dateRow(isQuote ? 'Valid until' : 'Due date', longDate(doc.due_date))
    if (doc.reference) dateRow('Request', doc.reference)

    pdf.y = Math.max(fromBottom, toBottom, dy) + 18
    pdf.font('Bold').fontSize(11.5).fillColor(SLATE).text(doc.title, left, pdf.y, { width })
    pdf.moveDown(0.6)

    // Line items
    const cols = [
      { key: 'n', title: '#', width: 24, align: 'left' },
      { key: 'description', title: 'Description', width: width - 24 - 70 - 95 - 95, align: 'left' },
      { key: 'qty', title: 'Qty', width: 70, align: 'right' },
      { key: 'unit', title: 'Unit price', width: 95, align: 'right' },
      { key: 'amount', title: 'Amount', width: 95, align: 'right' },
    ]
    const drawHead = () => {
      const y = pdf.y
      pdf.rect(left, y, width, 22).fill(ICE)
      let x = left
      for (const col of cols) {
        pdf.font('Bold').fontSize(7.5).fillColor(SLATE).text(col.title.toUpperCase(), x + 6, y + 7.5, { width: col.width - 12, align: col.align, characterSpacing: 1 })
        x += col.width
      }
      pdf.y = y + 22
    }
    drawHead()
    doc.items.forEach((item, index) => {
      const values = {
        n: String(index + 1),
        description: item.description,
        qty: `${item.quantity}${item.unit ? ` ${item.unit}` : ''}`,
        unit: money(item.unit_price_cents),
        amount: money(item.amount_cents),
      }
      pdf.font('Regular').fontSize(9)
      const rowHeight = Math.max(...cols.map((col) => pdf.heightOfString(values[col.key], { width: col.width - 12 }))) + 14
      if (pdf.y + rowHeight > bottomLimit()) {
        pdf.addPage()
        drawHead()
      }
      const y = pdf.y
      let x = left
      for (const col of cols) {
        pdf
          .font(col.key === 'amount' ? 'Bold' : 'Regular')
          .fontSize(9)
          .fillColor(col.key === 'n' ? MUTED : SLATE)
          .text(values[col.key], x + 6, y + 7, { width: col.width - 12, align: col.align })
        x += col.width
      }
      pdf.moveTo(left, y + rowHeight).lineTo(right, y + rowHeight).lineWidth(0.6).strokeColor(SILVER).stroke()
      pdf.y = y + rowHeight
    })

    // Totals
    const totals = [['Subtotal', money(doc.subtotal_cents)]]
    if (doc.discount_cents > 0) totals.push(['Discount', `-${money(doc.discount_cents)}`])
    if (doc.tax_rate > 0) totals.push([`${doc.tax_label} (${doc.tax_rate}%)`, money(doc.tax_cents)])
    ensureSpace(40 + totals.length * 16 + (!isQuote && doc.paid_cents > 0 ? 40 : 0))
    const tx = right - 220
    let ty = pdf.y + 14
    const stampAt = { page: pdf.bufferedPageRange().start + pdf.bufferedPageRange().count - 1, y: ty + 10 }
    for (const [name, value] of totals) {
      pdf.font('Regular').fontSize(9.5).fillColor(MUTED).text(name, tx, ty, { width: 110 })
      pdf.fillColor(SLATE).text(value, tx + 110, ty, { width: 110, align: 'right' })
      ty += 16
    }
    pdf.moveTo(tx, ty + 2).lineTo(right, ty + 2).lineWidth(1.5).strokeColor(SLATE).stroke()
    ty += 9
    pdf.font('Bold').fontSize(11).fillColor(SLATE).text(`Total (${doc.currency})`, tx, ty, { width: 110 })
    pdf.text(money(doc.total_cents), tx + 90, ty, { width: 130, align: 'right' })
    ty += 20
    if (!isQuote && doc.paid_cents > 0) {
      pdf.font('Regular').fontSize(9.5).fillColor(MUTED).text('Paid', tx, ty, { width: 110 })
      pdf.fillColor(SLATE).text(`-${money(doc.paid_cents)}`, tx + 110, ty, { width: 110, align: 'right' })
      ty += 18
      pdf.rect(tx - 4, ty - 4, 224, 20).fill(ICE)
      pdf.font('Bold').fontSize(10).fillColor(SLATE).text('Balance due', tx, ty + 1, { width: 110 })
      pdf.text(money(doc.balance_cents), tx + 90, ty + 1, { width: 130, align: 'right' })
      ty += 22
    }
    pdf.y = ty + 10

    // Payments, how to pay, notes, terms
    const block = (heading, body, { shaded = false } = {}) => {
      if (!body) return
      pdf.font('Regular').fontSize(9)
      const h = pdf.heightOfString(body, { width: width - (shaded ? 28 : 0) }) + 30
      ensureSpace(h)
      const y = pdf.y + 6
      if (shaded) pdf.roundedRect(left, y, width, h, 10).fill(ICE)
      const pad = shaded ? 14 : 0
      label(heading, left + pad, y + (shaded ? 12 : 0))
      pdf.font('Regular').fontSize(9).fillColor(shaded ? SLATE : MUTED).text(body, left + pad, y + (shaded ? 26 : 14), { width: width - 2 * pad })
      pdf.y = y + h + (shaded ? 4 : -10)
    }
    if (!isQuote && doc.payments?.length) {
      const lines = doc.payments.map((p) => `${longDate(p.paid_on)}  ·  ${PAYMENT_LABELS[p.method] ?? p.method}  ·  ${money(p.amount_cents)}`).join('\n')
      block('Payments received', lines)
    }
    if (!isQuote && settings.payment_instructions) {
      block('How to pay', `${settings.payment_instructions}${doc.number ? `\n\nPayment reference: ${doc.number}` : ''}`, { shaded: true })
    }
    const half = (width - 24) / 2
    const columns = [['Notes', doc.notes], ['Terms', doc.terms]].filter(([, body]) => body)
    if (columns.length) {
      pdf.font('Regular').fontSize(9)
      const colW = columns.length === 2 ? half : width
      const h = Math.max(...columns.map(([, body]) => pdf.heightOfString(body, { width: colW }))) + 20
      ensureSpace(h + 10)
      const y = pdf.y + 8
      columns.forEach(([heading, body], i) => {
        const x = left + i * (half + 24)
        label(heading, x, y)
        pdf.font('Regular').fontSize(9).fillColor(MUTED).text(body, x, y + 14, { width: colW })
      })
      pdf.y = y + h
    }

    // Status stamp and footer on every page
    const stamp = STAMPS[doc.display_status]
    const contact = [settings.contact_email, settings.contact_phone, settings.office_address].filter(Boolean).join('  ·  ')
    const range = pdf.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i++) {
      pdf.switchToPage(i)
      if (i === stampAt.page && stamp) {
        const good = doc.display_status === 'paid' || doc.display_status === 'accepted'
        const sx = left + 30
        pdf.save()
        pdf.rotate(-12, { origin: [sx + 75, stampAt.y + 20] })
        pdf.opacity(0.8).roundedRect(sx, stampAt.y, 150, 40, 6).lineWidth(3).strokeColor(good ? SLATE : RED).stroke()
        pdf.font('Bold').fontSize(18).fillColor(good ? SLATE : RED).text(stamp, sx, stampAt.y + 9, { width: 150, align: 'center', characterSpacing: 4, lineBreak: false })
        pdf.restore()
        pdf.opacity(1)
      }
      pdf.page.margins.bottom = 0
      const fy = pdf.page.height - 46
      pdf.moveTo(left, fy - 8).lineTo(right, fy - 8).lineWidth(0.6).strokeColor(SILVER).stroke()
      pdf.font('Bold').fontSize(8).fillColor(SLATE).text('Thank you for choosing Lephas Company Ltd.', left, fy, { width, align: 'center', lineBreak: false })
      const footer = `${contact}${contact ? '  ·  ' : ''}Page ${i - range.start + 1} of ${range.count}`
      pdf.font('Regular').fontSize(7.5).fillColor(MUTED).text(footer, left, fy + 11, { width, align: 'center', lineBreak: false })
    }
    pdf.end()
  })
}
