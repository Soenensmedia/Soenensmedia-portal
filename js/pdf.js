import { contractDocHtml } from './contractDoc.js';

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

export function generateAgreementCopyPdf(project, settings) {
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

  // ── titel + datum rechtsboven ──
  doc.setTextColor(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('ONDERTEKENINGSBEWIJS', 190, 22, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90);
  const ry = 29;
  doc.text(`Datum: ${fmtDateNL(project.agreement_signed_at)}`, 190, ry, { align: 'right' });

  y = Math.max(y, ry + 5) + 10;
  doc.setDrawColor(220);
  doc.line(marginX, y, 190, y);
  y += 10;

  // ── project + ondertekenaar ──
  doc.setTextColor(120);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('PROJECT', marginX, y);
  y += 5;
  doc.setTextColor(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(project.title || '—', marginX, y);
  y += 10;

  doc.setTextColor(120);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('ONDERTEKEND DOOR', marginX, y);
  y += 5;
  doc.setTextColor(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(project.agreement_signed_name || '—', marginX, y);
  y += 12;

  doc.setDrawColor(220);
  doc.line(marginX, y, 190, y);
  y += 10;

  // ── contracttekst (of verwijzing naar bijgevoegd bestand) ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30);
  if (project.agreement_bestand_naam) {
    doc.text(`Overeenkomst: zie bijgevoegd bestand "${project.agreement_bestand_naam}".`, marginX, y, { maxWidth: 170 });
    y += 12;
  } else if (project.agreement_content) {
    const lines = doc.splitTextToSize(project.agreement_content, 170);
    doc.text(lines, marginX, y);
    y += lines.length * 4.6 + 8;
  }

  // ── footer ──
  doc.setFontSize(8.5);
  doc.setTextColor(120);
  doc.text(
    `Digitaal ondertekend via het ${settings.bedrijfsnaam || 'SoenensMedia'}-klantportaal op ${fmtDateNL(project.agreement_signed_at)} door ${project.agreement_signed_name || '—'}.`,
    marginX, y, { maxWidth: 170 },
  );

  return doc;
}

export function generateContractPdf(contract) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const marginX = 20;
  const pageBottom = 280;
  let y = 22;

  function ensureSpace(needed) {
    if (y + needed > pageBottom) {
      doc.addPage();
      y = 22;
    }
  }

  // Contracttekst wordt geparsed uit dezelfde HTML als de portaal-weergave
  // (contractDocHtml) — zo blijft de PDF altijd exact gesynchroniseerd
  // met wat admin en klant op het scherm zien, zonder de tekst te dupliceren.
  const wrap = document.createElement('div');
  wrap.innerHTML = contractDocHtml(contract);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20);
  doc.text(contract.kind === 'opdracht' ? 'Offerte & opdrachtbevestiging' : 'Retainerovereenkomst', marginX, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(110);
  doc.text(`Ref. ${contract.ref || '—'} · Soenens Media`, marginX, y);
  y += 10;
  doc.setDrawColor(220);
  doc.line(marginX, y, 190, y);
  y += 8;

  wrap.querySelectorAll('.doc-art').forEach((art) => {
    const heading = art.querySelector('.doc-art-h')?.textContent.replace(/\s+/g, ' ').trim();
    ensureSpace(14);
    if (heading) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(20);
      doc.text(heading, marginX, y);
      y += 7;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(40);

    art.querySelectorAll(':scope > p, :scope > .doc-parties, :scope > .doc-pack-card, :scope > .doc-totals, :scope > .doc-meta, :scope > .doc-items-wrap, :scope > .doc-cols').forEach((block) => {
      if (block.classList.contains('doc-items-wrap')) {
        block.querySelectorAll('table.doc-items tbody tr').forEach((tr) => {
          const [d, q, u, r, tot] = [...tr.children].map((td) => td.textContent.trim());
          const text = `${d} — ${q} ${u} × ${r} = ${tot}`;
          const lines = doc.splitTextToSize(text, 170);
          ensureSpace(lines.length * 4.6 + 1);
          doc.text(lines, marginX, y);
          y += lines.length * 4.6 + 1;
        });
        y += 3;
        return;
      }
      if (block.classList.contains('doc-meta')) {
        block.querySelectorAll('dt').forEach((dt) => {
          const text = `${dt.textContent.trim()}: ${dt.nextElementSibling?.textContent.trim() || ''}`;
          ensureSpace(5.5);
          doc.text(text, marginX, y);
          y += 5;
        });
        y += 3;
        return;
      }
      const text = block.textContent.replace(/\s+/g, ' ').trim();
      if (!text) return;
      const lines = doc.splitTextToSize(text, 170);
      ensureSpace(lines.length * 4.6 + 4);
      doc.text(lines, marginX, y);
      y += lines.length * 4.6 + 4;
    });
    y += 3;
  });

  // ── handtekeningen ──
  ensureSpace(60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(20);
  doc.text(`11 ${contract.kind === 'opdracht' ? 'Akkoord' : 'Handtekeningen'}`, marginX, y);
  y += 10;

  const sigY = y;
  [
    { label: 'Voor Soenens Media', img: contract.sm_sig_image, name: contract.sm_sig_name, role: contract.sm_sig_role, date: contract.sm_signed_at, x: marginX },
    { label: 'Voor de klant', img: contract.cl_sig_image, name: contract.cl_sig_name, role: contract.cl_sig_role, date: contract.cl_signed_at, x: 110 },
  ].forEach((sig) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(sig.label, sig.x, sigY);
    if (sig.img) {
      try { doc.addImage(sig.img, 'PNG', sig.x, sigY + 3, 70, 26); } catch { /* ongeldige data-url, sla over */ }
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(20);
    doc.text(sig.name || '—', sig.x, sigY + 33);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(110);
    doc.text([sig.role, sig.date ? fmtDateNL(sig.date) : null].filter(Boolean).join(' · ') || 'Nog niet ondertekend', sig.x, sigY + 38);
  });
  y = sigY + 46;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(140);
  doc.text('Elektronische ondertekening, gelijkwaardig aan een handgeschreven handtekening (Verordening (EU) nr. 910/2014 — eIDAS).', marginX, y, { maxWidth: 170 });

  return doc;
}

export function downloadPdf(doc, filename) {
  doc.save(filename);
}

export function pdfToBase64(doc) {
  return doc.output('datauristring').split(',')[1];
}
