export const PRIMARY_CATEGORY_OPTIONS = [
  'General',
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Faith',
  'Fantasy',
  'History',
  'Horror',
  'Love',
  'Music',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Sport',
  'Thriller',
  'War'
] as const;

export const SECONDARY_GENRE_OPTIONS = PRIMARY_CATEGORY_OPTIONS.filter(
  (option) => option !== 'General'
);

export function normalizeSelectedGenres(values: string[]) {
  const allowed = new Set(SECONDARY_GENRE_OPTIONS);
  const seen = new Set<string>();

  return values
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && allowed.has(value))
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

export function toggleGenreSelection(current: string[], genre: string) {
  return current.includes(genre)
    ? current.filter((value) => value !== genre)
    : [...current, genre];
}
