import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../app/app_theme.dart';
import '../../../widgets/premium_scaffold.dart';
import '../data/user_preferences.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  String _playbackQuality = 'Adaptive';
  String _downloadQuality = 'Standard';
  bool _subtitles = false;
  bool _autoplay = true;
  bool _wifiOnly = false;
  bool _notifications = true;
  bool _startMuted = true;
  bool _previewSilently = true;
  bool _reduceMotion = false;
  bool _compactCards = false;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final preferences = await UserPreferences.load();
    if (!mounted) return;

    setState(() {
      _playbackQuality = preferences.playbackQuality;
      _downloadQuality = preferences.downloadQuality;
      _subtitles = preferences.subtitlesByDefault;
      _autoplay = preferences.autoplayNext;
      _wifiOnly = preferences.wifiOnlyDownloads;
      _notifications = preferences.accountNotifications;
      _startMuted = preferences.startPlaybackMuted;
      _previewSilently = preferences.previewSilently;
      _reduceMotion = preferences.reduceMotion;
      _compactCards = preferences.compactTitleCards;
      _loading = false;
    });
  }

  Future<void> _saveString(String key, String value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, value);
    ref.invalidate(userPreferencesProvider);
  }

  Future<void> _saveBool(String key, bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(key, value);
    ref.invalidate(userPreferencesProvider);
  }

  Future<void> _resetSettings() async {
    final prefs = await SharedPreferences.getInstance();
    await Future.wait([
      prefs.remove(UserPreferences.qualityKey),
      prefs.remove(UserPreferences.subtitlesKey),
      prefs.remove(UserPreferences.autoplayKey),
      prefs.remove(UserPreferences.wifiOnlyKey),
      prefs.remove(UserPreferences.notificationsKey),
      prefs.remove(UserPreferences.mutedKey),
      prefs.remove(UserPreferences.previewSilentlyKey),
      prefs.remove(UserPreferences.reduceMotionKey),
      prefs.remove(UserPreferences.compactCardsKey),
      prefs.remove(UserPreferences.downloadQualityKey),
    ]);

    ref.invalidate(userPreferencesProvider);
    await _loadSettings();

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Settings reset.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PremiumScaffold(
      title: 'Settings',
      currentLocation: '/profile',
      body: _loading
          ? const Padding(
              padding: EdgeInsets.only(top: 80),
              child: Center(child: CircularProgressIndicator()),
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Settings',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Choose how the app plays, saves, and presents titles on this device.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.textMuted,
                        height: 1.5,
                      ),
                ),
                const SizedBox(height: 20),
                _SettingsCard(
                  title: 'Playback',
                  children: [
                    _DropdownSetting(
                      label: 'Playback quality',
                      value: _playbackQuality,
                      values: const ['Adaptive', 'Data saver', 'High quality'],
                      onChanged: (value) {
                        setState(() => _playbackQuality = value);
                        _saveString(UserPreferences.qualityKey, value);
                      },
                    ),
                    _SettingsSwitch(
                      title: 'Start playback muted',
                      subtitle: 'Open videos silently until you turn sound on.',
                      value: _startMuted,
                      onChanged: (value) {
                        setState(() => _startMuted = value);
                        _saveBool(UserPreferences.mutedKey, value);
                      },
                    ),
                    _SettingsSwitch(
                      title: 'Silent previews',
                      subtitle:
                          'Keep previews muted while browsing from title to title.',
                      value: _previewSilently,
                      onChanged: (value) {
                        setState(() => _previewSilently = value);
                        _saveBool(UserPreferences.previewSilentlyKey, value);
                      },
                    ),
                    _SettingsSwitch(
                      title: 'Subtitles by default',
                      subtitle:
                          'Start playback with subtitles enabled when available.',
                      value: _subtitles,
                      onChanged: (value) {
                        setState(() => _subtitles = value);
                        _saveBool(UserPreferences.subtitlesKey, value);
                      },
                    ),
                    _SettingsSwitch(
                      title: 'Autoplay next episode',
                      subtitle: 'Continue series playback automatically.',
                      value: _autoplay,
                      onChanged: (value) {
                        setState(() => _autoplay = value);
                        _saveBool(UserPreferences.autoplayKey, value);
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _SettingsCard(
                  title: 'Downloads',
                  children: [
                    _DropdownSetting(
                      label: 'Offline download quality',
                      value: _downloadQuality,
                      values: const [
                        'Data saver',
                        'Standard',
                        'Best available'
                      ],
                      onChanged: (value) {
                        setState(() => _downloadQuality = value);
                        _saveString(UserPreferences.downloadQualityKey, value);
                      },
                    ),
                    _SettingsSwitch(
                      title: 'Download on Wi-Fi only',
                      subtitle:
                          'Reduce mobile data use when saving titles offline.',
                      value: _wifiOnly,
                      onChanged: (value) {
                        setState(() => _wifiOnly = value);
                        _saveBool(UserPreferences.wifiOnlyKey, value);
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _SettingsCard(
                  title: 'App experience',
                  children: [
                    _SettingsSwitch(
                      title: 'Account notifications',
                      subtitle: 'Receive important account and access updates.',
                      value: _notifications,
                      onChanged: (value) {
                        setState(() => _notifications = value);
                        _saveBool(UserPreferences.notificationsKey, value);
                      },
                    ),
                    _SettingsSwitch(
                      title: 'Reduce motion',
                      subtitle:
                          'Use calmer transitions where the app supports them.',
                      value: _reduceMotion,
                      onChanged: (value) {
                        setState(() => _reduceMotion = value);
                        _saveBool(UserPreferences.reduceMotionKey, value);
                      },
                    ),
                    _SettingsSwitch(
                      title: 'Compact title cards',
                      subtitle: 'Fit more titles on screen in catalog views.',
                      value: _compactCards,
                      onChanged: (value) {
                        setState(() => _compactCards = value);
                        _saveBool(UserPreferences.compactCardsKey, value);
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                OutlinedButton.icon(
                  onPressed: _resetSettings,
                  icon: const Icon(Icons.restart_alt_rounded),
                  label: const Text('Reset settings'),
                ),
              ],
            ),
    );
  }
}

class _SettingsCard extends StatelessWidget {
  const _SettingsCard({
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }
}

class _DropdownSetting extends StatelessWidget {
  const _DropdownSetting({
    required this.label,
    required this.value,
    required this.values,
    required this.onChanged,
  });

  final String label;
  final String value;
  final List<String> values;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: DropdownButtonFormField<String>(
        initialValue: value,
        decoration: InputDecoration(labelText: label),
        items: values
            .map((item) => DropdownMenuItem(value: item, child: Text(item)))
            .toList(),
        onChanged: (next) {
          if (next != null) onChanged(next);
        },
      ),
    );
  }
}

class _SettingsSwitch extends StatelessWidget {
  const _SettingsSwitch({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return SwitchListTile.adaptive(
      contentPadding: EdgeInsets.zero,
      title: Text(title),
      subtitle: Text(
        subtitle,
        style: const TextStyle(color: AppTheme.textMuted),
      ),
      value: value,
      onChanged: onChanged,
    );
  }
}
