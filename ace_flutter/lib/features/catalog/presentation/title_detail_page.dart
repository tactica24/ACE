import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/app_theme.dart';
import '../../../core/network/media_url.dart';
import '../../../widgets/premium_scaffold.dart';
import '../../auth/data/auth_repository.dart';
import '../../downloads/data/offline_download_repository.dart';
import '../../downloads/models/downloaded_title.dart';
import '../../library/data/library_repository.dart';
import '../../player/models/playback_request.dart';
import '../data/catalog_repository.dart';
import '../data/unlock_repository.dart';
import '../models/title_detail.dart';

class TitleDetailPage extends ConsumerWidget {
  const TitleDetailPage({super.key, required this.titleId});

  final String titleId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(titleDetailProvider(titleId));

    return PremiumScaffold(
      title: 'Title',
      currentLocation: '/browse',
      body: detailAsync.when(
        data: (detail) => _DetailBody(detail: detail),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Text(error.toString()),
      ),
    );
  }
}

class _DetailBody extends ConsumerStatefulWidget {
  const _DetailBody({required this.detail});

  final TitleDetail detail;

  @override
  ConsumerState<_DetailBody> createState() => _DetailBodyState();
}

class _DetailBodyState extends ConsumerState<_DetailBody> {
  bool _isDownloading = false;
  String? _downloadError;
  String? _unlockError;
  double? _downloadProgress;
  final Set<String> _busyUnlockIds = <String>{};

  bool get _isSeriesContainer => widget.detail.isSeriesContainer;

  String? get _principalId => ref.read(firebaseAuthProvider).currentUser?.uid;

  List<PlaybackQueueEntry> _buildSeriesQueue() {
    return widget.detail.episodes
        .map(
          (episode) => PlaybackQueueEntry(
            id: episode.id,
            title: episode.title,
            description: episode.description,
            posterKey: episode.posterKey ?? widget.detail.summary.posterKey,
            posterUrl: resolveTitlePosterUrl(
              titleId: episode.id,
              posterUrl: episode.posterUrl ?? widget.detail.summary.posterUrl,
              posterKey: episode.posterKey ?? widget.detail.summary.posterKey,
            ),
            teaserOnly: !episode.access.hasAccess,
            hasAccess: episode.access.hasAccess,
            previewAvailable: episode.previewAvailable,
            audioLanguages: episode.audioLanguages,
            subtitleTracks: episode.subtitleTracks,
            resumePositionSec: episode.progressSec,
            trailerUrl: episode.trailerUrl,
            seasonNumber: episode.seasonNumber,
            episodeNumber: episode.episodeNumber,
          ),
        )
        .toList();
  }

  PlaybackQueueEntry _buildStandaloneEntry() {
    return PlaybackQueueEntry(
      id: widget.detail.summary.id,
      title: widget.detail.summary.title,
      description: widget.detail.summary.description,
      posterKey: widget.detail.summary.posterKey,
      posterUrl: resolveTitlePosterUrl(
        titleId: widget.detail.summary.id,
        posterUrl: widget.detail.summary.posterUrl,
        posterKey: widget.detail.summary.posterKey,
      ),
      teaserOnly: !widget.detail.access.hasAccess,
      hasAccess: widget.detail.access.hasAccess,
      previewAvailable: widget.detail.previewAvailable,
      audioLanguages: widget.detail.audioLanguages,
      subtitleTracks: widget.detail.subtitleTracks,
      resumePositionSec: widget.detail.progressSec,
      trailerUrl: widget.detail.trailerUrl,
      seasonNumber: widget.detail.seasonNumber,
      episodeNumber: widget.detail.episodeNumber,
    );
  }

  void _launchPlayback({
    required PlaybackQueueEntry entry,
    required int index,
    required List<PlaybackQueueEntry> queue,
  }) {
    context.push(
      '/player/${entry.id}?teaser=${entry.teaserOnly ? '1' : '0'}',
      extra: PlaybackRequest(entries: queue, currentIndex: index),
    );
  }

  Future<void> _unlockTitle(String titleId, {VoidCallback? onSuccess}) async {
    final principalId = _principalId;
    if (principalId == null || principalId.isEmpty) {
      if (!mounted) return;
      setState(() {
        _unlockError = 'Sign in is required before unlocking this title.';
      });
      return;
    }

    setState(() {
      _busyUnlockIds.add(titleId);
      _unlockError = null;
    });

    try {
      await ref.read(unlockRepositoryProvider).unlockTitle(titleId);
      ref.invalidate(titleDetailProvider(widget.detail.summary.id));
      ref.invalidate(libraryTitlesProvider);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Access unlocked.')),
      );
      onSuccess?.call();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _unlockError = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _busyUnlockIds.remove(titleId);
        });
      }
    }
  }

  Future<void> _unlockEpisodeAndPlay(int episodeIndex) async {
    final seriesQueue = _buildSeriesQueue();
    final queueEntry = seriesQueue[episodeIndex];

    await _unlockTitle(
      queueEntry.id,
      onSuccess: () {
        final updatedQueue = List<PlaybackQueueEntry>.from(seriesQueue);
        updatedQueue[episodeIndex] = updatedQueue[episodeIndex].copyWith(
          hasAccess: true,
          teaserOnly: false,
          resumePositionSec: 0,
        );
        _launchPlayback(
          entry: updatedQueue[episodeIndex],
          index: episodeIndex,
          queue: updatedQueue,
        );
      },
    );
  }

  Future<void> _startOfflineDownload() async {
    final principalId = _principalId;
    if (principalId == null || principalId.isEmpty) {
      if (!mounted) return;
      setState(() {
        _downloadError = 'Sign in is required before downloading titles.';
      });
      return;
    }

    if (_isSeriesContainer) {
      if (!mounted) return;
      setState(() {
        _downloadError = 'Not available.';
      });
      return;
    }

    setState(() {
      _isDownloading = true;
      _downloadProgress = 0;
      _downloadError = null;
    });

    try {
      await ref.read(offlineDownloadRepositoryProvider).downloadTitle(
            principalId: principalId,
            detail: widget.detail,
            isSignedIn: true,
            onProgress: (progress) {
              if (!mounted) return;
              setState(() {
                _downloadProgress = progress;
              });
            },
          );

      ref.invalidate(offlineDownloadsProvider(principalId));
      ref.invalidate(
        downloadedTitleProvider(
          (principalId: principalId, titleId: widget.detail.summary.id),
        ),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Saved for offline playback in this app.')),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _downloadError = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isDownloading = false;
          _downloadProgress = null;
        });
      }
    }
  }

  Future<void> _removeOfflineDownload() async {
    final principalId = _principalId;
    if (principalId == null || principalId.isEmpty) {
      return;
    }

    await ref.read(offlineDownloadRepositoryProvider).removeDownload(
          principalId: principalId,
          titleId: widget.detail.summary.id,
        );

    ref.invalidate(offlineDownloadsProvider(principalId));
    ref.invalidate(
      downloadedTitleProvider(
        (principalId: principalId, titleId: widget.detail.summary.id),
      ),
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Offline copy removed.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.detail.summary;
    final principalId = ref.watch(firebaseAuthProvider).currentUser?.uid;
    final isSignedIn = principalId != null && principalId.isNotEmpty;
    final downloadedAsync =
        (!_isSeriesContainer && principalId != null && principalId.isNotEmpty)
            ? ref.watch(
                downloadedTitleProvider(
                  (principalId: principalId, titleId: title.id),
                ),
              )
            : const AsyncData<DownloadedTitle?>(null);
    final seriesQueue = _buildSeriesQueue();
    final firstPlayableEpisode = seriesQueue.isEmpty
        ? null
        : seriesQueue.firstWhere(
            (entry) => entry.hasAccess,
            orElse: () => seriesQueue.first,
          );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_isSeriesContainer) ...[
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(30),
              gradient: AppTheme.premiumPanelGradient,
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title.title,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                        letterSpacing: -1,
                      ),
                ),
                const SizedBox(height: 12),
                Text(
                  title.description,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: AppTheme.textMuted,
                        height: 1.6,
                      ),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    _DetailChip(label: title.category),
                    _DetailChip(label: title.videoType),
                    _DetailChip(label: title.ageRating),
                    if (title.releaseYear != null)
                      _DetailChip(label: '${title.releaseYear}'),
                    if (title.audioLanguages.isNotEmpty)
                      ...title.audioLanguages
                          .take(2)
                          .map((language) => _DetailChip(label: language)),
                  ],
                ),
                const SizedBox(height: 22),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (firstPlayableEpisode != null)
                      ElevatedButton(
                        onPressed: firstPlayableEpisode.hasAccess ||
                                firstPlayableEpisode.previewAvailable
                            ? () => _launchPlayback(
                                  entry: firstPlayableEpisode,
                                  index:
                                      seriesQueue.indexOf(firstPlayableEpisode),
                                  queue: seriesQueue,
                                )
                            : null,
                        child: Text(
                          firstPlayableEpisode.hasAccess
                              ? 'Start series'
                              : firstPlayableEpisode.previewAvailable
                                  ? 'Watch preview'
                                  : 'Preview unavailable',
                        ),
                      ),
                    OutlinedButton(
                      onPressed: () => context.go('/library'),
                      child: const Text('My Access'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          _SeriesAccessCard(
            detail: widget.detail,
            isSignedIn: isSignedIn,
            busyUnlockIds: _busyUnlockIds,
            onUnlockAndPlay: _unlockEpisodeAndPlay,
            onPlayEpisode: (episodeIndex) => _launchPlayback(
              entry: seriesQueue[episodeIndex],
              index: episodeIndex,
              queue: seriesQueue,
            ),
          ),
        ] else
          _MovieOverviewCard(
            detail: widget.detail,
            isSignedIn: isSignedIn,
            busyUnlock: _busyUnlockIds.contains(title.id),
            downloadedAsync: downloadedAsync,
            isDownloading: _isDownloading,
            downloadProgress: _downloadProgress,
            onUnlock: () => _unlockTitle(title.id),
            onPreview: () => _launchPlayback(
              entry: _buildStandaloneEntry(),
              index: 0,
              queue: [_buildStandaloneEntry()],
            ),
            onDownload: _startOfflineDownload,
            onRemoveDownload: _removeOfflineDownload,
            onPlayOffline: (downloaded) =>
                context.push('/offline-player', extra: downloaded),
            onOpenLibrary: () => context.go('/library'),
          ),
        if (_downloadError != null) ...[
          const SizedBox(height: 10),
          Text(
            _downloadError!,
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: Colors.redAccent),
          ),
        ],
        if (_unlockError != null) ...[
          const SizedBox(height: 10),
          Text(
            _unlockError!,
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: Colors.redAccent),
          ),
        ],
      ],
    );
  }
}

class _MovieOverviewCard extends StatelessWidget {
  const _MovieOverviewCard({
    required this.detail,
    required this.isSignedIn,
    required this.busyUnlock,
    required this.downloadedAsync,
    required this.isDownloading,
    required this.downloadProgress,
    required this.onUnlock,
    required this.onPreview,
    required this.onDownload,
    required this.onRemoveDownload,
    required this.onPlayOffline,
    required this.onOpenLibrary,
  });

  final TitleDetail detail;
  final bool isSignedIn;
  final bool busyUnlock;
  final AsyncValue<DownloadedTitle?> downloadedAsync;
  final bool isDownloading;
  final double? downloadProgress;
  final VoidCallback onUnlock;
  final VoidCallback onPreview;
  final VoidCallback onDownload;
  final VoidCallback onRemoveDownload;
  final ValueChanged<DownloadedTitle> onPlayOffline;
  final VoidCallback onOpenLibrary;

  @override
  Widget build(BuildContext context) {
    final title = detail.summary;
    final canWatch = detail.access.hasAccess;
    final posterUrl = resolveTitlePosterUrl(
      titleId: title.id,
      posterUrl: title.posterUrl,
      posterKey: title.posterKey,
    );
    final metaChips = <Widget>[
      _DetailChip(label: title.category),
      _DetailChip(label: title.videoType),
      _DetailChip(label: title.ageRating),
      if (title.releaseYear != null) _DetailChip(label: '${title.releaseYear}'),
      ...title.audioLanguages
          .take(2)
          .map((language) => _DetailChip(label: language)),
    ];

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppTheme.premiumPanelGradient,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.border),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final showSideBySide = constraints.maxWidth >= 680;

          return Flex(
            direction: showSideBySide ? Axis.horizontal : Axis.vertical,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: showSideBySide ? 190 : double.infinity,
                child: AspectRatio(
                  aspectRatio: 2 / 3,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(18),
                    child: posterUrl == null
                        ? _MoviePosterFallback(title: title.title)
                        : CachedNetworkImage(
                            imageUrl: posterUrl,
                            fit: BoxFit.cover,
                            errorWidget: (_, __, ___) =>
                                _MoviePosterFallback(title: title.title),
                            placeholder: (_, __) => const ColoredBox(
                              color: AppTheme.surfaceElevated,
                            ),
                          ),
                  ),
                ),
              ),
              SizedBox(
                width: showSideBySide ? 20 : 0,
                height: showSideBySide ? 0 : 18,
              ),
              showSideBySide
                  ? Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title.title,
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w900,
                                ),
                          ),
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: metaChips,
                          ),
                          if (title.description.isNotEmpty) ...[
                            const SizedBox(height: 14),
                            Text(
                              title.description,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(
                                    color: AppTheme.textMuted,
                                    height: 1.55,
                                  ),
                            ),
                          ],
                          const SizedBox(height: 14),
                          Text(
                            canWatch
                                ? detail.access.message
                                : 'Preview is available now. Unlock the full movie to continue watching and download it in the app.',
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(
                                  color: AppTheme.textMuted,
                                  height: 1.45,
                                ),
                          ),
                          const SizedBox(height: 16),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              ElevatedButton.icon(
                                onPressed: canWatch || detail.previewAvailable
                                    ? onPreview
                                    : null,
                                icon: Icon(
                                  canWatch
                                      ? Icons.play_circle_fill_rounded
                                      : Icons.play_circle_outline_rounded,
                                ),
                                label: Text(
                                    canWatch ? 'Watch now' : 'Watch preview'),
                              ),
                              if (!canWatch)
                                ElevatedButton.icon(
                                  onPressed: busyUnlock
                                      ? null
                                      : isSignedIn
                                          ? onUnlock
                                          : null,
                                  icon: busyUnlock
                                      ? const SizedBox(
                                          width: 18,
                                          height: 18,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                          ),
                                        )
                                      : const Icon(Icons.lock_open_rounded),
                                  label: Text(
                                    busyUnlock
                                        ? 'Unlocking...'
                                        : isSignedIn
                                            ? 'Unlock full movie'
                                            : 'Sign in to unlock',
                                  ),
                                ),
                              OutlinedButton(
                                onPressed: onOpenLibrary,
                                child: const Text('My Access'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          downloadedAsync.when(
                            data: (downloaded) {
                              if (!canWatch) {
                                return Text(
                                  detail.previewAvailable
                                      ? 'Offline download becomes available immediately after unlock.'
                                      : 'Preview is not available for this title yet. Offline download becomes available after unlock.',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(
                                        color: AppTheme.textMuted,
                                      ),
                                );
                              }

                              if (isDownloading) {
                                return Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Saving for offline playback...',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyMedium
                                          ?.copyWith(
                                            fontWeight: FontWeight.w600,
                                          ),
                                    ),
                                    const SizedBox(height: 10),
                                    LinearProgressIndicator(
                                      value: downloadProgress,
                                      backgroundColor: const Color(0x22FFFFFF),
                                      valueColor:
                                          const AlwaysStoppedAnimation<Color>(
                                        AppTheme.gold,
                                      ),
                                    ),
                                  ],
                                );
                              }

                              if (downloaded == null) {
                                return OutlinedButton.icon(
                                  onPressed: onDownload,
                                  icon: const Icon(Icons.download_rounded),
                                  label: const Text('Download in app'),
                                );
                              }

                              return Wrap(
                                spacing: 12,
                                runSpacing: 12,
                                children: [
                                  ElevatedButton.icon(
                                    onPressed: () => onPlayOffline(downloaded),
                                    icon: const Icon(
                                      Icons.play_circle_fill_rounded,
                                    ),
                                    label: const Text('Play offline'),
                                  ),
                                  OutlinedButton.icon(
                                    onPressed: onRemoveDownload,
                                    icon: const Icon(
                                        Icons.delete_outline_rounded),
                                    label: const Text('Remove download'),
                                  ),
                                ],
                              );
                            },
                            loading: () => const SizedBox(
                              height: 20,
                              child: Center(
                                child:
                                    CircularProgressIndicator(strokeWidth: 2),
                              ),
                            ),
                            error: (error, _) => Text(
                              error.toString(),
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(color: Colors.redAccent),
                            ),
                          ),
                        ],
                      ),
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title.title,
                          style: Theme.of(context)
                              .textTheme
                              .headlineSmall
                              ?.copyWith(
                                fontWeight: FontWeight.w900,
                              ),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: metaChips,
                        ),
                        if (title.description.isNotEmpty) ...[
                          const SizedBox(height: 14),
                          Text(
                            title.description,
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(
                                  color: AppTheme.textMuted,
                                  height: 1.55,
                                ),
                          ),
                        ],
                        const SizedBox(height: 14),
                        Text(
                          canWatch
                              ? detail.access.message
                              : 'Preview is available now. Unlock the full movie to continue watching and download it in the app.',
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: AppTheme.textMuted,
                                    height: 1.45,
                                  ),
                        ),
                        const SizedBox(height: 16),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            ElevatedButton.icon(
                              onPressed: canWatch || detail.previewAvailable
                                  ? onPreview
                                  : null,
                              icon: Icon(
                                canWatch
                                    ? Icons.play_circle_fill_rounded
                                    : Icons.play_circle_outline_rounded,
                              ),
                              label: Text(
                                  canWatch ? 'Watch now' : 'Watch preview'),
                            ),
                            if (!canWatch)
                              ElevatedButton.icon(
                                onPressed: busyUnlock
                                    ? null
                                    : isSignedIn
                                        ? onUnlock
                                        : null,
                                icon: busyUnlock
                                    ? const SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(
                                            strokeWidth: 2),
                                      )
                                    : const Icon(Icons.lock_open_rounded),
                                label: Text(
                                  busyUnlock
                                      ? 'Unlocking...'
                                      : isSignedIn
                                          ? 'Unlock full movie'
                                          : 'Sign in to unlock',
                                ),
                              ),
                            OutlinedButton(
                              onPressed: onOpenLibrary,
                              child: const Text('My Access'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        downloadedAsync.when(
                          data: (downloaded) {
                            if (!canWatch) {
                              return Text(
                                detail.previewAvailable
                                    ? 'Offline download becomes available immediately after unlock.'
                                    : 'Preview is not available for this title yet. Offline download becomes available after unlock.',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(
                                      color: AppTheme.textMuted,
                                    ),
                              );
                            }

                            if (isDownloading) {
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Saving for offline playback...',
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.copyWith(fontWeight: FontWeight.w600),
                                  ),
                                  const SizedBox(height: 10),
                                  LinearProgressIndicator(
                                    value: downloadProgress,
                                    backgroundColor: const Color(0x22FFFFFF),
                                    valueColor:
                                        const AlwaysStoppedAnimation<Color>(
                                      AppTheme.gold,
                                    ),
                                  ),
                                ],
                              );
                            }

                            if (downloaded == null) {
                              return OutlinedButton.icon(
                                onPressed: onDownload,
                                icon: const Icon(Icons.download_rounded),
                                label: const Text('Download in app'),
                              );
                            }

                            return Wrap(
                              spacing: 12,
                              runSpacing: 12,
                              children: [
                                ElevatedButton.icon(
                                  onPressed: () => onPlayOffline(downloaded),
                                  icon: const Icon(
                                      Icons.play_circle_fill_rounded),
                                  label: const Text('Play offline'),
                                ),
                                OutlinedButton.icon(
                                  onPressed: onRemoveDownload,
                                  icon:
                                      const Icon(Icons.delete_outline_rounded),
                                  label: const Text('Remove download'),
                                ),
                              ],
                            );
                          },
                          loading: () => const SizedBox(
                            height: 20,
                            child: Center(
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          ),
                          error: (error, _) => Text(
                            error.toString(),
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(color: Colors.redAccent),
                          ),
                        ),
                      ],
                    ),
            ],
          );
        },
      ),
    );
  }
}

class _MoviePosterFallback extends StatelessWidget {
  const _MoviePosterFallback({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: AppTheme.premiumPanelGradient,
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Align(
          alignment: Alignment.bottomLeft,
          child: Text(
            title,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
        ),
      ),
    );
  }
}

class _SeriesAccessCard extends StatelessWidget {
  const _SeriesAccessCard({
    required this.detail,
    required this.isSignedIn,
    required this.busyUnlockIds,
    required this.onUnlockAndPlay,
    required this.onPlayEpisode,
  });

  final TitleDetail detail;
  final bool isSignedIn;
  final Set<String> busyUnlockIds;
  final ValueChanged<int> onUnlockAndPlay;
  final ValueChanged<int> onPlayEpisode;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Episodes',
          style: Theme.of(context)
              .textTheme
              .titleLarge
              ?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 12),
        ...detail.episodes.asMap().entries.map((entry) {
          final index = entry.key;
          final episode = entry.value;
          final busy = busyUnlockIds.contains(episode.id);
          final buttonLabel = episode.access.hasAccess
              ? 'Watch episode'
              : isSignedIn
                  ? 'Unlock episode'
                  : 'Sign in to unlock';

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  episode.episodeLabel,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                Text(
                  episode.description,
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(color: AppTheme.textMuted),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _DetailChip(
                      label: episode.access.hasAccess ? 'Unlocked' : 'Locked',
                    ),
                    if (episode.subtitleTracks.isNotEmpty)
                      _DetailChip(
                        label:
                            '${episode.subtitleTracks.length} subtitle option${episode.subtitleTracks.length == 1 ? '' : 's'}',
                      ),
                    if (episode.audioLanguages.isNotEmpty)
                      _DetailChip(
                        label: episode.audioLanguages.first,
                      ),
                  ],
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ElevatedButton.icon(
                      onPressed: episode.access.hasAccess
                          ? () => onPlayEpisode(index)
                          : busy
                              ? null
                              : isSignedIn
                                  ? () => onUnlockAndPlay(index)
                                  : null,
                      icon: busy
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Icon(
                              episode.access.hasAccess
                                  ? Icons.play_circle_fill_rounded
                                  : Icons.lock_open_rounded,
                            ),
                      label: Text(
                        busy ? 'Unlocking...' : buttonLabel,
                      ),
                    ),
                    if (!episode.access.hasAccess && episode.previewAvailable)
                      OutlinedButton.icon(
                        onPressed: () => onPlayEpisode(index),
                        icon: const Icon(Icons.play_circle_outline_rounded),
                        label: const Text('Preview'),
                      ),
                  ],
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}

class _DetailChip extends StatelessWidget {
  const _DetailChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0x14FFFFFF),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppTheme.border),
      ),
      child: Text(label),
    );
  }
}
