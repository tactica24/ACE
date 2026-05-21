'use client';

import { useDeferredValue, useEffect, useState } from 'react';
import VideoCard, { type VideoCardData } from '@/components/VideoCard';

type BrowseCatalogVideo = VideoCardData & {
  genres: string[];
};

export default function BrowseCatalog({
  videos,
  initialQuery = '',
  initialCategory = 'All',
  initialVideoType = 'All'
}: {
  videos: BrowseCatalogVideo[];
  initialQuery?: string;
  initialCategory?: string;
  initialVideoType?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [activeVideoType, setActiveVideoType] = useState(initialVideoType);
  const deferredQuery = useDeferredValue(query);
  const trimmedQuery = deferredQuery.trim();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setActiveCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setActiveVideoType(initialVideoType);
  }, [initialVideoType]);

  const categories = ['All', ...Array.from(new Set(videos.map((video) => video.category).filter(Boolean))).sort((a, b) => a.localeCompare(b))];
  const videoTypes = ['All', ...Array.from(new Set(videos.map((video) => video.videoType).filter(Boolean))).sort((a, b) => a.localeCompare(b))];
  const normalizedQuery = trimmedQuery.toLowerCase();
  const filteredVideos = videos.filter((video) => {
    const matchesCategory = activeCategory === 'All' || video.category === activeCategory;
    const matchesVideoType = activeVideoType === 'All' || video.videoType === activeVideoType;

    if (!matchesCategory || !matchesVideoType) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const searchText = [
      video.title,
      video.description,
      video.category,
      video.videoType,
      video.ageRating,
      ...video.genres
    ]
      .join(' ')
      .toLowerCase();

    return searchText.includes(normalizedQuery);
  });

  return (
    <div className="browse-layout">
      <aside className="card card-soft browse-sidebar">
        <div className="browse-sidebar-section">
          <h3 style={{ marginBottom: 8 }}>Find something fast</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Search across titles, genres, moods, and categories.
          </p>
          <input
            className="input"
            type="search"
            placeholder="Search titles, genres, or descriptions"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="browse-sidebar-section">
          <div className="stack-row" style={{ alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Categories</h3>
            <span className="muted">{filteredVideos.length}</span>
          </div>
          <div className="browse-filter-list">
            {categories.map((category) => (
              <button
                key={category}
                className={`browse-filter-button${category === activeCategory ? ' active' : ''}`}
                type="button"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="browse-sidebar-section">
          <div className="stack-row" style={{ alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Format</h3>
            <span className="muted">{activeVideoType}</span>
          </div>
          <div className="browse-filter-list">
            {videoTypes.map((videoType) => (
              <button
                key={videoType}
                className={`browse-filter-button${videoType === activeVideoType ? ' active' : ''}`}
                type="button"
                onClick={() => setActiveVideoType(videoType)}
              >
                {videoType}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="browse-results">
        <div className="browse-results-header">
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>
              {activeCategory === 'All' && activeVideoType === 'All'
                ? 'All titles'
                : [activeCategory !== 'All' ? activeCategory : null, activeVideoType !== 'All' ? activeVideoType : null]
                    .filter(Boolean)
                    .join(' / ')}
            </h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              {trimmedQuery
                ? `Showing results for "${trimmedQuery}".`
                : 'Filter the catalog by category, format, or keyword.'}
            </p>
          </div>
          <div className="pill">{filteredVideos.length} matches</div>
        </div>

        {filteredVideos.length ? (
          <div className="video-grid">
            {filteredVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="card empty-state">
            <h3>No titles matched that search</h3>
            <p className="muted">No matches found for the current filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
