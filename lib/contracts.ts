export type RightsTierValue = 'SHARED' | 'EXCLUSIVE';

type ContractDocumentArgs = {
  effectiveDate: Date | string;
  producerDisplayName: string;
  producerNumber?: string | null;
  producerSignedName?: string | null;
  producerSignedDate?: Date | string | null;
  videoTitle: string;
  rightsTier: RightsTierValue;
  payoutSplit: number;
  paymentSchedule?: string;
  minimumPayoutNaira?: number;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatContractDate(value: Date | string | null | undefined) {
  if (!value) return '';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function createContractDownloadFileName(videoTitle: string, producerNumber?: string | null) {
  const safeTitle = videoTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'content-distribution-agreement';
  const safeProducerNumber = (producerNumber ?? 'producer-record').replace(/[^A-Za-z0-9-]+/g, '-');
  return `${safeTitle}-${safeProducerNumber}-distribution-agreement.doc`;
}

export function buildContractDocument(args: ContractDocumentArgs) {
  const payoutPercent = Math.round(args.payoutSplit * 100);
  const platformPercent = 100 - payoutPercent;
  const effectiveDateLabel = formatContractDate(args.effectiveDate);
  const signedDateLabel = formatContractDate(args.producerSignedDate);
  const producerName = args.producerDisplayName.trim();
  const producerSignedName = args.producerSignedName?.trim() || '__________________________';
  const paymentSchedule = args.paymentSchedule?.trim() || 'Monthly';
  const minimumPayoutNaira = args.minimumPayoutNaira ?? 10000;
  const rightsLabel = args.rightsTier === 'EXCLUSIVE' ? 'Exclusive distribution election' : 'Shared distribution election';
  const producerNumberLabel = args.producerNumber?.trim() || 'Pending assignment';

  const sections = [
    {
      title: 'I. Grant of Rights',
      body:
        `The Producer hereby grants the Platform a non-exclusive, worldwide license to host, stream, market, and distribute the audiovisual content titled "${args.videoTitle}" ("Content") through the ACE Studio marketplace and related playback surfaces. The Producer retains all copyrights and ownership of the original intellectual property except for the distribution rights expressly granted in this Agreement.`
    },
    {
      title: 'II. Revenue Sharing and Payment',
      body:
        `Revenue generated from sales, rentals, unlocks, or subscription access to the Content will be split ${payoutPercent}% to the Producer and ${platformPercent}% to the Platform. This split is calculated on Net Revenue, meaning gross receipts actually received by the Platform less third-party processing, gateway, marketplace, and app-store fees. Producer balances are scheduled for ${paymentSchedule.toLowerCase()} disbursement once the payable balance exceeds NGN ${minimumPayoutNaira.toLocaleString('en-US')}.`
    },
    {
      title: 'III. Producer Obligations',
      body:
        'The Producer agrees to provide the Content in the technical formats required by ACE Studio, including deliverables suitable for reliable streaming playback. The Producer represents and warrants that all rights needed for global digital distribution have been cleared, including music, likeness, performance, underlying script, artwork, and any guild, union, or location permissions that apply to the Content.'
    },
    {
      title: 'IV. Platform Obligations',
      body:
        'The Platform will provide hosting, secure playback infrastructure, storefront placement, and reporting tools that allow the Producer to monitor catalog status and performance. The Platform may moderate, classify, or temporarily withhold publication of the Content when required for quality control, legal review, fraud prevention, or safety policy enforcement.'
    },
    {
      title: 'V. Term and Termination',
      body:
        'This Agreement begins on the Effective Date and remains in effect until terminated by either party with at least 30 days written notice. After a valid termination request, the Platform will remove the Content from active marketplace availability within 14 business days, subject to any legal, accounting, or already-completed consumer transactions that must remain on record.'
    },
    {
      title: 'VI. Indemnification',
      body:
        'The Producer agrees to indemnify and hold harmless ACE Studio, its officers, team members, contractors, and affiliates from claims, damages, losses, or expenses arising out of a breach of the Producer warranties, including disputes relating to ownership, copyright, privacy, defamation, music rights, or distribution authority.'
    },
    {
      title: 'VII. Confidentiality',
      body:
        'Both parties agree to keep non-public commercial terms, operational information, platform security details, and unreleased product information confidential except where disclosure is required by law, regulation, professional advisers, payment processors, or auditors acting under confidentiality obligations.'
    }
  ];

  const intro =
    `This Content Distribution Agreement ("Agreement") is entered into as of ${effectiveDateLabel}, by and between ACE Studio ("Platform") and ${producerName} ("Producer"). This Agreement governs the title "${args.videoTitle}" and is stored in ACE Studio under producer number ${producerNumberLabel}.`;

  const plainText = [
    'CONTENT DISTRIBUTION AGREEMENT',
    '',
    `Effective Date: ${effectiveDateLabel}`,
    `Producer: ${producerName}`,
    `Producer Number: ${producerNumberLabel}`,
    `Content Title: ${args.videoTitle}`,
    `Rights Election: ${rightsLabel}`,
    '',
    intro,
    '',
    ...sections.flatMap((section) => [section.title, section.body, '']),
    'SIGNATURES',
    '',
    'Platform Representative: ACE Studio',
    `Date: ${effectiveDateLabel}`,
    '',
    `Producer Representative: ${producerSignedName}`,
    `Date: ${signedDateLabel || '__________________________'}`
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ACE Studio Content Distribution Agreement</title>
    <style>
      body {
        margin: 0;
        padding: 40px;
        background: #f4f1ea;
        color: #171717;
        font-family: "Georgia", "Times New Roman", serif;
        line-height: 1.65;
      }
      .document {
        max-width: 900px;
        margin: 0 auto;
        padding: 56px 64px;
        background: #ffffff;
        border: 1px solid #d8d1c4;
        box-shadow: 0 18px 50px rgba(23, 23, 23, 0.12);
      }
      .eyebrow {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #6c5c3f;
      }
      h1 {
        margin: 10px 0 8px;
        font-size: 30px;
        line-height: 1.1;
      }
      .meta {
        display: table;
        width: 100%;
        margin: 28px 0 22px;
        border-collapse: collapse;
      }
      .meta-row {
        display: table-row;
      }
      .meta-label,
      .meta-value {
        display: table-cell;
        padding: 7px 0;
        border-bottom: 1px solid #ece6da;
        vertical-align: top;
      }
      .meta-label {
        width: 190px;
        font-weight: 700;
        color: #473d2a;
      }
      h2 {
        margin: 28px 0 10px;
        font-size: 19px;
        line-height: 1.25;
      }
      p {
        margin: 0 0 14px;
      }
      .signature-grid {
        display: table;
        width: 100%;
        margin-top: 36px;
        border-spacing: 22px 0;
      }
      .signature-cell {
        display: table-cell;
        width: 50%;
        padding-top: 12px;
        vertical-align: top;
      }
      .signature-line {
        border-top: 1px solid #171717;
        padding-top: 10px;
        margin-top: 52px;
      }
      .signature-label {
        font-size: 12px;
        color: #5d5d5d;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .footer-note {
        margin-top: 28px;
        font-size: 12px;
        color: #5d5d5d;
      }
    </style>
  </head>
  <body>
    <div class="document">
      <div class="eyebrow">ACE Studio Legal Record</div>
      <h1>Content Distribution Agreement</h1>
      <p>${escapeHtml(intro)}</p>
      <div class="meta">
        <div class="meta-row"><div class="meta-label">Effective Date</div><div class="meta-value">${escapeHtml(effectiveDateLabel)}</div></div>
        <div class="meta-row"><div class="meta-label">Producer</div><div class="meta-value">${escapeHtml(producerName)}</div></div>
        <div class="meta-row"><div class="meta-label">Producer Number</div><div class="meta-value">${escapeHtml(producerNumberLabel)}</div></div>
        <div class="meta-row"><div class="meta-label">Content Title</div><div class="meta-value">${escapeHtml(args.videoTitle)}</div></div>
        <div class="meta-row"><div class="meta-label">Rights Election</div><div class="meta-value">${escapeHtml(rightsLabel)}</div></div>
      </div>
      ${sections
        .map(
          (section) =>
            `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.body)}</p></section>`
        )
        .join('')}
      <div class="signature-grid">
        <div class="signature-cell">
          <div class="signature-line">ACE Studio</div>
          <div class="signature-label">Platform Representative</div>
          <div class="footer-note">Date: ${escapeHtml(effectiveDateLabel)}</div>
        </div>
        <div class="signature-cell">
          <div class="signature-line">${escapeHtml(producerSignedName)}</div>
          <div class="signature-label">Producer Representative</div>
          <div class="footer-note">Date: ${escapeHtml(signedDateLabel || 'Pending signature')}</div>
        </div>
      </div>
      <p class="footer-note">This signed document is retained by ACE Studio as part of the producer record for dispute review and compliance tracking.</p>
    </div>
  </body>
</html>`;

  return {
    plainText,
    html,
    downloadFileName: createContractDownloadFileName(args.videoTitle, args.producerNumber)
  };
}

export function generateContract(args: {
  creatorName: string;
  creatorNumber?: string | null;
  videoTitle: string;
  rightsTier: RightsTierValue;
  payoutSplit: number;
  producerSignedName?: string | null;
  effectiveDate?: Date | string;
  producerSignedDate?: Date | string | null;
}) {
  return buildContractDocument({
    effectiveDate: args.effectiveDate ?? new Date(),
    producerDisplayName: args.creatorName,
    producerNumber: args.creatorNumber,
    producerSignedName: args.producerSignedName,
    producerSignedDate: args.producerSignedDate,
    videoTitle: args.videoTitle,
    rightsTier: args.rightsTier,
    payoutSplit: args.payoutSplit
  }).plainText;
}
