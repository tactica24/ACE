import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../app/app_theme.dart';
import '../features/catalog/models/title_summary.dart';

class TitleCard extends StatelessWidget {
  const TitleCard({
    super.key,
    required this.title,
    required this.posterUrl,
    required this.onTap,
    this.progress,
    this.compact = false,
  });

  final TitleSummary title;
  final String? posterUrl;
  final VoidCallback onTap;
  final double? progress;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Ink(
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(24)),
              child: AspectRatio(
                aspectRatio: 16 / 10,
                child: posterUrl == null
                    ? _FallbackPoster(title: title)
                    : CachedNetworkImage(
                        imageUrl: posterUrl!,
                        fit: BoxFit.cover,
                        errorWidget: (_, __, ___) =>
                            _FallbackPoster(title: title),
                        placeholder: (_, __) => const ColoredBox(
                          color: AppTheme.surfaceElevated,
                        ),
                      ),
              ),
            ),
            Padding(
              padding: EdgeInsets.all(compact ? 12 : 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: (compact
                            ? Theme.of(context).textTheme.titleSmall
                            : Theme.of(context).textTheme.titleMedium)
                        ?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (!compact) ...[
                    const SizedBox(height: 8),
                    Text(
                      '${title.category} / ${title.videoType}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppTheme.textMuted,
                          ),
                    ),
                  ],
                  if (progress != null) ...[
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        minHeight: 5,
                        value: progress,
                        backgroundColor: const Color(0x22FFFFFF),
                        valueColor:
                            const AlwaysStoppedAnimation<Color>(AppTheme.coral),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FallbackPoster extends StatelessWidget {
  const _FallbackPoster({required this.title});

  final TitleSummary title;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: AppTheme.premiumPanelGradient,
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0x22FFFFFF),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                title.heroLabel,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: AppTheme.gold,
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ),
            const Spacer(),
            Text(
              title.title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
