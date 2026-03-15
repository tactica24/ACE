import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyTransaction } from '@/lib/paystack';
import { creditWallet } from '@/lib/wallet';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const reference = body.reference as string | undefined;
  if (!reference) return NextResponse.json({ error: 'Missing reference' }, { status: 400 });

  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

  if (payment.gateway === 'STRIPE') {
    if (payment.status === 'SUCCESS') return NextResponse.json({ ok: true, credited: false });
    if (payment.status === 'FAILED') {
      return NextResponse.json({ error: 'Payment failed' }, { status: 400 });
    }
    return NextResponse.json({ status: 'pending' }, { status: 202 });
  }

  if (payment.status === 'SUCCESS') {
    return NextResponse.json({ ok: true, credited: false });
  }

  const verification = await verifyTransaction(reference);
  if (!verification.status || verification.data.status !== 'success') {
    await prisma.payment.update({ where: { reference }, data: { status: 'FAILED' } });
    return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
  }

  const amountNaira = Math.round(verification.data.amount / 100);
  if (amountNaira < payment.amountNaira) {
    await prisma.payment.update({ where: { reference }, data: { status: 'FAILED' } });
    return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
  }
  const feeMinor = typeof verification.data.fees === 'number' ? verification.data.fees : null;
  const amountMinor = verification.data.amount;
  const netMinor = feeMinor === null ? null : amountMinor - feeMinor;
  await prisma.payment.update({
    where: { reference },
    data: {
      status: 'SUCCESS',
      amountMinor,
      currency: verification.data.currency ?? 'NGN',
      feeMinor,
      netMinor
    }
  });

  const type = (payment.metadata as { type?: string } | null)?.type;
  if (type === 'pass') {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await prisma.subscriptionPass.create({
      data: {
        userId: payment.userId,
        creditsRemaining: 30,
        expiresAt
      }
    });
  } else if (type === 'family') {
    const credits = Number((payment.metadata as { credits?: number } | null)?.credits ?? 50);
    const recipientUserId = (payment.metadata as { recipientUserId?: string } | null)?.recipientUserId;
    if (recipientUserId) {
      await prisma.wallet.update({
        where: { userId: recipientUserId },
        data: { credits: { increment: credits } }
      });
    }
  } else {
    await creditWallet(payment.userId, amountNaira);
  }

  if (payment.referralCode) {
    const referral = await prisma.referralLink.findUnique({ where: { code: payment.referralCode } });
    if (referral) {
      const existing = await prisma.referralEvent.findFirst({ where: { paymentId: payment.id } });
      if (!existing) {
        await prisma.referralEvent.create({
          data: {
            referralId: referral.id,
            paymentId: payment.id,
            commissionNaira: 0
          }
        });
      }
    }
  }

  return NextResponse.json({ ok: true, credited: true });
}




