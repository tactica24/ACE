import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../app/app_theme.dart';
import '../../../widgets/premium_scaffold.dart';
import '../data/live_match_repository.dart';
import '../models/live_match.dart';

class LiveMatchesPage extends ConsumerWidget {
  const LiveMatchesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final matches = ref.watch(liveMatchesProvider);

    return PremiumScaffold(
      title: 'Live',
      currentLocation: '/live',
      actions: [
        IconButton(
          onPressed: () => ref.invalidate(liveMatchesProvider),
          icon: const Icon(Icons.refresh_rounded),
          tooltip: 'Refresh matches',
        ),
      ],
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Live sport. One loud room.',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Watch the action and join the match conversation in real time.',
            style: TextStyle(color: AppTheme.textMuted, height: 1.5),
          ),
          const SizedBox(height: 24),
          matches.when(
            data: (items) => items.isEmpty
                ? const _EmptyMatches()
                : Column(
                    children: items
                        .map((match) => Padding(
                              padding: const EdgeInsets.only(bottom: 14),
                              child: _MatchCard(match: match),
                            ))
                        .toList(),
                  ),
            loading: () => const Padding(
              padding: EdgeInsets.only(top: 70),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (error, _) => _LiveError(
              message: error.toString(),
              onRetry: () => ref.invalidate(liveMatchesProvider),
            ),
          ),
        ],
      ),
    );
  }
}

class _MatchCard extends StatelessWidget {
  const _MatchCard({required this.match});

  final LiveMatchSummary match;

  @override
  Widget build(BuildContext context) {
    final isLive = match.status == 'LIVE';
    return InkWell(
      onTap: () => context.push('/live/${match.id}'),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isLive
                ? AppTheme.brand.withValues(alpha: .55)
                : AppTheme.border,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 16 / 8,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (match.posterUrl != null)
                    CachedNetworkImage(
                      imageUrl: match.posterUrl!,
                      fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => const _MatchBackdrop(),
                    )
                  else
                    const _MatchBackdrop(),
                  const DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Color(0xE605070D)],
                      ),
                    ),
                  ),
                  Positioned(
                    left: 14,
                    top: 14,
                    child: _StatusBadge(status: match.status),
                  ),
                  Center(
                    child: Container(
                      width: 46,
                      height: 46,
                      decoration: const BoxDecoration(
                        color: AppTheme.brand,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.play_arrow_rounded, size: 30),
                    ),
                  ),
                  Positioned(
                    left: 16,
                    right: 16,
                    bottom: 14,
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            match.homeTeam,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontWeight: FontWeight.w900),
                          ),
                        ),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 10),
                          child: Text('VS',
                              style: TextStyle(
                                  color: AppTheme.coral,
                                  fontWeight: FontWeight.w900)),
                        ),
                        Expanded(
                          child: Text(
                            match.awayTeam,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontWeight: FontWeight.w900),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    match.competition.toUpperCase(),
                    style: const TextStyle(
                      color: AppTheme.coral,
                      fontWeight: FontWeight.w800,
                      fontSize: 11,
                    ),
                  ),
                  const SizedBox(height: 7),
                  Text(match.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                          )),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(Icons.schedule_rounded,
                          size: 16, color: AppTheme.textMuted),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          DateFormat('EEE, d MMM • HH:mm')
                              .format(match.kickoffAt.toLocal()),
                          style: const TextStyle(
                              color: AppTheme.textMuted, fontSize: 12),
                        ),
                      ),
                      const Icon(Icons.chat_bubble_outline_rounded,
                          size: 15, color: AppTheme.textMuted),
                      const SizedBox(width: 5),
                      Text('${match.messageCount}',
                          style: const TextStyle(
                              color: AppTheme.textMuted, fontSize: 12)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: status == 'LIVE' ? AppTheme.brand : const Color(0xD90B0D12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        status == 'LIVE' ? '● LIVE NOW' : status,
        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900),
      ),
    );
  }
}

class _MatchBackdrop extends StatelessWidget {
  const _MatchBackdrop();

  @override
  Widget build(BuildContext context) {
    return const ColoredBox(
      color: Color(0xFF18090E),
      child: Center(
        child: Icon(Icons.sports_soccer_rounded,
            size: 58, color: Color(0x55FF5B6B)),
      ),
    );
  }
}

class _EmptyMatches extends StatelessWidget {
  const _EmptyMatches();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 70),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.event_busy_rounded, size: 44, color: AppTheme.textMuted),
            SizedBox(height: 12),
            Text('The next fixtures are being lined up.'),
          ],
        ),
      ),
    );
  }
}

class _LiveError extends StatelessWidget {
  const _LiveError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(message, style: const TextStyle(color: AppTheme.textMuted)),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: onRetry,
          icon: const Icon(Icons.refresh_rounded),
          label: const Text('Try again'),
        ),
      ],
    );
  }
}
