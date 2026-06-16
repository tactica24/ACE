import '../../catalog/models/title_detail.dart';

class PlaybackQueueEntry {
  const PlaybackQueueEntry({
    required this.id,
    required this.title,
    required this.description,
    required this.posterKey,
    this.posterUrl,
    required this.teaserOnly,
    required this.hasAccess,
    required this.previewAvailable,
    required this.audioLanguages,
    required this.subtitleTracks,
    required this.resumePositionSec,
    required this.trailerUrl,
    this.parentTitleId,
    this.seasonNumber,
    this.episodeNumber,
  });

  final String id;
  final String title;
  final String description;
  final String? posterKey;
  final String? posterUrl;
  final bool teaserOnly;
  final bool hasAccess;
  final bool previewAvailable;
  final List<String> audioLanguages;
  final List<TitleSubtitleTrack> subtitleTracks;
  final int resumePositionSec;
  final String? trailerUrl;
  final String? parentTitleId;
  final int? seasonNumber;
  final int? episodeNumber;

  PlaybackQueueEntry copyWith({
    String? id,
    String? title,
    String? description,
    String? posterKey,
    String? posterUrl,
    bool? teaserOnly,
    bool? hasAccess,
    bool? previewAvailable,
    List<String>? audioLanguages,
    List<TitleSubtitleTrack>? subtitleTracks,
    int? resumePositionSec,
    String? trailerUrl,
    String? parentTitleId,
    int? seasonNumber,
    int? episodeNumber,
  }) {
    return PlaybackQueueEntry(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      posterKey: posterKey ?? this.posterKey,
      posterUrl: posterUrl ?? this.posterUrl,
      teaserOnly: teaserOnly ?? this.teaserOnly,
      hasAccess: hasAccess ?? this.hasAccess,
      previewAvailable: previewAvailable ?? this.previewAvailable,
      audioLanguages: audioLanguages ?? this.audioLanguages,
      subtitleTracks: subtitleTracks ?? this.subtitleTracks,
      resumePositionSec: resumePositionSec ?? this.resumePositionSec,
      trailerUrl: trailerUrl ?? this.trailerUrl,
      parentTitleId: parentTitleId ?? this.parentTitleId,
      seasonNumber: seasonNumber ?? this.seasonNumber,
      episodeNumber: episodeNumber ?? this.episodeNumber,
    );
  }

  String get episodeLabel {
    if (seasonNumber == null || episodeNumber == null) {
      return title;
    }

    return 'S${seasonNumber!.toString().padLeft(2, '0')}'
        'E${episodeNumber!.toString().padLeft(2, '0')} - $title';
  }
}

class PlaybackRequest {
  const PlaybackRequest({
    required this.entries,
    required this.currentIndex,
  });

  final List<PlaybackQueueEntry> entries;
  final int currentIndex;
}
