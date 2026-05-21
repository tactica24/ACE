import 'package:flutter/material.dart';

class AppTheme {
  static const Color background = Color(0xFF05070D);
  static const Color backgroundAccent = Color(0xFF0D0A10);
  static const Color surface = Color(0xFF090B10);
  static const Color surfaceElevated = Color(0xFF16080D);
  static const Color brand = Color(0xFFE50914);
  static const Color brandBright = Color(0xFFFF1428);
  static const Color brandDark = Color(0xFF8F0712);
  static const Color gold = Color(0xFFF4C46A);
  static const Color coral = Color(0xFFFF5B6B);
  static const Color sky = Color(0xFFFFCAD0);
  static const Color textPrimary = Color(0xFFFFF8F1);
  static const Color textMuted = Color(0xFFB9B2B3);
  static const Color border = Color(0x1AFFFFFF);
  static const LinearGradient appGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [background, backgroundAccent, background],
  );
  static const LinearGradient brandGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [brandBright, brand, brandDark],
  );
  static const LinearGradient premiumPanelGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF291018), Color(0xFF09080D), Color(0xFF18070C)],
  );
  static const LinearGradient brandMarkGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF141016), Color(0xFF07080D), background],
  );

  static ThemeData get theme {
    final base = ThemeData.dark(useMaterial3: true);

    return base.copyWith(
      scaffoldBackgroundColor: background,
      colorScheme: base.colorScheme.copyWith(
        primary: brand,
        secondary: gold,
        surface: surface,
      ),
      textTheme: base.textTheme.apply(
        bodyColor: textPrimary,
        displayColor: textPrimary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: textPrimary,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: border),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceElevated,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: brand),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: brand,
          foregroundColor: textPrimary,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          textStyle: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: textPrimary,
          side: const BorderSide(color: border),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
        ),
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: surfaceElevated,
        selectedColor: const Color(0x33E50914),
        side: const BorderSide(color: border),
        labelStyle: const TextStyle(color: textPrimary),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: surface,
        selectedItemColor: brandBright,
        unselectedItemColor: textMuted,
        showUnselectedLabels: true,
        type: BottomNavigationBarType.fixed,
      ),
    );
  }
}
