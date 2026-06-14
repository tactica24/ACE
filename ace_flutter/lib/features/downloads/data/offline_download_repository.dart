import 'dart:convert';
import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/network/api_client.dart';
import '../../auth/data/auth_repository.dart';
import '../../catalog/models/title_detail.dart';
import '../models/downloaded_title.dart';
import 'ace_offline_crypto.dart';

const _downloadsPrefKeyPrefix = 'ace.offline.downloads.';
const _offlineKeyPrefix = 'ace.offline.key.';

final offlineDownloadRepositoryProvider = Provider<OfflineDownloadRepository>((
  ref,
) {
  return OfflineDownloadRepository(
    apiClient: ref.watch(apiClientProvider),
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
    required this.apiClient,
    required this.httpClient,
  });

  final ApiClient apiClient;
  final http.Client httpClient;

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

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

    final package = await _prepareOfflinePackage(detail.summary.id);
    if (package.status != 'READY' || package.downloadKey == null) {
      throw Exception(
          'Offline package is still being prepared. Please try again in a moment.');
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

    final request = http.Request(
      'GET',
      apiClient.resolve('/api/offline/packages/${package.id}/file'),
    );
    request.headers.addAll(await apiClient.authHeaders());

    final streamed = await httpClient.send(request);
    if (streamed.statusCode >= 400) {
      throw ApiException(
        'Unable to download this title for offline playback right now.',
        statusCode: streamed.statusCode,
      );
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
    await _writeOfflineKey(
      principalId: principalId,
      packageId: package.id,
      base64Key: package.downloadKey!,
    );

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
      offlinePackageId: package.id,
      releaseYear: detail.summary.releaseYear,
      fileSizeBytes: await savedFile.length(),
    );

    await _upsertDownload(record);
    onProgress?.call(1.0);
    return record;
  }

  Future<File> preparePlaybackFile(DownloadedTitle download) async {
    final sourceFile = File(download.localPath);
    if (!await sourceFile.exists()) {
      throw Exception('Offline file is no longer available on this device.');
    }

    final packageId = download.offlinePackageId?.trim();
    if (packageId == null || packageId.isEmpty) {
      return sourceFile;
    }

    final base64Key = await _readOfflineKey(
      principalId: download.principalId,
      packageId: packageId,
    );
    if (base64Key == null || base64Key.isEmpty) {
      throw Exception(
          'Offline license is missing for this title. Please download it again.');
    }

    final tempDirectory = await getTemporaryDirectory();
    final playbackDirectory =
        Directory('${tempDirectory.path}/ace-offline-playback');
    if (!await playbackDirectory.exists()) {
      await playbackDirectory.create(recursive: true);
    }

    final tempPlaybackFile = File(
      '${playbackDirectory.path}/${_safeFileName(download.id)}.mp4',
    );

    await decryptAceFile(
      sourceFile: sourceFile,
      targetFile: tempPlaybackFile,
      key: base64Decode(base64Key),
    );

    return tempPlaybackFile;
  }

  Future<void> cleanupPreparedPlaybackFile({
    required DownloadedTitle download,
    String? preparedPath,
  }) async {
    final packageId = download.offlinePackageId?.trim();
    if (packageId == null || packageId.isEmpty) {
      return;
    }

    if (preparedPath == null || preparedPath.isEmpty) {
      return;
    }

    final file = File(preparedPath);
    if (await file.exists()) {
      await file.delete();
    }
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
        await _deleteOfflineKey(
          principalId: item.principalId,
          packageId: item.offlinePackageId,
        );
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
        await _deleteOfflineKey(
          principalId: item.principalId,
          packageId: item.offlinePackageId,
        );
        await cleanupPreparedPlaybackFile(download: item, preparedPath: null);
        continue;
      }
      kept.add(item);
    }
    await _saveDownloads(principalId, kept);
  }

  Future<_OfflinePackageDownload> _prepareOfflinePackage(String titleId) async {
    final payload = await apiClient.postJson(
      '/api/offline/packages',
      body: {'videoId': titleId},
    ) as Map<String, dynamic>;

    final package = payload['package'];
    if (package is! Map<String, dynamic>) {
      throw Exception('Offline package response was invalid.');
    }

    return _OfflinePackageDownload.fromJson(package);
  }

  Future<void> _upsertDownload(DownloadedTitle record) async {
    final downloads = await _readDownloads(record.principalId);
    final replaced = downloads.where((item) => item.id == record.id);
    for (final item in replaced) {
      if (item.offlinePackageId != record.offlinePackageId) {
        await _deleteOfflineKey(
          principalId: item.principalId,
          packageId: item.offlinePackageId,
        );
      }
    }
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

  Future<void> _writeOfflineKey({
    required String principalId,
    required String packageId,
    required String base64Key,
  }) {
    return _secureStorage.write(
      key: _offlineKeyStorageKey(principalId, packageId),
      value: base64Key,
    );
  }

  Future<String?> _readOfflineKey({
    required String principalId,
    required String packageId,
  }) {
    return _secureStorage.read(
      key: _offlineKeyStorageKey(principalId, packageId),
    );
  }

  Future<void> _deleteOfflineKey({
    required String principalId,
    required String? packageId,
  }) async {
    final trimmedPackageId = packageId?.trim();
    if (trimmedPackageId == null || trimmedPackageId.isEmpty) {
      return;
    }

    await _secureStorage.delete(
      key: _offlineKeyStorageKey(principalId, trimmedPackageId),
    );
  }

  String _downloadsPrefKey(String principalId) =>
      '$_downloadsPrefKeyPrefix$principalId';

  String _offlineKeyStorageKey(String principalId, String packageId) =>
      '$_offlineKeyPrefix$principalId.$packageId';

  String _safeFileName(String value) {
    final safe = value.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
    if (safe.isEmpty) {
      return 'title';
    }
    return safe;
  }
}

class _OfflinePackageDownload {
  const _OfflinePackageDownload({
    required this.id,
    required this.status,
    required this.downloadKey,
  });

  final String id;
  final String status;
  final String? downloadKey;

  factory _OfflinePackageDownload.fromJson(Map<String, dynamic> json) {
    return _OfflinePackageDownload(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? 'PREPARING',
      downloadKey: json['downloadKey'] as String?,
    );
  }
}
