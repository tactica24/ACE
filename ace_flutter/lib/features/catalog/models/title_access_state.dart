import '../../../core/currency/currency_service.dart';

class TitleAccessState {
  const TitleAccessState({
    required this.hasAccess,
    required this.status,
    required this.message,
    this.canPreview = true,
    this.requiresAuth = false,
    this.requiresPurchase = false,
    this.priceInfo,
  });

  final bool hasAccess;
  final String status;
  final String message;
  final bool canPreview;
  final bool requiresAuth;
  final bool requiresPurchase;
  final PriceInfo? priceInfo;

  factory TitleAccessState.fromJson(Map<String, dynamic> json) {
    final hasAccess = json['hasAccess'] as bool? ?? false;
    final status = json['status'] as String? ?? 'NO_ACCESS';
    final message = json['message'] as String? ??
        (hasAccess ? 'You have access to this title' : 'Access required');

    final priceInfoJson = json['priceInfo'] as Map<String, dynamic>?;
    final priceInfo =
        priceInfoJson != null ? PriceInfo.fromJson(priceInfoJson) : null;

    return TitleAccessState(
      hasAccess: hasAccess,
      status: status,
      message: message,
      canPreview: json['canPreview'] as bool? ?? true,
      requiresAuth: json['requiresAuth'] as bool? ?? false,
      requiresPurchase: json['requiresPurchase'] as bool? ?? false,
      priceInfo: priceInfo,
    );
  }
}

class PriceInfo {
  const PriceInfo({
    required this.minorUnits,
    required this.currency,
    this.tier,
  });

  final int minorUnits;
  final String currency;
  final String? tier;

  factory PriceInfo.fromJson(Map<String, dynamic> json) {
    return PriceInfo(
      minorUnits: json['minorUnits'] as int? ?? 0,
      currency: json['currency'] as String? ?? 'USD',
      tier: json['tier'] as String?,
    );
  }

  String get formattedPrice {
    final currencyEnum = Currency.values.firstWhere(
      (c) => c.code.toLowerCase() == currency.toLowerCase(),
      orElse: () => Currency.usd,
    );
    return CurrencyService.formatPrice(
      minorUnits: minorUnits,
      currency: currencyEnum,
    );
  }
}
