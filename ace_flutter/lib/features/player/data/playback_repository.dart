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

  Future<PlaybackStreamUrls> createPlaybackUrls({
    required String titleId,
    required bool teaserOnly,
    required bool isSignedIn,
    String? trailerUrl,
    String qualityPreference = 'Adaptive',
  }) async {
    final trimmedTrailerUrl = trailerUrl?.trim();
    if (teaserOnly && trimmedTrailerUrl != null && trimmedTrailerUrl.isNotEmpty) {
      return PlaybackStreamUrls(progressiveUrl: apiClient.resolve(trimmedTrailerUrl).toString());
    }

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
    final playback = payload['playback'] as Map<String, dynamic>?;

    String? hls;
    String? dash;
    String? progressive;
    var preferredMode = PlaybackMode.progressive;

    if (playback != null) {
      final preferred = playback['preferred'];
      preferredMode =
          preferred is String && preferred.toLowerCase() == 'hls'
              ? PlaybackMode.hls
              : PlaybackMode.progressive;
      final h = playback['hlsUrl'];
      if (h is String && h.isNotEmpty) {
        hls = apiClient.resolve(h).toString();
      }
      final d = playback['dashUrl'];
      if (d is String && d.isNotEmpty) {
        dash = apiClient.resolve(d).toString();
      }
      final p = playback['progressiveUrl'];
      if (p is String && p.isNotEmpty) {
        progressive = apiClient.resolve(p).toString();
      }
    }

    if (hls == null && dash == null && progressive == null) {
      throw ApiException(
        'No playback stream is ready for this title right now.',
        statusCode: 503,
      );
    }

    return PlaybackStreamUrls(
      hlsUrl: hls,
      dashUrl: dash,
      progressiveUrl: progressive,
      preferredMode: preferredMode,
    );
  }
}

enum PlaybackMode { progressive, hls }

class PlaybackStreamUrls {
  const PlaybackStreamUrls({
    this.hlsUrl,
    this.dashUrl,
    this.progressiveUrl,
    this.preferredMode = PlaybackMode.progressive,
  });

  final String? hlsUrl;
  final String? dashUrl;
  final String? progressiveUrl;
  final PlaybackMode preferredMode;

  String? get preferredUrl {
    if (preferredMode == PlaybackMode.hls) {
      return hlsUrl ?? progressiveUrl ?? dashUrl;
    }
    return progressiveUrl ?? hlsUrl ?? dashUrl;
  }
}
