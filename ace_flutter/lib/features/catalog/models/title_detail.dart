import 'title_access_state.dart';
import 'title_summary.dart';

class TitleSubtitleTrack {
  const TitleSubtitleTrack({
    required this.id,
    required this.label,
    required this.languageCode,
    required this.kind,
    required this.fileKey,
    required this.fileUrl,
    required this.isDefault,
  });

  final String id;
  final String label;
  final String languageCode;
  final String kind;
  final String fileKey;
  final String fileUrl;
  final bool isDefault;

  factory TitleSubtitleTrack.fromJson(Map<String, dynamic> json) =>
      TitleSubtitleTrack(
        id: json['id'] as String,
        label: json['label'] as String? ?? 'Subtitle',
        languageCode: json['languageCode'] as String? ?? 'und',
        kind: json['kind'] as String? ?? 'subtitles',
        fileKey: json['fileKey'] as String? ?? '',
        fileUrl: json['fileUrl'] as String? ?? '',
        isDefault: json['isDefault'] as bool? ?? false,
      );
}

class TitleEpisode {
  const TitleEpisode({
    required this.id,
    required this.title,
    required this.description,
    required this.teaserSec,
    required this.durationSec,
    required this.posterKey,
    this.posterUrl,
    required this.previewAvailable,
    required this.audioLanguages,
    required this.subtitleTracks,
    required this.access,
    required this.progressSec,
    required this.trailerUrl,
    this.seasonNumber,
    this.episodeNumber,
  });

  final String id;
  final String title;
  final String description;
  final int teaserSec;
  final int durationSec;
  final String? posterKey;
  final String? posterUrl;
  final bool previewAvailable;
  final List<String> audioLanguages;
  final List<TitleSubtitleTrack> subtitleTracks;
  final TitleAccessState access;
  final int progressSec;
  final String? trailerUrl;
  final int? seasonNumber;
  final int? episodeNumber;

  String get episodeLabel {
    if (seasonNumber == null || episodeNumber == null) {
      return title;
    }

    return 'S${seasonNumber!.toString().padLeft(2, '0')}'
        'E${episodeNumber!.toString().padLeft(2, '0')} - $title';
  }

  factory TitleEpisode.fromJson(Map<String, dynamic> json) => TitleEpisode(
        id: json['id'] as String,
        title: json['title'] as String? ?? 'Episode',
        description: json['description'] as String? ?? '',
        teaserSec: (json['teaserSec'] as num?)?.toInt() ?? 0,
        durationSec: (json['durationSec'] as num?)?.toInt() ?? 0,
        posterKey: json['posterKey'] as String?,
        posterUrl: json['posterUrl'] as String?,
        previewAvailable: json['previewAvailable'] as bool? ?? false,
        audioLanguages: (json['audioLanguages'] as List<dynamic>? ?? const [])
            .map((item) => item.toString())
            .toList(),
        subtitleTracks: (json['subtitleTracks'] as List<dynamic>? ?? const [])
            .map((item) =>
                TitleSubtitleTrack.fromJson(item as Map<String, dynamic>))
            .toList(),
        access: TitleAccessState.fromJson(
          json['access'] as Map<String, dynamic>? ?? const {},
        ),
        progressSec: (json['progressSec'] as num?)?.toInt() ?? 0,
        trailerUrl: json['trailerUrl'] as String?,
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
    required this.previewAvailable,
    required this.audioLanguages,
    required this.subtitleTracks,
    required this.progressSec,
    required this.trailerUrl,
    this.seasonNumber,
    this.episodeNumber,
  });

  final TitleSummary summary;
  final String creatorId;
  final TitleAccessState access;
  final List<TitleEpisode> episodes;
  final bool previewAvailable;
  final List<String> audioLanguages;
  final List<TitleSubtitleTrack> subtitleTracks;
  final int progressSec;
  final String? trailerUrl;
  final int? seasonNumber;
  final int? episodeNumber;

  bool get isSeriesContainer =>
      summary.videoType == 'SERIES' && summary.seriesId == null;

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
      previewAvailable: title['previewAvailable'] as bool? ?? false,
      audioLanguages: (title['audioLanguages'] as List<dynamic>? ?? const [])
          .map((item) => item.toString())
          .toList(),
      subtitleTracks: (title['subtitleTracks'] as List<dynamic>? ?? const [])
          .map((item) =>
              TitleSubtitleTrack.fromJson(item as Map<String, dynamic>))
          .toList(),
      progressSec: (title['progressSec'] as num?)?.toInt() ?? 0,
      trailerUrl: title['trailerUrl'] as String?,
      seasonNumber: (title['seasonNumber'] as num?)?.toInt(),
      episodeNumber: (title['episodeNumber'] as num?)?.toInt(),
    );
  }
}
