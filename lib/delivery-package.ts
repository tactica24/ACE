type DeliveryPackageInput = {
  videoType?: string | null;
  seriesId?: string | null;
  primaryReady?: boolean;
  fallbackReady?: boolean;
  masterReady?: boolean;
  hlsReady?: boolean;
  episodeCount?: number;
  readyEpisodeCount?: number;
  subtitleTrackCount?: number;
  englishSubtitlesProvided?: boolean;
  deliveryFormat?: string | null;
};

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function isSeriesContainerDelivery(input: Pick<DeliveryPackageInput, 'videoType' | 'seriesId'>) {
  return input.videoType === 'SERIES' && !input.seriesId;
}

export function getViewerPackageLabel(input: Pick<DeliveryPackageInput, 'videoType' | 'seriesId'>) {
  return isSeriesContainerDelivery(input)
    ? 'Per-episode Bunny playback package'
    : 'Bunny playback package';
}

export function getViewerPackageStatus(input: DeliveryPackageInput) {
  if (isSeriesContainerDelivery(input)) {
    const readyEpisodeCount = input.readyEpisodeCount ?? 0;
    const episodeCount = input.episodeCount ?? 0;

    if (episodeCount === 0) {
      return 'No episode package uploaded yet';
    }

    return `${pluralize(readyEpisodeCount, 'episode')} ready out of ${episodeCount}`;
  }

  if (input.primaryReady && input.fallbackReady) {
    return '1080p and 720p ready';
  }

  if (input.hlsReady) {
    return 'Bunny playback ready';
  }

  if (input.masterReady) {
    return 'Master source attached; Bunny playback pending';
  }

  if (input.primaryReady) {
    return '1080p ready, 720p missing';
  }

  if (input.fallbackReady) {
    return '720p ready, 1080p missing';
  }

  return 'Viewer package missing';
}

export function getSubtitlePackageStatus(input: Pick<DeliveryPackageInput, 'subtitleTrackCount' | 'englishSubtitlesProvided'>) {
  const subtitleTrackCount = input.subtitleTrackCount ?? 0;
  if (subtitleTrackCount > 0) {
    return pluralize(subtitleTrackCount, 'subtitle track');
  }

  if (input.englishSubtitlesProvided) {
    return 'English subtitles flagged';
  }

  return 'No subtitles uploaded';
}

export function getDeliveryFormatLabel(input: Pick<DeliveryPackageInput, 'deliveryFormat'>) {
  return input.deliveryFormat?.trim() || 'MP4 viewer package';
}
