import 'package:ace_studio_flutter/features/player/data/playback_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const urls = PlaybackStreamUrls(
    hlsUrl: 'https://video.example/full.m3u8',
    progressiveUrl: 'https://video.example/full.mp4',
    previewUrl: 'https://video.example/trailer.m3u8',
    preferred: 'hls',
  );

  test('full playback candidates never include the trailer', () {
    expect(
      urls.playbackCandidates(teaserOnly: false),
      [
        'https://video.example/full.m3u8',
        'https://video.example/full.mp4',
      ],
    );
  });

  test('preview playback can use the trailer', () {
    expect(
      urls.playbackCandidates(teaserOnly: true),
      [
        'https://video.example/full.m3u8',
        'https://video.example/full.mp4',
        'https://video.example/trailer.m3u8',
      ],
    );
  });
}
