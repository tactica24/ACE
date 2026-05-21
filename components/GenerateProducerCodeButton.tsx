'use client';

import { useState } from 'react';

export default function GenerateProducerCodeButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/studio/generate-producer-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate producer code');
      }

      setMessage(`Producer code generated: ${data.creatorNumber}`);
      // Refresh the page to show the new producer code
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="btn btn-ghost btn-compact"
        style={{ fontSize: '0.875rem', padding: '6px 12px' }}
      >
        {loading ? 'Generating...' : 'Generate ACE producer code'}
      </button>
      {message && (
        <p className={`field-hint ${message.includes('error') || message.includes('Error') ? 'text-red-600' : 'text-green-600'}`} style={{ marginTop: 4 }}>
          {message}
        </p>
      )}
    </div>
  );
}