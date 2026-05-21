import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../auth/data/auth_repository.dart';
import '../../catalog/models/title_summary.dart';

final libraryRepositoryProvider = Provider<LibraryRepository>((ref) {
  return LibraryRepository(ref.watch(apiClientProvider));
});

final libraryTitlesProvider = FutureProvider<List<TitleSummary>>((ref) async {
  return ref.watch(libraryRepositoryProvider).fetchLibrary();
});

class LibraryRepository {
  LibraryRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<TitleSummary>> fetchLibrary() async {
    final payload = await _apiClient.getJson('/api/mobile/me/library') as Map<String, dynamic>;
    return (payload['titles'] as List<dynamic>? ?? const [])
        .map((item) => TitleSummary.fromJson(item as Map<String, dynamic>))
        .toList();
  }
}
