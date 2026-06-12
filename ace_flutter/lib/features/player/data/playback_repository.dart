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
      return PlaybackStreamUrls(
        previewUrl: apiClient.resolve(trimmedTrailerUrl).toString(),
      );
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

    String? playbackUrl;
    final directPlaybackUrl = payload['playbackUrl'];
    if (directPlaybackUrl is String && directPlaybackUrl.isNotEmpty) {
      playbackUrl = apiClient.resolve(directPlaybackUrl).toString();
    }

    final playback = payload['playback'] as Map<String, dynamic>?;
    String? hlsUrl;
    final nestedHlsUrl = playback?['hlsUrl'];
    if (nestedHlsUrl is String && nestedHlsUrl.isNotEmpty) {
      hlsUrl = apiClient.resolve(nestedHlsUrl).toString();
    }

    String? progressiveUrl;
    final nestedPlaybackUrl = playback?['progressiveUrl'];
    if (nestedPlaybackUrl is String && nestedPlaybackUrl.isNotEmpty) {
      progressiveUrl = apiClient.resolve(nestedPlaybackUrl).toString();
    }

    final nestedPreviewUrl = playback?['previewUrl'];
    final previewUrl = nestedPreviewUrl is String && nestedPreviewUrl.isNotEmpty
        ? apiClient.resolve(nestedPreviewUrl).toString()
        : null;
    final preferredValue = playback?['preferred'];
    final preferred = preferredValue is String ? preferredValue : null;

    if (playbackUrl == null && hlsUrl == null && progressiveUrl == null && previewUrl == null) {
      throw ApiException(
        'No playback stream is ready for this title right now.',
        statusCode: 503,
      );
    }

    return PlaybackStreamUrls(
      playbackUrl: playbackUrl,
      hlsUrl: hlsUrl,
      progressiveUrl: progressiveUrl,
      previewUrl: previewUrl,
      preferred: preferred,
    );
  }
}

class PlaybackStreamUrls {
  const PlaybackStreamUrls({
    this.playbackUrl,
    this.hlsUrl,
    this.progressiveUrl,
    this.previewUrl,
    this.preferred,
  });

  final String? playbackUrl;
  final String? hlsUrl;
  final String? progressiveUrl;
  final String? previewUrl;
  final String? preferred;

  List<String> get playbackCandidates {
    final ordered = <String?>[];
    if (preferred == 'preview') {
      ordered.add(previewUrl);
      ordered.add(hlsUrl);
      ordered.add(playbackUrl);
      ordered.add(progressiveUrl);
    } else if (preferred == 'progressive') {
      ordered.add(progressiveUrl);
      ordered.add(playbackUrl);
      ordered.add(hlsUrl);
      ordered.add(previewUrl);
    } else {
      ordered.add(hlsUrl);
      ordered.add(playbackUrl);
      ordered.add(progressiveUrl);
      ordered.add(previewUrl);
    }

    final seen = <String>{};
    return ordered
        .whereType<String>()
        .where((url) => url.isNotEmpty && seen.add(url))
        .toList(growable: false);
  }
}
