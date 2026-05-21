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
            gradient: AppTheme.appGradient,
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}

Future<void> initializeFirebase() async {
  if (Firebase.apps.isNotEmpty) {
    return;
  }

  await Firebase.initializeApp(options: await AppConfig.resolveFirebaseOptions());
}
