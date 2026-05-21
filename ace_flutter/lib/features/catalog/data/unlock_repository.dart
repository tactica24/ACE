import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../auth/data/auth_repository.dart';

final unlockRepositoryProvider = Provider<UnlockRepository>((ref) {
  return UnlockRepository(ref.watch(apiClientProvider));
});

class UnlockRepository {
  UnlockRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<UnlockResult> unlockTitle(String titleId) async {
    final payload = await _apiClient.postJson(
      '/api/unlock',
      body: {'videoId': titleId},
    ) as Map<String, dynamic>;

    return UnlockResult.fromJson(payload);
  }
}

class UnlockResult {
  const UnlockResult({
    required this.unlocked,
    required this.source,
  });

  final bool unlocked;
  final String source;

  factory UnlockResult.fromJson(Map<String, dynamic> json) {
    return UnlockResult(
      unlocked: json['unlocked'] as bool? ?? json['ok'] as bool? ?? false,
      source: json['source'] as String? ?? 'WALLET',
    );
  }
}
