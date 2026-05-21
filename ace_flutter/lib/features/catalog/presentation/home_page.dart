import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/app_theme.dart';
import '../../../core/network/media_url.dart';
import '../../../widgets/premium_scaffold.dart';
import '../../../widgets/section_heading.dart';
import '../../../widgets/title_card.dart';
import '../../profile/data/user_preferences.dart';
import '../data/catalog_repository.dart';
import '../models/title_summary.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final titlesAsync = ref.watch(catalogTitlesProvider);
    final compactCards = ref.watch(userPreferencesProvider).maybeWhen(
          data: (preferences) => preferences.compactTitleCards,
          orElse: () => false,
        );

    return PremiumScaffold(
      title: 'Home',
      currentLocation: '/home',
      actions: [
        IconButton(
          onPressed: () => context.push('/profile'),
          icon: const Icon(Icons.notifications_none_rounded),
        ),
      ],
      body: titlesAsync.when(
        data: (titles) =>
            _HomeContent(titles: titles, compactCards: compactCards),
        loading: () => const Padding(
          padding: EdgeInsets.only(top: 80),
          child: Center(child: CircularProgressIndicator()),
        ),
        error: (error, _) => _ErrorBlock(
          message: error.toString(),
          onRetry: () => ref.invalidate(catalogTitlesProvider),
        ),
      ),
    );
  }
}

class _HomeContent extends StatelessWidget {
  const _HomeContent({
    required this.titles,
    required this.compactCards,
  });

  final List<TitleSummary> titles;
  final bool compactCards;

  @override
  Widget build(BuildContext context) {
    final featured = titles.isNotEmpty ? titles.first : null;
    final trending = titles.take(6).toList();
    final editorsChoice = titles.skip(2).take(6).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (featured != null) _HeroCard(title: featured),
        const SizedBox(height: 28),
        const SectionHeading(
          eyebrow: 'Curated for you',
          title: 'A premium home for films, series, and high-quality viewing.',
          subtitle:
              'Discover standout titles, continue watching, and move from phone to screen without losing your place.',
        ),
        const SizedBox(height: 20),
        _CarouselSection(
            title: 'Trending now',
            titles: trending,
            compactCards: compactCards),
        const SizedBox(height: 24),
        const _CategoryStrip(
          categories: [
            'New Releases',
            'Drama',
            'Action',
            'Romance',
            'Family',
            'Thriller',
            'Documentary',
          ],
        ),
        const SizedBox(height: 24),
        _CarouselSection(
            title: "Editor's choice",
            titles: editorsChoice,
            compactCards: compactCards),
      ],
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.title});

  final TitleSummary title;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        gradient: AppTheme.premiumPanelGradient,
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(
              color: const Color(0x22FFFFFF),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              title.heroLabel.toUpperCase(),
              style: const TextStyle(
                color: AppTheme.gold,
                fontWeight: FontWeight.w700,
                letterSpacing: 2.2,
                fontSize: 11,
              ),
            ),
          ),
          const SizedBox(height: 18),
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
            maxLines: 4,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AppTheme.textMuted,
                  height: 1.55,
                ),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _MetaChip(label: title.category),
              _MetaChip(label: title.videoType),
              if (title.releaseYear != null)
                _MetaChip(label: '${title.releaseYear}'),
              _MetaChip(label: title.ageRating),
            ],
          ),
          const SizedBox(height: 22),
          Row(
            children: [
              ElevatedButton(
                onPressed: () => context.push('/title/${title.id}'),
                child: const Text('Open title'),
              ),
              const SizedBox(width: 12),
              OutlinedButton(
                onPressed: () => context.push('/player/${title.id}?teaser=1'),
                child: const Text('Watch preview'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CarouselSection extends StatelessWidget {
  const _CarouselSection({
    required this.title,
    required this.titles,
    required this.compactCards,
  });

  final String title;
  final List<TitleSummary> titles;
  final bool compactCards;

  @override
  Widget build(BuildContext context) {
    if (titles.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
              ),
        ),
        const SizedBox(height: 14),
        SizedBox(
          height: compactCards ? 220 : 265,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: titles.length,
            separatorBuilder: (_, __) => const SizedBox(width: 14),
            itemBuilder: (context, index) {
              final titleItem = titles[index];
              return SizedBox(
                width: compactCards ? 178 : 220,
                child: TitleCard(
                  title: titleItem,
                  posterUrl: resolveMediaUrl(titleItem.posterKey),
                  compact: compactCards,
                  onTap: () => context.push('/title/${titleItem.id}'),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _CategoryStrip extends StatelessWidget {
  const _CategoryStrip({required this.categories});

  final List<String> categories;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: categories
          .map(
            (category) => ActionChip(
              label: Text(category),
              onPressed: () => context.push('/browse?q=$category'),
            ),
          )
          .toList(),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0x18FFFFFF),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppTheme.border),
      ),
      child: Text(label),
    );
  }
}

class _ErrorBlock extends StatelessWidget {
  const _ErrorBlock({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.wifi_off_rounded, color: AppTheme.gold),
          const SizedBox(height: 14),
          Text(
            'Unable to load titles',
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.textMuted,
                  height: 1.5,
                ),
          ),
          const SizedBox(height: 18),
          ElevatedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Try again'),
          ),
        ],
      ),
    );
  }
}
