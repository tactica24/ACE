import 'package:ace_studio_flutter/features/catalog/models/title_summary.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses card metadata and formatted regional price', () {
    final title = TitleSummary.fromJson({
      'id': 'movie-1',
      'title': 'A Clean Poster',
      'videoType': 'MOVIE',
      'category': 'Featured',
      'ageRating': 'PG-13',
      'releaseYear': 2026,
      'price': {
        'currency': 'NGN',
        'minorUnits': 1500,
        'formatted': 'NGN 1,500',
      },
    });

    expect(title.releaseYear, 2026);
    expect(title.ageRating, 'PG-13');
    expect(title.formattedPrice, 'NGN 1,500');
  });
}
