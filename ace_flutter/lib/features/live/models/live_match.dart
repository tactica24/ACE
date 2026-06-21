class LiveChatProfile {
  const LiveChatProfile({required this.handle, required this.avatarEmoji});

  final String handle;
  final String avatarEmoji;

  factory LiveChatProfile.fromJson(Map<String, dynamic> json) {
    return LiveChatProfile(
      handle: json['handle'] as String? ?? 'fan',
      avatarEmoji: json['avatarEmoji'] as String? ?? '⚽',
    );
  }
}

class LiveMatchSummary {
  const LiveMatchSummary({
    required this.id,
    required this.title,
    required this.sport,
    required this.competition,
    required this.homeTeam,
    required this.awayTeam,
    required this.kickoffAt,
    required this.status,
    required this.chatEnabled,
    required this.messageCount,
    this.posterUrl,
  });

  final String id;
  final String title;
  final String sport;
  final String competition;
  final String homeTeam;
  final String awayTeam;
  final DateTime kickoffAt;
  final String status;
  final String? posterUrl;
  final bool chatEnabled;
  final int messageCount;

  factory LiveMatchSummary.fromJson(Map<String, dynamic> json) {
    return LiveMatchSummary(
      id: json['id'] as String,
      title: json['title'] as String,
      sport: json['sport'] as String? ?? 'Football',
      competition: json['competition'] as String,
      homeTeam: json['homeTeam'] as String,
      awayTeam: json['awayTeam'] as String,
      kickoffAt: DateTime.parse(json['kickoffAt'] as String),
      status: json['status'] as String? ?? 'UPCOMING',
      posterUrl: json['posterUrl'] as String?,
      chatEnabled: json['chatEnabled'] as bool? ?? true,
      messageCount: json['messageCount'] as int? ?? 0,
    );
  }
}

class LiveMatchDetail {
  const LiveMatchDetail({
    required this.id,
    required this.title,
    required this.sport,
    required this.competition,
    required this.homeTeam,
    required this.awayTeam,
    required this.kickoffAt,
    required this.status,
    required this.embedUrl,
    required this.chatEnabled,
    this.description,
    this.venue,
    this.sourceLabel,
  });

  final String id;
  final String title;
  final String sport;
  final String competition;
  final String homeTeam;
  final String awayTeam;
  final DateTime kickoffAt;
  final String status;
  final String embedUrl;
  final bool chatEnabled;
  final String? description;
  final String? venue;
  final String? sourceLabel;

  factory LiveMatchDetail.fromJson(Map<String, dynamic> json) {
    return LiveMatchDetail(
      id: json['id'] as String,
      title: json['title'] as String,
      sport: json['sport'] as String? ?? 'Football',
      competition: json['competition'] as String,
      homeTeam: json['homeTeam'] as String,
      awayTeam: json['awayTeam'] as String,
      kickoffAt: DateTime.parse(json['kickoffAt'] as String),
      status: json['status'] as String? ?? 'UPCOMING',
      embedUrl: json['embedUrl'] as String,
      chatEnabled: json['chatEnabled'] as bool? ?? true,
      description: json['description'] as String?,
      venue: json['venue'] as String?,
      sourceLabel: json['sourceLabel'] as String?,
    );
  }
}

class LiveChatReaction {
  const LiveChatReaction({
    required this.emoji,
    required this.count,
    required this.reacted,
  });

  final String emoji;
  final int count;
  final bool reacted;

  factory LiveChatReaction.fromJson(Map<String, dynamic> json) {
    return LiveChatReaction(
      emoji: json['emoji'] as String,
      count: json['count'] as int? ?? 0,
      reacted: json['reacted'] as bool? ?? false,
    );
  }
}

class LiveChatReply {
  const LiveChatReply({
    required this.id,
    required this.content,
    this.author,
  });

  final String id;
  final String content;
  final LiveChatProfile? author;

  factory LiveChatReply.fromJson(Map<String, dynamic> json) {
    final author = json['author'];
    return LiveChatReply(
      id: json['id'] as String,
      content: json['content'] as String,
      author: author is Map<String, dynamic>
          ? LiveChatProfile.fromJson(author)
          : null,
    );
  }
}

class LiveChatMessage {
  const LiveChatMessage({
    required this.id,
    required this.content,
    required this.createdAt,
    required this.reactions,
    this.author,
    this.replyTo,
  });

  final String id;
  final String content;
  final DateTime createdAt;
  final LiveChatProfile? author;
  final LiveChatReply? replyTo;
  final List<LiveChatReaction> reactions;

  factory LiveChatMessage.fromJson(Map<String, dynamic> json) {
    final author = json['author'];
    final replyTo = json['replyTo'];
    return LiveChatMessage(
      id: json['id'] as String,
      content: json['content'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      author: author is Map<String, dynamic>
          ? LiveChatProfile.fromJson(author)
          : null,
      replyTo: replyTo is Map<String, dynamic>
          ? LiveChatReply.fromJson(replyTo)
          : null,
      reactions: (json['reactions'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(LiveChatReaction.fromJson)
          .toList(),
    );
  }
}

class LiveMatchRoom {
  const LiveMatchRoom({
    required this.match,
    required this.isSignedIn,
    this.profile,
  });

  final LiveMatchDetail match;
  final bool isSignedIn;
  final LiveChatProfile? profile;
}
