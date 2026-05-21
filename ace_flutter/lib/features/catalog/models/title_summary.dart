class TitleSummary {
  const TitleSummary({
    required this.id,
    required this.title,
    required this.description,
    required this.videoType,
    required this.category,
    required this.ageRating,
    required this.genres,
    required this.teaserSec,
    required this.durationSec,
    required this.posterKey,
    this.audioLanguages = const [],
    this.seriesId,
    this.releaseYear,
    this.highlightSeconds = const [],
  });

  final String id;
  final String title;
  final String description;
  final String videoType;
  final String category;
  final String ageRating;
  final List<String> genres;
  final int teaserSec;
  final int durationSec;
  final String? posterKey;
  final List<String> audioLanguages;
  final String? seriesId;
  final int? releaseYear;
  final List<int> highlightSeconds;

  factory TitleSummary.fromJson(Map<String, dynamic> json) => TitleSummary(
        id: json['id'] as String,
        title: json['title'] as String? ?? 'Untitled',
        description: json['description'] as String? ?? '',
        videoType: json['videoType'] as String? ?? 'MOVIE',
        category: json['category'] as String? ?? 'Featured',
        ageRating: json['ageRating'] as String? ?? 'PG',
        genres: (json['genres'] as List<dynamic>? ?? const []).map((item) => item.toString()).toList(),
        teaserSec: (json['teaserSec'] as num?)?.toInt() ?? 0,
        durationSec: (json['durationSec'] as num?)?.toInt() ?? 0,
        posterKey: json['posterKey'] as String?,
        audioLanguages: (json['audioLanguages'] as List<dynamic>? ?? const [])
            .map((item) => item.toString())
            .toList(),
        seriesId: json['seriesId'] as String?,
        releaseYear: (json['releaseYear'] as num?)?.toInt(),
        highlightSeconds: (json['highlightSeconds'] as List<dynamic>? ?? const [])
            .map((item) => (item as num).toInt())
            .toList(),
      );

  String get heroLabel => genres.isNotEmpty ? genres.first : category;
}
