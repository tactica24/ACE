# HLS Conversion Guidelines for ACE Studio

## FFmpeg Command Template

Use this command to convert masters to HLS:

```bash
ffmpeg \
  -y \
  -i "input.mp4" \
  -filter_complex "[0:v]split=3[v1][v2][v3];[v1]scale=-2:2160:force_original_aspect_ratio=decrease[v2160];[v2]scale=-2:1080:force_original_aspect_ratio=decrease[v1080];[v3]scale=-2:720:force_original_aspect_ratio=decrease[v720]" \
  -map "[v2160]" -map 0:a:0 \
  -map "[v1080]" -map 0:a:0 \
  -map "[v720]" -map 0:a:0 \
  -c:v libx264 -preset veryfast -crf 20 -c:a aac -ar 48000 \
  -b:v:0 12000k -maxrate:v:0 14000k -bufsize:v:0 24000k -b:a:0 192k \
  -b:v:1 6000k -maxrate:v:1 7000k -bufsize:v:1 12000k -b:a:1 128k \
  -b:v:2 3000k -maxrate:v:2 3500k -bufsize:v:2 6000k -b:a:2 128k \
  -f hls -hls_time 6 -hls_playlist_type vod -hls_flags independent_segments \
  -hls_segment_filename "hls-v1/%v/seg-%05d.ts" \
  -master_pl_name master.m3u8 \
  -var_stream_map "v:0,a:0,name:2160p v:1,a:1,name:1080p v:2,a:2,name:720p" \
  "hls-v1/%v/index.m3u8"
```

## Output Structure

```
movieId/hls-v1/
├── master.m3u8
├── 2160p/
│   ├── index.m3u8
│   ├── seg-00001.ts
│   └── ...
├── 1080p/
│   ├── index.m3u8
│   ├── seg-00001.ts
│   └── ...
└── 720p/
    ├── index.m3u8
    ├── seg-00001.ts
    └── ...
```

## Quality Guidelines

- **2160p (4K)**: For high-quality masters, 12000k bitrate
- **1080p**: Standard quality, 6000k bitrate
- **720p**: Fallback for slower connections, 3000k bitrate

Adjust qualities based on master resolution. Skip 2160p if master is < 2160p.

## Segment Settings

- 6-second segments for optimal streaming
- VOD playlist type (complete segments)
- Independent segments for better seeking

## Audio

- AAC codec at 48kHz
- Stereo unless source has surround
- 128k bitrate per quality level

## Validation

After conversion, run admin validation to ensure:
- master.m3u8 loads
- All quality playlists load
- Sample segments load with correct Content-Type
- CORS headers allow playback

## Upload

Use the publish script:
```bash
npm run publish:hls -- --movieId=xyz --version=hls-v1 --folder=./output/xyz/hls-v1
```

This sets correct cache headers and updates the database.