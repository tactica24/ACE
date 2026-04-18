import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/app_theme.dart';
import '../../../widgets/premium_scaffold.dart';
import '../../auth/data/auth_repository.dart';
import '../../downloads/data/offline_download_repository.dart';
import '../../downloads/models/downloaded_title.dart';
import '../data/catalog_repository.dart';
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
  double? _downloadProgress;
  String? _downloadError;

  Future<void> _startOfflineDownload() async {
    final principalId = ref.read(firebaseAuthProvider).currentUser?.uid;
    if (principalId == null || principalId.isEmpty) {
      if (!mounted) return;
      setState(() {
        _downloadError = 'Sign in is required before downloading titles.';
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
        downloadedTitleProvider((principalId: principalId, titleId: widget.detail.summary.id)),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Saved for offline playback.')),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _downloadError = error.toString();
      });
    } finally {
      if (!mounted) return;
      setState(() {
        _isDownloading = false;
        _downloadProgress = null;
      });
    }
  }

  Future<void> _removeOfflineDownload() async {
    final principalId = ref.read(firebaseAuthProvider).currentUser?.uid;
    if (principalId == null || principalId.isEmpty) {
      return;
    }

    await ref.read(offlineDownloadRepositoryProvider).removeDownload(
          principalId: principalId,
          titleId: widget.detail.summary.id,
        );

    ref.invalidate(offlineDownloadsProvider(principalId));
    ref.invalidate(
      downloadedTitleProvider((principalId: principalId, titleId: widget.detail.summary.id)),
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Offline copy removed.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.detail.summary;
    final canWatch = widget.detail.access.hasAccess;
    final principalId = ref.watch(firebaseAuthProvider).currentUser?.uid;
    final downloadedAsync = principalId == null || principalId.isEmpty
        ? const AsyncData<DownloadedTitle?>(null)
        : ref.watch(downloadedTitleProvider((principalId: principalId, titleId: title.id)));
    final accessMessage = canWatch
        ? widget.detail.access.message
        : 'This account does not currently have access to this title.';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(30),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF13203C), Color(0xFF0B1320), Color(0xFF221529)],
            ),
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
                  if (title.releaseYear != null) _DetailChip(label: '${title.releaseYear}'),
                ],
              ),
              const SizedBox(height: 22),
              Row(
                children: [
                  ElevatedButton(
                    onPressed: () => context.push(
                      '/player/${title.id}?teaser=${canWatch ? '0' : '1'}',
                    ),
                    child: Text(canWatch ? 'Watch now' : 'Watch preview'),
                  ),
                  const SizedBox(width: 12),
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
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppTheme.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Access status',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 10),
              Text(
                accessMessage,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.textMuted,
                      height: 1.5,
                    ),
              ),
              const SizedBox(height: 16),
              downloadedAsync.when(
                data: (downloaded) {
                  if (!canWatch) {
                    return Text(
                      'Download is available only for unlocked titles.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppTheme.textMuted,
                          ),
                    );
                  }

                  if (_isDownloading) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Saving for offline playback...',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                        const SizedBox(height: 10),
                        LinearProgressIndicator(
                          value: _downloadProgress,
                          backgroundColor: const Color(0x22FFFFFF),
                          valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.gold),
                        ),
                      ],
                    );
                  }

                  if (downloaded == null) {
                    return OutlinedButton.icon(
                      onPressed: _startOfflineDownload,
                      icon: const Icon(Icons.download_rounded),
                      label: const Text('Download for offline'),
                    );
                  }

                  return Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      ElevatedButton.icon(
                        onPressed: () => context.push('/offline-player', extra: downloaded),
                        icon: const Icon(Icons.play_circle_fill_rounded),
                        label: const Text('Play offline'),
                      ),
                      OutlinedButton.icon(
                        onPressed: _removeOfflineDownload,
                        icon: const Icon(Icons.delete_outline_rounded),
                        label: const Text('Remove download'),
                      ),
                    ],
                  );
                },
                loading: () => const SizedBox(
                  height: 20,
                  child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                ),
                error: (error, _) => Text(
                  error.toString(),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.redAccent),
                ),
              ),
              if (_downloadError != null) ...[
                const SizedBox(height: 10),
                Text(
                  _downloadError!,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.redAccent),
                ),
              ],
              if (canWatch) ...[
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => context.push('/player/${title.id}'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.gold,
                    foregroundColor: AppTheme.background,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Play',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        if (widget.detail.episodes.isNotEmpty) ...[
          const SizedBox(height: 20),
          Text(
            'Episodes',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          ...widget.detail.episodes.map(
            (episode) => Container(
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
                    episode.title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    episode.description,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppTheme.textMuted),
                  ),
                ],
              ),
            ),
          ),
        ],
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
