'use client';

import { useDeferredValue, useState } from 'react';
import VideoCard, { type VideoCardData } from '@/components/VideoCard';

type BrowseCatalogVideo = VideoCardData & {
  genres: string[];
};

export default function BrowseCatalog({ videos }: { videos: BrowseCatalogVideo[] }) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const deferredQuery = useDeferredValue(query);
  const trimmedQuery = deferredQuery.trim();

  const categories = ['All', ...Array.from(new Set(videos.map((video) => video.category).filter(Boolean))).sort((a, b) => a.localeCompare(b))];
  const normalizedQuery = trimmedQuery.toLowerCase();
  const filteredVideos = videos.filter((video) => {
    const matchesCategory = activeCategory === 'All' || video.category === activeCategory;
    if (!matchesCategory) {
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
            Search by title, genre, mood, or category.
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
      </aside>

      <div className="browse-results">
        <div className="browse-results-header">
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>
              {activeCategory === 'All' ? 'All titles' : activeCategory}
            </h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              {trimmedQuery
                ? `Showing results for "${trimmedQuery}".`
                : 'Browse freely and keep filtering without interrupting your viewing flow.'}
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
            <p className="muted">Try another category or a shorter search term.</p>
          </div>
        )}
      </div>
    </div>
  );
}
