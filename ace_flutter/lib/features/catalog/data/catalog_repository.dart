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

final titleDetailProvider = FutureProvider.family<TitleDetail, String>((ref, id) async {
  return ref.watch(catalogRepositoryProvider).fetchTitleDetail(id);
});

class CatalogRepository {
  CatalogRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<TitleSummary>> fetchTitles({int limit = 24}) async {
    final payload = await _apiClient.getJson(
      '/api/mobile/titles',
      query: {'limit': '$limit'},
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
