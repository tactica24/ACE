import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/app_theme.dart';
import '../../../core/network/media_url.dart';
import '../../../widgets/premium_scaffold.dart';
import '../../../widgets/title_card.dart';
import '../../profile/data/user_preferences.dart';
import '../data/catalog_repository.dart';

class BrowsePage extends ConsumerStatefulWidget {
  const BrowsePage({super.key, this.initialQuery});

  final String? initialQuery;

  @override
  ConsumerState<BrowsePage> createState() => _BrowsePageState();
}

class _BrowsePageState extends ConsumerState<BrowsePage> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialQuery ?? '');
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = _controller.text.trim();
    final titlesAsync = ref.watch(catalogSearchProvider(query));
    final compactCards = ref.watch(userPreferencesProvider).maybeWhen(
          data: (preferences) => preferences.compactTitleCards,
          orElse: () => false,
        );

    return PremiumScaffold(
      title: 'Browse',
      currentLocation: '/browse',
      body: titlesAsync.when(
        data: (titles) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _controller,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  hintText: 'Search films, genres, or categories',
                  prefixIcon: Icon(Icons.search_rounded),
                ),
              ),
              const SizedBox(height: 22),
              Text(
                query.isEmpty
                    ? 'All titles'
                    : 'Results for "${_controller.text.trim()}"',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 16),
              if (titles.isEmpty)
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: const Text('No titles matched your search.'),
                )
              else
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: titles.length,
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 14,
                    mainAxisSpacing: 14,
                    childAspectRatio: compactCards ? 0.88 : 0.72,
                  ),
                  itemBuilder: (context, index) {
                    final title = titles[index];
                    return TitleCard(
                      title: title,
                      posterUrl: resolveMediaUrl(title.posterKey),
                      compact: compactCards,
                      onTap: () => context.push('/title/${title.id}'),
                    );
                  },
                ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Container(
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
                'Unable to load browse',
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(
                error.toString(),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.textMuted,
                      height: 1.5,
                    ),
              ),
              const SizedBox(height: 18),
              ElevatedButton.icon(
                onPressed: () => ref.invalidate(catalogSearchProvider(query)),
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Try again'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
