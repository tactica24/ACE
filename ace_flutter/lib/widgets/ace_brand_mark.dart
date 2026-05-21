import 'package:flutter/material.dart';

import '../app/app_theme.dart';

class AceBrandMark extends StatelessWidget {
  const AceBrandMark({
    super.key,
    this.size = 40,
    this.showWordmark = false,
  });

  final double size;
  final bool showWordmark;

  @override
  Widget build(BuildContext context) {
    final mark = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(size * 0.22),
        gradient: AppTheme.brandMarkGradient,
        border: Border.all(color: AppTheme.gold.withValues(alpha: 0.28), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: AppTheme.brand.withValues(alpha: 0.28),
            blurRadius: size * 0.24,
            offset: Offset(0, size * 0.08),
          ),
        ],
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Positioned(
            left: size * 0.12,
            right: size * 0.12,
            bottom: size * 0.2,
            child: Container(
              height: size * 0.035,
              decoration: BoxDecoration(
                color: AppTheme.brand.withValues(alpha: 0.48),
                borderRadius: BorderRadius.circular(99),
              ),
            ),
          ),
          Text(
            'A',
            style: TextStyle(
              color: AppTheme.brand,
              fontSize: size * 0.66,
              height: 1,
              fontWeight: FontWeight.w900,
              letterSpacing: 0,
            ),
          ),
          Positioned(
            right: size * 0.22,
            bottom: size * 0.25,
            child: Icon(
              Icons.play_arrow_rounded,
              color: AppTheme.textPrimary,
              size: size * 0.34,
            ),
          ),
        ],
      ),
    );

    if (!showWordmark) return mark;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        mark,
        const SizedBox(width: 10),
        Text(
          'ACE',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: AppTheme.textPrimary,
                fontWeight: FontWeight.w900,
                letterSpacing: 0,
              ),
        ),
      ],
    );
  }
}
