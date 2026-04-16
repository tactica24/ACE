import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/app_theme.dart';
import '../../../core/currency/currency_service.dart';
import '../../../widgets/premium_scaffold.dart';
import '../data/catalog_repository.dart';
import '../models/title_detail.dart';

class TitleDetailPage extends ConsumerWidget {
  const TitleDetailPage({super.key, required this.titleId});

  final String titleId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(titleDetailProvider(titleId));

    return PremiumScaffold(
      title: 'Title',
      currentLocation: '/browse',
      body: detailAsync.when(
        data: (detail) => _DetailBody(detail: detail),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Text(error.toString()),
      ),
    );
  }
}

class _DetailBody extends StatelessWidget {
  const _DetailBody({required this.detail});

  final TitleDetail detail;

  @override
  Widget build(BuildContext context) {
    final title = detail.summary;
    final canWatch = detail.access.hasAccess;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(30),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF13203C), Color(0xFF0B1320), Color(0xFF221529)],
            ),
            border: Border.all(color: AppTheme.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title.title,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                      letterSpacing: -1,
                    ),
              ),
              const SizedBox(height: 12),
              Text(
                title.description,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppTheme.textMuted,
                      height: 1.6,
                    ),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _DetailChip(label: title.category),
                  _DetailChip(label: title.videoType),
                  _DetailChip(label: title.ageRating),
                  if (title.releaseYear != null) _DetailChip(label: '${title.releaseYear}'),
                ],
              ),
              const SizedBox(height: 22),
              Row(
                children: [
                  ElevatedButton(
                    onPressed: () => context.push(
                      '/player/${title.id}?teaser=${canWatch ? '0' : '1'}',
                    ),
                    child: Text(canWatch ? 'Watch now' : 'Watch preview'),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton(
                    onPressed: () => context.go('/library'),
                    child: const Text('My Access'),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppTheme.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Access status',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 10),
              Text(
                detail.access.message,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.textMuted,
                      height: 1.5,
                    ),
              ),
              if (detail.access.priceInfo != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0x22F3BE74),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0x33F3BE74)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            detail.access.hasAccess ? 'Watch Now' : 'Unlock Required',
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                          if (detail.access.priceInfo!.tier != null) ...[
                            const SizedBox(height: 4),
                            Text(
                              detail.access.priceInfo!.tier!,
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppTheme.textMuted,
                                  ),
                            ),
                          ],
                        ],
                      ),
                      if (detail.access.hasAccess) ...[
                        ElevatedButton(
                          onPressed: () {
                            context.push('/playback/${titleId}');
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.gold,
                            foregroundColor: AppTheme.background,
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text(
                            'Play',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 16,
                            ),
                          ),
                        ),
                      ] else ...[
                        Text(
                          detail.access.priceInfo!.formattedPrice,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: AppTheme.gold,
                                fontWeight: FontWeight.w900,
                            ),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton(
                          onPressed: () {
                            // Redirect to web for payment
                            final url = Uri.parse('https://acestudio.global/wallet');
                            launchUrl(url);
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.gold,
                            foregroundColor: AppTheme.background,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text(
                            'Get Credits',
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        if (detail.episodes.isNotEmpty) ...[
          const SizedBox(height: 20),
          Text(
            'Episodes',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          ...detail.episodes.map(
            (episode) => Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    episode.title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    episode.description,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppTheme.textMuted),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _DetailChip extends StatelessWidget {
  const _DetailChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0x14FFFFFF),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppTheme.border),
      ),
      child: Text(label),
    );
  }
}
