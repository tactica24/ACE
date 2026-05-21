import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../auth/data/auth_repository.dart';

final supportRepositoryProvider = Provider<SupportRepository>((ref) {
  return SupportRepository(ref.watch(apiClientProvider));
});

class SupportRepository {
  SupportRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<void> createTicket({
    required String category,
    required String subject,
    required String message,
  }) async {
    await _apiClient.postJson(
      '/api/support',
      body: {
        'category': category,
        'subject': subject,
        'message': message,
      },
    );
  }
}
