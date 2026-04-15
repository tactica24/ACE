import 'package:flutter/material.dart';

import '../../../app/app_theme.dart';
import '../../../widgets/premium_scaffold.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return PremiumScaffold(
      title: 'Settings',
      currentLocation: '/profile',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Playback and account preferences',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 12),
          Text(
            'Use this area for subtitle defaults, streaming quality, notifications, and device preferences as the Flutter app expands.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.textMuted,
                  height: 1.5,
                ),
          ),
          const SizedBox(height: 20),
          ...const [
            _SettingCard(
              title: 'Playback quality',
              description: 'Default to adaptive streaming with room for future manual quality controls.',
            ),
            _SettingCard(
              title: 'Subtitles and audio',
              description: 'Prepare language, subtitle, and accessibility preferences for playback sessions.',
            ),
            _SettingCard(
              title: 'Notifications',
              description: 'Reserve space for release alerts, account security notices, and product updates.',
            ),
          ],
        ],
      ),
    );
  }
}

class _SettingCard extends StatelessWidget {
  const _SettingCard({
    required this.title,
    required this.description,
  });

  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
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
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            description,
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
