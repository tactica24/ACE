import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/presentation/bootstrap_page.dart';
import '../features/auth/presentation/login_page.dart';
import '../features/auth/presentation/register_page.dart';
import '../features/catalog/presentation/browse_page.dart';
import '../features/catalog/presentation/home_page.dart';
import '../features/catalog/presentation/title_detail_page.dart';
import '../features/library/presentation/library_page.dart';
import '../features/player/presentation/playback_page.dart';
import '../features/profile/presentation/profile_page.dart';
import '../features/profile/presentation/settings_page.dart';
import '../features/profile/presentation/support_page.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>();

GoRouter createRouter() {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/',
    routes: [
      GoRoute(path: '/', builder: (context, state) => const BootstrapPage()),
      GoRoute(path: '/login', builder: (context, state) => const LoginPage()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterPage()),
      GoRoute(path: '/home', builder: (context, state) => const HomePage()),
      GoRoute(
        path: '/browse',
        builder: (context, state) => BrowsePage(initialQuery: state.uri.queryParameters['q']),
      ),
      GoRoute(path: '/library', builder: (context, state) => const LibraryPage()),
      GoRoute(path: '/profile', builder: (context, state) => const ProfilePage()),
      GoRoute(path: '/settings', builder: (context, state) => const SettingsPage()),
      GoRoute(path: '/support', builder: (context, state) => const SupportPage()),
      GoRoute(
        path: '/title/:id',
        builder: (context, state) => TitleDetailPage(titleId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/player/:id',
        builder: (context, state) => PlaybackPage(
          titleId: state.pathParameters['id']!,
          teaserOnly: state.uri.queryParameters['teaser'] == '1',
        ),
      ),
    ],
  );
}
