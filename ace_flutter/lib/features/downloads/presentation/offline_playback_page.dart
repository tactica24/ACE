import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';

import '../../../app/app_theme.dart';
import '../../../widgets/premium_scaffold.dart';
import '../../profile/data/user_preferences.dart';
import '../models/downloaded_title.dart';

class OfflinePlaybackPage extends ConsumerStatefulWidget {
  const OfflinePlaybackPage({super.key, required this.download});

  final DownloadedTitle download;

  @override
  ConsumerState<OfflinePlaybackPage> createState() =>
      _OfflinePlaybackPageState();
}

class _OfflinePlaybackPageState extends ConsumerState<OfflinePlaybackPage> {
  VideoPlayerController? _controller;
  String? _error;
  bool _loading = true;
  bool _muted = true;

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
      final file = File(widget.download.localPath);
      final exists = await file.exists();
      if (!exists) {
        throw Exception('Offline file is no longer available on this device.');
      }

      final controller = VideoPlayerController.file(file);
      await controller.initialize();
      final preferences = await ref.read(userPreferencesProvider.future);
      await controller.setVolume(preferences.startPlaybackMuted ? 0 : 1);
      await controller.play();

      if (!mounted) {
        await controller.dispose();
        return;
      }

      setState(() {
        _controller = controller;
        _muted = preferences.startPlaybackMuted;
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

  Future<void> _toggleMute() async {
    final controller = _controller;
    if (controller == null) return;

    final nextMuted = !_muted;
    await controller.setVolume(nextMuted ? 0 : 1);
    if (!mounted) return;
    setState(() {
      _muted = nextMuted;
    });
  }

  @override
  Widget build(BuildContext context) {
    return PremiumScaffold(
      title: 'Offline Playback',
      currentLocation: '/library',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.download.title,
            style: Theme.of(context)
                .textTheme
                .headlineSmall
                ?.copyWith(fontWeight: FontWeight.w900),
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
                      : _PlayerErrorState(
                          message: _error ??
                              'Unable to play this download right now.'),
            ),
          ),
          const SizedBox(height: 18),
          if (_controller != null && !_loading) ...[
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                OutlinedButton.icon(
                  onPressed: _toggleMute,
                  icon: Icon(_muted
                      ? Icons.volume_off_rounded
                      : Icons.volume_up_rounded),
                  label: Text(_muted ? 'Sound off' : 'Sound on'),
                ),
                OutlinedButton.icon(
                  onPressed: () {
                    if (_controller!.value.isPlaying) {
                      _controller!.pause();
                    } else {
                      _controller!.play();
                    }
                    setState(() {});
                  },
                  icon: Icon(
                    _controller!.value.isPlaying
                        ? Icons.pause_circle_outline_rounded
                        : Icons.play_circle_outline_rounded,
                  ),
                  label: Text(_controller!.value.isPlaying ? 'Pause' : 'Play'),
                ),
              ],
            ),
            const SizedBox(height: 18),
          ],
          Text(
            'Playing from device storage',
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            'This title is playing offline from your downloaded library.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.textMuted,
                  height: 1.5,
                ),
          ),
        ],
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
