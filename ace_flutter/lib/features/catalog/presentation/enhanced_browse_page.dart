import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/app_theme.dart';
import '../../../core/network/media_url.dart';
import '../../../widgets/premium_scaffold.dart';
import '../../../widgets/title_card.dart';
import '../data/catalog_repository.dart';
import '../models/title_summary.dart';

class EnhancedBrowsePage extends ConsumerStatefulWidget {
  const EnhancedBrowsePage({super.key, this.initialQuery});

  final String? initialQuery;

  @override
  ConsumerState<EnhancedBrowsePage> createState() => _EnhancedBrowsePageState();
}

class _EnhancedBrowsePageState extends ConsumerState<EnhancedBrowsePage> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategory = 'All';
  String _selectedGenre = 'All';
  String _selectedSort = 'Newest';
  bool _isSearching = false;

  final List<String> _categories = [
    'All',
    'Feature Films',
    'Series',
    'Documentaries',
    'Shorts',
    'Skit',
    'Advert'
  ];

  final List<String> _genres = [
    'All',
    'Drama',
    'Action',
    'Comedy',
    'Romance',
    'Thriller',
    'Horror',
    'Family',
    'Documentary',
    'Sci-Fi',
    'Fantasy',
    'Mystery',
    'Crime'
  ];

  final List<String> _sortOptions = [
    'Newest',
    'Oldest',
    'Title A-Z',
    'Title Z-A',
    'Most Popular',
    'Highest Rated'
  ];

  @override
  void initState() {
    super.initState();
    if (widget.initialQuery != null) {
      _searchController.text = widget.initialQuery!;
      _isSearching = true;
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _performSearch() {
    if (_searchController.text.trim().isNotEmpty) {
      setState(() {
        _isSearching = true;
      });
      // In a real implementation, this would trigger a search
    }
  }

  void _clearSearch() {
    _searchController.clear();
    setState(() {
      _isSearching = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final titlesAsync = ref.watch(catalogTitlesProvider);

    return PremiumScaffold(
      title: 'Browse',
      currentLocation: '/browse',
      body: Column(
        children: [
          // Search bar
          Container(
            margin: const EdgeInsets.only(bottom: 20),
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppTheme.border),
            ),
            child: TextField(
              controller: _searchController,
              style: const TextStyle(color: AppTheme.textPrimary),
              decoration: InputDecoration(
                hintText: 'Search for films, series, documentaries...',
                hintStyle: const TextStyle(color: AppTheme.textMuted),
                prefixIcon: const Icon(Icons.search, color: AppTheme.textMuted),
                suffixIcon: _isSearching
                    ? IconButton(
                        onPressed: _clearSearch,
                        icon:
                            const Icon(Icons.clear, color: AppTheme.textMuted),
                      )
                    : null,
                border: InputBorder.none,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              ),
              onSubmitted: (_) => _performSearch(),
            ),
          ),

          // Filters
          Container(
            margin: const EdgeInsets.only(bottom: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Category filter
                _buildFilterSection(
                  title: 'Category',
                  items: _categories,
                  selected: _selectedCategory,
                  onTap: (category) {
                    setState(() {
                      _selectedCategory = category;
                    });
                  },
                ),
                const SizedBox(height: 16),

                // Genre filter
                _buildFilterSection(
                  title: 'Genre',
                  items: _genres,
                  selected: _selectedGenre,
                  onTap: (genre) {
                    setState(() {
                      _selectedGenre = genre;
                    });
                  },
                ),
                const SizedBox(height: 16),

                // Sort options
                _buildFilterSection(
                  title: 'Sort By',
                  items: _sortOptions,
                  selected: _selectedSort,
                  onTap: (sort) {
                    setState(() {
                      _selectedSort = sort;
                    });
                  },
                ),
              ],
            ),
          ),

          // Results
          Expanded(
            child: titlesAsync.when(
              data: (titles) => _buildResultsGrid(titles),
              loading: () => const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(color: AppTheme.gold),
                    SizedBox(height: 16),
                    Text(
                      'Discovering amazing content...',
                      style: TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
              ),
              error: (error, _) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      size: 64,
                      color: AppTheme.textMuted,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Something went wrong',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: AppTheme.textMuted,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Please try again later',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppTheme.textMuted,
                          ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterSection({
    required String title,
    required List<String> items,
    required String selected,
    required Function(String) onTap,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: items.map((item) {
            final isSelected = item == selected;
            return FilterChip(
              label: Text(item),
              selected: isSelected,
              onSelected: (_) => onTap(item),
              backgroundColor: isSelected ? AppTheme.gold : AppTheme.surface,
              labelStyle: TextStyle(
                color: isSelected ? AppTheme.background : AppTheme.textPrimary,
                fontWeight: FontWeight.w600,
              ),
              side: BorderSide(
                color: isSelected ? AppTheme.gold : AppTheme.border,
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildResultsGrid(List<TitleSummary> titles) {
    if (titles.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.search_off,
              size: 64,
              color: AppTheme.textMuted,
            ),
            const SizedBox(height: 16),
            Text(
              'No titles found',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: AppTheme.textMuted,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Try adjusting your filters or search terms',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.textMuted,
                  ),
            ),
          ],
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(4),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.7,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: titles.length,
      itemBuilder: (context, index) {
        final title = titles[index];
        return TitleCard(
          title: title,
          posterUrl: resolvePosterUrl(title.posterUrl, title.posterKey),
          onTap: () => context.push('/title/${title.id}'),
        );
      },
    );
  }
}
