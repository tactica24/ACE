import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../app/app_theme.dart';
import 'ace_brand_mark.dart';

class PremiumScaffold extends StatelessWidget {
  const PremiumScaffold({
    super.key,
    required this.title,
    required this.currentLocation,
    required this.body,
    this.actions = const [],
    this.padding = const EdgeInsets.fromLTRB(20, 12, 20, 32),
  });

  final String title;
  final String currentLocation;
  final Widget body;
  final List<Widget> actions;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        leadingWidth: 56,
        leading: const Padding(
          padding: EdgeInsets.only(left: 16),
          child: AceBrandMark(size: 38),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'ACE Studio',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: AppTheme.brandBright,
                    letterSpacing: 2.5,
                    fontWeight: FontWeight.w700,
                  ),
            ),
            Text(title),
          ],
        ),
        actions: actions,
      ),
      body: SafeArea(
        child: ListView(
          padding: padding,
          children: [body],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _indexForLocation(currentLocation),
        onTap: (index) {
          if (index == 0) {
            context.go('/home');
            return;
          }

          if (index == 1) {
            context.go('/browse');
            return;
          }

          if (index == 2) {
            context.go('/live');
            return;
          }

          if (index == 3) {
            context.go('/library');
            return;
          }

          context.go('/profile');
        },
        items: const [
          BottomNavigationBarItem(
              icon: Icon(Icons.home_rounded), label: 'Home'),
          BottomNavigationBarItem(
              icon: Icon(Icons.explore_rounded), label: 'Browse'),
          BottomNavigationBarItem(
              icon: Icon(Icons.sensors_rounded), label: 'Live'),
          BottomNavigationBarItem(
              icon: Icon(Icons.collections_bookmark_rounded),
              label: 'My Access'),
          BottomNavigationBarItem(
              icon: Icon(Icons.person_rounded), label: 'Profile'),
        ],
      ),
    );
  }

  int _indexForLocation(String location) {
    if (location.startsWith('/browse') ||
        location.startsWith('/title') ||
        location.startsWith('/player')) {
      return 1;
    }
    if (location.startsWith('/live')) {
      return 2;
    }
    if (location.startsWith('/library')) {
      return 3;
    }
    if (location.startsWith('/profile')) {
      return 4;
    }
    return 0;
  }
}
