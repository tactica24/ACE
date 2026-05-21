import { Currency, CurrencyService } from './currency';

export interface LocalizedContent {
  [key: string]: {
    [key: string]: string;
  };
}

export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh-Hans', 'zh-Hant'] as const;

export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export interface LocalizationContext {
  locale: SupportedLocale;
  currency: Currency;
  dateFormat: string;
  timeFormat: string;
}

export class InternationalizationService {
  private static defaultLocale: SupportedLocale = 'en';
  private static defaultCurrency: Currency = Currency.USD;

  static detectLocale(request?: Request): SupportedLocale {
    if (request) {
      const acceptLanguage = request.headers.get('accept-language') || '';
      const preferredLocale = acceptLanguage
        .split(',')[0]
        .split('-')[0]
        .toLowerCase();

      // Map common locale codes to our supported locales
      const localeMap: Record<string, SupportedLocale> = {
        'en': 'en',
        'es': 'es',
        'fr': 'fr',
        'de': 'de',
        'it': 'it',
        'pt': 'pt',
        'ja': 'ja',
        'ko': 'ko',
        'zh': 'zh-Hans', // Default to simplified Chinese
      };

      return localeMap[preferredLocale] || this.defaultLocale;
    }

    return this.defaultLocale;
  }

  static getLocalizationContext(request?: Request): LocalizationContext {
    const locale = this.detectLocale(request);
    const currency = CurrencyService.detectUserCurrency(request);
    
    return {
      locale,
      currency,
      dateFormat: this.getDateFormat(locale),
      timeFormat: this.getTimeFormat(locale),
    };
  }

  private static getDateFormat(locale: SupportedLocale): string {
    const formats: Record<SupportedLocale, string> = {
      'en': 'MM/dd/yyyy',
      'es': 'dd/MM/yyyy',
      'fr': 'dd/MM/yyyy',
      'de': 'dd.MM.yyyy',
      'it': 'dd/MM/yyyy',
      'pt': 'dd/MM/yyyy',
      'ja': 'yyyy/MM/dd',
      'ko': 'yyyy. MM. dd.',
      'zh-Hans': 'yyyy年MM月dd日',
      'zh-Hant': 'yyyy年MM月dd日',
    };

    return formats[locale] || formats['en'];
  }

  private static getTimeFormat(locale: SupportedLocale): string {
    const formats: Record<SupportedLocale, string> = {
      'en': 'h:mm a',
      'es': 'H:mm',
      'fr': 'H:mm',
      'de': 'H:mm',
      'it': 'H:mm',
      'pt': 'H:mm',
      'ja': 'H:mm',
      'ko': 'A h:mm',
      'zh-Hans': 'HH:mm',
      'zh-Hant': 'HH:mm',
    };

    return formats[locale] || formats['en'];
  }

  static formatDate(date: Date, locale: SupportedLocale): string {
    const format = this.getDateFormat(locale);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  static formatTime(date: Date, locale: SupportedLocale): string {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: locale === 'en',
    }).format(date);
  }

  static formatDateTime(date: Date, locale: SupportedLocale): string {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: locale === 'en',
    }).format(date);
  }

  static getLocalizedText(key: string, locale: SupportedLocale = 'en'): string {
    // In a real implementation, this would load from translation files
    const translations: LocalizedContent = {
      'price': {
        'en': 'Price',
        'es': 'Precio',
        'fr': 'Prix',
        'de': 'Preis',
        'it': 'Prezzo',
        'pt': 'Preço',
        'ja': '価格',
        'ko': '가격',
        'zh-Hans': '价格',
        'zh-Hant': '價格',
      },
      'duration': {
        'en': 'Duration',
        'es': 'Duración',
        'fr': 'Durée',
        'de': 'Dauer',
        'it': 'Durata',
        'pt': 'Duração',
        'ja': '再生時間',
        'ko': '재생 시간',
        'zh-Hans': '时长',
        'zh-Hant': '時長',
      },
      'released': {
        'en': 'Released',
        'es': 'Estrenado',
        'fr': 'Sortie',
        'de': 'Veröffentlicht',
        'it': 'Uscita',
        'pt': 'Lançado',
        'ja': '公開日',
        'ko': '개봉일',
        'zh-Hans': '发布日期',
        'zh-Hant': '發布日期',
      },
      'watch_now': {
        'en': 'Watch Now',
        'es': 'Ver Ahora',
        'fr': 'Regarder',
        'de': 'Jetzt Ansehen',
        'it': 'Guarda Ora',
        'pt': 'Assistir Agora',
        'ja': '今すぐ視聴',
        'ko': '지금 시청',
        'zh-Hans': '立即观看',
        'zh-Hant': '立即觀看',
      },
      'trailer': {
        'en': 'Trailer',
        'es': 'Tráiler',
        'fr': 'Bande-annonce',
        'de': 'Trailer',
        'it': 'Trailer',
        'pt': 'Trailer',
        'ja': '予告編',
        'ko': '예고편',
        'zh-Hans': '预告片',
        'zh-Hant': '預告片',
      },
    };

    return translations[key]?.[locale] || translations[key]?.['en'] || key;
  }
}
