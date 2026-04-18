import 'dart:io';

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../../../app/app_theme.dart';
import '../../../widgets/premium_scaffold.dart';
import '../models/downloaded_title.dart';

class OfflinePlaybackPage extends StatefulWidget {
  const OfflinePlaybackPage({super.key, required this.download});

  final DownloadedTitle download;

  @override
  State<OfflinePlaybackPage> createState() => _OfflinePlaybackPageState();
}

class _OfflinePlaybackPageState extends State<OfflinePlaybackPage> {
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
      final file = File(widget.download.localPath);
      final exists = await file.exists();
      if (!exists) {
        throw Exception('Offline file is no longer available on this device.');
      }

      final controller = VideoPlayerController.file(file);
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
    return PremiumScaffold(
      title: 'Offline Playback',
      currentLocation: '/library',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.download.title,
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
                      : _PlayerErrorState(message: _error ?? 'Unable to play this download right now.'),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            'Playing from device storage',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
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
