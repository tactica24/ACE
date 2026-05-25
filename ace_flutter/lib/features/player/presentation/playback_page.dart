import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';

import '../../../app/app_theme.dart';
import '../../../widgets/premium_scaffold.dart';
import '../../auth/data/auth_repository.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/data/unlock_repository.dart';
import '../../catalog/models/title_detail.dart';
import '../../profile/data/user_preferences.dart';
import '../data/playback_repository.dart';
import '../models/playback_request.dart';

const _historySyncInterval = Duration(seconds: 5);

class PlaybackPage extends ConsumerStatefulWidget {
  const PlaybackPage({
    super.key,
    required this.titleId,
    required this.teaserOnly,
    this.request,
  });

  final String titleId;
  final bool teaserOnly;
  final PlaybackRequest? request;

  @override
  ConsumerState<PlaybackPage> createState() => _PlaybackPageState();
}
class _PlaybackPageState extends ConsumerState<PlaybackPage> {
  VideoPlayerController? _controller;
  String? _error;
  String? _notice;
  bool _loading = true;
  bool _fullscreen = false;
  bool _showControls = true;
  Timer? _controlsTimer;
  bool _unlockingNext = false;
  double _volume = 1;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  Duration _lastHistorySync = Duration.zero;
  bool _completionHandled = false;
  String _selectedSubtitleId = 'off';
  List<VideoAudioTrack> _audioTracks = const [];
  List<PlaybackQueueEntry> _queue = const [];
  late int _currentIndex;
  bool _isSignedIn = false;
  UserPreferences? _preferences;

  PlaybackQueueEntry get _currentEntry => _queue[_currentIndex];

  @override
  void initState() {
    super.initState();
    _queue = _buildInitialQueue();
    _currentIndex = _buildInitialIndex();
    unawaited(_bootstrap());
  }

  @override
  void dispose() {
    unawaited(_syncHistory(force: true));
    if (_fullscreen) {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    }
    _controller?.removeListener(_handleControllerUpdate);
    _controller?.dispose();
    _controlsTimer?.cancel();
    super.dispose();
  }

  List<PlaybackQueueEntry> _buildInitialQueue() {
    final request = widget.request;
    if (request != null && request.entries.isNotEmpty) {
      return request.entries;
    }

    return <PlaybackQueueEntry>[
      PlaybackQueueEntry(
        id: widget.titleId,
        title: 'Playback',
        description: '',
        posterKey: null,
        teaserOnly: widget.teaserOnly,
        hasAccess: !widget.teaserOnly,
        previewAvailable: !widget.teaserOnly,
        audioLanguages: const [],
        subtitleTracks: const [],
        resumePositionSec: 0,
        trailerUrl: null,
      ),
    ];
  }

  int _buildInitialIndex() {
    final request = widget.request;
    if (request == null || request.entries.isEmpty) {
      return 0;
    }

    return request.currentIndex.clamp(0, request.entries.length - 1).toInt();
  }

  Future<void> _bootstrap() async {
    try {
      final results = await Future.wait<dynamic>([
        ref.read(currentAccountProvider.future),
        ref.read(userPreferencesProvider.future),
      ]);

      final account = results[0];
      final preferences = results[1] as UserPreferences;

      _isSignedIn = account != null;
      _preferences = preferences;

      await _loadEntry(
        _currentIndex,
        autoplay: true,
        resumeFromSec: _currentEntry.resumePositionSec,
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _loadEntry(
    int index, {
    required bool autoplay,
    int? resumeFromSec,
  }) async {
    final entry = _queue[index];
    final nextResumeSec = resumeFromSec ?? entry.resumePositionSec;

    setState(() {
      _loading = true;
      _error = null;
      _notice = null;
      _position = Duration.zero;
      _duration = Duration.zero;
      _audioTracks = const [];
      _completionHandled = false;
    });

    try {
      final controller = await _createControllerForEntry(
        entry,
        autoplay: autoplay,
        resumeFromSec: nextResumeSec,
      );

      final previousController = _controller;
      previousController?.removeListener(_handleControllerUpdate);

      if (!mounted) {
        await controller.dispose();
        await previousController?.dispose();
        return;
      }

      setState(() {
        _currentIndex = index;
        _controller = controller;
        _loading = false;
        _volume = controller.value.volume;
        _duration = controller.value.duration;
        _position = controller.value.position;
      });

      await previousController?.dispose();
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<VideoPlayerController> _createControllerForEntry(
    PlaybackQueueEntry entry, {
    required bool autoplay,
    required int resumeFromSec,
  }) async {
    final UserPreferences preferences =
        _preferences ?? await ref.read(userPreferencesProvider.future);
    final urls =
        await ref.read(playbackRepositoryProvider).createPlaybackUrls(
              titleId: entry.id,
              teaserOnly: entry.teaserOnly,
              isSignedIn: _isSignedIn,
              trailerUrl: entry.trailerUrl,
              qualityPreference: preferences.playbackQuality,
            );
    final playbackCandidates = <String>[
      if (urls.progressiveUrl != null && urls.progressiveUrl!.isNotEmpty)
        urls.progressiveUrl!,
      if (urls.hlsUrl != null && urls.hlsUrl!.isNotEmpty) urls.hlsUrl!,
      if (urls.dashUrl != null && urls.dashUrl!.isNotEmpty) urls.dashUrl!,
    ];
    if (playbackCandidates.isEmpty) {
      throw Exception('No playback stream available for this title.');
    }
    VideoPlayerController? controller;
    String? playbackError;
    for (final url in playbackCandidates) {
      final nextController = VideoPlayerController.networkUrl(Uri.parse(url));
      try {
        await nextController.initialize();
        controller = nextController;
        break;
      } on PlatformException catch (error) {
        playbackError = error.message ?? error.code;
        await nextController.dispose();
      } catch (error) {
        playbackError = error.toString();
        await nextController.dispose();
      }
    }
    if (controller == null) {
      throw Exception(
        'Video player had an error loading this stream. '
        '${playbackError ?? 'Please try a different title.'}',
      );
    }
    final shouldMute = preferences.startPlaybackMuted ||
        (entry.teaserOnly && preferences.previewSilently);
    final defaultSubtitleId = _defaultSubtitleIdFor(entry, preferences);
    await controller.setVolume(shouldMute ? 0 : _volume);
    final safeResume = resumeFromSec > 3
        ? Duration(
            seconds: resumeFromSec
                .clamp(
                  0,
                  controller.value.duration.inSeconds > 10
                      ? controller.value.duration.inSeconds - 5
                      : controller.value.duration.inSeconds,
                )
                .toInt(),
          )
        : Duration.zero;
    if (safeResume > Duration.zero) {
      await controller.seekTo(safeResume);
    }
    _selectedSubtitleId = defaultSubtitleId;
    try {
      await _applySubtitleSelectionToController(
        controller,
        entry,
        defaultSubtitleId,
      );
    } catch (_) {
      _selectedSubtitleId = 'off';
      await controller.setClosedCaptionFile(null);
    }
    if (controller.isAudioTrackSupportAvailable()) {
      final tracks = await controller.getAudioTracks();
      _audioTracks = tracks;
    } else {
      _audioTracks = const [];
    }
    controller.addListener(_handleControllerUpdate);
    if (autoplay) {
      await controller.play();
    }
    return controller;
  }

  String _defaultSubtitleIdFor(
    PlaybackQueueEntry entry,
    UserPreferences preferences,
  ) {
    if (entry.subtitleTracks.isEmpty || !preferences.subtitlesByDefault) {
      return 'off';
    }

    return entry.subtitleTracks
        .firstWhere(
          (track) => track.isDefault,
          orElse: () => entry.subtitleTracks.first,
        )
        .id;
  }

  Future<void> _applySubtitleSelectionToController(
    VideoPlayerController controller,
    PlaybackQueueEntry entry,
    String subtitleId,
  ) async {
    if (subtitleId == 'off') {
      await controller.setClosedCaptionFile(null);
      return;
    }

    TitleSubtitleTrack? track;
    for (final item in entry.subtitleTracks) {
      if (item.id == subtitleId) {
        track = item;
        break;
      }
    }
    if (track == null || track.fileUrl.isEmpty) {
      await controller.setClosedCaptionFile(null);
      return;
    }

    final client = ref.read(httpClientProvider);
    final apiClient = ref.read(apiClientProvider);
    final uri = Uri.tryParse(track.fileUrl);
    final resolvedUri =
        uri != null && uri.hasScheme ? uri : apiClient.resolve(track.fileUrl);
    final response = await client.get(resolvedUri);

    if (response.statusCode >= 400) {
      throw Exception('Subtitle track is not available right now.');
    }

    await controller.setClosedCaptionFile(
      Future<ClosedCaptionFile>.value(
        WebVTTCaptionFile(response.body),
      ),
    );
  }

  Future<void> _syncHistory({
    bool completed = false,
    bool force = false,
  }) async {
    if (!_isSignedIn) {
      return;
    }

    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      return;
    }

    final progress = completed ? 0 : controller.value.position.inSeconds;
    if (!completed &&
        !force &&
        progress - _lastHistorySync.inSeconds <
            _historySyncInterval.inSeconds) {
      return;
    }

    try {
      await ref.read(apiClientProvider).postJson(
        '/api/watch-history',
        body: {
          'videoId': _currentEntry.id,
          'progressSec': progress,
          'durationSec': controller.value.duration.inSeconds,
          'completed': completed,
        },
      );
      _lastHistorySync = Duration(seconds: progress);
    } catch (_) {
      // Keep local playback moving even if sync fails.
    }
  }

  void _handleControllerUpdate() {
    final controller = _controller;
    if (!mounted || controller == null || !controller.value.isInitialized) {
      return;
    }

    final value = controller.value;
    final completed = value.duration > Duration.zero &&
        value.position >= value.duration - const Duration(milliseconds: 400);

    if (!completed) {
      _completionHandled = false;
    }

    setState(() {
      _position = value.position;
      _duration = value.duration;
      _volume = value.volume;
    });

    if (_isSignedIn &&
        value.position.inSeconds - _lastHistorySync.inSeconds >=
            _historySyncInterval.inSeconds) {
      unawaited(_syncHistory());
    }

    if (completed && !_completionHandled) {
      _completionHandled = true;
      unawaited(_handleCompletion());
    }
  }

  Future<void> _handleCompletion() async {
    await _syncHistory(completed: true, force: true);

    final hasNext = _currentIndex < _queue.length - 1;
    if (!hasNext) {
      if (!mounted) {
        return;
      }
      setState(() {
        _notice = 'Playback finished.';
      });
      return;
    }

    final UserPreferences preferences =
        _preferences ?? await ref.read(userPreferencesProvider.future);
    if (!preferences.autoplayNext) {
      if (!mounted) {
        return;
      }
      setState(() {
        _notice = 'Next episode is ready.';
      });
      return;
    }

    await _playNext(autoAdvance: true);
  }

  Future<void> _playNext({required bool autoAdvance}) async {
    final nextIndex = _currentIndex + 1;
    if (nextIndex >= _queue.length) {
      return;
    }

    final unlockedEntry =
        await _ensureAccessForIndex(nextIndex, autoAdvance: autoAdvance);
    if (unlockedEntry == null) {
      return;
    }

    await _syncHistory(force: true);
    if (!mounted) {
      return;
    }
    setState(() {
      _queue = List<PlaybackQueueEntry>.from(_queue)
        ..[nextIndex] = unlockedEntry;
      _notice = 'Up next: ${unlockedEntry.episodeLabel}';
    });

    await _loadEntry(nextIndex, autoplay: true, resumeFromSec: 0);
  }

  Future<PlaybackQueueEntry?> _ensureAccessForIndex(
    int index, {
    required bool autoAdvance,
  }) async {
    final entry = _queue[index];
    if (entry.hasAccess) {
      return entry.copyWith(teaserOnly: false);
    }

    if (!_isSignedIn) {
      if (!mounted) {
        return null;
      }
      setState(() {
        _notice = 'Sign in is required to continue with the next episode.';
      });
      return null;
    }

    if (mounted) {
      setState(() {
        _unlockingNext = true;
        _notice = autoAdvance ? 'Unlocking ${entry.episodeLabel}...' : null;
      });
    }

    try {
      await ref.read(unlockRepositoryProvider).unlockTitle(entry.id);
      return entry.copyWith(
        hasAccess: true,
        teaserOnly: false,
        resumePositionSec: 0,
      );
    } catch (error) {
      if (!mounted) {
        return null;
      }
      setState(() {
        _notice = error.toString();
      });
      return null;
    } finally {
      if (mounted) {
        setState(() {
          _unlockingNext = false;
        });
      }
    }
  }

  Future<void> _unlockCurrentAndReload() async {
    final entry = _currentEntry;
    if (entry.hasAccess && !entry.teaserOnly) {
      return;
    }

    if (!_isSignedIn) {
      setState(() {
        _notice = 'Please sign in to unlock this title.';
      });
      return;
    }

    setState(() {
      _unlockingNext = true;
      _notice = 'Unlocking full video...';
    });

    try {
      await ref.read(unlockRepositoryProvider).unlockTitle(entry.id);

      // Invalidate so the detail screen updates its access state
      ref.invalidate(titleDetailProvider(entry.id));

      if (!mounted) return;

      // Update current queue entry and reload with full access
      final updated = entry.copyWith(
        hasAccess: true,
        teaserOnly: false,
        resumePositionSec: _position.inSeconds,
      );

      setState(() {
        _queue = List<PlaybackQueueEntry>.from(_queue)
          ..[_currentIndex] = updated;
        _notice = 'Access unlocked. Loading full video...';
      });

      await _loadEntry(
        _currentIndex,
        autoplay: true,
        resumeFromSec: _position.inSeconds,
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _notice = 'Unlock failed: ${error.toString()}';
      });
    } finally {
      if (mounted) {
        setState(() {
          _unlockingNext = false;
        });
      }
    }
  }

  Future<void> _togglePlayPause() async {
    final controller = _controller;
    if (controller == null) {
      return;
    }

    if (controller.value.isPlaying) {
      await controller.pause();
      await _syncHistory(force: true);
    } else {
      await controller.play();
      _resetControlsTimer();
    }
    if (mounted) {
      setState(() {
        _showControls = true;
      });
    }
  }

  Future<void> _seekToSeconds(int seconds) async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      return;
    }

    final bounded =
        seconds.clamp(0, controller.value.duration.inSeconds).toInt();
    await controller.seekTo(Duration(seconds: bounded));
    if (!mounted) {
      return;
    }
    setState(() {
      _position = Duration(seconds: bounded);
    });
  }

  Future<void> _toggleFullscreen() async {
    final nextFullscreen = !_fullscreen;
    await SystemChrome.setEnabledSystemUIMode(
      nextFullscreen ? SystemUiMode.immersiveSticky : SystemUiMode.edgeToEdge,
    );
    if (!mounted) {
      return;
    }
    setState(() {
      _fullscreen = nextFullscreen;
    });
  }

  void _toggleControls() {
    setState(() {
      _showControls = !_showControls;
    });
    _resetControlsTimer();
  }

  void _resetControlsTimer() {
    _controlsTimer?.cancel();
    if (_showControls && (_controller?.value.isPlaying ?? false)) {
      _controlsTimer = Timer(const Duration(seconds: 3), () {
        if (mounted && (_controller?.value.isPlaying ?? false)) {
          setState(() => _showControls = false);
        }
      });
    }
  }

  Future<void> _selectSubtitle(String subtitleId) async {
    final controller = _controller;
    if (controller == null) {
      return;
    }

    try {
      await _applySubtitleSelectionToController(
        controller,
        _currentEntry,
        subtitleId,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _selectedSubtitleId = subtitleId;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _notice = error.toString();
      });
    }
  }

  Future<void> _selectAudioTrack(String trackId) async {
    final controller = _controller;
    if (controller == null) {
      return;
    }

    await controller.selectAudioTrack(trackId);
    if (!mounted) {
      return;
    }
    final tracks = await controller.getAudioTracks();
    setState(() {
      _audioTracks = tracks;
    });
  }

  String _formatDuration(Duration value) {
    final hours = value.inHours;
    final minutes = value.inMinutes.remainder(60);
    final seconds = value.inSeconds.remainder(60);
    if (hours > 0) {
      return '${hours.toString().padLeft(2, '0')}:'
          '${minutes.toString().padLeft(2, '0')}:'
          '${seconds.toString().padLeft(2, '0')}';
    }

    return '${minutes.toString().padLeft(2, '0')}:'
        '${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(titleDetailProvider(_currentEntry.id));
    final playbackTitle = detailAsync.maybeWhen(
      data: (detail) => detail.summary.title,
      orElse: () => _currentEntry.title,
    );
    final playbackDescription = detailAsync.maybeWhen(
      data: (detail) => detail.summary.description,
      orElse: () => _currentEntry.description,
    );
    final accessMessage = detailAsync.maybeWhen(
      data: (detail) => detail.access.message,
      orElse: () => _currentEntry.hasAccess
          ? 'Active access is available for this title.'
          : 'Preview playback is active for this title.',
    );
    final controller = _controller;
    final isPlaying = controller?.value.isPlaying ?? false;
    final sliderMax =
        _duration.inSeconds > 0 ? _duration.inSeconds.toDouble() : 1.0;
    final sliderValue =
        _position.inSeconds.clamp(0, sliderMax.toInt()).toDouble();
    final videoAspectRatio = controller != null &&
            controller.value.isInitialized &&
            controller.value.aspectRatio > 0
        ? controller.value.aspectRatio
        : 16 / 9;
    Widget playerSurface() {
      return Container(
        color: Colors.black,
        child: AspectRatio(
          aspectRatio: videoAspectRatio,
          child: _loading
              ? const Center(
                  child: CircularProgressIndicator(color: AppTheme.gold),
                )
              : controller != null && controller.value.isInitialized
                  ? Stack(
                      fit: StackFit.expand,
                      children: [
                        VideoPlayer(controller),
                        if (controller.value.isBuffering)
                          const Center(
                            child: CircularProgressIndicator(
                              color: AppTheme.gold,
                            ),
                          ),
                        if (_selectedSubtitleId != 'off')
                          Align(
                            alignment: Alignment.bottomCenter,
                            child: Padding(
                              padding: const EdgeInsets.only(
                                left: 18,
                                right: 18,
                                bottom: 24,
                              ),
                              child: ClosedCaption(
                                text: controller.value.caption.text,
                                textStyle: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  shadows: [
                                    Shadow(
                                      blurRadius: 10,
                                      color: Colors.black,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        Positioned.fill(
                          child: GestureDetector(
                            behavior: HitTestBehavior.opaque,
                            onTap: _toggleControls,
                            child: AnimatedOpacity(
                              opacity: _showControls ? 1.0 : 0.0,
                              duration: const Duration(milliseconds: 200),
                              child: _showControls
                                  ? Container(
                                      decoration: const BoxDecoration(
                                        gradient: LinearGradient(
                                          begin: Alignment.topCenter,
                                          end: Alignment.bottomCenter,
                                          colors: [
                                            Colors.black54,
                                            Colors.transparent,
                                            Colors.transparent,
                                            Colors.black45,
                                          ],
                                          stops: [0.0, 0.2, 0.7, 1.0],
                                        ),
                                      ),
                                      child: Stack(
                                        children: [
                                          Positioned(
                                            top: 8,
                                            left: 12,
                                            right: 12,
                                            child: Row(
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    playbackTitle,
                                                    style: const TextStyle(
                                                      color: Colors.white,
                                                      fontSize: 14,
                                                      fontWeight: FontWeight.w600,
                                                    ),
                                                    maxLines: 1,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                                IconButton(
                                                  onPressed: _toggleFullscreen,
                                                  icon: Icon(
                                                    _fullscreen
                                                        ? Icons.fullscreen_exit_rounded
                                                        : Icons.fullscreen_rounded,
                                                    color: Colors.white,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          Center(
                                            child: (_currentEntry.teaserOnly ||
                                                    !_currentEntry.hasAccess)
                                                ? ElevatedButton.icon(
                                                    onPressed: _unlockingNext
                                                        ? null
                                                        : _unlockCurrentAndReload,
                                                    icon: const Icon(
                                                      Icons.lock_open_rounded,
                                                    ),
                                                    label: Text(
                                                      _unlockingNext
                                                          ? 'Unlocking...'
                                                          : 'Unlock full movie',
                                                    ),
                                                    style: ElevatedButton.styleFrom(
                                                      backgroundColor: AppTheme.gold,
                                                      foregroundColor:
                                                          AppTheme.background,
                                                    ),
                                                  )
                                                : IconButton(
                                                    onPressed: _togglePlayPause,
                                                    iconSize: 72,
                                                    icon: Icon(
                                                      isPlaying
                                                          ? Icons.pause_circle_filled_rounded
                                                          : Icons.play_circle_filled_rounded,
                                                      color: Colors.white,
                                                    ),
                                                  ),
                                          ),
                                          Positioned(
                                            left: 12,
                                            right: 12,
                                            bottom: 8,
                                            child: Column(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                SliderTheme(
                                                  data: SliderTheme.of(context)
                                                      .copyWith(
                                                    trackHeight: 3,
                                                    thumbShape:
                                                        const RoundSliderThumbShape(
                                                      enabledThumbRadius: 7,
                                                    ),
                                                    overlayShape:
                                                        const RoundSliderOverlayShape(
                                                      overlayRadius: 14,
                                                    ),
                                                    activeTrackColor:
                                                        AppTheme.gold,
                                                    inactiveTrackColor:
                                                        Colors.white30,
                                                    thumbColor: AppTheme.gold,
                                                  ),
                                                  child: Slider(
                                                    value: sliderValue,
                                                    max: sliderMax,
                                                    onChanged: (v) =>
                                                        _seekToSeconds(v.toInt()),
                                                  ),
                                                ),
                                                Row(
                                                  children: [
                                                    Text(
                                                      _formatDuration(_position),
                                                      style: const TextStyle(
                                                        color: Colors.white70,
                                                        fontSize: 11,
                                                      ),
                                                    ),
                                                    const Spacer(),
                                                    Text(
                                                      _formatDuration(_duration),
                                                      style: const TextStyle(
                                                        color: Colors.white70,
                                                        fontSize: 11,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    )
                                  : const SizedBox.shrink(),
                            ),
                          ),
                        ),
                      ],
                    )
                  : _PlayerErrorState(
                      message:
                          _error ?? 'Playback is not available right now.',
                    ),
        ),
      );
    }
    if (_fullscreen) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: SizedBox.expand(
          child: Center(
            child: playerSurface(),
          ),
        ),
      );
    }
    return PremiumScaffold(
      title: 'Playback',
      currentLocation: '/browse',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _currentEntry.episodeLabel,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: AppTheme.gold,
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            playbackTitle,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          if (playbackDescription.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              playbackDescription,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.textMuted,
                    height: 1.5,
                  ),
            ),
          ],
          const SizedBox(height: 12),
          playerSurface(),
          const SizedBox(height: 12),
          Text(
            accessMessage,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.textMuted,
                  height: 1.5,
                ),
          ),
          if (_notice != null) ...[
            const SizedBox(height: 10),
            Text(
              _notice!,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppTheme.gold,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
          if (_unlockingNext) ...[
            const SizedBox(height: 10),
            const LinearProgressIndicator(
              backgroundColor: Color(0x22FFFFFF),
              valueColor: AlwaysStoppedAnimation<Color>(AppTheme.gold),
            ),
          ],
          if (_currentEntry.subtitleTracks.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text(
              'Subtitles',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                _ChoiceChipButton(
                  label: 'Off',
                  selected: _selectedSubtitleId == 'off',
                  onTap: () => _selectSubtitle('off'),
                ),
                ..._currentEntry.subtitleTracks.map(
                  (track) => _ChoiceChipButton(
                    label: track.label,
                    selected: _selectedSubtitleId == track.id,
                    onTap: () => _selectSubtitle(track.id),
                  ),
                ),
              ],
            ),
          ],
          if (_audioTracks.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text(
              'Audio',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: _audioTracks
                  .map(
                    (track) => _ChoiceChipButton(
                      label: track.label?.trim().isNotEmpty == true
                          ? track.label!.trim()
                          : track.language?.toUpperCase() ?? 'Audio',
                      selected: track.isSelected,
                      onTap: () => _selectAudioTrack(track.id),
                    ),
                  )
                  .toList(),
            ),
          ],
          if (_queue.length > 1) ...[
            const SizedBox(height: 20),
            Text(
              'Queue',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 10),
            ..._queue.asMap().entries.map(
                  (entry) => _QueueRow(
                    label: entry.value.episodeLabel,
                    stateLabel: entry.key == _currentIndex
                        ? 'Now playing'
                        : entry.value.hasAccess
                            ? 'Unlocked'
                            : 'Locked',
                    active: entry.key == _currentIndex,
                  ),
                ),
          ],
        ],
      ),
    );
  }
}

class _ChoiceChipButton extends StatelessWidget {
  const _ChoiceChipButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppTheme.gold : const Color(0x14FFFFFF),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? AppTheme.gold : AppTheme.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? AppTheme.background : AppTheme.textPrimary,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _QueueRow extends StatelessWidget {
  const _QueueRow({
    required this.label,
    required this.stateLabel,
    required this.active,
  });

  final String label;
  final String stateLabel;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: active ? const Color(0x14F4D35E) : AppTheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: active ? AppTheme.gold : AppTheme.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                  ),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            stateLabel,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: active ? AppTheme.gold : AppTheme.textMuted,
                  fontWeight: FontWeight.w700,
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
