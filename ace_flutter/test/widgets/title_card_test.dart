import 'package:ace_studio_flutter/features/catalog/models/title_summary.dart';
import 'package:ace_studio_flutter/widgets/title_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('compact title card footer fits without overflow',
      (tester) async {
    const title = TitleSummary(
      id: 'movie-1',
      title: 'A Professional Movie Title',
      description: '',
      videoType: 'MOVIE',
      category: 'Featured',
      ageRating: 'PG-13',
      genres: [],
      teaserSec: 60,
      durationSec: 7200,
      posterKey: null,
      releaseYear: 2026,
      formattedPrice: 'NGN 1,500',
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: SizedBox(
              width: 178,
              height: 350,
              child: TitleCard(
                title: title,
                posterUrl: null,
                compact: true,
                onTap: () {},
              ),
            ),
          ),
        ),
      ),
    );

    expect(tester.takeException(), isNull);
    expect(find.text('2026  |  MOVIE  |  PG-13'), findsOneWidget);
    expect(find.text('NGN 1,500'), findsOneWidget);
  });
}
