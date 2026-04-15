import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';

import '../../../app/app_theme.dart';
import '../../../widgets/premium_scaffold.dart';
import '../../auth/data/auth_repository.dart';
import '../../catalog/data/catalog_repository.dart';
import '../data/playback_repository.dart';

class PlaybackPage extends ConsumerStatefulWidget {
  const PlaybackPage({
    super.key,
    required this.titleId,
    required this.teaserOnly,
  });

  final String titleId;
  final bool teaserOnly;

  @override
  ConsumerState<PlaybackPage> createState() => _PlaybackPageState();
}

class _PlaybackPageState extends ConsumerState<PlaybackPage> {
  VideoPlayerController? _controller;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    try {
      final account = await ref.read(currentAccountProvider.future);
      final streamUrl = await ref.read(playbackRepositoryProvider).createPlaybackUrl(
            titleId: widget.titleId,
            teaserOnly: widget.teaserOnly,
            isSignedIn: account != null,
          );

      final controller = VideoPlayerController.networkUrl(Uri.parse(streamUrl));
      await controller.initialize();
      await controller.play();

      if (!mounted) {
        await controller.dispose();
        return;
      }

      setState(() {
        _controller = controller;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final titleAsync = ref.watch(titleDetailProvider(widget.titleId));

    return PremiumScaffold(
      title: 'Playback',
      currentLocation: '/browse',
      body: titleAsync.when(
        data: (detail) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              detail.summary.title,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 16),
            Container(
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: AppTheme.border),
              ),
              padding: const EdgeInsets.all(14),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : _controller != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(20),
                            child: VideoPlayer(_controller!),
                          )
                        : _PlayerErrorState(message: _error ?? detail.access.message),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              widget.teaserOnly
                  ? 'Preview playback mode'
                  : 'Full playback for accounts with access',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              detail.access.message,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.textMuted,
                    height: 1.5,
                  ),
            ),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Text(error.toString()),
      ),
    );
  }
}

class _PlayerErrorState extends StatelessWidget {
  const _PlayerErrorState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Text(
          message,
          textAlign: TextAlign.center,
          style: const TextStyle(color: AppTheme.textMuted, height: 1.5),
        ),
      ),
    );
  }
}
