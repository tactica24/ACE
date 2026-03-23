'use client';

import { useState, type FormEvent } from 'react';

type UploadState = {
  title: string;
  description: string;
  priceTier: string;
  rightsTier: string;
  teaserSec: number;
  durationSec: number;
  videoType: string;
  ageRating: string;
  category: string;
  genres: string;
  tags: string;
  highlightSeconds: string;
};

const initialState: UploadState = {
  title: '',
  description: '',
  priceTier: 'STANDARD',
  rightsTier: 'SHARED',
  teaserSec: 300,
  durationSec: 1800,
  videoType: 'FEATURE',
  ageRating: 'ALL',
  category: 'General',
  genres: '',
  tags: '',
  highlightSeconds: ''
};

export default function UploadForm() {
  const [form, setForm] = useState<UploadState>(initialState);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const updateField = <K extends keyof UploadState>(key: K, value: UploadState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const uploadAsset = async (file: File) => {
    const presign = await fetch('/api/studio/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || 'application/octet-stream'
      })
    });
    const presignData = await presign.json();
    if (!presign.ok) {
      throw new Error(presignData.error || 'Unable to prepare upload');
    }

    const upload = await fetch(presignData.url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    });

    if (!upload.ok) {
      throw new Error('Unable to upload file');
    }

    return presignData.key as string;
  };

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!videoFile) {
      setMessage('Select a video file before you submit this release.');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const [r2Key, posterKey] = await Promise.all([
        uploadAsset(videoFile),
        posterFile ? uploadAsset(posterFile) : Promise.resolve<string | null>(null)
      ]);

      const create = await fetch('/api/studio/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          videoType: form.videoType,
          ageRating: form.ageRating,
          category: form.category,
          genres: form.genres.split(',').map((tag) => tag.trim()).filter(Boolean),
          priceTier: form.priceTier,
          rightsTier: form.rightsTier,
          teaserSec: form.teaserSec,
          durationSec: form.durationSec,
          tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          highlightSeconds: form.highlightSeconds
            .split(',')
            .map((value) => parseInt(value.trim(), 10))
            .filter((value) => Number.isFinite(value)),
          r2Key,
          posterKey
        })
      });

      const data = await create.json().catch(() => ({}));
      if (!create.ok) {
        throw new Error(data.error || 'Unable to save release');
      }

      window.location.href = '/studio/library';
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} className="form-grid">
      <div className="form-section">
        <div>
          <h3 className="form-section-title">Release details</h3>
          <p className="muted form-section-copy">Enter the details viewers and moderators will see across the catalog, TV page, and review queue.</p>
        </div>
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Movie title</span>
            <input
              className="input"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              required
            />
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
        </div>
        <label className="field">
          <span className="field-label">Synopsis</span>
          <textarea
            className="input"
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            rows={4}
            required
          />
        </label>
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Movie type</span>
            <select className="input" value={form.videoType} onChange={(event) => updateField('videoType', event.target.value)}>
              <option value="FEATURE">Feature film</option>
              <option value="SERIES">Series</option>
              <option value="SHORT">Short film</option>
              <option value="SKIT">Skit</option>
              <option value="DOCUMENTARY">Documentary</option>
              <option value="ADVERT">Advert</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Age rating</span>
            <select className="input" value={form.ageRating} onChange={(event) => updateField('ageRating', event.target.value)}>
              <option value="ALL">All audiences</option>
              <option value="PG13">PG-13</option>
              <option value="PG16">16+</option>
              <option value="PG18">18+</option>
            </select>
          </label>
        </div>
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Genres</span>
            <input
              className="input"
              value={form.genres}
              onChange={(event) => updateField('genres', event.target.value)}
            />
            <span className="field-hint">Separate multiple genres with commas.</span>
          </label>
          <label className="field">
            <span className="field-label">Tags</span>
            <input
              className="input"
              value={form.tags}
              onChange={(event) => updateField('tags', event.target.value)}
            />
            <span className="field-hint">Use short discovery tags like “festival”, “romance”, or “family”.</span>
          </label>
        </div>
      </div>

      <div className="form-section">
        <div>
          <h3 className="form-section-title">Pricing and timing</h3>
          <p className="muted form-section-copy">These settings drive the purchase label, teaser gate, and runtime display everywhere the title appears.</p>
        </div>
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Price tier</span>
            <select className="input" value={form.priceTier} onChange={(event) => updateField('priceTier', event.target.value)}>
              <option value="SNACK">Snack / NGN 100</option>
              <option value="STANDARD">Standard / NGN 200</option>
              <option value="PREMIERE">Premiere / NGN 500</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Rights tier</span>
            <select className="input" value={form.rightsTier} onChange={(event) => updateField('rightsTier', event.target.value)}>
              <option value="SHARED">Shared rights (60/40)</option>
              <option value="EXCLUSIVE">Exclusive (60/40)</option>
            </select>
          </label>
        </div>
        <div className="field-grid field-grid-3">
          <label className="field">
            <span className="field-label">Teaser seconds</span>
            <input
              className="input"
              type="number"
              min={0}
              value={form.teaserSec}
              onChange={(event) => updateField('teaserSec', parseInt(event.target.value || '0', 10))}
            />
          </label>
          <label className="field">
            <span className="field-label">Duration seconds</span>
            <input
              className="input"
              type="number"
              min={0}
              value={form.durationSec}
              onChange={(event) => updateField('durationSec', parseInt(event.target.value || '0', 10))}
            />
          </label>
          <label className="field">
            <span className="field-label">Highlight timestamps</span>
            <input
              className="input"
              value={form.highlightSeconds}
              onChange={(event) => updateField('highlightSeconds', event.target.value)}
            />
            <span className="field-hint">Example: 30, 90, 150</span>
          </label>
        </div>
      </div>

      <div className="form-section">
        <div>
          <h3 className="form-section-title">Artwork and media</h3>
          <p className="muted form-section-copy">Poster artwork is used on the homepage, browse grid, admin review, and TV shelf.</p>
        </div>
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Video file</span>
            <input
              className="input"
              type="file"
              accept="video/*"
              onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Poster image</span>
            <input
              className="input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(event) => setPosterFile(event.target.files?.[0] ?? null)}
            />
            <span className="field-hint">Recommended aspect ratio: 16:9 or wider for the TV shelf.</span>
          </label>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Submitting release...' : 'Submit for approval'}
        </button>
        {message ? <p className="muted form-message">{message}</p> : null}
      </div>
    </form>
  );
}
