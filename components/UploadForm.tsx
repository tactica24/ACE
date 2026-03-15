'use client';

import { useState } from 'react';

export default function UploadForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceTier, setPriceTier] = useState('STANDARD');
  const [rightsTier, setRightsTier] = useState('SHARED');
  const [teaserSec, setTeaserSec] = useState(300);
  const [durationSec, setDurationSec] = useState(1800);
  const [videoType, setVideoType] = useState('FEATURE');
  const [ageRating, setAgeRating] = useState('ALL');
  const [category, setCategory] = useState('General');
  const [genres, setGenres] = useState('');
  const [tags, setTags] = useState('');
  const [highlightSeconds, setHighlightSeconds] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Select a video file.');
      return;
    }
    setLoading(true);
    try {
      const presign = await fetch('/api/studio/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'video/mp4'
        })
      });
      const presignData = await presign.json();
      if (!presign.ok) throw new Error(presignData.error || 'Presign failed');

      await fetch(presignData.url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'video/mp4' },
        body: file
      });

      const create = await fetch('/api/studio/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          videoType,
          ageRating,
          category,
          genres: genres.split(',').map((tag) => tag.trim()).filter(Boolean),
          priceTier,
          rightsTier,
          teaserSec,
          durationSec,
          tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          highlightSeconds: highlightSeconds
            .split(',')
            .map((value) => parseInt(value.trim(), 10))
            .filter((value) => Number.isFinite(value)),
          r2Key: presignData.key
        })
      });
      if (!create.ok) throw new Error('Create failed');
      window.location.href = '/studio/library';
    } catch (err) {
      alert('Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} className="form-grid">
      <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea
        className="input"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
      />
      <div className="grid">
        <label>
          <span className="muted">Price Tier</span>
          <select className="input" value={priceTier} onChange={(e) => setPriceTier(e.target.value)}>
            <option value="SNACK">Snack · NGN 100</option>
            <option value="STANDARD">Standard · NGN 200</option>
            <option value="PREMIERE">Premiere · NGN 500</option>
          </select>
        </label>
        <label>
          <span className="muted">Rights Tier</span>
          <select className="input" value={rightsTier} onChange={(e) => setRightsTier(e.target.value)}>
            <option value="SHARED">Shared Rights (60/40)</option>
            <option value="EXCLUSIVE">Exclusive (60/40)</option>
          </select>
        </label>
      </div>
      <div className="grid">
        <label>
          <span className="muted">Movie Type</span>
          <select className="input" value={videoType} onChange={(e) => setVideoType(e.target.value)}>
            <option value="FEATURE">Feature Film</option>
            <option value="SERIES">Series</option>
            <option value="SHORT">Short Film</option>
            <option value="SKIT">Skit</option>
            <option value="DOCUMENTARY">Documentary</option>
            <option value="ADVERT">Advert</option>
          </select>
        </label>
        <label>
          <span className="muted">Age Rating</span>
          <select className="input" value={ageRating} onChange={(e) => setAgeRating(e.target.value)}>
            <option value="ALL">All</option>
            <option value="PG13">PG-13</option>
            <option value="PG16">16+</option>
            <option value="PG18">18+</option>
          </select>
        </label>
      </div>
      <label>
        <span className="muted">Category</span>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
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
      <input className="input" placeholder="Genres (comma separated)" value={genres} onChange={(e) => setGenres(e.target.value)} />
      <div className="grid">
        <label>
          <span className="muted">Teaser Seconds</span>
          <input className="input" type="number" value={teaserSec} onChange={(e) => setTeaserSec(parseInt(e.target.value || '0', 10))} />
        </label>
        <label>
          <span className="muted">Duration Seconds</span>
          <input className="input" type="number" value={durationSec} onChange={(e) => setDurationSec(parseInt(e.target.value || '0', 10))} />
        </label>
      </div>
      <input className="input" placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
      <input
        className="input"
        placeholder="Highlight seconds (comma separated, e.g. 30, 90, 150)"
        value={highlightSeconds}
        onChange={(e) => setHighlightSeconds(e.target.value)}
      />
      <input className="input" type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? 'Uploading...' : 'Upload & Create'}
      </button>
    </form>
  );
}



