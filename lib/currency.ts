export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  CAD = 'CAD',
  NGN = 'NGN'
}

export interface CurrencyAmount {
  amount: number;
  currency: Currency;
  formatted: string;
  formattedWithoutSymbol: string;
}

export class CurrencyService {
  static detectUserCurrency(request?: Request): Currency {
    // In a real app, this would use Accept-Language header or user preference
    const defaultCurrency = Currency.USD;
    
    if (request) {
      const acceptLanguage = request.headers.get('accept-language');
      if (acceptLanguage) {
        if (acceptLanguage.includes('en-GB') || acceptLanguage.includes('gb')) {
          return Currency.GBP;
        }
        if (acceptLanguage.includes('en-CA') || acceptLanguage.includes('ca')) {
          return Currency.CAD;
        }
        if (acceptLanguage.includes('de') || acceptLanguage.includes('fr') || 
            acceptLanguage.includes('it') || acceptLanguage.includes('es')) {
          return Currency.EUR;
        }
        if (acceptLanguage.includes('ng') || acceptLanguage.includes('en-NG')) {
          return Currency.NGN;
        }
      }
    }
    
    return defaultCurrency;
  }

  static convertFromMinorUnits({
    minorUnits,
    currency
  }: {
    minorUnits: number;
    currency: Currency;
  }): CurrencyAmount {
    let amount: number;
    
    amount = minorUnits / 100;

    const formatted = this.formatPrice({ minorUnits, currency, showSymbol: true });
    const formattedWithoutSymbol = this.formatPrice({ minorUnits, currency, showSymbol: false });

    return {
      amount,
      currency,
      formatted,
      formattedWithoutSymbol
    };
  }

  static formatPrice({
    minorUnits,
    currency,
    showSymbol = true
  }: {
    minorUnits: number;
    currency: Currency;
    showSymbol?: boolean;
  }): string {
    const locale = this.getLocaleForCurrency(currency);
    const symbol = this.getSymbolForCurrency(currency);
    const decimalDigits = currency === Currency.NGN ? 0 : 2;
    
    const amount = minorUnits / 100;

    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimalDigits,
      maximumFractionDigits: decimalDigits,
    }).format(amount);

    if (!showSymbol) {
      return formatted.replace(new RegExp(`[^\\d.,\\s]`), '').trim();
    }

    return formatted;
  }

  private static getLocaleForCurrency(currency: Currency): string {
    switch (currency) {
      case Currency.USD:
        return 'en-US';
      case Currency.EUR:
        return 'de-DE';
      case Currency.GBP:
        return 'en-GB';
      case Currency.CAD:
        return 'en-CA';
      case Currency.NGN:
        return 'en-NG';
      default:
        return 'en-US';
    }
  }

  private static getSymbolForCurrency(currency: Currency): string {
    switch (currency) {
      case Currency.USD:
        return '$';
      case Currency.EUR:
        return '€';
      case Currency.GBP:
        return '£';
      case Currency.CAD:
        return 'C$';
      case Currency.NGN:
        return '₦';
      default:
        return '$';
    }
  }

  static getLocalizedPriceLabel(currency: Currency): string {
    switch (currency) {
      case Currency.USD:
      case Currency.GBP:
      case Currency.CAD:
        return 'Price';
      case Currency.EUR:
        return 'Preis';
      case Currency.NGN:
        return 'Price';
      default:
        return 'Price';
    }
  }
}
