import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { creditsToStoredUnits, storedUnitsToCredits } from '@/lib/credits';
import { prisma } from '@/lib/db';
import { markPaymentFailed, markPaymentSuccessful, validateSettledPayment } from '@/lib/payment-ops';
import { verifyTransaction } from '@/lib/paystack';
import { getStripe } from '@/lib/stripe';

function getActionType(balanceNairaDelta: number, creditsDelta: number) {
  if (balanceNairaDelta !== 0 && creditsDelta !== 0) return 'SUPPORT_COMPENSATION';
  if (creditsDelta !== 0) return 'CREDIT_ADJUSTMENT';
  return 'WALLET_ADJUSTMENT';
}

function serializeWallet(wallet: { balanceNaira: number; credits: number }) {
  return {
    ...wallet,
    credits: storedUnitsToCredits(wallet.credits)
  };
}

function serializeSupportAction<T extends {
  creditsDelta: number;
  resultingCredits: number | null;
}>(action: T) {
  return {
    ...action,
    creditsDelta: storedUnitsToCredits(action.creditsDelta),
    resultingCredits: action.resultingCredits === null ? null : storedUnitsToCredits(action.resultingCredits)
  };
}

async function logSupportAction(args: {
  adminUserId: string;
  userId: string;
  paymentId?: string | null;
  actionType: 'PAYMENT_VERIFY' | 'PAYMENT_STATUS_UPDATE' | 'WALLET_ADJUSTMENT' | 'CREDIT_ADJUSTMENT' | 'SUPPORT_COMPENSATION';
  amountNairaDelta?: number;
  creditsDelta?: number;
  resultingBalanceNaira?: number | null;
  resultingCredits?: number | null;
  note: string;
}) {
  return prisma.adminSupportAction.create({
    data: {
      adminUserId: args.adminUserId,
      userId: args.userId,
      paymentId: args.paymentId ?? null,
      actionType: args.actionType,
      amountNairaDelta: args.amountNairaDelta ?? 0,
      creditsDelta: args.creditsDelta ?? 0,
      resultingBalanceNaira: args.resultingBalanceNaira ?? null,
      resultingCredits: args.resultingCredits ?? null,
      note: args.note
    },
    select: {
      id: true,
      actionType: true,
      amountNairaDelta: true,
      creditsDelta: true,
      resultingBalanceNaira: true,
      resultingCredits: true,
      note: true,
      createdAt: true,
      adminUser: { select: { email: true } }
    }
  });
}

async function getStripeSupportSnapshot(reference: string) {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) {
    throw new Error('Payment not found.');
  }

  const metadata = (payment.metadata as { stripeSessionId?: string } | null) ?? null;
  if (!metadata?.stripeSessionId) {
    throw new Error('Stripe session ID is missing for this payment.');
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(metadata.stripeSessionId);

  if (session.payment_status === 'paid') {
    const amountMinor = session.amount_total ?? payment.amountMinor;
    const validation = validateSettledPayment(payment, {
      amountMinor,
      currency: session.currency?.toUpperCase() ?? payment.currency
    });
    if (!validation.ok) {
      await markPaymentFailed(reference);
      return { externalStatus: 'amount_mismatch', payment: await prisma.payment.findUnique({ where: { reference } }) };
    }

    await markPaymentSuccessful({
      reference,
      amountMinor,
      currency: validation.currency
    });
    return { externalStatus: 'paid', payment: await prisma.payment.findUnique({ where: { reference } }) };
  }

  if (session.status === 'expired') {
    await markPaymentFailed(reference);
    return { externalStatus: 'expired', payment: await prisma.payment.findUnique({ where: { reference } }) };
  }

  return { externalStatus: session.payment_status ?? session.status ?? 'pending', payment };
}

async function getPaystackSupportSnapshot(reference: string) {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) {
    throw new Error('Payment not found.');
  }

  const verification = await verifyTransaction(reference);
  if (verification.status && verification.data.status === 'success') {
    const amountMinor = verification.data.amount;
    const feeMinor = typeof verification.data.fees === 'number' ? verification.data.fees : null;
    const netMinor = feeMinor === null ? null : amountMinor - feeMinor;
    const validation = validateSettledPayment(payment, {
      amountMinor,
      currency: verification.data.currency ?? payment.currency
    });
    if (!validation.ok) {
      await markPaymentFailed(reference);
      return { externalStatus: 'amount_mismatch', payment: await prisma.payment.findUnique({ where: { reference } }) };
    }

    await markPaymentSuccessful({
      reference,
      amountMinor,
      currency: validation.currency,
      feeMinor,
      netMinor
    });
    return { externalStatus: 'success', payment: await prisma.payment.findUnique({ where: { reference } }) };
  }

  if (verification.data.status === 'failed' || verification.data.status === 'abandoned') {
    await markPaymentFailed(reference);
    return { externalStatus: verification.data.status, payment: await prisma.payment.findUnique({ where: { reference } }) };
  }

  return { externalStatus: verification.data.status ?? 'pending', payment };
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const action = typeof body?.action === 'string' ? body.action : '';

  try {
    if (action === 'VERIFY_PAYMENT') {
      const reference = typeof body?.reference === 'string' ? body.reference.trim() : '';
      const targetUserId = typeof body?.userId === 'string' ? body.userId.trim() : '';
      if (!reference) {
        return NextResponse.json({ error: 'Payment reference is required.' }, { status: 400 });
      }

      const payment = await prisma.payment.findUnique({ where: { reference } });
      if (!payment) {
        return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
      }
      if (targetUserId && payment.userId !== targetUserId) {
        return NextResponse.json({ error: 'That payment belongs to a different user.' }, { status: 400 });
      }

      const result = payment.gateway === 'STRIPE'
        ? await getStripeSupportSnapshot(reference)
        : await getPaystackSupportSnapshot(reference);

      const supportAction = await logSupportAction({
        adminUserId: auth.sub,
        userId: payment.userId,
        paymentId: payment.id,
        actionType: 'PAYMENT_VERIFY',
        note: `Gateway verification completed for ${reference}. External status: ${result.externalStatus}.`
      });

      return NextResponse.json({
        ok: true,
        payment: result.payment,
        externalStatus: result.externalStatus,
        action: serializeSupportAction(supportAction)
      });
    }

    if (action === 'UPDATE_PAYMENT_STATUS') {
      const reference = typeof body?.reference === 'string' ? body.reference.trim() : '';
      const status = body?.status === 'REFUNDED' || body?.status === 'REVERSED' ? body.status : '';
      const note = typeof body?.note === 'string' ? body.note.trim() : '';
      if (!reference || !status || !note) {
        return NextResponse.json({ error: 'Reference, status, and support note are required.' }, { status: 400 });
      }

      const payment = await prisma.payment.update({
        where: { reference },
        data: { status },
        select: {
          id: true,
          userId: true,
          reference: true,
          amountNaira: true,
          amountMinor: true,
          currency: true,
          status: true,
          gateway: true,
          createdAt: true
        }
      });

      const supportAction = await logSupportAction({
        adminUserId: auth.sub,
        userId: payment.userId,
        paymentId: payment.id,
        actionType: 'PAYMENT_STATUS_UPDATE',
        note
      });

      return NextResponse.json({ ok: true, payment, action: serializeSupportAction(supportAction) });
    }

    if (action === 'ADJUST_ACCOUNT') {
      const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
      const note = typeof body?.note === 'string' ? body.note.trim() : '';
      const reference = typeof body?.reference === 'string' ? body.reference.trim() : '';
      const amountNairaDelta = Math.round(Number(body?.amountNairaDelta ?? 0));
      const creditsDelta = creditsToStoredUnits(Number(body?.creditsDelta ?? 0));

      if (!userId || !note) {
        return NextResponse.json({ error: 'User and support note are required.' }, { status: 400 });
      }
      if (!amountNairaDelta && !creditsDelta) {
        return NextResponse.json({ error: 'Provide a wallet or credit adjustment.' }, { status: 400 });
      }

      const payment = reference ? await prisma.payment.findUnique({ where: { reference } }) : null;
      if (reference && !payment) {
        return NextResponse.json({ error: 'Payment reference was not found.' }, { status: 404 });
      }

      const result = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`support:${userId}`}))`;

        const wallet = await tx.wallet.upsert({
          where: { userId },
          update: {},
          create: { userId }
        });

        const nextBalance = wallet.balanceNaira + amountNairaDelta;
        const nextCredits = wallet.credits + creditsDelta;
        if (nextBalance < 0 || nextCredits < 0) {
          throw new Error('This adjustment would leave the user with a negative wallet balance or credits.');
        }

        const updatedWallet = await tx.wallet.update({
          where: { userId },
          data: {
            balanceNaira: nextBalance,
            credits: nextCredits
          }
        });

        const actionRecord = await tx.adminSupportAction.create({
          data: {
            adminUserId: auth.sub,
            userId,
            paymentId: payment?.id ?? null,
            actionType: getActionType(amountNairaDelta, creditsDelta),
            amountNairaDelta,
            creditsDelta,
            resultingBalanceNaira: updatedWallet.balanceNaira,
            resultingCredits: updatedWallet.credits,
            note
          },
          select: {
            id: true,
            actionType: true,
            amountNairaDelta: true,
            creditsDelta: true,
            resultingBalanceNaira: true,
            resultingCredits: true,
            note: true,
            createdAt: true,
            adminUser: { select: { email: true } }
          }
        });

        return { wallet: updatedWallet, action: actionRecord };
      });

      return NextResponse.json({
        ok: true,
        wallet: serializeWallet(result.wallet),
        action: serializeSupportAction(result.action)
      });
    }

    return NextResponse.json({ error: 'Unsupported support action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to complete this admin support action.' },
      { status: 400 }
    );
  }
}
