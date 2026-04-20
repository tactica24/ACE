import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/storage/device_session_store.dart';
import '../../auth/data/auth_repository.dart';

final deviceSessionStoreProvider = Provider<DeviceSessionStore>((ref) {
  return DeviceSessionStore();
});

final playbackRepositoryProvider = Provider<PlaybackRepository>((ref) {
  return PlaybackRepository(
    apiClient: ref.watch(apiClientProvider),
    deviceSessionStore: ref.watch(deviceSessionStoreProvider),
  );
});

class PlaybackRepository {
  PlaybackRepository({
    required this.apiClient,
    required this.deviceSessionStore,
  });

  final ApiClient apiClient;
  final DeviceSessionStore deviceSessionStore;

  Future<String> createPlaybackUrl({
    required String titleId,
    required bool teaserOnly,
    required bool isSignedIn,
  }) async {
    final query = <String, String>{
      'videoId': titleId,
      if (teaserOnly) 'teaser': '1',
    };

    if (isSignedIn) {
      query['deviceSessionId'] = await deviceSessionStore.getOrCreate();
    }

    final payload = await apiClient.getJson('/api/stream/token', query: query) as Map<String, dynamic>;
    final token = payload['token'] as String;
    final playback = payload['playback'];
    if (playback is Map<String, dynamic>) {
      final hlsUrl = playback['hlsUrl'];
      if (hlsUrl is String && hlsUrl.isNotEmpty) {
        return apiClient.resolve(hlsUrl).toString();
      }

      final dashUrl = playback['dashUrl'];
      if (dashUrl is String && dashUrl.isNotEmpty) {
        return apiClient.resolve(dashUrl).toString();
      }

      final progressiveUrl = playback['progressiveUrl'];
      if (progressiveUrl is String && progressiveUrl.isNotEmpty) {
        return apiClient.resolve(progressiveUrl).toString();
      }
    }

    return apiClient.streamUrl(titleId, token);
  }
}
