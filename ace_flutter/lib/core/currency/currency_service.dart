import 'package:intl/intl.dart';

enum Currency {
  usd('USD', '\$', 'United States Dollar'),
  eur('EUR', '€', 'Euro'),
  gbp('GBP', '£', 'British Pound'),
  cad('CAD', 'C\$', 'Canadian Dollar'),
  ngn('NGN', '₦', 'Nigerian Naira');

  const Currency(this.code, this.symbol, this.name);
  
  final String code;
  final String symbol;
  final String name;
}

class CurrencyAmount {
  const CurrencyAmount({
    required this.amount,
    required this.currency,
  });

  final double amount;
  final Currency currency;

  String get formatted {
    final format = NumberFormat.currency(
      locale: _getLocaleForCurrency(currency),
      symbol: currency.symbol,
      decimalDigits: currency == Currency.ngn ? 0 : 2,
    );
    return format.format(amount);
  }

  String get formattedWithoutSymbol {
    final format = NumberFormat.currency(
      locale: _getLocaleForCurrency(currency),
      symbol: '',
      decimalDigits: currency == Currency.ngn ? 0 : 2,
    );
    return format.format(amount);
  }

  static String _getLocaleForCurrency(Currency currency) {
    switch (currency) {
      case Currency.usd:
        return 'en_US';
      case Currency.eur:
        return 'de_DE';
      case Currency.gbp:
        return 'en_GB';
      case Currency.cad:
        return 'en_CA';
      case Currency.ngn:
        return 'en_NG';
    }
  }
}

class CurrencyService {
  static Currency detectUserCurrency() {
    // In a real app, this would use device locale or user preference
    // For now, default to USD for international audience
    return Currency.usd;
  }

  static CurrencyAmount convertFromMinorUnits({
    required int minorUnits,
    required Currency currency,
  }) {
    double amount;
    switch (currency) {
      case Currency.ngn:
        amount = minorUnits.toDouble();
        break;
      default:
        amount = minorUnits / 100.0;
    }
    return CurrencyAmount(amount: amount, currency: currency);
  }

  static String formatPrice({
    required int minorUnits,
    required Currency currency,
    bool showSymbol = true,
  }) {
    final amount = convertFromMinorUnits(minorUnits: minorUnits, currency: currency);
    return showSymbol ? amount.formatted : amount.formattedWithoutSymbol;
  }

  static String getLocalizedPriceLabel(Currency currency) {
    switch (currency) {
      case Currency.usd:
        return 'Price';
      case Currency.eur:
        return 'Preis';
      case Currency.gbp:
        return 'Price';
      case Currency.cad:
        return 'Price';
      case Currency.ngn:
        return 'Price';
    }
  }
}
