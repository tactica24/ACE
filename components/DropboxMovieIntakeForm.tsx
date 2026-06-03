'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type DropboxMovieIntakeFormProps = {
  extraPayload?: Record<string, unknown>;
  requestHeaders?: Record<string, string>;
  submissionEndpoint?: string;
  successRedirectPath?: string;
  contractRedirectBasePath?: string | null;
};

type FormState = {
  title: string;
  description: string;
  category: string;
  videoType: string;
  ageRating: string;
  priceTier: string;
  rightsTier: string;
  releaseYear: string;
  durationSec: string;
  originalLanguage: string;
  genres: string;
  contentWarnings: string;
  masterSourceUrl: string;
};

const initialState: FormState = {
  title: '',
  description: '',
  category: 'General',
  videoType: 'FEATURE',
  ageRating: 'ALL',
  priceTier: 'STANDARD',
  rightsTier: 'SHARED',
  releaseYear: String(new Date().getFullYear()),
  durationSec: '',
  originalLanguage: 'en',
  genres: '',
  contentWarnings: '',
  masterSourceUrl: ''
};

function normalizeList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function DropboxMovieIntakeForm({
  extraPayload,
  requestHeaders,
  submissionEndpoint = '/api/studio/video',
  successRedirectPath = '/studio/library',
  contractRedirectBasePath = '/studio/upload?contractVideoId='
}: DropboxMovieIntakeFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!form.title.trim() || !form.description.trim() || !form.masterSourceUrl.trim()) {
      setMessage('Enter the movie details and paste the Dropbox source link before continuing.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(submissionEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(requestHeaders ?? {})
        },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          videoType: form.videoType,
          ageRating: form.ageRating,
          priceTier: form.priceTier,
          rightsTier: form.rightsTier,
          releaseYear: Number(form.releaseYear || 0),
          durationSec: Number(form.durationSec || 0),
          originalLanguage: form.originalLanguage.trim().toLowerCase() || 'en',
          genres: normalizeList(form.genres),
          contentWarnings: normalizeList(form.contentWarnings),
          masterSourceUrl: form.masterSourceUrl.trim(),
          ...(extraPayload ?? {})
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'We could not create the movie record right now.');
      }

      if (payload.requiresContract && payload.videoId && contractRedirectBasePath) {
        router.push(`${contractRedirectBasePath}${encodeURIComponent(payload.videoId)}`);
        return;
      }

      router.push(successRedirectPath);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not create the movie record right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stack-list">
      <div className="field-grid field-grid-2">
        <label className="field">
          <span className="field-label">Title</span>
          <input className="input" value={form.title} onChange={(event) => updateField('title', event.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Category</span>
          <select className="input" value={form.category} onChange={(event) => updateField('category', event.target.value)}>
            <option value="General">General</option>
            <option value="Love">Love</option>
            <option value="Action">Action</option>
            <option value="Thriller">Thriller</option>
            <option value="Comedy">Comedy</option>
            <option value="Drama">Drama</option>
            <option value="Romance">Romance</option>
            <option value="Sci-Fi">Sci-Fi</option>
            <option value="Horror">Horror</option>
            <option value="Documentary">Documentary</option>
            <option value="Family">Family</option>
            <option value="Faith">Faith</option>
            <option value="Animation">Animation</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Type</span>
          <select className="input" value={form.videoType} onChange={(event) => updateField('videoType', event.target.value)}>
            <option value="FEATURE">Feature</option>
            <option value="SHORT">Short</option>
            <option value="SKIT">Skit</option>
            <option value="DOCUMENTARY">Documentary</option>
            <option value="ADVERT">Advert</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Age rating</span>
          <select className="input" value={form.ageRating} onChange={(event) => updateField('ageRating', event.target.value)}>
            <option value="ALL">All</option>
            <option value="PG13">13+</option>
            <option value="PG16">16+</option>
            <option value="PG18">18+</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Price tier</span>
          <select className="input" value={form.priceTier} onChange={(event) => updateField('priceTier', event.target.value)}>
            <option value="SNACK">Snack</option>
            <option value="STANDARD">Standard</option>
            <option value="PREMIERE">Premiere</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Rights</span>
          <select className="input" value={form.rightsTier} onChange={(event) => updateField('rightsTier', event.target.value)}>
            <option value="SHARED">Shared</option>
            <option value="EXCLUSIVE">Exclusive</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Release year</span>
          <input className="input" type="number" value={form.releaseYear} onChange={(event) => updateField('releaseYear', event.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Duration (seconds)</span>
          <input className="input" type="number" min={1} value={form.durationSec} onChange={(event) => updateField('durationSec', event.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Original language</span>
          <input className="input" value={form.originalLanguage} onChange={(event) => updateField('originalLanguage', event.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Genres</span>
          <input className="input" value={form.genres} onChange={(event) => updateField('genres', event.target.value)} placeholder="Drama, Thriller" />
        </label>
        <label className="field">
          <span className="field-label">Content warnings</span>
          <input className="input" value={form.contentWarnings} onChange={(event) => updateField('contentWarnings', event.target.value)} placeholder="Violence, Language" />
        </label>
      </div>

      <label className="field">
        <span className="field-label">Synopsis</span>
        <textarea className="input" rows={5} value={form.description} onChange={(event) => updateField('description', event.target.value)} />
      </label>

      <label className="field">
        <span className="field-label">Dropbox master source URL</span>
        <input
          className="input"
          type="url"
          value={form.masterSourceUrl}
          onChange={(event) => updateField('masterSourceUrl', event.target.value)}
          placeholder="Paste the Dropbox share link for the movie master"
        />
        <span className="muted">This source stays in Dropbox. ACE Studio will use Contabo to download it, transcode HLS, and publish the HLS package to Bunny.</span>
      </label>

      {message ? <div className="card">{message}</div> : null}

      <div className="action-list">
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Creating movie...' : 'Create movie from Dropbox source'}
        </button>
      </div>
    </form>
  );
}
