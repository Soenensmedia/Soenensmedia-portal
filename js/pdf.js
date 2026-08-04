const eur = (n) => '€ ' + (Math.round((n || 0) * 100) / 100).toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDateNL = (iso) => (iso ? new Date(iso).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

function buildDocument({ kind, nummer, datum, vervaldatum, klant, klantEmail, omschrijving, bedrag, btw, showBtw, settings }) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const marginX = 20;
  let y = 22;

  // ── header: bedrijfsgegevens ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(settings.bedrijfsnaam || 'SoenensMedia', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90);
  y += 6;
  if (settings.bedrijfsadres) { doc.text(settings.bedrijfsadres, marginX, y); y += 4.5; }
  if (settings.ondernemingsnummer) { doc.text(`Ondernemingsnr: ${settings.ondernemingsnummer}`, marginX, y); y += 4.5; }

  // ── titel + nummer rechtsboven ──
  doc.setTextColor(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(kind === 'factuur' ? 'FACTUUR' : 'OFFERTE', 190, 22, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90);
  let ry = 29;
  if (nummer) { doc.text(`Nr. ${nummer}`, 190, ry, { align: 'right' }); ry += 5; }
  doc.text(`Datum: ${fmtDateNL(datum)}`, 190, ry, { align: 'right' }); ry += 5;
  if (vervaldatum) { doc.text(`Vervaldatum: ${fmtDateNL(vervaldatum)}`, 190, ry, { align: 'right' }); ry += 5; }

  y = Math.max(y, ry) + 10;
  doc.setDrawColor(220);
  doc.line(marginX, y, 190, y);
  y += 10;

  // ── klant ──
  doc.setTextColor(120);
  doc.setFontSize(9);
  doc.text('AAN', marginX, y);
  y += 5;
  doc.setTextColor(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(klant || '—', marginX, y);
  y += 5.5;
  if (klantEmail) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(klantEmail, marginX, y);
    y += 5.5;
  }
  y += 8;

  // ── tabel ──
  const btwPct = Number(btw) || 0;
  const excl = Number(bedrag) || 0;
  const btwBedrag = showBtw ? excl * (btwPct / 100) : 0;
  const incl = excl + btwBedrag;

  doc.setFillColor(20, 20, 20);
  doc.rect(marginX, y, 170, 8, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('OMSCHRIJVING', marginX + 3, y + 5.5);
  if (showBtw) {
    doc.text('BEDRAG EXCL.', 130, y + 5.5, { align: 'right' });
    doc.text('BTW', 155, y + 5.5, { align: 'right' });
    doc.text('TOTAAL', 187, y + 5.5, { align: 'right' });
  } else {
    doc.text('BEDRAG', 187, y + 5.5, { align: 'right' });
  }
  y += 8;

  doc.setDrawColor(230);
  doc.setTextColor(30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const omschrijvingMaxWidth = showBtw ? 72 : 100;
  const omschrijvingLines = doc.splitTextToSize(omschrijving || '—', omschrijvingMaxWidth);
  const rowHeight = Math.max(8, omschrijvingLines.length * 4.5 + 3);
  doc.text(omschrijvingLines, marginX + 3, y + 5.5);
  if (showBtw) {
    doc.text(eur(excl), 130, y + 5.5, { align: 'right' });
    doc.text(`${btwPct}%`, 155, y + 5.5, { align: 'right' });
    doc.text(eur(incl), 187, y + 5.5, { align: 'right' });
  } else {
    doc.text(eur(excl), 187, y + 5.5, { align: 'right' });
  }
  y += rowHeight;
  doc.line(marginX, y, 190, y);
  y += 10;

  // ── totalen ──
  if (showBtw) {
    doc.setFontSize(9.5);
    doc.setTextColor(90);
    doc.text('Subtotaal (excl. btw)', 150, y, { align: 'right' });
    doc.text(eur(excl), 187, y, { align: 'right' });
    y += 5.5;
    doc.text(`Btw (${btwPct}%)`, 150, y, { align: 'right' });
    doc.text(eur(btwBedrag), 187, y, { align: 'right' });
    y += 6.5;
    doc.setDrawColor(20);
    doc.line(140, y - 4, 190, y - 4);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(20);
  doc.text('Totaal', 150, y, { align: 'right' });
  doc.text(eur(incl), 187, y, { align: 'right' });
  y += 16;

  // ── footer: betalingsvoorwaarden ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(120);
  if (kind === 'factuur') {
    const termijn = settings.betalingstermijn_dagen || 30;
    doc.text(`Gelieve te betalen binnen de ${termijn} dagen na factuurdatum${settings.iban ? ` op rekeningnummer ${settings.iban}` : ''}${nummer ? ` met vermelding van factuurnummer ${nummer}.` : '.'}`, marginX, y, { maxWidth: 170 });
  } else {
    doc.text('Deze offerte is vrijblijvend en geldig gedurende 30 dagen na de datum hierboven.', marginX, y, { maxWidth: 170 });
  }
  y += 10;
  doc.text('Bedankt voor uw vertrouwen — ' + (settings.bedrijfsnaam || 'SoenensMedia'), marginX, y);

  return doc;
}

export function generateFactuurPdf(factuur, settings) {
  return buildDocument({
    kind: 'factuur',
    nummer: factuur.factuurnummer,
    datum: factuur.datum,
    vervaldatum: factuur.vervaldatum,
    klant: factuur.klant,
    klantEmail: factuur.klant_email,
    omschrijving: factuur.omschrijving,
    bedrag: factuur.bedrag,
    btw: factuur.btw,
    showBtw: true,
    settings,
  });
}

export function generateOffertePdf(offerte, settings) {
  return buildDocument({
    kind: 'offerte',
    nummer: offerte.offertenummer,
    datum: offerte.datum,
    vervaldatum: null,
    klant: offerte.klant,
    klantEmail: offerte.klant_email,
    omschrijving: offerte.omschrijving,
    bedrag: offerte.bedrag,
    btw: 0,
    showBtw: false,
    settings,
  });
}

export function downloadPdf(doc, filename) {
  doc.save(filename);
}

export function pdfToBase64(doc) {
  return doc.output('datauristring').split(',')[1];
}
