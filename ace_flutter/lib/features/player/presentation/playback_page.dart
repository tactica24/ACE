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
const _playbackRateOptions = <double>[0.75, 1, 1.25, 1.5, 2];

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
  bool _muted = true;
  bool _fullscreen = false;
  bool _unlockingNext = false;
  double _volume = 1;
  double _playbackRate = 1;
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
        _muted = controller.value.volume == 0;
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
    final streamUrl =
        await ref.read(playbackRepositoryProvider).createPlaybackUrl(
              titleId: entry.id,
              teaserOnly: entry.teaserOnly,
              isSignedIn: _isSignedIn,
              qualityPreference: preferences.playbackQuality,
            );

    final controller = VideoPlayerController.networkUrl(Uri.parse(streamUrl));
    await controller.initialize();

    final shouldMute = preferences.startPlaybackMuted ||
        (entry.teaserOnly && preferences.previewSilently);
    final defaultSubtitleId = _defaultSubtitleIdFor(entry, preferences);

    await controller.setPlaybackSpeed(_playbackRate);
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
    await _applySubtitleSelectionToController(
      controller,
      entry,
      defaultSubtitleId,
    );

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
      _muted = value.volume == 0;
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

  Future<void> _playPrevious() async {
    if (_currentIndex == 0) {
      await _seekToSeconds(0);
      return;
    }

    await _syncHistory(force: true);
    await _loadEntry(_currentIndex - 1, autoplay: true, resumeFromSec: 0);
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
    }
  }

  Future<void> _toggleMute() async {
    final controller = _controller;
    if (controller == null) {
      return;
    }

    final nextMuted = !_muted;
    await controller.setVolume(nextMuted ? 0 : (_volume == 0 ? 1 : _volume));
    if (!mounted) {
      return;
    }
    setState(() {
      _muted = nextMuted;
      _volume = nextMuted ? 0 : (_volume == 0 ? 1 : _volume);
    });
  }

  Future<void> _setVolume(double nextVolume) async {
    final controller = _controller;
    if (controller == null) {
      return;
    }

    final safeVolume = nextVolume.clamp(0, 1).toDouble();
    await controller.setVolume(safeVolume);
    if (!mounted) {
      return;
    }
    setState(() {
      _muted = safeVolume == 0;
      _volume = safeVolume;
    });
  }

  Future<void> _setPlaybackRate(double nextRate) async {
    final controller = _controller;
    if (controller == null) {
      return;
    }

    await controller.setPlaybackSpeed(nextRate);
    if (!mounted) {
      return;
    }
    setState(() {
      _playbackRate = nextRate;
    });
  }

  Future<void> _seekRelative(int seconds) async {
    final controller = _controller;
    if (controller == null) {
      return;
    }

    await _seekToSeconds(controller.value.position.inSeconds + seconds);
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
          const SizedBox(height: 18),
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
                  : controller != null && controller.value.isInitialized
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(20),
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              VideoPlayer(controller),
                              if (controller.value.isBuffering)
                                const Center(
                                  child: CircularProgressIndicator(),
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
                            ],
                          ),
                        )
                      : _PlayerErrorState(
                          message:
                              _error ?? 'Playback is not available right now.',
                        ),
            ),
          ),
          const SizedBox(height: 16),
          _PlaybackControls(
            isPlaying: isPlaying,
            isMuted: _muted,
            isFullscreen: _fullscreen,
            sliderMax: sliderMax,
            sliderValue: sliderValue,
            positionLabel: _formatDuration(_position),
            durationLabel: _formatDuration(_duration),
            playbackRate: _playbackRate,
            volume: _volume,
            canGoPrevious:
                _currentIndex > 0 || _position > const Duration(seconds: 3),
            canGoNext: _currentIndex < _queue.length - 1,
            onSeek: (value) => _seekToSeconds(value.toInt()),
            onPlayPause: _togglePlayPause,
            onReplay10: () => _seekRelative(-10),
            onForward10: () => _seekRelative(10),
            onPrevious: _playPrevious,
            onNext: () => _playNext(autoAdvance: false),
            onMute: _toggleMute,
            onFullscreen: _toggleFullscreen,
            onVolumeChanged: _setVolume,
            onRateChanged: _setPlaybackRate,
          ),
          const SizedBox(height: 18),
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

class _PlaybackControls extends StatelessWidget {
  const _PlaybackControls({
    required this.isPlaying,
    required this.isMuted,
    required this.isFullscreen,
    required this.sliderMax,
    required this.sliderValue,
    required this.positionLabel,
    required this.durationLabel,
    required this.playbackRate,
    required this.volume,
    required this.canGoPrevious,
    required this.canGoNext,
    required this.onSeek,
    required this.onPlayPause,
    required this.onReplay10,
    required this.onForward10,
    required this.onPrevious,
    required this.onNext,
    required this.onMute,
    required this.onFullscreen,
    required this.onVolumeChanged,
    required this.onRateChanged,
  });

  final bool isPlaying;
  final bool isMuted;
  final bool isFullscreen;
  final double sliderMax;
  final double sliderValue;
  final String positionLabel;
  final String durationLabel;
  final double playbackRate;
  final double volume;
  final bool canGoPrevious;
  final bool canGoNext;
  final ValueChanged<double> onSeek;
  final Future<void> Function() onPlayPause;
  final Future<void> Function() onReplay10;
  final Future<void> Function() onForward10;
  final Future<void> Function() onPrevious;
  final Future<void> Function() onNext;
  final Future<void> Function() onMute;
  final Future<void> Function() onFullscreen;
  final ValueChanged<double> onVolumeChanged;
  final ValueChanged<double> onRateChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        children: [
          Slider(
            value: sliderValue,
            max: sliderMax,
            onChanged: onSeek,
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(positionLabel),
              Text(durationLabel),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            alignment: WrapAlignment.center,
            children: [
              OutlinedButton.icon(
                onPressed: canGoPrevious ? () => onPrevious() : null,
                icon: const Icon(Icons.skip_previous_rounded),
                label: const Text('Previous'),
              ),
              OutlinedButton.icon(
                onPressed: () => onReplay10(),
                icon: const Icon(Icons.replay_10_rounded),
                label: const Text('-10s'),
              ),
              ElevatedButton.icon(
                onPressed: () => onPlayPause(),
                icon: Icon(
                  isPlaying
                      ? Icons.pause_circle_filled_rounded
                      : Icons.play_circle_fill_rounded,
                ),
                label: Text(isPlaying ? 'Pause' : 'Play'),
              ),
              OutlinedButton.icon(
                onPressed: () => onForward10(),
                icon: const Icon(Icons.forward_10_rounded),
                label: const Text('+10s'),
              ),
              OutlinedButton.icon(
                onPressed: canGoNext ? () => onNext() : null,
                icon: const Icon(Icons.skip_next_rounded),
                label: const Text('Next'),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              OutlinedButton.icon(
                onPressed: () => onMute(),
                icon: Icon(
                  isMuted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
                ),
                label: Text(isMuted ? 'Sound off' : 'Sound on'),
              ),
              SizedBox(
                width: 160,
                child: Slider(
                  value: isMuted ? 0 : volume,
                  onChanged: onVolumeChanged,
                ),
              ),
              OutlinedButton.icon(
                onPressed: () => onFullscreen(),
                icon: Icon(
                  isFullscreen
                      ? Icons.fullscreen_exit_rounded
                      : Icons.fullscreen_rounded,
                ),
                label: Text(isFullscreen ? 'Exit full screen' : 'Full screen'),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: _playbackRateOptions
                .map(
                  (rate) => _ChoiceChipButton(
                    label: '${rate}x',
                    selected: playbackRate == rate,
                    onTap: () => onRateChanged(rate),
                  ),
                )
                .toList(),
          ),
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
