/**
 * NIZAAM.COM — International Standard PDF Generator
 * FBR-Compliant Tax Invoice Format · Pakistan
 * Design adapted from KAMBOH ASSOCIATES · Nizaam.com
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { amountInWords } from './amountInWords';

// ── Palette ─────────────────────────────────────────────────────────────────
const BL   = [12,  61,  94];   // #0C3D5E — primary brand
const BL2  = [26,  82, 118];
const BLL  = [187, 213, 228];
const BLLX = [235, 245, 251];
const AMB  = [240, 165,   0];  // #F0A500 — accent
const DK   = [15,  23,  42];
const SUB  = [71,  85, 105];
const MUT  = [148, 163, 184];
const WH   = [255, 255, 255];
const GRN  = [5,  150, 105];
const RED  = [220,  38,  38];
const BDR  = [226, 232, 240];
const BG   = [248, 250, 252];

const _fmt = n => { const v = Math.round((parseFloat(n)||0)*100)/100; const s = v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,','); return s; };
const PKR  = n => 'PKR ' + _fmt(n);
const FMT  = d => { if (!d) return '-'; try { return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); } catch { return String(d); } };
const S    = (v, fb='-') => (v !== null && v !== undefined && v !== '') ? String(v) : fb;
const QTY  = n => { const v = parseFloat(n); if (!isFinite(v)) return '0'; return (Math.round(v*1000)/1000).toString(); };

// ── Logo loader with background removal ─────────────────────────────────────
async function loadLogo(base64DataUrl) {
  if (!base64DataUrl) return null;
  try {
    return await new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 200; canvas.height = img.height || 200;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const dat = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          const W = canvas.width;
          let bgR=0, bgG=0, bgB=0;
          [[0,0],[W-1,0],[0,canvas.height-1],[W-1,canvas.height-1]].forEach(([px,py]) => {
            const i=(py*W+px)*4; bgR+=dat[i]||255; bgG+=dat[i+1]||255; bgB+=dat[i+2]||255;
          });
          bgR=Math.round(bgR/4); bgG=Math.round(bgG/4); bgB=Math.round(bgB/4);
          const id = ctx.getImageData(0,0,canvas.width,canvas.height);
          const d = id.data;
          for (let i=0; i<d.length; i+=4) {
            const rr=d[i], gg=d[i+1], bb=d[i+2];
            if ((Math.abs(rr-bgR)<40 && Math.abs(gg-bgG)<40 && Math.abs(bb-bgB)<40) || (rr>215&&gg>205&&bb>185))
              d[i+3]=0;
          }
          ctx.putImageData(id, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch { resolve(base64DataUrl); }
      };
      img.onerror = () => resolve(base64DataUrl);
      img.src = base64DataUrl;
    });
  } catch { return null; }
}

function newDoc() { return new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' }); }
function ps(doc) { return { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() }; }

// ── Header ───────────────────────────────────────────────────────────────────
async function drawHeader(doc, company, docLabel, docNo, docDate, logoData, extra={}) {
  const { w } = ps(doc);
  const M = 14;

  doc.setFillColor(...WH);
  doc.rect(0, 0, w, 70, 'F');

  // Top stripe
  doc.setFillColor(...BL);
  doc.rect(0, 0, w, 3.5, 'F');
  doc.setFillColor(...AMB);
  doc.rect(w-36, 0, 36, 3.5, 'F');

  const leftColW = w/2 - M - 8;
  let contentY = 8;

  if (logoData) {
    try { doc.addImage(logoData, 'PNG', M, contentY, 28, 18, '', 'FAST'); } catch {}
    contentY += 22;
  }

  // Company name
  const companyName = (company.businessName || 'Company').toUpperCase();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...DK);
  doc.splitTextToSize(companyName, leftColW).slice(0,3).forEach((l,i) => doc.text(l, M, contentY+6+i*6.5));
  contentY += 6 + Math.min(doc.splitTextToSize(companyName, leftColW).length, 3)*6.5+2;

  // Company details
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...SUB);
  const infoLines = [
    company.address || '',
    [company.contactPhone ? `Tel: ${company.contactPhone}` : '', company.contactEmail ? `Email: ${company.contactEmail}` : ''].filter(Boolean).join('   '),
    [company.ntn ? `NTN: ${company.ntn}` : '', company.strn ? `STRN: ${company.strn}` : ''].filter(Boolean).join('   '),
  ].filter(Boolean);
  infoLines.forEach(line => {
    doc.splitTextToSize(line, leftColW).forEach(wl => { doc.text(wl, M, contentY); contentY += 4.5; });
  });

  // Right: Document label
  const rightX = w-M;
  doc.setFont('helvetica','bold'); doc.setFontSize(19); doc.setTextColor(...BL);
  doc.text(docLabel, rightX, 18, { align:'right' });
  doc.setDrawColor(...BLL); doc.setLineWidth(0.5);
  doc.line(w/2+5, 21, rightX, 21);

  // Meta rows
  const metaRows = [
    ['INVOICE NO.', S(docNo)],
    ['DATE',        FMT(docDate)],
    ...(extra.dueDate ? [['DUE DATE', FMT(extra.dueDate)]] : []),
    ...(extra.type ? [['TYPE', S(extra.type).replace(/_/g,' ')]] : []),
    ...(extra.fbrIrn ? [['FBR IRN', S(extra.fbrIrn)]] : []),
  ];
  const rightHalfX = w/2+5;
  let metaY = 28;
  metaRows.forEach(([label, value], idx) => {
    if (idx%2===0) { doc.setFillColor(...BG); doc.rect(rightHalfX-2, metaY-4, rightX-rightHalfX+4, 8.5, 'F'); }
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(...MUT);
    doc.text(label, rightHalfX, metaY, { align:'left' });
    doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...(label==='FBR IRN' ? GRN : DK));
    doc.text(S(value), rightX, metaY, { align:'right' });
    metaY += 9;
  });

  const divY = Math.max(contentY+4, metaY+4, 52);
  doc.setDrawColor(...BL); doc.setLineWidth(0.8); doc.line(M, divY, w-M, divY);
  doc.setFillColor(...AMB); doc.circle(w-M, divY, 1.2, 'F');
  return divY+6;
}

function drawFooter(doc, company) {
  const total = doc.internal.getNumberOfPages();
  for (let i=1; i<=total; i++) {
    doc.setPage(i);
    const { w, h } = ps(doc);
    const fy = h-10;
    doc.setDrawColor(...BDR); doc.setLineWidth(0.4); doc.line(14, fy, w-14, fy);
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(...MUT);
    doc.text(company.businessName||'', 14, fy+4.5);
    doc.text(`Page ${i} of ${total}`, w/2, fy+4.5, { align:'center' });
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}  |  Nizaam.com`, w-14, fy+4.5, { align:'right' });
  }
}

function drawBillTo(doc, x, y, maxW, label, name, lines=[]) {
  doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...MUT);
  doc.text(label, x, y);
  doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(...DK);
  doc.text(S(name,'—'), x, y+7);
  let ly = y+13;
  lines.filter(Boolean).forEach(l => {
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...SUB);
    doc.text(S(l), x, ly, { maxWidth: maxW }); ly += 5;
  });
  return ly;
}

function drawMetaGrid(doc, x, y, w, rows) {
  rows.forEach(([label, value], i) => {
    const ry = y+i*6.5;
    if(i%2===0) { doc.setFillColor(...BG); doc.rect(x-2, ry-3, w+4, 6.5, 'F'); }
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...MUT);
    doc.text(S(label), x, ry);
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...DK);
    doc.text(S(value,' — '), x+w, ry, { align:'right' });
  });
  return y+rows.length*6.5;
}

function drawTotals(doc, x, y, w, rows) {
  let ty = y;
  rows.forEach(({ label, value, highlight, red, green, bold=false }) => {
    const rh = highlight ? 10 : 7.5;
    if (highlight) { doc.setFillColor(...BL); doc.roundedRect(x, ty, w, rh, 1, 1, 'F'); }
    else if (red) { doc.setFillColor(...RED); doc.roundedRect(x, ty, w, rh, 1, 1, 'F'); }
    else if (green) { doc.setFillColor(...GRN); doc.roundedRect(x, ty, w, rh, 1, 1, 'F'); }
    else { doc.setFillColor(...(ty%14<7 ? BG : WH)); doc.rect(x, ty, w, rh, 'F'); }

    const textColor = (highlight||red||green) ? WH : (bold ? DK : SUB);
    const sz = highlight ? 10.5 : (bold ? 9 : 8.5);
    doc.setFont('helvetica', bold||highlight||red||green ? 'bold':'normal');
    doc.setFontSize(sz); doc.setTextColor(...textColor);
    doc.text(label, x+5, ty+rh/2+sz*0.3);
    doc.text(value, x+w-5, ty+rh/2+sz*0.3, { align:'right' });
    ty += rh+1;
  });
  return ty;
}

function drawAmountWords(doc, x, y, w, amount) {
  doc.setFillColor(...BLLX); doc.roundedRect(x, y, w, 9, 1, 1, 'F');
  doc.setDrawColor(...BLL); doc.setLineWidth(0.4); doc.roundedRect(x, y, w, 9, 1, 1, 'S');
  doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...BL2);
  doc.text('Amount in Words:', x+4, y+6);
  doc.setFont('helvetica','italic'); doc.setFontSize(8); doc.setTextColor(...DK);
  doc.text(amountInWords(amount), x+42, y+6, { maxWidth: w-48 });
  return y+13;
}

function drawSigs(doc, x, y, totalW, labels) {
  const sw = (totalW-(labels.length-1)*8)/labels.length;
  labels.forEach((lbl,i) => {
    const sx = x+i*(sw+8);
    doc.setDrawColor(...BDR); doc.setLineWidth(0.6); doc.line(sx, y+14, sx+sw, y+14);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...MUT);
    doc.text(lbl, sx+sw/2, y+19, { align:'center' });
  });
}

// ── Main: Generate FBR Tax Invoice ──────────────────────────────────────────
export async function generateInvoicePDF(invoice, company) {
  const doc = newDoc();
  const { w } = ps(doc);
  const M = 14;

  const logoData = company?.logoBase64 ? await loadLogo(company.logoBase64) : null;

  const fbrAccepted = invoice.fbrStatus === 'ACCEPTED';
  const docLabel = invoice.invoiceType === 'DEBIT_NOTE' ? 'DEBIT NOTE'
    : invoice.invoiceType === 'CREDIT_NOTE' ? 'CREDIT NOTE'
    : invoice.invoiceType === 'EXPORT_INVOICE' ? 'EXPORT INVOICE'
    : 'TAX INVOICE';

  let y = await drawHeader(doc, company || {
    businessName: invoice.sellerBusinessName,
    ntn: invoice.sellerNtn,
    strn: invoice.sellerStrn,
    address: invoice.sellerAddress,
  }, docLabel, invoice.invoiceNumber, invoice.invoiceDate, logoData, {
    type: invoice.invoiceType,
    fbrIrn: invoice.fbrInvoiceNumber || null,
  });

  // Seller + Buyer
  const halfW = (w-M*2-10)/2;
  drawBillTo(doc, M, y, halfW, 'SELLER', invoice.sellerBusinessName, [
    invoice.sellerNtn ? `NTN: ${invoice.sellerNtn}` : null,
    invoice.sellerStrn ? `STRN: ${invoice.sellerStrn}` : null,
    invoice.sellerAddress || null,
    invoice.sellerProvince || null,
  ]);
  drawMetaGrid(doc, M+halfW+10, y, halfW, [
    ['BUYER',      invoice.buyerBusinessName],
    ['REG TYPE',   invoice.buyerRegistrationType],
    ...(invoice.buyerNtn  ? [['NTN',  invoice.buyerNtn]]  : []),
    ...(invoice.buyerStrn ? [['STRN', invoice.buyerStrn]] : []),
    ...(invoice.buyerCnic ? [['CNIC', invoice.buyerCnic]] : []),
    ['ADDRESS',    invoice.buyerAddress||'—'],
    ...(invoice.paymentMethod ? [['PAYMENT', invoice.paymentMethod.replace(/_/g,' ')]] : []),
  ]);

  y += 38;
  doc.setDrawColor(...BDR); doc.setLineWidth(0.3); doc.line(M, y, w-M, y); y += 5;

  // Items table
  const items = invoice.items || [];
  autoTable(doc, {
    startY: y,
    head: [['#','DESCRIPTION','HS CODE','QTY','UNIT','UNIT PRICE','TAXABLE','TAX%','TAX AMT','TOTAL']],
    body: items.map((it,i) => [
      String(i+1).padStart(2,'0'),
      S(it.productDescription),
      S(it.hsCode||'—'),
      QTY(it.quantity),
      S(it.unitOfMeasure),
      PKR(it.unitPrice),
      PKR(it.taxableValue),
      `${it.taxRate}%`,
      PKR(it.taxAmount),
      PKR(it.totalAmount),
    ]),
    theme: 'plain',
    headStyles: { fillColor:BL, textColor:WH, fontStyle:'bold', fontSize:7.5, cellPadding:{top:4.5,bottom:4.5,left:3,right:3} },
    bodyStyles: { fontSize:8.5, cellPadding:{top:4,bottom:4,left:3,right:3}, textColor:DK },
    alternateRowStyles: { fillColor:BG },
    columnStyles: {
      0: { halign:'center', cellWidth:9, textColor:MUT },
      1: { cellWidth:'auto' },
      2: { halign:'center', cellWidth:18, fontSize:7 },
      3: { halign:'center', cellWidth:13 },
      4: { halign:'center', cellWidth:12 },
      5: { halign:'right', cellWidth:24 },
      6: { halign:'right', cellWidth:24 },
      7: { halign:'center', cellWidth:11 },
      8: { halign:'right', cellWidth:22 },
      9: { halign:'right', cellWidth:24, fontStyle:'bold', textColor:BL },
    },
    margin: { left:M, right:M },
  });
  y = doc.lastAutoTable.finalY + 8;

  // Totals
  const totW = 100; const totX = w-M-totW;
  const furtherTax = parseFloat(invoice.totalFurtherTax || 0);
  const balance = parseFloat(invoice.totalInvoiceAmount||0) - parseFloat(invoice.paidAmount||0);

  y = drawTotals(doc, totX, y, totW, [
    { label:'Taxable Value',  value: PKR(invoice.totalTaxableValue) },
    { label:'Sales Tax (GST)',value: PKR(invoice.totalSalesTax), bold:true },
    ...(furtherTax > 0 ? [{ label:'Further Tax (3%)', value: PKR(furtherTax), bold:false }] : []),
    { label:'TOTAL AMOUNT',   value: PKR(invoice.totalInvoiceAmount), highlight:true },
    { label:'Paid Amount',    value: PKR(invoice.paidAmount||0), bold:false },
    balance > 0.5
      ? { label:'BALANCE DUE', value: PKR(balance), red:true }
      : { label:'FULLY PAID',  value: 'CLEARED ✓', green:true },
  ]);
  y += 5;

  y = drawAmountWords(doc, M, y, w-M*2, invoice.totalInvoiceAmount);

  // Remarks / Notes
  if (invoice.remarks || invoice.paymentTerms) {
    y += 3;
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...SUB);
    if (invoice.paymentTerms) { doc.text(`Payment Terms: ${invoice.paymentTerms}`, M, y); y += 5; }
    if (invoice.remarks) { doc.text(`Remarks: ${invoice.remarks}`, M, y, { maxWidth: w-M*2 }); y += 7; }
  }

  // FBR compliance note
  y += 3;
  doc.setFont('helvetica','italic'); doc.setFontSize(7); doc.setTextColor(...MUT);
  doc.text(`FBR Status: ${fbrAccepted ? '✓ ACCEPTED' : invoice.fbrStatus||'PENDING'} | Per SRO 1413(I)/2025`, M, y);
  if (invoice.fbrInvoiceNumber) {
    y += 4;
    doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...GRN);
    doc.text(`FBR IRN: ${invoice.fbrInvoiceNumber}`, M, y);
  }
  y += 10;

  drawSigs(doc, M, y, w-M*2, ['Prepared By','Authorized Signatory','Customer / Receiver']);
  drawFooter(doc, company || { businessName: invoice.sellerBusinessName });

  doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
}

// ── Generate Quotation PDF ───────────────────────────────────────────────────
export async function generateQuotationPDF(quotation, company) {
  const doc = newDoc();
  const { w } = ps(doc);
  const M = 14;

  const logoData = company?.logoBase64 ? await loadLogo(company.logoBase64) : null;

  let y = await drawHeader(doc, company || { businessName: '' }, 'QUOTATION',
    quotation.quotationNumber, quotation.quotationDate, logoData,
    { dueDate: quotation.validUntil });

  const halfW = (w-M*2-10)/2;
  const customer = quotation.customer || {};
  drawBillTo(doc, M, y, halfW, 'QUOTATION FOR', customer.businessName||'Customer', [
    customer.contactPhone ? `Phone: ${customer.contactPhone}` : null,
    customer.address||null, customer.city||null,
  ]);
  drawMetaGrid(doc, M+halfW+10, y, halfW, [
    ['Quotation No.',  quotation.quotationNumber],
    ['Date',           FMT(quotation.quotationDate)],
    ['Valid Until',    quotation.validUntil ? FMT(quotation.validUntil) : '—'],
    ['Status',         quotation.status],
  ]);
  y += 36;
  doc.setDrawColor(...BDR); doc.setLineWidth(0.3); doc.line(M, y, w-M, y); y += 5;

  const items = quotation.items || [];
  autoTable(doc, {
    startY: y,
    head: [['#','DESCRIPTION','QTY','UNIT PRICE','TAXABLE','TAX%','TAX AMT','TOTAL']],
    body: items.map((it,i) => [
      String(i+1).padStart(2,'0'),
      S(it.productDescription),
      QTY(it.quantity),
      PKR(it.unitPrice),
      PKR(it.taxableValue),
      `${it.taxRate}%`,
      PKR(it.taxAmount),
      PKR(it.totalAmount),
    ]),
    theme: 'plain',
    headStyles: { fillColor:BL, textColor:WH, fontStyle:'bold', fontSize:8, cellPadding:{top:5,bottom:5,left:4,right:4} },
    bodyStyles: { fontSize:9, cellPadding:{top:4.5,bottom:4.5,left:4,right:4}, textColor:DK },
    alternateRowStyles: { fillColor:BG },
    columnStyles: {
      0: { halign:'center', cellWidth:10, textColor:MUT },
      1: { cellWidth:'auto' },
      2: { halign:'center', cellWidth:16 },
      3: { halign:'right', cellWidth:30 },
      4: { halign:'right', cellWidth:28 },
      5: { halign:'center', cellWidth:12 },
      6: { halign:'right', cellWidth:26 },
      7: { halign:'right', cellWidth:28, fontStyle:'bold', textColor:BL },
    },
    margin: { left:M, right:M },
  });
  y = doc.lastAutoTable.finalY + 8;

  const totW = 100; const totX = w-M-totW;
  y = drawTotals(doc, totX, y, totW, [
    { label:'Taxable Value', value: PKR(quotation.totalTaxableValue) },
    { label:'GST',           value: PKR(quotation.totalSalesTax), bold:true },
    { label:'TOTAL AMOUNT',  value: PKR(quotation.totalAmount), highlight:true },
  ]);
  y += 5;

  y = drawAmountWords(doc, M, y, w-M*2, quotation.totalAmount);

  if (quotation.notes) {
    y += 3;
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...SUB);
    doc.text(`Notes: ${quotation.notes}`, M, y, { maxWidth: w-M*2 }); y += 7;
  }
  y += 3;
  doc.setFont('helvetica','italic'); doc.setFontSize(7.5); doc.setTextColor(...MUT);
  doc.text('This is a quotation only. Prices valid until the date stated above. Taxes per FBR rates.', M, y);
  y += 10;

  drawSigs(doc, M, y, w-M*2, ['Prepared By','Authorized Signatory','Customer Acceptance']);
  drawFooter(doc, company || { businessName: '' });

  doc.save(`Quotation-${quotation.quotationNumber}.pdf`);
}

// ── Generate Sales Report PDF ────────────────────────────────────────────────
export async function generateReportPDF(invoices, company, range, totals) {
  const doc = newDoc();
  const { w } = ps(doc);
  const M = 14;
  const logoData = company?.logoBase64 ? await loadLogo(company.logoBase64) : null;

  // ── Header stripe
  doc.setFillColor(...BL); doc.rect(0, 0, w, 28, 'F');
  doc.setFillColor(...AMB); doc.rect(w-36, 0, 36, 28, 'F');
  if (logoData) { try { doc.addImage(logoData, 'PNG', M, 5, 18, 14, '', 'FAST'); } catch {} }
  doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(...WH);
  doc.text((company?.businessName || 'Company').toUpperCase(), logoData ? M+22 : M, 12);
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(187,213,228);
  doc.text([
    company?.ntn ? `NTN: ${company.ntn}` : '',
    company?.strn ? `STRN: ${company.strn}` : '',
  ].filter(Boolean).join('  ·  '), logoData ? M+22 : M, 19);
  doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.setTextColor(...AMB);
  doc.text('SALES REPORT', w-M, 12, { align:'right' });
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...WH);
  doc.text(`Period: ${FMT(range?.startDate)} — ${FMT(range?.endDate)}`, w-M, 20, { align:'right' });

  let y = 38;

  // ── Summary stat boxes
  const stats = [
    { label:'Total Invoices', value: String(totals.count||invoices.length) },
    { label:'Taxable Value',  value: PKR(totals.taxable) },
    { label:'Sales Tax',      value: PKR(totals.tax) },
    { label:'Grand Total',    value: PKR(totals.amount), hi: true },
    { label:'Outstanding',    value: PKR(totals.unpaid), red: totals.unpaid > 0 },
  ];
  const bw = (w-M*2-4*(stats.length-1))/stats.length;
  stats.forEach((s, i) => {
    const bx = M + i*(bw+4);
    doc.setFillColor(...(s.hi ? BL : s.red ? [220,38,38] : BG));
    doc.roundedRect(bx, y, bw, 18, 1, 1, 'F');
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5);
    doc.setTextColor(...(s.hi||s.red ? WH : MUT));
    doc.text(s.label, bx + bw/2, y+6, { align:'center' });
    doc.setFont('helvetica','bold'); doc.setFontSize(s.hi ? 9 : 8);
    doc.setTextColor(...(s.hi||s.red ? WH : DK));
    doc.text(s.value, bx + bw/2, y+14, { align:'center' });
  });
  y += 24;

  // ── Accepted invoices count note
  const accepted = invoices.filter(i => i.fbrStatus === 'ACCEPTED').length;
  doc.setFont('helvetica','italic'); doc.setFontSize(7.5); doc.setTextColor(...MUT);
  doc.text(`FBR Accepted: ${accepted} of ${invoices.length} invoices  |  Generated: ${new Date().toLocaleString('en-GB')}  |  Nizaam.com`, M, y);
  y += 8;

  // ── Invoice table
  const dateStr = d => { try { return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric'}); } catch { return ''; } };
  autoTable(doc, {
    startY: y,
    head: [['#','INVOICE NO','DATE','CUSTOMER','TAXABLE (PKR)','TAX (PKR)','TOTAL (PKR)','FBR','PAYMENT']],
    body: invoices.map((inv, i) => [
      String(i+1).padStart(3,'0'),
      inv.invoiceNumber,
      dateStr(inv.invoiceDate),
      (inv.customer?.businessName || '').slice(0, 30),
      _fmt(inv.totalTaxableValue),
      _fmt(inv.totalSalesTax),
      _fmt(inv.totalInvoiceAmount),
      inv.fbrStatus || 'PENDING',
      inv.paymentStatus || 'UNPAID',
    ]),
    foot: [['','','','TOTAL',
      _fmt(totals.taxable),
      _fmt(totals.tax),
      _fmt(totals.amount),
      `${accepted} acc.`,
      `${invoices.filter(i=>i.paymentStatus==='PAID').length} paid`,
    ]],
    theme: 'plain',
    headStyles: { fillColor:BL, textColor:WH, fontStyle:'bold', fontSize:7, cellPadding:{top:4,bottom:4,left:3,right:3} },
    bodyStyles: { fontSize:7.5, cellPadding:{top:3.5,bottom:3.5,left:3,right:3}, textColor:DK },
    alternateRowStyles: { fillColor:BG },
    footStyles: { fillColor:BL, textColor:WH, fontStyle:'bold', fontSize:7.5 },
    columnStyles: {
      0: { halign:'center', cellWidth:8, textColor:MUT },
      1: { cellWidth:32, fontStyle:'bold', textColor:BL2 },
      2: { cellWidth:20 },
      3: { cellWidth:'auto' },
      4: { halign:'right', cellWidth:28 },
      5: { halign:'right', cellWidth:22, textColor:GRN },
      6: { halign:'right', cellWidth:28, fontStyle:'bold' },
      7: { halign:'center', cellWidth:18, fontSize:6.5 },
      8: { halign:'center', cellWidth:16, fontSize:6.5 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const v = data.cell.raw;
        if (v === 'ACCEPTED') data.cell.styles.textColor = GRN;
        else if (v === 'ERROR' || v === 'CANCELLED') data.cell.styles.textColor = RED;
        else data.cell.styles.textColor = [180,107,0];
      }
      if (data.section === 'body' && data.column.index === 8) {
        const v = data.cell.raw;
        if (v === 'PAID') data.cell.styles.textColor = GRN;
        else if (v === 'PARTIAL') data.cell.styles.textColor = [180,107,0];
        else data.cell.styles.textColor = RED;
      }
    },
    margin: { left:M, right:M },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Footer
  drawFooter(doc, company || { businessName: '' });

  const filename = `Sales-Report-${range?.startDate||'all'}-to-${range?.endDate||'all'}.pdf`;
  doc.save(filename);
}

// ── Print helper — opens system print dialog on current page ─────────────────
export function printCurrentPage() {
  window.print();
}
