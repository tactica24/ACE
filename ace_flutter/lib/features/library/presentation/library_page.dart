import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/app_theme.dart';
import '../../../core/network/media_url.dart';
import '../../../widgets/premium_scaffold.dart';
import '../../../widgets/title_card.dart';
import '../../auth/data/auth_repository.dart';
import '../../catalog/models/title_summary.dart';
import '../../downloads/data/offline_download_repository.dart';
import '../../downloads/models/downloaded_title.dart';
import '../data/library_repository.dart';

enum _LibraryTab { cloud, downloads }

class LibraryPage extends ConsumerStatefulWidget {
  const LibraryPage({super.key});

  @override
  ConsumerState<LibraryPage> createState() => _LibraryPageState();
}

class _LibraryPageState extends ConsumerState<LibraryPage> {
  _LibraryTab _activeTab = _LibraryTab.cloud;

  @override
  Widget build(BuildContext context) {
    return PremiumScaffold(
      title: 'My Access',
      currentLocation: '/library',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              ChoiceChip(
                selected: _activeTab == _LibraryTab.cloud,
                label: const Text('Cloud access'),
                onSelected: (_) {
                  setState(() {
                    _activeTab = _LibraryTab.cloud;
                  });
                },
              ),
              ChoiceChip(
                selected: _activeTab == _LibraryTab.downloads,
                label: const Text('Downloaded'),
                onSelected: (_) {
                  setState(() {
                    _activeTab = _LibraryTab.downloads;
                  });
                },
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_activeTab == _LibraryTab.cloud) _buildCloudLibrary() else _buildOfflineDownloads(),
        ],
      ),
    );
  }

  Widget _buildCloudLibrary() {
    final authAsync = ref.watch(currentAccountProvider);
    return authAsync.when(
      data: (user) {
        if (user == null) {
          return const _SignedOutLibraryState();
        }

        final libraryAsync = ref.watch(libraryTitlesProvider);
        return libraryAsync.when(
          data: (titles) {
            if (titles.isEmpty) {
              return _EmptyLibraryState(name: user.name ?? user.email);
            }

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Titles available on your account',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 16),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: titles.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 14,
                    mainAxisSpacing: 14,
                    childAspectRatio: 0.72,
                  ),
                  itemBuilder: (context, index) {
                    final title = titles[index];
                    return TitleCard(
                      title: title,
                      posterUrl: resolveMediaUrl(title.posterKey),
                      onTap: () => context.push('/title/${title.id}'),
                    );
                  },
                ),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Text(error.toString()),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Text(error.toString()),
    );
  }

  Widget _buildOfflineDownloads() {
    final principalId = ref.watch(firebaseAuthProvider).currentUser?.uid;
    if (principalId == null || principalId.isEmpty) {
      return const _SignedOutDownloadsState();
    }

    final downloadsAsync = ref.watch(offlineDownloadsProvider(principalId));
    return downloadsAsync.when(
      data: (downloads) {
        if (downloads.isEmpty) {
          return const _EmptyDownloadsState();
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Downloaded titles',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              'Saved to this device and available for offline playback.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppTheme.textMuted),
            ),
            const SizedBox(height: 16),
            ...downloads.map((download) => _DownloadedCard(
                  download: download,
                  onPlay: () => context.push('/offline-player', extra: download),
                  onRemove: () async {
                    await ref.read(offlineDownloadRepositoryProvider).removeDownload(
                          principalId: principalId,
                          titleId: download.id,
                        );
                    ref.invalidate(offlineDownloadsProvider(principalId));
                  },
                )),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Text(error.toString()),
    );
  }
}

class _DownloadedCard extends StatelessWidget {
  const _DownloadedCard({
    required this.download,
    required this.onPlay,
    required this.onRemove,
  });

  final DownloadedTitle download;
  final VoidCallback onPlay;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final title = TitleSummary(
      id: download.id,
      title: download.title,
      description: download.description,
      videoType: download.videoType,
      category: download.category,
      ageRating: download.ageRating,
      genres: const [],
      teaserSec: 0,
      durationSec: download.durationSec,
      posterKey: download.posterKey,
      releaseYear: download.releaseYear,
    );

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 248,
            child: TitleCard(
              title: title,
              posterUrl: resolveMediaUrl(download.posterKey),
              onTap: onPlay,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: onPlay,
                  icon: const Icon(Icons.play_circle_fill_rounded),
                  label: const Text('Play offline'),
                ),
              ),
              const SizedBox(width: 10),
              OutlinedButton.icon(
                onPressed: onRemove,
                icon: const Icon(Icons.delete_outline_rounded),
                label: const Text('Remove'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SignedOutLibraryState extends StatelessWidget {
  const _SignedOutLibraryState();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Sign in to view your access',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 10),
          Text(
            'Use the account that already has access to titles on ACE Studio.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppTheme.textMuted),
          ),
          const SizedBox(height: 18),
          ElevatedButton(
            onPressed: () => context.push('/login'),
            child: const Text('Sign in'),
          ),
        ],
      ),
    );
  }
}

class _SignedOutDownloadsState extends StatelessWidget {
  const _SignedOutDownloadsState();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Sign in to view downloads',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 10),
          Text(
            'Downloaded titles are linked to your signed-in profile on this device.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppTheme.textMuted),
          ),
          const SizedBox(height: 18),
          ElevatedButton(
            onPressed: () => context.push('/login'),
            child: const Text('Sign in'),
          ),
        ],
      ),
    );
  }
}

class _EmptyLibraryState extends StatelessWidget {
  const _EmptyLibraryState({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'No active access found for this account',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 10),
          Text(
            '$name does not currently have titles in the mobile library feed.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppTheme.textMuted),
          ),
          const SizedBox(height: 18),
          OutlinedButton(
            onPressed: () => context.go('/browse'),
            child: const Text('Browse catalog'),
          ),
        ],
      ),
    );
  }
}

class _EmptyDownloadsState extends StatelessWidget {
  const _EmptyDownloadsState();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'No offline downloads yet',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 10),
          Text(
            'Open an unlocked title and tap "Download for offline" to save it on this device.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppTheme.textMuted),
          ),
        ],
      ),
    );
  }
}
