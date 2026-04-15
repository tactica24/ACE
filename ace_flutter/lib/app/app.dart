import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/app_config.dart';
import 'app_router.dart';
import 'app_theme.dart';

final routerProvider = Provider<GoRouter>((ref) => createRouter());

class AceFlutterApp extends ConsumerWidget {
  const AceFlutterApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'ACE Studio',
      theme: AppTheme.theme,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
      builder: (context, child) {
        return DecoratedBox(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0xFF070B15),
                Color(0xFF08111D),
                Color(0xFF060913),
              ],
            ),
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}

Future<void> initializeFirebaseIfConfigured() async {
  if (!AppConfig.hasFirebaseConfig) {
    return;
  }

  try {
    await Firebase.initializeApp(options: AppConfig.firebaseOptions);
  } catch (_) {
    // Firebase initialization errors are surfaced through auth flows.
  }
}
