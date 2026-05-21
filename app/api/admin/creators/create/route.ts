import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { generateUniqueCreatorNumber } from '@/lib/creator-number';
import { prisma } from '@/lib/db';

const ADMIN_CREATED_PASSWORD_SENTINEL = 'ADMIN_CREATED_PENDING_AUTH';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  const bankName = typeof body.bankName === 'string' ? body.bankName.trim() : '';
  const bankAccountName = typeof body.bankAccountName === 'string' ? body.bankAccountName.trim() : '';
  const bankAccountNumber = typeof body.bankAccountNumber === 'string' ? body.bankAccountNumber.trim() : '';
  const reliabilityNotes = typeof body.reliabilityNotes === 'string' ? body.reliabilityNotes.trim() : '';

  if (!displayName || !email) {
    return NextResponse.json({ error: 'Producer name and email are required.' }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { creator: true }
  });

  try {
    const record = await prisma.$transaction(async (tx) => {
      const creatorNumber = existingUser?.creator?.creatorNumber ?? (await generateUniqueCreatorNumber());

      if (existingUser) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            name: displayName,
            email,
            role: 'CREATOR',
            signupIntent: 'CREATOR',
            creatorAccessStatus: 'INVITED'
          }
        });

        const profile = existingUser.creator
          ? await tx.creatorProfile.update({
              where: { userId: existingUser.id },
              data: {
                creatorNumber,
                displayName,
                address: address || null,
                bankName: bankName || null,
                bankAccountName: bankAccountName || displayName,
                bankAccountNumber: bankAccountNumber || null,
                reliabilityNotes: reliabilityNotes || existingUser.creator.reliabilityNotes || 'Admin-created producer record',
                verified: true,
                emailVerified: true
              }
            })
          : await tx.creatorProfile.create({
              data: {
                userId: existingUser.id,
                creatorNumber,
                displayName,
                address: address || null,
                bankName: bankName || null,
                bankAccountName: bankAccountName || displayName,
                bankAccountNumber: bankAccountNumber || null,
                reliabilityNotes: reliabilityNotes || 'Admin-created producer record',
                verified: true,
                emailVerified: true
              }
            });

        await tx.wallet.upsert({
          where: { userId: existingUser.id },
          update: {},
          create: {
            userId: existingUser.id
          }
        });

        return {
          id: existingUser.id,
          email,
          displayName: profile.displayName,
          creatorNumber: profile.creatorNumber
        };
      }

      const user = await tx.user.create({
        data: {
          name: displayName,
          email,
          passwordHash: ADMIN_CREATED_PASSWORD_SENTINEL,
          role: 'CREATOR',
          signupIntent: 'CREATOR',
          creatorAccessStatus: 'INVITED',
          wallet: {
            create: {}
          }
        }
      });

      const profile = await tx.creatorProfile.create({
        data: {
          userId: user.id,
          creatorNumber,
          displayName,
          address: address || null,
          bankName: bankName || null,
          bankAccountName: bankAccountName || displayName,
          bankAccountNumber: bankAccountNumber || null,
          reliabilityNotes: reliabilityNotes || 'Admin-created producer record',
          verified: true,
          emailVerified: true
        }
      });

      return {
        id: user.id,
        email: user.email,
        displayName: profile.displayName,
        creatorNumber: profile.creatorNumber
      };
    });

    revalidatePath('/admin/upload');
    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${record.id}`);

    return NextResponse.json({ ok: true, producer: record });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({
        error: 'A producer account with this email or code already exists.'
      }, { status: 400 });
    }

    return NextResponse.json({ error: 'Unable to create the producer right now.' }, { status: 500 });
  }
}
