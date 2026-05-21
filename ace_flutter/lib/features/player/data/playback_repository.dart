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

  String mapPlaybackQualityPreference(String value, {bool teaserOnly = false}) {
    switch (value) {
      case 'Data saver':
        return '720p';
      case 'High quality':
        return '1080p';
      case 'Adaptive':
      default:
        return teaserOnly ? '720p' : 'adaptive';
    }
  }

  String mapDownloadQualityPreference(String value) {
    switch (value) {
      case 'Best available':
        return '1080p';
      case 'Data saver':
      case 'Standard':
      default:
        return '720p';
    }
  }

  Future<String> createPlaybackUrl({
    required String titleId,
    required bool teaserOnly,
    required bool isSignedIn,
    String qualityPreference = 'Adaptive',
  }) async {
    final query = <String, String>{
      'videoId': titleId,
      if (teaserOnly) 'teaser': '1',
      'quality': mapPlaybackQualityPreference(
        qualityPreference,
        teaserOnly: teaserOnly,
      ),
    };

    if (isSignedIn) {
      query['deviceSessionId'] = await deviceSessionStore.getOrCreate();
    }

    final payload = await apiClient.getJson('/api/stream/token', query: query)
        as Map<String, dynamic>;
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

    throw ApiException(
      'No playback stream is ready for this title right now.',
      statusCode: 503,
    );
  }
}
