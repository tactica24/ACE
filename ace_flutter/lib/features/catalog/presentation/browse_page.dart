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
  const BrowsePage({
    super.key,
    this.initialQuery,
    this.initialCategory,
    this.initialVideoType,
    this.initialSort,
  });

  final String? initialQuery;
  final String? initialCategory;
  final String? initialVideoType;
  final String? initialSort;

  @override
  ConsumerState<BrowsePage> createState() => _BrowsePageState();
}

class _BrowsePageState extends ConsumerState<BrowsePage> {
  static const List<String> _categories = [
    'All',
    'Action',
    'Adventure',
    'Comedy',
    'Crime',
    'Documentary',
    'Drama',
    'Family',
    'Fantasy',
    'Love',
    'Mystery',
    'Romance',
    'Sci-Fi',
    'Thriller',
  ];

  static const List<String> _videoTypes = [
    'All',
    'FEATURE',
    'SERIES',
    'SHORT',
    'SKIT',
    'DOCUMENTARY',
  ];

  late final TextEditingController _controller;
  late String _selectedCategory;
  late String _selectedVideoType;
  late BrowseSort _selectedSort;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialQuery ?? '');
    _selectedCategory = _normalizeValue(
      value: widget.initialCategory,
      allowed: _categories,
      fallback: 'All',
    );
    _selectedVideoType = _normalizeValue(
      value: widget.initialVideoType?.toUpperCase(),
      allowed: _videoTypes,
      fallback: 'All',
    );
    _selectedSort = _sortFromValue(widget.initialSort);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = _controller.text.trim();
    final filters = BrowseFilters(
      query: query,
      category: _selectedCategory,
      videoType: _selectedVideoType,
      sort: _selectedSort,
    );
    final titlesAsync = ref.watch(catalogSearchProvider(filters));
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
                decoration: InputDecoration(
                  hintText: 'Search films, genres, or categories',
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: query.isEmpty
                      ? null
                      : IconButton(
                          onPressed: () {
                            _controller.clear();
                            setState(() {});
                          },
                          icon: const Icon(Icons.close_rounded),
                        ),
                ),
              ),
              const SizedBox(height: 20),
              _FilterSection(
                label: 'Browse by category',
                children: _categories
                    .map(
                      (category) => ChoiceChip(
                        selected: _selectedCategory == category,
                        label: Text(category),
                        onSelected: (_) {
                          setState(() {
                            _selectedCategory = category;
                          });
                        },
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 14),
              _FilterSection(
                label: 'Format',
                children: _videoTypes
                    .map(
                      (videoType) => ChoiceChip(
                        selected: _selectedVideoType == videoType,
                        label: Text(videoType == 'All'
                            ? 'All'
                            : _formatLabel(videoType)),
                        onSelected: (_) {
                          setState(() {
                            _selectedVideoType = videoType;
                          });
                        },
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _SortChip(
                    label: 'New releases',
                    selected: _selectedSort == BrowseSort.newest,
                    onTap: () => setState(() {
                      _selectedSort = BrowseSort.newest;
                    }),
                  ),
                  _SortChip(
                    label: 'Oldest',
                    selected: _selectedSort == BrowseSort.oldest,
                    onTap: () => setState(() {
                      _selectedSort = BrowseSort.oldest;
                    }),
                  ),
                  _SortChip(
                    label: 'Title A-Z',
                    selected: _selectedSort == BrowseSort.title,
                    onTap: () => setState(() {
                      _selectedSort = BrowseSort.title;
                    }),
                  ),
                ],
              ),
              const SizedBox(height: 22),
              Text(
                _headlineFor(query: query),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                '${titles.length} title${titles.length == 1 ? '' : 's'} available',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.textMuted,
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
                  child: const Text('No titles matched your current filters.'),
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
                    childAspectRatio: compactCards ? 0.52 : 0.54,
                  ),
                  itemBuilder: (context, index) {
                    final title = titles[index];
                    return TitleCard(
                      title: title,
                      posterUrl: resolveTitlePosterUrl(
                        titleId: title.id,
                        posterUrl: title.posterUrl,
                        posterKey: title.posterKey,
                      ),
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
                onPressed: () => ref.invalidate(catalogSearchProvider(filters)),
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Try again'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _headlineFor({required String query}) {
    if (query.isNotEmpty) {
      return 'Results for "$query"';
    }

    final parts = <String>[
      if (_selectedCategory != 'All') _selectedCategory,
      if (_selectedVideoType != 'All') _formatLabel(_selectedVideoType),
    ];

    if (parts.isEmpty) {
      return _selectedSort == BrowseSort.newest
          ? 'New releases'
          : _selectedSort == BrowseSort.oldest
              ? 'Earlier additions'
              : 'All titles';
    }

    return parts.join(' / ');
  }

  String _normalizeValue({
    required String? value,
    required List<String> allowed,
    required String fallback,
  }) {
    final trimmed = value?.trim();
    if (trimmed == null || trimmed.isEmpty) {
      return fallback;
    }

    for (final option in allowed) {
      if (option.toLowerCase() == trimmed.toLowerCase()) {
        return option;
      }
    }

    return fallback;
  }

  BrowseSort _sortFromValue(String? value) {
    switch (value?.trim().toLowerCase()) {
      case 'oldest':
        return BrowseSort.oldest;
      case 'title':
        return BrowseSort.title;
      default:
        return BrowseSort.newest;
    }
  }

  String _formatLabel(String videoType) {
    switch (videoType) {
      case 'FEATURE':
        return 'Films';
      case 'SERIES':
        return 'Series';
      case 'SHORT':
        return 'Shorts';
      case 'SKIT':
        return 'Skits';
      case 'DOCUMENTARY':
        return 'Documentaries';
      default:
        return videoType;
    }
  }
}

class _FilterSection extends StatelessWidget {
  const _FilterSection({
    required this.label,
    required this.children,
  });

  final String label;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: children,
        ),
      ],
    );
  }
}

class _SortChip extends StatelessWidget {
  const _SortChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
    );
  }
}
