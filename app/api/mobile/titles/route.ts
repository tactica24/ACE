import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { CurrencyService, Currency } from '@/lib/currency';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(24),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'NGN']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { limit, currency: preferredCurrency } = querySchema.parse({
      limit: searchParams.get('limit'),
      currency: searchParams.get('currency'),
    });

    // Detect user's currency from headers or use preferred
    const userCurrency = preferredCurrency 
      ? preferredCurrency as Currency
      : CurrencyService.detectUserCurrency(request);

    // Fetch approved videos with pricing
    const videos = await prisma.video.findMany({
      where: { 
        status: 'APPROVED',
        seriesId: null, // Only show main titles, not episodes
      },
      select: {
        id: true,
        seriesId: true,
        title: true,
        description: true,
        videoType: true,
        ageRating: true,
        category: true,
        genres: true,
        teaserSec: true,
        durationSec: true,
        releaseYear: true,
        highlightSeconds: true,
        posterKey: true,
        priceTier: true,
        rightsTier: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Get pricing configuration
    const financeConfig = await prisma.financeConfig.findUnique({
      where: { id: 'default' },
    });

    if (!financeConfig) {
      return NextResponse.json(
        { error: 'Finance configuration not found' },
        { status: 500 }
      );
    }

    // Transform videos for mobile API with international pricing
    const titles = videos.map((video) => {
      let priceMinor: number;
      let currency: string;

      // Determine pricing based on user's currency
      switch (userCurrency) {
        case Currency.USD:
          priceMinor = financeConfig.snackUsdMinor;
          currency = 'USD';
          break;
        case Currency.EUR:
          priceMinor = financeConfig.snackEurMinor;
          currency = 'EUR';
          break;
        case Currency.GBP:
          priceMinor = financeConfig.snackGbpMinor;
          currency = 'GBP';
          break;
        case Currency.CAD:
          priceMinor = financeConfig.snackCadMinor;
          currency = 'CAD';
          break;
        case Currency.NGN:
        default:
          priceMinor = financeConfig.snackNaira;
          currency = 'NGN';
          break;
      }

      // Adjust for different price tiers
      const tierMultiplier = {
        SNACK: 1,
        STANDARD: 1.5,
        PREMIERE: 2.5,
      };

      const finalPriceMinor = Math.round(
        priceMinor * (tierMultiplier[video.priceTier as keyof typeof tierMultiplier] || 1)
      );

      return {
        id: video.id,
        title: video.title,
        description: video.description,
        videoType: video.videoType,
        ageRating: video.ageRating,
        category: video.category,
        genres: video.genres,
        durationSec: video.durationSec,
        releaseYear: video.releaseYear,
        posterKey: video.posterKey,
        priceTier: video.priceTier,
        rightsTier: video.rightsTier,
        // International pricing
        price: {
          currency,
          minorUnits: finalPriceMinor,
          formatted: CurrencyService.formatPrice({
            minorUnits: finalPriceMinor,
            currency: userCurrency,
          }),
        },
        // Metadata for UI
        heroLabel: video.videoType === 'SERIES' ? 'SERIES' : 'FILM',
      };
    });

    return NextResponse.json({
      titles,
      currency: userCurrency,
      total: titles.length,
      hasMore: videos.length === limit,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120'
      }
    });

  } catch (error) {
    console.error('Mobile titles API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch titles' },
      { status: 500 }
    );
  }
}
