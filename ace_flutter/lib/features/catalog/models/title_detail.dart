import 'title_access_state.dart';
import 'title_summary.dart';

class TitleEpisode {
  const TitleEpisode({
    required this.id,
    required this.title,
    required this.description,
    required this.teaserSec,
    required this.durationSec,
    required this.posterKey,
    this.seasonNumber,
    this.episodeNumber,
  });

  final String id;
  final String title;
  final String description;
  final int teaserSec;
  final int durationSec;
  final String? posterKey;
  final int? seasonNumber;
  final int? episodeNumber;

  factory TitleEpisode.fromJson(Map<String, dynamic> json) => TitleEpisode(
        id: json['id'] as String,
        title: json['title'] as String? ?? 'Episode',
        description: json['description'] as String? ?? '',
        teaserSec: (json['teaserSec'] as num?)?.toInt() ?? 0,
        durationSec: (json['durationSec'] as num?)?.toInt() ?? 0,
        posterKey: json['posterKey'] as String?,
        seasonNumber: (json['seasonNumber'] as num?)?.toInt(),
        episodeNumber: (json['episodeNumber'] as num?)?.toInt(),
      );
}

class TitleDetail {
  const TitleDetail({
    required this.summary,
    required this.creatorId,
    required this.access,
    required this.episodes,
    this.seasonNumber,
    this.episodeNumber,
  });

  final TitleSummary summary;
  final String creatorId;
  final TitleAccessState access;
  final List<TitleEpisode> episodes;
  final int? seasonNumber;
  final int? episodeNumber;

  factory TitleDetail.fromJson(Map<String, dynamic> json) {
    final title = json['title'] as Map<String, dynamic>;
    final summary = TitleSummary.fromJson(title);

    return TitleDetail(
      summary: summary,
      creatorId: title['creatorId'] as String? ?? '',
      access: TitleAccessState.fromJson(json['access'] as Map<String, dynamic>? ?? const {}),
      episodes: (title['episodes'] as List<dynamic>? ?? const [])
          .map((item) => TitleEpisode.fromJson(item as Map<String, dynamic>))
          .toList(),
      seasonNumber: (title['seasonNumber'] as num?)?.toInt(),
      episodeNumber: (title['episodeNumber'] as num?)?.toInt(),
    );
  }
}
