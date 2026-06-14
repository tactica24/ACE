class DownloadedTitle {
  const DownloadedTitle({
    required this.id,
    required this.title,
    required this.description,
    required this.videoType,
    required this.category,
    required this.ageRating,
    required this.durationSec,
    required this.posterKey,
    required this.localPath,
    required this.downloadedAtIso,
    required this.principalId,
    this.offlinePackageId,
    this.releaseYear,
    this.fileSizeBytes,
  });

  final String id;
  final String title;
  final String description;
  final String videoType;
  final String category;
  final String ageRating;
  final int durationSec;
  final String? posterKey;
  final String localPath;
  final String downloadedAtIso;
  final String principalId;
  final String? offlinePackageId;
  final int? releaseYear;
  final int? fileSizeBytes;

  DateTime get downloadedAt =>
      DateTime.tryParse(downloadedAtIso)?.toLocal() ?? DateTime.now();

  factory DownloadedTitle.fromJson(Map<String, dynamic> json) {
    return DownloadedTitle(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Untitled',
      description: json['description'] as String? ?? '',
      videoType: json['videoType'] as String? ?? 'MOVIE',
      category: json['category'] as String? ?? 'Featured',
      ageRating: json['ageRating'] as String? ?? 'PG',
      durationSec: (json['durationSec'] as num?)?.toInt() ?? 0,
      posterKey: json['posterKey'] as String?,
      localPath: json['localPath'] as String? ?? '',
      downloadedAtIso: json['downloadedAtIso'] as String? ?? '',
      principalId: json['principalId'] as String? ?? '',
      offlinePackageId: json['offlinePackageId'] as String?,
      releaseYear: (json['releaseYear'] as num?)?.toInt(),
      fileSizeBytes: (json['fileSizeBytes'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'videoType': videoType,
        'category': category,
        'ageRating': ageRating,
        'durationSec': durationSec,
        'posterKey': posterKey,
        'localPath': localPath,
        'downloadedAtIso': downloadedAtIso,
        'principalId': principalId,
        'offlinePackageId': offlinePackageId,
        'releaseYear': releaseYear,
        'fileSizeBytes': fileSizeBytes,
      };
}
