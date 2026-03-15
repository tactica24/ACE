import { RightsTier } from '@prisma/client';

export function generateContract(args: {
  creatorName: string;
  videoTitle: string;
  rightsTier: RightsTier;
  payoutSplit: number;
}) {
  const tierLabel = args.rightsTier === RightsTier.EXCLUSIVE ? 'Exclusive' : 'Shared';
  const payoutPercent = Math.round(args.payoutSplit * 100);
  const platformPercent = 100 - payoutPercent;

  return [
    `ACE DIGITAL LICENSE AGREEMENT`,
    `Date: ${new Date().toLocaleDateString()}`,
    `Creator: ${args.creatorName}`,
    `Title: ${args.videoTitle}`,
    `Rights Tier: ${tierLabel}`,
    `Revenue Split: ${payoutPercent}% Creator / ${platformPercent}% ACE`,
    `Grant of Rights: The Creator grants ACE the right to distribute the title within ACE channels, including offline encrypted distribution via .ace files.`,
    `Term: 12 months with auto-renewal unless either party terminates with 30 days notice.`,
    `Security: ACE will apply signed URLs, dynamic watermarking, and device-bound unlocks.`,
    `Payments: Creator payouts settle weekly to the registered payout account.`,
    `Governing Law: Federal Republic of Nigeria.`
  ].join('\n');
}


