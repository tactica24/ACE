import 'package:flutter/material.dart';

import '../../../app/app_theme.dart';
import '../../../widgets/premium_scaffold.dart';

class SupportPage extends StatelessWidget {
  const SupportPage({super.key});

  @override
  Widget build(BuildContext context) {
    return PremiumScaffold(
      title: 'Help and Support',
      currentLocation: '/profile',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Support built for viewers and account recovery',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 12),
          Text(
            'ACE Studio support should stay neutral in the mobile app and focus on playback, sign-in, and account access.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.textMuted,
                  height: 1.5,
                ),
          ),
          const SizedBox(height: 20),
          ...const [
            _SupportCard(
              title: 'Playback unavailable',
              description: 'Guide viewers to sign in with the account that already has access.',
            ),
            _SupportCard(
              title: 'Device and session support',
              description: 'Handle sign-out, session refresh, and device troubleshooting for mobile playback.',
            ),
            _SupportCard(
              title: 'Contact ACE Studio',
              description: 'Route account questions to info@acestudio.ng or a dedicated support pipeline when connected.',
            ),
          ],
        ],
      ),
    );
  }
}

class _SupportCard extends StatelessWidget {
  const _SupportCard({
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
