import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:video_player/video_player.dart';

import '../../../app/app_theme.dart';

class PremiumVideoPlayer extends ConsumerStatefulWidget {
  const PremiumVideoPlayer({
    super.key,
    required this.videoUrl,
    required this.title,
    this.subtitleUrl,
    this.onProgress,
    this.onCompleted,
  });

  final String videoUrl;
  final String title;
  final String? subtitleUrl;
  final Function(Duration)? onProgress;
  final VoidCallback? onCompleted;

  @override
  ConsumerState<PremiumVideoPlayer> createState() => _PremiumVideoPlayerState();
}

class _PremiumVideoPlayerState extends ConsumerState<PremiumVideoPlayer> {
  VideoPlayerController? _controller;
  bool _isLoading = true;
  bool _showControls = true;
  bool _isFullscreen = false;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  bool _subtitlesEnabled = false;

  @override
  void initState() {
    super.initState();
    _initializePlayer();
  }

  @override
  void dispose() {
    _controller?.removeListener(_videoListener);
    if (_isFullscreen) {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    }
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _initializePlayer() async {
    try {
      _controller =
          VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl));

      await _controller!.initialize();

      if (mounted) {
        setState(() {
          _isLoading = false;
        });

        _controller!.addListener(_videoListener);
        await _controller!.play();
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _videoListener() {
    if (_controller == null) return;

    final value = _controller!.value;
    final position = value.position;
    final duration = value.duration;

    if (!mounted) return;

    setState(() {
      _position = position;
      _duration = duration;
    });

    widget.onProgress?.call(position);

    if (duration.inMilliseconds > 0 &&
        position.inSeconds >= duration.inSeconds - 1) {
      widget.onCompleted?.call();
    }
  }

  void _togglePlayPause() {
    if (_controller == null) return;

    if (_controller!.value.isPlaying) {
      _controller!.pause();
    } else {
      _controller!.play();
    }
  }

  void _seekForward10Seconds() {
    if (_controller == null) return;
    final newPosition = _position + const Duration(seconds: 10);
    _controller!.seekTo(_boundedPosition(newPosition));
  }

  void _seekBackward10Seconds() {
    if (_controller == null) return;
    final newPosition = _position - const Duration(seconds: 10);
    _controller!.seekTo(_boundedPosition(newPosition));
  }

  void _toggleFullscreen() {
    setState(() {
      _isFullscreen = !_isFullscreen;
    });

    if (_isFullscreen) {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    } else {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    }
  }

  void _toggleSubtitles() {
    setState(() {
      _subtitlesEnabled = !_subtitlesEnabled;
    });
  }

  Duration _boundedPosition(Duration position) {
    if (_duration <= Duration.zero) {
      return Duration.zero;
    }
    if (position < Duration.zero) {
      return Duration.zero;
    }
    if (position > _duration) {
      return _duration;
    }
    return position;
  }

  String _formatDuration(Duration duration) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    final seconds = duration.inSeconds.remainder(60);

    if (hours > 0) {
      return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
    } else {
      return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: AppTheme.gold),
            SizedBox(height: 16),
            Text(
              'Loading premium content...',
              style: TextStyle(
                color: AppTheme.textMuted,
                fontSize: 16,
              ),
            ),
          ],
        ),
      );
    }

    if (_controller == null || !_controller!.value.isInitialized) {
      return const Center(
        child: Text(
          'Unable to load video right now.',
          style: TextStyle(color: AppTheme.textMuted),
        ),
      );
    }

    final sliderMax =
        _duration.inSeconds > 0 ? _duration.inSeconds.toDouble() : 1.0;
    final sliderValue =
        _position.inSeconds.clamp(0, sliderMax.toInt()).toDouble();

    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onTap: () {
          setState(() {
            _showControls = !_showControls;
          });
        },
        child: Stack(
          children: [
            // Video player
            Center(
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: VideoPlayer(_controller!),
              ),
            ),

            // Controls overlay
            if (_showControls) ...[
              // Top controls
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black54,
                        Colors.transparent,
                      ],
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          widget.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Row(
                        children: [
                          IconButton(
                            onPressed: _toggleSubtitles,
                            icon: Icon(
                              _subtitlesEnabled
                                  ? Icons.subtitles
                                  : Icons.subtitles_off,
                              color: Colors.white,
                            ),
                          ),
                          IconButton(
                            onPressed: _toggleFullscreen,
                            icon: const Icon(
                              Icons.fullscreen,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // Bottom controls
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.black54,
                      ],
                    ),
                  ),
                  child: Column(
                    children: [
                      // Progress bar
                      SliderTheme(
                        data: SliderTheme.of(context).copyWith(
                          thumbShape: const RoundSliderThumbShape(
                              enabledThumbRadius: 6),
                          overlayShape:
                              const RoundSliderOverlayShape(overlayRadius: 12),
                          activeTrackColor: AppTheme.gold,
                          inactiveTrackColor: Colors.white24,
                          thumbColor: AppTheme.gold,
                        ),
                        child: Slider(
                          value: sliderValue,
                          max: sliderMax,
                          onChanged: _duration.inSeconds > 0
                              ? (value) {
                                  _controller?.seekTo(
                                      Duration(seconds: value.toInt()));
                                }
                              : null,
                        ),
                      ),

                      const SizedBox(height: 8),

                      // Time display
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _formatDuration(_position),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                            ),
                          ),
                          Text(
                            _formatDuration(_duration),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 8),

                      // Control buttons
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          IconButton(
                            onPressed: _seekBackward10Seconds,
                            icon: const Icon(
                              Icons.replay_10,
                              color: Colors.white,
                              size: 32,
                            ),
                          ),
                          IconButton(
                            onPressed: _togglePlayPause,
                            icon: Icon(
                              _controller!.value.isPlaying
                                  ? Icons.pause
                                  : Icons.play_arrow,
                              color: Colors.white,
                              size: 48,
                            ),
                          ),
                           IconButton(
                             onPressed: _seekForward10Seconds,
                             icon: const Icon(
                               Icons.forward_10,
                               color: Colors.white,
                               size: 32,
                             ),
                           ),
                         ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
