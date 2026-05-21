import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../auth/data/auth_repository.dart';
import '../models/title_detail.dart';
import '../models/title_summary.dart';

final catalogRepositoryProvider = Provider<CatalogRepository>((ref) {
  return CatalogRepository(ref.watch(apiClientProvider));
});

final catalogTitlesProvider = FutureProvider<List<TitleSummary>>((ref) async {
  return ref.watch(catalogRepositoryProvider).fetchTitles();
});

final catalogSearchProvider =
    FutureProvider.family<List<TitleSummary>, String>((ref, query) async {
  final trimmed = query.trim();
  return ref
      .watch(catalogRepositoryProvider)
      .fetchTitles(limit: trimmed.isEmpty ? 24 : 100, query: trimmed);
});

final titleDetailProvider = FutureProvider.family<TitleDetail, String>((ref, id) async {
  return ref.watch(catalogRepositoryProvider).fetchTitleDetail(id);
});

class CatalogRepository {
  CatalogRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<TitleSummary>> fetchTitles({
    int limit = 24,
    String? query,
  }) async {
    final trimmedQuery = query?.trim() ?? '';
    final payload = await _apiClient.getJson(
      '/api/mobile/titles',
      query: {
        'limit': '$limit',
        if (trimmedQuery.isNotEmpty) 'q': trimmedQuery,
      },
    ) as Map<String, dynamic>;

    return (payload['titles'] as List<dynamic>? ?? const [])
        .map((item) => TitleSummary.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<TitleDetail> fetchTitleDetail(String id) async {
    final payload = await _apiClient.getJson('/api/mobile/titles/$id') as Map<String, dynamic>;
    return TitleDetail.fromJson(payload);
  }
}
