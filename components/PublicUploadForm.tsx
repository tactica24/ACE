'use client';

import { useState, type FormEvent } from 'react';

type PublicUploadState = {
  title: string;
  description: string;
  category: string;
  ageRating: string;
  creatorName: string;
  creatorEmail: string;
  dropboxUrl: string;
};

const initialState: PublicUploadState = {
  title: '',
  description: '',
  category: 'General',
  ageRating: 'ALL',
  creatorName: '',
  creatorEmail: '',
  dropboxUrl: '',
};

export default function PublicUploadForm() {
  const [form, setForm] = useState<PublicUploadState>(initialState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const updateField = <K extends keyof PublicUploadState>(key: K, value: PublicUploadState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!form.title.trim() || !form.description.trim() || !form.creatorName.trim() || !form.creatorEmail.trim() || !form.dropboxUrl.trim()) {
      setMessage('Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {
      setMessage('Thank you for your submission! We will review your content and contact you soon.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Creator Name *
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.creatorName}
            onChange={(e) => updateField('creatorName', e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email *
          </label>
          <input
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.creatorEmail}
            onChange={(e) => updateField('creatorEmail', e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title *
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.title}
          onChange={(e) => updateField('title', e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description *
        </label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          value={form.description}
          onChange={(e) => updateField('description', e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.category}
            onChange={(e) => updateField('category', e.target.value)}
          >
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Age Rating
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.ageRating}
            onChange={(e) => updateField('ageRating', e.target.value)}
          >
            <option value="ALL">All audiences</option>
            <option value="PG13">PG-13</option>
            <option value="PG16">16+</option>
            <option value="PG18">18+</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dropbox source link *
        </label>
        <input
          type="url"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.dropboxUrl}
          onChange={(e) => updateField('dropboxUrl', e.target.value)}
          required
        />
      </div>

      {message && (
        <div className={`p-4 rounded-md ${message.includes('Thank you') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit for Review'}
      </button>
    </form>
  );
}
