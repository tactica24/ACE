import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../auth/data/auth_repository.dart';
import '../models/live_match.dart';

const liveChatEmojis = ['🔥', '⚽', '😂', '👏', '😮', '❤️'];
const liveChatAvatars = ['⚽', '🏆', '🦁', '🦅', '🔥', '⭐', '🌟', '🎉'];

final liveMatchRepositoryProvider = Provider<LiveMatchRepository>((ref) {
  return LiveMatchRepository(ref.watch(apiClientProvider));
});

final liveMatchesProvider = FutureProvider<List<LiveMatchSummary>>((ref) {
  return ref.watch(liveMatchRepositoryProvider).fetchMatches();
});

class LiveMatchRepository {
  LiveMatchRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<LiveMatchSummary>> fetchMatches() async {
    final payload = await _apiClient.getJson('/api/mobile/live-matches')
        as Map<String, dynamic>;
    return (payload['matches'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(LiveMatchSummary.fromJson)
        .toList();
  }

  Future<LiveMatchRoom> fetchRoom(String matchId) async {
    final payload = await _apiClient
        .getJson('/api/mobile/live-matches/$matchId') as Map<String, dynamic>;
    final profile = payload['profile'];
    return LiveMatchRoom(
      match: LiveMatchDetail.fromJson(payload['match'] as Map<String, dynamic>),
      isSignedIn: payload['isSignedIn'] as bool? ?? false,
      profile: profile is Map<String, dynamic>
          ? LiveChatProfile.fromJson(profile)
          : null,
    );
  }

  Future<List<LiveChatMessage>> fetchMessages(String matchId) async {
    final payload = await _apiClient.getJson('/api/live-matches/$matchId/chat')
        as Map<String, dynamic>;
    return (payload['messages'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(LiveChatMessage.fromJson)
        .toList();
  }

  Future<LiveChatProfile> createProfile({
    required String handle,
    required String avatarEmoji,
  }) async {
    final payload = await _apiClient.postJson(
      '/api/live-chat/profile',
      body: {'handle': handle, 'avatarEmoji': avatarEmoji},
    ) as Map<String, dynamic>;
    return LiveChatProfile.fromJson(payload['profile'] as Map<String, dynamic>);
  }

  Future<void> sendMessage({
    required String matchId,
    required String content,
    String? parentId,
  }) async {
    await _apiClient.postJson(
      '/api/live-matches/$matchId/chat',
      body: {'content': content, 'parentId': parentId},
    );
  }

  Future<void> react({
    required String matchId,
    required String messageId,
    required String emoji,
  }) async {
    await _apiClient.postJson(
      '/api/live-matches/$matchId/reactions',
      body: {'messageId': messageId, 'emoji': emoji},
    );
  }
}
