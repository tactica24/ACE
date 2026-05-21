export type RightsTierValue = 'SHARED' | 'EXCLUSIVE';

type ContractDocumentArgs = {
  effectiveDate: Date | string;
  producerDisplayName: string;
  producerNumber?: string | null;
  producerSignedName?: string | null;
  producerSignedDate?: Date | string | null;
  producerSignatureImageUrl?: string | null;
  platformSignatureImageUrl?: string | null;
  videoTitle: string;
  rightsTier: RightsTierValue;
  payoutSplit: number;
  paymentSchedule?: string;
  minimumPayoutNaira?: number;
};

export type ContractSection = {
  title: string;
  body: string;
};

export type ContractSignatureBlock = {
  markLabel: string;
  printedName: string;
  roleLabel: string;
  dateLabel: string;
  signatureImageUrl?: string | null;
};

export type ContractRenderData = {
  title: string;
  intro: string;
  effectiveDateLabel: string;
  producerName: string;
  producerNumberLabel: string;
  videoTitle: string;
  sections: ContractSection[];
  platformSignature: ContractSignatureBlock;
  producerSignature: ContractSignatureBlock;
  footerNote: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderSignatureMark(block: ContractSignatureBlock) {
  if (block.signatureImageUrl) {
    return `<div class="signature-mark"><img src="${escapeHtml(block.signatureImageUrl)}" alt="${escapeHtml(block.roleLabel)} signature" /></div>`;
  }

  return `<div class="signature-mark signature-mark-fallback">${escapeHtml(block.markLabel)}</div>`;
}

function buildSections(args: ContractDocumentArgs): ContractSection[] {
  const payoutPercent = Math.round(args.payoutSplit * 100);
  const platformPercent = 100 - payoutPercent;
  const paymentSchedule = args.paymentSchedule?.trim() || 'Monthly';
  const minimumPayoutNaira = args.minimumPayoutNaira ?? 10000;

  return [
    {
      title: 'I. Grant of Rights',
      body:
        `The Producer hereby grants ACE Studio the limited, non-exclusive rights required to host, stream, market, and distribute the audiovisual content titled "${args.videoTitle}" through ACE Studio and its approved playback surfaces, including transactional, rental, subscription, and electronic sell-through style access where enabled by the agreed commercial package. ACE Studio may not sublicense the Content to another VOD service or third-party platform unless the Producer gives separate written approval.`
    },
    {
      title: 'II. Revenue Sharing and Payment',
      body:
        `Revenue generated from sales, rentals, unlocks, or subscription access to the Content will be split ${payoutPercent}% to the Producer and ${platformPercent}% to ACE Studio. This split is calculated on Net Revenue, meaning gross receipts actually received by ACE Studio less third-party processing, gateway, marketplace, and app-store fees. Producer balances are scheduled for ${paymentSchedule.toLowerCase()} disbursement once the payable balance exceeds NGN ${minimumPayoutNaira.toLocaleString('en-US')}.`
    },
    {
      title: 'III. Delivery, Availability, and Promotion',
      body:
        'The Producer will deliver a technically suitable master, trailer where available, poster artwork, 16:9 key art, promotional stills, subtitles where available, vendor identifiers, territory information, release dates, cast, crew, synopsis, localizations, and other metadata reasonably required for platform publication. ACE Studio may encode, format, feature, promote, subtitle, or package the Content for storefront visibility and viewer discovery, provided those actions do not alter the core work without approval.'
    },
    {
      title: 'IV. Territory, Term, and Availability',
      body:
        'The Content may be made available only in the territories and languages cleared by the Producer or licensor metadata accepted by ACE Studio. Unless a separate title schedule states otherwise, each accepted title is intended to remain available for a minimum two-year commercial availability period during the active agreement term, subject to takedown requirements, rights disputes, blackout windows, or written withdrawal terms agreed by the parties.'
    },
    {
      title: 'V. Monthly Reporting, Royalty Data, and Audit',
      body:
        'ACE Studio will prepare monthly royalty statements from platform records no later than thirty days after month end where reportable activity exists. Each statement may include vendor ID, title, transaction date, transaction count, customer price, ACE service or platform fee, approved third-party deductions, net revenue, producer share, territory information, payment status, and carry-forward balance. ACE Studio will maintain commercially reasonable financial records for the Content and cooperate with a good-faith audit request on reasonable written notice.'
    },
    {
      title: 'VI. Producer Warranties',
      body:
        'The Producer warrants that they control or have cleared all rights necessary for distribution, including picture, music, performance, publicity, and trademark rights, and that the Content does not knowingly infringe any third-party rights or violate applicable law.'
    },
    {
      title: 'VII. Suspension and Termination',
      body:
        'This Agreement begins on the Effective Date and remains active until either party terminates it according to the platform policies then in effect. ACE Studio may suspend or remove the Content while investigating fraud, rights disputes, payment abuse, legal complaints, or safety issues.'
    },
    {
      title: 'VIII. Indemnification',
      body:
        'The Producer agrees to indemnify and hold harmless ACE Studio, its officers, team members, contractors, and affiliates from claims, damages, losses, or expenses arising out of a breach of the Producer warranties, including disputes relating to ownership, copyright, privacy, defamation, music rights, or distribution authority.'
    },
    {
      title: 'IX. Confidentiality',
      body:
        'Both parties agree to keep non-public commercial terms, operational information, platform security details, and unreleased product information confidential except where disclosure is required by law, regulation, professional advisers, payment processors, or auditors acting under confidentiality obligations.'
    }
  ];
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
  return `${safeTitle}-${safeProducerNumber}-distribution-agreement.pdf`;
}

export function buildContractDocument(args: ContractDocumentArgs) {
  const effectiveDateLabel = formatContractDate(args.effectiveDate);
  const signedDateLabel = formatContractDate(args.producerSignedDate) || effectiveDateLabel || 'Pending signature';
  const producerName = args.producerDisplayName.trim();
  const producerSignedName = args.producerSignedName?.trim() || producerName || 'Producer';
  const producerNumberLabel = args.producerNumber?.trim() || 'Pending assignment';
  const sections = buildSections(args);
  const intro =
    `This Content Distribution Agreement ("Agreement") is entered into as of ${effectiveDateLabel}, by and between ACE Studio ("Platform") and ${producerName} ("Producer"). This Agreement governs the title "${args.videoTitle}" and is stored in ACE Studio under producer number ${producerNumberLabel}.`;

  const data: ContractRenderData = {
    title: 'Content Distribution Agreement',
    intro,
    effectiveDateLabel,
    producerName,
    producerNumberLabel,
    videoTitle: args.videoTitle,
    sections,
    platformSignature: {
      markLabel: 'ACE Studio',
      printedName: 'ACE Studio',
      roleLabel: 'Platform Representative',
      dateLabel: effectiveDateLabel || 'Pending signature',
      signatureImageUrl: args.platformSignatureImageUrl ?? null
    },
    producerSignature: {
      markLabel: producerSignedName,
      printedName: producerSignedName,
      roleLabel: 'Producer Representative',
      dateLabel: signedDateLabel,
      signatureImageUrl: args.producerSignatureImageUrl ?? null
    },
    footerNote:
      'This signed document is retained by ACE Studio as part of the producer record for dispute review and compliance tracking.'
  };

  const plainText = [
    data.title.toUpperCase(),
    '',
    `Effective Date: ${data.effectiveDateLabel}`,
    `Producer: ${data.producerName}`,
    `Producer Number: ${data.producerNumberLabel}`,
    `Content Title: ${data.videoTitle}`,
    '',
    data.intro,
    '',
    ...data.sections.flatMap((section) => [section.title, section.body, '']),
    'SIGNATURES',
    '',
    `ACE Studio signature: ${data.platformSignature.printedName}`,
    `Printed Name: ${data.platformSignature.printedName}`,
    `Role: ${data.platformSignature.roleLabel}`,
    `Date: ${data.platformSignature.dateLabel}`,
    '',
    `Producer signature: ${data.producerSignature.printedName}`,
    `Printed Name: ${data.producerSignature.printedName}`,
    `Role: ${data.producerSignature.roleLabel}`,
    `Date: ${data.producerSignature.dateLabel}`,
    '',
    data.footerNote
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
        color: #1a1814;
        font-family: "Georgia", "Times New Roman", serif;
        line-height: 1.62;
      }
      .document {
        max-width: 900px;
        margin: 0 auto;
        background: #fffdf8;
        border: 1px solid #d8cfbf;
        border-radius: 20px;
        padding: 44px;
        box-shadow: 0 24px 60px rgba(53, 39, 18, 0.08);
      }
      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.18em;
        font-size: 11px;
        color: #8a6d42;
        margin-bottom: 16px;
      }
      h1 {
        margin: 0 0 14px;
        font-size: 34px;
        line-height: 1.08;
      }
      h2 {
        margin: 28px 0 10px;
        font-size: 19px;
        line-height: 1.25;
      }
      p {
        margin: 0 0 14px;
      }
      .meta {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin: 26px 0 6px;
      }
      .meta-row {
        border: 1px solid #e5dac8;
        border-radius: 14px;
        padding: 14px 16px;
        background: #fbf7ef;
      }
      .meta-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #7a6952;
        margin-bottom: 6px;
      }
      .meta-value {
        font-size: 16px;
        color: #241d13;
      }
      .signature-grid {
        display: table;
        width: 100%;
        margin-top: 40px;
        border-spacing: 22px 0;
      }
      .signature-cell {
        display: table-cell;
        width: 50%;
        vertical-align: top;
      }
      .signature-card {
        min-height: 220px;
        padding: 20px 18px 18px;
        border: 1px solid #e5dac8;
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(253, 250, 242, 0.98), rgba(246, 239, 226, 0.88));
      }
      .signature-mark {
        height: 78px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        margin-bottom: 10px;
      }
      .signature-mark img {
        max-width: 100%;
        max-height: 74px;
        object-fit: contain;
      }
      .signature-mark-fallback {
        font-size: 28px;
        font-style: italic;
        color: #36250f;
      }
      .signature-line {
        border-top: 1px solid #171717;
        margin: 0 0 10px;
      }
      .signature-name {
        font-size: 17px;
        font-weight: 700;
        color: #17120d;
      }
      .signature-label {
        font-size: 12px;
        color: #5d5d5d;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-top: 4px;
      }
      .footer-note {
        margin-top: 14px;
        font-size: 12px;
        color: #5d5d5d;
      }
    </style>
  </head>
  <body>
    <div class="document">
      <div class="eyebrow">ACE Studio Legal Record</div>
      <h1>${escapeHtml(data.title)}</h1>
      <p>${escapeHtml(data.intro)}</p>
      <div class="meta">
        <div class="meta-row"><div class="meta-label">Effective Date</div><div class="meta-value">${escapeHtml(data.effectiveDateLabel)}</div></div>
        <div class="meta-row"><div class="meta-label">Producer</div><div class="meta-value">${escapeHtml(data.producerName)}</div></div>
        <div class="meta-row"><div class="meta-label">Producer Number</div><div class="meta-value">${escapeHtml(data.producerNumberLabel)}</div></div>
        <div class="meta-row"><div class="meta-label">Content Title</div><div class="meta-value">${escapeHtml(data.videoTitle)}</div></div>
      </div>
      ${data.sections
        .map(
          (section) =>
            `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.body)}</p></section>`
        )
        .join('')}
      <div class="signature-grid">
        <div class="signature-cell">
          <div class="signature-card">
            ${renderSignatureMark(data.platformSignature)}
            <div class="signature-line"></div>
            <div class="signature-name">${escapeHtml(data.platformSignature.printedName)}</div>
            <div class="signature-label">${escapeHtml(data.platformSignature.roleLabel)}</div>
            <div class="footer-note">Date: ${escapeHtml(data.platformSignature.dateLabel)}</div>
          </div>
        </div>
        <div class="signature-cell">
          <div class="signature-card">
            ${renderSignatureMark(data.producerSignature)}
            <div class="signature-line"></div>
            <div class="signature-name">${escapeHtml(data.producerSignature.printedName)}</div>
            <div class="signature-label">${escapeHtml(data.producerSignature.roleLabel)}</div>
            <div class="footer-note">Date: ${escapeHtml(data.producerSignature.dateLabel)}</div>
          </div>
        </div>
      </div>
      <p class="footer-note">${escapeHtml(data.footerNote)}</p>
    </div>
  </body>
</html>`;

  return {
    plainText,
    html,
    data,
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
