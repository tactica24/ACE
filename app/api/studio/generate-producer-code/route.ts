import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { generateUniqueCreatorNumber } from '@/lib/creator-number';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth || (auth.role !== 'CREATOR' && auth.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow users to generate codes for their own profile
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId: auth.sub },
      select: { id: true, creatorNumber: true }
    });

    if (!creatorProfile) {
      return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 });
    }

    if (creatorProfile.creatorNumber) {
      return NextResponse.json({
        error: 'Producer code already exists',
        creatorNumber: creatorProfile.creatorNumber
      }, { status: 400 });
    }

    // Generate new producer code
    const creatorNumber = await generateUniqueCreatorNumber();

    // Update the creator profile with the new code
    const updatedProfile = await prisma.creatorProfile.update({
      where: { userId: auth.sub },
      data: { creatorNumber },
      select: { creatorNumber: true }
    });

    return NextResponse.json({
      success: true,
      creatorNumber: updatedProfile.creatorNumber
    });
  } catch (error) {
    console.error('Error generating producer code:', error);
    return NextResponse.json(
      { error: 'Failed to generate producer code' },
      { status: 500 }
    );
  }
}