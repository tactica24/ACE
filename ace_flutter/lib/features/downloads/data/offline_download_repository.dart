import 'dart:convert';
import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/network/api_client.dart';
import '../../auth/data/auth_repository.dart';
import '../../catalog/models/title_detail.dart';
import '../../player/data/playback_repository.dart';
import '../../profile/data/user_preferences.dart';
import '../models/downloaded_title.dart';

const _downloadsPrefKeyPrefix = 'ace.offline.downloads.';

final offlineDownloadRepositoryProvider = Provider<OfflineDownloadRepository>((
  ref,
) {
  return OfflineDownloadRepository(
    playbackRepository: ref.watch(playbackRepositoryProvider),
    httpClient: ref.watch(httpClientProvider),
  );
});

final offlineDownloadsProvider =
    FutureProvider.family<List<DownloadedTitle>, String>(
  (ref, principalId) async {
    return ref
        .watch(offlineDownloadRepositoryProvider)
        .listDownloads(principalId);
  },
);

final downloadedTitleProvider = FutureProvider.family<DownloadedTitle?,
    ({String principalId, String titleId})>(
  (ref, args) async {
    return ref
        .watch(offlineDownloadRepositoryProvider)
        .findDownload(principalId: args.principalId, titleId: args.titleId);
  },
);

class OfflineDownloadRepository {
  OfflineDownloadRepository({
    required this.playbackRepository,
    required this.httpClient,
  });

  final PlaybackRepository playbackRepository;
  final http.Client httpClient;

  Future<DownloadedTitle> downloadTitle({
    required String principalId,
    required TitleDetail detail,
    required bool isSignedIn,
    void Function(double progress)? onProgress,
  }) async {
    if (principalId.isEmpty) {
      throw Exception('Sign in is required before downloading.');
    }
    if (!isSignedIn || !detail.access.hasAccess) {
      throw Exception(
          'Only unlocked titles can be downloaded for offline playback.');
    }

    final urls = await playbackRepository.createPlaybackUrls(
      titleId: detail.summary.id,
      teaserOnly: false,
      isSignedIn: true,
      qualityPreference:
          (await UserPreferences.load()).downloadQuality == 'Best available'
              ? 'High quality'
              : 'Data saver',
    );
    final streamUrl = urls.progressiveUrl ?? urls.hlsUrl ?? urls.dashUrl;
    if (streamUrl == null) {
      throw Exception('No downloadable stream available for this title.');
    }

    final request = http.Request('GET', Uri.parse(streamUrl));
    final streamed = await httpClient.send(request);
    if (streamed.statusCode >= 400) {
      throw ApiException('Unable to download this title right now.',
          statusCode: streamed.statusCode);
    }

    final directory = await _downloadsDirectoryFor(principalId);
    final safeId = _safeFileName(detail.summary.id);
    final tempFile = File('${directory.path}/$safeId.part');
    final targetFile = File('${directory.path}/$safeId.ace');

    if (await tempFile.exists()) {
      await tempFile.delete();
    }
    if (await targetFile.exists()) {
      await targetFile.delete();
    }

    final sink = tempFile.openWrite();
    final totalBytes = streamed.contentLength ?? 0;
    var receivedBytes = 0;
    try {
      await for (final chunk in streamed.stream) {
        sink.add(chunk);
        receivedBytes += chunk.length;
        if (totalBytes > 0) {
          onProgress?.call(receivedBytes / totalBytes);
        }
      }
      await sink.flush();
    } finally {
      await sink.close();
    }

    final savedFile = await tempFile.rename(targetFile.path);

    final record = DownloadedTitle(
      id: detail.summary.id,
      title: detail.summary.title,
      description: detail.summary.description,
      videoType: detail.summary.videoType,
      category: detail.summary.category,
      ageRating: detail.summary.ageRating,
      durationSec: detail.summary.durationSec,
      posterKey: detail.summary.posterKey,
      localPath: savedFile.path,
      downloadedAtIso: DateTime.now().toUtc().toIso8601String(),
      principalId: principalId,
      releaseYear: detail.summary.releaseYear,
      fileSizeBytes: await savedFile.length(),
    );

    await _upsertDownload(record);
    onProgress?.call(1.0);
    return record;
  }

  Future<List<DownloadedTitle>> listDownloads(String principalId) async {
    final records = await _readDownloads(principalId);
    final existing = <DownloadedTitle>[];
    var removedMissingFiles = false;

    for (final item in records) {
      final file = File(item.localPath);
      if (await file.exists()) {
        existing.add(item);
      } else {
        removedMissingFiles = true;
      }
    }

    if (removedMissingFiles) {
      await _saveDownloads(principalId, existing);
    }

    existing.sort((a, b) => b.downloadedAt.compareTo(a.downloadedAt));
    return existing;
  }

  Future<DownloadedTitle?> findDownload({
    required String principalId,
    required String titleId,
  }) async {
    final downloads = await listDownloads(principalId);
    for (final item in downloads) {
      if (item.id == titleId) {
        return item;
      }
    }
    return null;
  }

  Future<void> removeDownload({
    required String principalId,
    required String titleId,
  }) async {
    final downloads = await _readDownloads(principalId);
    final kept = <DownloadedTitle>[];
    for (final item in downloads) {
      if (item.id == titleId) {
        final file = File(item.localPath);
        if (await file.exists()) {
          await file.delete();
        }
        continue;
      }
      kept.add(item);
    }
    await _saveDownloads(principalId, kept);
  }

  Future<void> _upsertDownload(DownloadedTitle record) async {
    final downloads = await _readDownloads(record.principalId);
    final next = <DownloadedTitle>[
      record,
      ...downloads.where((item) => item.id != record.id),
    ];
    await _saveDownloads(record.principalId, next);
  }

  Future<List<DownloadedTitle>> _readDownloads(String principalId) async {
    if (principalId.isEmpty) {
      return const [];
    }
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_downloadsPrefKey(principalId));
    if (raw == null || raw.isEmpty) {
      return const [];
    }

    final decoded = jsonDecode(raw);
    if (decoded is! List<dynamic>) {
      return const [];
    }

    return decoded
        .whereType<Map>()
        .map(
            (item) => DownloadedTitle.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<void> _saveDownloads(
      String principalId, List<DownloadedTitle> downloads) async {
    final prefs = await SharedPreferences.getInstance();
    final payload = downloads.map((item) => item.toJson()).toList();
    await prefs.setString(_downloadsPrefKey(principalId), jsonEncode(payload));
  }

  Future<Directory> _downloadsDirectoryFor(String principalId) async {
    final base = await getApplicationSupportDirectory();
    final directory = Directory('${base.path}/offline/$principalId');
    if (!await directory.exists()) {
      await directory.create(recursive: true);
    }
    return directory;
  }

  String _downloadsPrefKey(String principalId) =>
      '$_downloadsPrefKeyPrefix$principalId';

  String _safeFileName(String value) {
    final safe = value.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
    if (safe.isEmpty) {
      return 'title';
    }
    return safe;
  }
}
