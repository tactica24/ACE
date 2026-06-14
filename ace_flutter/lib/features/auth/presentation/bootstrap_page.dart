import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../data/auth_repository.dart';

class BootstrapPage extends ConsumerStatefulWidget {
  const BootstrapPage({super.key});

  @override
  ConsumerState<BootstrapPage> createState() => _BootstrapPageState();
}

class _BootstrapPageState extends ConsumerState<BootstrapPage> {
  void _redirectTo(String route) {
    Future.microtask(() {
      if (!mounted) {
        return;
      }
      context.go(route);
    });
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(firebaseUserChangesProvider);

    return authState.when(
      data: (user) {
        _redirectTo('/home');
        return const _BootstrapScaffold();
      },
      loading: () => const _BootstrapScaffold(),
      error: (_, __) {
        _redirectTo('/home');
        return const _BootstrapScaffold();
      },
    );
  }
}

class _BootstrapScaffold extends StatelessWidget {
  const _BootstrapScaffold();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}
