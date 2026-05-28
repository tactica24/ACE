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

  Future<PlaybackStreamUrls> createPlaybackUrls({
    required String titleId,
    required bool teaserOnly,
    required bool isSignedIn,
    String? trailerUrl,
  }) async {
    final trimmedTrailerUrl = trailerUrl?.trim();
    if (teaserOnly && trimmedTrailerUrl != null && trimmedTrailerUrl.isNotEmpty) {
      return PlaybackStreamUrls(progressiveUrl: apiClient.resolve(trimmedTrailerUrl).toString());
    }

    final endpoint = '/api/movies/$titleId/playback';
    final deviceSessionId = isSignedIn ? await deviceSessionStore.getOrCreate() : null;
    final payload = teaserOnly
        ? await apiClient.getJson(endpoint, query: {
            'teaser': '1',
            if (deviceSessionId != null) 'deviceSessionId': deviceSessionId,
          }) as Map<String, dynamic>
        : await apiClient.postJson(
            endpoint,
            body: {'deviceSessionId': deviceSessionId},
          ) as Map<String, dynamic>;

    String? progressive;
    final directPlaybackUrl = payload['playbackUrl'];
    if (directPlaybackUrl is String && directPlaybackUrl.isNotEmpty) {
      progressive = apiClient.resolve(directPlaybackUrl).toString();
    }

    final playback = payload['playback'] as Map<String, dynamic>?;
    final nestedPlaybackUrl = playback?['progressiveUrl'];
    if (progressive == null && nestedPlaybackUrl is String && nestedPlaybackUrl.isNotEmpty) {
      progressive = apiClient.resolve(nestedPlaybackUrl).toString();
    }

    if (progressive == null) {
      throw ApiException(
        'No playback stream is ready for this title right now.',
        statusCode: 503,
      );
    }

    return PlaybackStreamUrls(
      progressiveUrl: progressive,
    );
  }
}

class PlaybackStreamUrls {
  const PlaybackStreamUrls({
    this.progressiveUrl,
  });

  final String? progressiveUrl;
}
