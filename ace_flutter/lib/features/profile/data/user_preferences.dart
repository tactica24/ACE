import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final userPreferencesProvider = FutureProvider<UserPreferences>((ref) async {
  return UserPreferences.load();
});

class UserPreferences {
  const UserPreferences({
    required this.playbackQuality,
    required this.subtitlesByDefault,
    required this.autoplayNext,
    required this.wifiOnlyDownloads,
    required this.accountNotifications,
    required this.startPlaybackMuted,
    required this.previewSilently,
    required this.reduceMotion,
    required this.compactTitleCards,
    required this.downloadQuality,
  });

  static const qualityKey = 'ace.settings.playbackQuality';
  static const subtitlesKey = 'ace.settings.subtitles';
  static const autoplayKey = 'ace.settings.autoplay';
  static const wifiOnlyKey = 'ace.settings.wifiOnly';
  static const notificationsKey = 'ace.settings.notifications';
  static const mutedKey = 'ace.settings.startMuted';
  static const previewSilentlyKey = 'ace.settings.previewSilently';
  static const reduceMotionKey = 'ace.settings.reduceMotion';
  static const compactCardsKey = 'ace.settings.compactCards';
  static const downloadQualityKey = 'ace.settings.downloadQuality';

  final String playbackQuality;
  final bool subtitlesByDefault;
  final bool autoplayNext;
  final bool wifiOnlyDownloads;
  final bool accountNotifications;
  final bool startPlaybackMuted;
  final bool previewSilently;
  final bool reduceMotion;
  final bool compactTitleCards;
  final String downloadQuality;

  static Future<UserPreferences> load() async {
    final prefs = await SharedPreferences.getInstance();
    return UserPreferences(
      playbackQuality: prefs.getString(qualityKey) ?? 'Adaptive',
      subtitlesByDefault: prefs.getBool(subtitlesKey) ?? false,
      autoplayNext: prefs.getBool(autoplayKey) ?? true,
      wifiOnlyDownloads: prefs.getBool(wifiOnlyKey) ?? false,
      accountNotifications: prefs.getBool(notificationsKey) ?? true,
      startPlaybackMuted: prefs.getBool(mutedKey) ?? true,
      previewSilently: prefs.getBool(previewSilentlyKey) ?? true,
      reduceMotion: prefs.getBool(reduceMotionKey) ?? false,
      compactTitleCards: prefs.getBool(compactCardsKey) ?? false,
      downloadQuality: prefs.getString(downloadQualityKey) ?? 'Standard',
    );
  }
}
