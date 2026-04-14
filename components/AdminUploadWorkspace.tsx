'use client';

import { useMemo, useState } from 'react';
import UploadForm from '@/components/UploadForm';

type ProducerOption = {
  id: string;
  email: string;
  displayName: string;
  creatorNumber?: string | null;
  verified?: boolean;
};

type SeriesOption = {
  id: string;
  creatorId: string;
  title: string;
  status: string;
  priceTier: string;
  rightsTier: string;
  category: string;
  ageRating: string;
  originalLanguage: string | null;
  audioLanguages: string[];
  releaseYear: number | null;
  episodeCount: number;
};

export default function AdminUploadWorkspace({
  producers,
  seriesOptions,
  initialProducerId
}: {
  producers: ProducerOption[];
  seriesOptions: SeriesOption[];
  initialProducerId?: string | null;
}) {
  const safeInitialProducerId =
    initialProducerId && producers.some((producer) => producer.id === initialProducerId)
      ? initialProducerId
      : producers[0]?.id ?? '';
  const [selectedProducerId, setSelectedProducerId] = useState(safeInitialProducerId);

  const selectedProducer = useMemo(
    () => producers.find((producer) => producer.id === selectedProducerId) ?? null,
    [producers, selectedProducerId]
  );

  const filteredSeriesOptions = useMemo(
    () => seriesOptions.filter((series) => series.creatorId === selectedProducerId),
    [selectedProducerId, seriesOptions]
  );

  if (!producers.length) {
    return (
      <div className="card">
        <h3>No producer account is ready for admin upload</h3>
        <p className="muted">
          Create or complete a producer account first so uploaded movies can be attached to the correct rights holder and show up properly in reports.
        </p>
        <div className="action-list">
          <a className="btn btn-primary" href="#create-producer">Create approved producer</a>
        </div>
      </div>
    );
  }

  return (
    <div className="stack-list">
      <div className="card">
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Producer account</span>
            <select
              className="input"
              value={selectedProducerId}
              onChange={(event) => setSelectedProducerId(event.target.value)}
            >
              {producers.map((producer) => (
                <option key={producer.id} value={producer.id}>
                  {producer.displayName} | {producer.email}
                </option>
              ))}
            </select>
          </label>
          <div className="detail-card">
            <span className="detail-label">Selected producer</span>
            <strong>{selectedProducer?.displayName ?? 'Not selected'}</strong>
            <span className="muted">
              {selectedProducer?.creatorNumber ?? 'No producer number yet'}
              {selectedProducer?.verified ? ' | verified' : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <UploadForm
          key={selectedProducerId}
          seriesOptions={filteredSeriesOptions.map((series) => ({
            id: series.id,
            title: series.title,
            status: series.status,
            priceTier: series.priceTier,
            rightsTier: series.rightsTier,
            category: series.category,
            ageRating: series.ageRating,
            originalLanguage: series.originalLanguage,
            audioLanguages: series.audioLanguages,
            releaseYear: series.releaseYear,
            episodeCount: series.episodeCount
          }))}
          extraPayload={{ targetCreatorUserId: selectedProducerId }}
          successRedirectPath={`/admin/users/${selectedProducerId}`}
          contractRedirectBasePath={null}
        />
      </div>
    </div>
  );
}
