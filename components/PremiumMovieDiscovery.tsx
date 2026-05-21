'use client';

import Image from 'next/image';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  SlidersHorizontal,
  Star,
  Calendar,
  Clock,
  TrendingUp,
  Play,
  Info,
  ChevronDown,
  X,
  Heart,
  Plus,
  Eye
} from 'lucide-react';

interface Movie {
  id: string;
  title: string;
  thumbnail: string;
  backdrop: string;
  synopsis: string;
  year: number;
  director: string;
  duration: number;
  ageRating: string;
  genres: string[];
  contentWarnings: string[];
  quality: 'SD' | 'HD' | '4K';
  rating: number;
  views: number;
  isNew: boolean;
  isTrending: boolean;
  matchPercentage: number;
  lastAdded: Date;
}

interface FilterOptions {
  genres: string[];
  yearRange: [number, number];
  ratingRange: [number, number];
  quality: string[];
  contentWarnings: string[];
  sortBy: 'relevance' | 'year' | 'rating' | 'views' | 'dateAdded';
  sortOrder: 'asc' | 'desc';
}

interface DeviceType {
  type: 'tv' | 'desktop' | 'tablet' | 'mobile';
}

export default function PremiumMovieDiscovery({
  movies,
  onMovieSelect,
  onPlay,
  onAddToList
}: {
  movies: Movie[];
  onMovieSelect?: (movie: Movie) => void;
  onPlay?: (movie: Movie) => void;
  onAddToList?: (movie: Movie) => void;
}) {
  const [device, setDevice] = useState<DeviceType>({ type: 'desktop' });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    genres: [],
    yearRange: [1900, new Date().getFullYear()],
    ratingRange: [0, 5],
    quality: [],
    contentWarnings: [],
    sortBy: 'relevance',
    sortOrder: 'desc'
  });

  const [hoveredMovie, setHoveredMovie] = useState<string | null>(null);
  const [selectedMovies, setSelectedMovies] = useState<Set<string>>(new Set());

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      let type: DeviceType['type'] = 'desktop';
      
      if (width >= 1920) type = 'tv';
      else if (width >= 1024) type = 'desktop';
      else if (width >= 768) type = 'tablet';
      else type = 'mobile';

      setDevice({ type });
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  const filteredMovies = movies.filter(movie => {
    const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         movie.synopsis.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         movie.director.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGenre = filters.genres.length === 0 || 
                       movie.genres.some(genre => filters.genres.includes(genre));
    
    const matchesYear = movie.year >= filters.yearRange[0] && movie.year <= filters.yearRange[1];
    
    const matchesRating = movie.rating >= filters.ratingRange[0] && movie.rating <= filters.ratingRange[1];
    
    const matchesQuality = filters.quality.length === 0 || 
                        filters.quality.includes(movie.quality);
    
    return matchesSearch && matchesGenre && matchesYear && matchesRating && matchesQuality;
  }).sort((a, b) => {
    let comparison = 0;
    
    switch (filters.sortBy) {
      case 'year':
        comparison = a.year - b.year;
        break;
      case 'rating':
        comparison = a.rating - b.rating;
        break;
      case 'views':
        comparison = a.views - b.views;
        break;
      case 'dateAdded':
        comparison = a.lastAdded.getTime() - b.lastAdded.getTime();
        break;
      default:
        comparison = 0;
    }
    
    return filters.sortOrder === 'asc' ? comparison : -comparison;
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getLayoutClasses = () => {
    const baseClasses = "premium-movie-discovery";
    const deviceClasses = {
      tv: "tv-discovery",
      desktop: "desktop-discovery", 
      tablet: "tablet-discovery",
      mobile: "mobile-discovery"
    };
    
    return `${baseClasses} ${deviceClasses[device.type]} ${viewMode}`;
  };

  const MovieCard = ({ movie, size = 'medium' }: { movie: Movie; size?: 'small' | 'medium' | 'large' }) => {
    const isHovered = hoveredMovie === movie.id;
    const isSelected = selectedMovies.has(movie.id);

    return (
      <div 
        className={`movie-card ${size} ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''}`}
        onMouseEnter={() => setHoveredMovie(movie.id)}
        onMouseLeave={() => setHoveredMovie(null)}
        onClick={() => onMovieSelect?.(movie)}
      >
        {/* Thumbnail Container */}
        <div className="movie-thumbnail">
          <Image src={movie.thumbnail} alt={movie.title} width={300} height={169} />
          
          {/* Overlay Content */}
          <div className="movie-overlay">
            {/* Quick Actions */}
            <div className="quick-actions">
              <button 
                className="action-button play"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay?.(movie);
                }}
              >
                <Play className="w-4 h-4" />
              </button>
              
              <button 
                className={`action-button ${isSelected ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const newSelected = new Set(selectedMovies);
                  if (isSelected) {
                    newSelected.delete(movie.id);
                  } else {
                    newSelected.add(movie.id);
                  }
                  setSelectedMovies(newSelected);
                }}
              >
                <Plus className="w-4 h-4" />
              </button>
              
              <button 
                className="action-button"
                onClick={(e) => {
                  e.stopPropagation();
                  // Add to favorites
                }}
              >
                <Heart className="w-4 h-4" />
              </button>
            </div>

            {/* Movie Info Overlay */}
            <div className="movie-info-overlay">
              <div className="overlay-header">
                <h4 className="overlay-title">{movie.title}</h4>
                <div className="overlay-meta">
                  <span className="overlay-year">{movie.year}</span>
                  <span className="overlay-rating">{movie.ageRating}</span>
                  <span className="overlay-duration">{formatDuration(movie.duration)}</span>
                </div>
              </div>
              
              <div className="overlay-stats">
                <div className="stat-item">
                  <Star className="w-3 h-3 fill-current" />
                  <span>{movie.rating.toFixed(1)}</span>
                </div>
                <div className="stat-item">
                  <Eye className="w-3 h-3" />
                  <span>{movie.views.toLocaleString()}</span>
                </div>
                <div className="stat-item">
                  <TrendingUp className="w-3 h-3" />
                  <span>{movie.matchPercentage}%</span>
                </div>
              </div>
              
              <div className="overlay-synopsis">
                <p>{movie.synopsis.substring(0, 150)}...</p>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="movie-badges">
            {movie.isNew && <span className="badge new">NEW</span>}
            {movie.isTrending && <span className="badge trending">TRENDING</span>}
            {movie.quality === '4K' && <span className="badge quality">4K</span>}
          </div>

          {/* Progress Ring for Continue Watching */}
          {movie.views > 0 && (
            <div className="progress-indicator">
              <div className="progress-ring">
                <div className="progress-fill" />
              </div>
            </div>
          )}
        </div>

        {/* Movie Details */}
        <div className="movie-details">
          <h3 className="movie-title">{movie.title}</h3>
          
          <div className="movie-meta">
            <span className="movie-year">{movie.year}</span>
            <div className="movie-rating">
              <Star className="w-3 h-3 fill-current" />
              <span>{movie.rating.toFixed(1)}</span>
            </div>
            <span className="movie-quality">{movie.quality}</span>
          </div>

          <div className="movie-genres">
            {movie.genres.slice(0, 2).map((genre, index) => (
              <span key={index} className="genre-tag">{genre}</span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const MovieListItem = ({ movie }: { movie: Movie }) => (
    <div 
      className={`movie-list-item ${hoveredMovie === movie.id ? 'hovered' : ''}`}
      onMouseEnter={() => setHoveredMovie(movie.id)}
      onMouseLeave={() => setHoveredMovie(null)}
      onClick={() => onMovieSelect?.(movie)}
    >
      {/* Thumbnail */}
      <div className="list-thumbnail">
        <Image src={movie.thumbnail} alt={movie.title} width={300} height={169} />
        <button 
          className="list-play-button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay?.(movie);
          }}
        >
          <Play className="w-4 h-4" />
        </button>
      </div>

      {/* Movie Information */}
      <div className="list-content">
        <div className="list-header">
          <h3 className="list-title">{movie.title}</h3>
          <div className="list-meta">
            <span className="list-year">{movie.year}</span>
            <span className="list-rating">{movie.ageRating}</span>
            <span className="list-duration">{formatDuration(movie.duration)}</span>
            <span className="list-quality">{movie.quality}</span>
          </div>
        </div>

        <p className="list-synopsis">{movie.synopsis}</p>

        <div className="list-stats">
          <div className="stat-item">
            <Star className="w-3 h-3 fill-current" />
            <span>{movie.rating.toFixed(1)}/5.0</span>
          </div>
          <div className="stat-item">
            <Eye className="w-3 h-3" />
            <span>{movie.views.toLocaleString()} views</span>
          </div>
          <div className="stat-item">
            <TrendingUp className="w-3 h-3" />
            <span>{movie.matchPercentage}% match</span>
          </div>
        </div>

        <div className="list-genres">
          {movie.genres.map((genre, index) => (
            <span key={index} className="genre-tag">{genre}</span>
          ))}
        </div>
      </div>

      {/* List Actions */}
      <div className="list-actions">
        <button className="action-button">
          <Plus className="w-4 h-4" />
        </button>
        <button className="action-button">
          <Heart className="w-4 h-4" />
        </button>
        <button className="action-button">
          <Info className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className={getLayoutClasses()}>
      {/* Search and Filter Bar */}
      <div className="discovery-header">
        <div className="search-section">
          <div className="search-bar">
            <Search className="w-5 h-5" />
            <input
              type="text"
              placeholder="Search movies, directors, actors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="filter-section">
          <div className="view-controls">
            <button 
              className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button 
              className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          <button 
            className={`filter-button ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span>Filters</span>
            {(filters.genres.length > 0 || filters.quality.length > 0) && (
              <span className="filter-count">
                {filters.genres.length + filters.quality.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-header">
            <h3>Advanced Filters</h3>
            <button onClick={() => setShowFilters(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="filters-content">
            <div className="filter-group">
              <h4>Genres</h4>
              <div className="filter-options">
                {['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller'].map((genre) => (
                  <label key={genre} className="filter-option">
                    <input
                      type="checkbox"
                      checked={filters.genres.includes(genre)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({ ...prev, genres: [...prev.genres, genre] }));
                        } else {
                          setFilters(prev => ({ ...prev, genres: prev.genres.filter(g => g !== genre) }));
                        }
                      }}
                    />
                    <span>{genre}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>Quality</h4>
              <div className="filter-options">
                {['SD', 'HD', '4K'].map((quality) => (
                  <label key={quality} className="filter-option">
                    <input
                      type="checkbox"
                      checked={filters.quality.includes(quality)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({ ...prev, quality: [...prev.quality, quality] }));
                        } else {
                          setFilters(prev => ({ ...prev, quality: prev.quality.filter(q => q !== quality) }));
                        }
                      }}
                    />
                    <span>{quality}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>Sort By</h4>
              <select 
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                className="sort-select"
              >
                <option value="relevance">Relevance</option>
                <option value="year">Year</option>
                <option value="rating">Rating</option>
                <option value="views">Views</option>
                <option value="dateAdded">Date Added</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="results-summary">
        <div className="summary-text">
          <span className="results-count">{filteredMovies.length}</span>
          <span className="results-label">
            {filteredMovies.length === 1 ? 'movie found' : 'movies found'}
          </span>
          {searchQuery && (
            <span className="search-query">for &quot;{searchQuery}&quot;</span>
          )}
        </div>

        <div className="sort-controls">
          <select 
            value={filters.sortOrder}
            onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as any }))}
            className="sort-order-select"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {/* Movies Grid/List */}
      <div className="movies-container">
        {viewMode === 'grid' ? (
          <div className="movies-grid">
            {filteredMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="movies-list">
            {filteredMovies.map((movie) => (
              <MovieListItem key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </div>

      {/* No Results */}
      {filteredMovies.length === 0 && (
        <div className="no-results">
          <div className="no-results-content">
            <Search className="w-12 h-12 text-gray-400" />
            <h3>No movies found</h3>
            <p>Try adjusting your search or filters</p>
            <button 
              className="clear-filters-button"
              onClick={() => setFilters({
                genres: [],
                yearRange: [1900, new Date().getFullYear()],
                ratingRange: [0, 5],
                quality: [],
                contentWarnings: [],
                sortBy: 'relevance',
                sortOrder: 'desc'
              })}
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
