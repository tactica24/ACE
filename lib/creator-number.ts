import crypto from 'crypto';
import { prisma } from './db';

function buildCandidate() {
  return `ACE-CR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function generateUniqueCreatorNumber() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = buildCandidate();
    const existing = await prisma.creatorProfile.findUnique({
      where: { creatorNumber: candidate },
      select: { id: true }
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new Error('Unable to generate a unique creator number.');
}
