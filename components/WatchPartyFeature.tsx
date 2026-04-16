'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Lock,
  Play,
  Plus,
  Share2,
  Unlock,
  Users,
  X,
} from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  isHost?: boolean;
}

interface WatchParty {
  id: string;
  title: string;
  description: string;
  hostName: string;
  videoTitle: string;
  videoPoster: string;
  startTime: string;
  participants: Participant[];
  maxParticipants: number;
  isPublic: boolean;
  isLive: boolean;
  password?: string;
}

interface NewPartyForm {
  title: string;
  description: string;
  videoId: string;
  maxParticipants: number;
  isPublic: boolean;
  password: string;
}

const defaultFormState: NewPartyForm = {
  title: '',
  description: '',
  videoId: '',
  maxParticipants: 8,
  isPublic: false,
  password: '',
};

const mockMyParties: WatchParty[] = [
  {
    id: 'party_1',
    title: 'Friday Night Movie Marathon',
    description: 'A premium group screening for friends who want synchronized playback and live chat.',
    hostName: 'You',
    videoTitle: 'The Last Guardian',
    videoPoster: '/api/placeholder/movie/poster1',
    startTime: '2026-04-16T20:00:00.000Z',
    participants: [
      { id: 'participant_1', name: 'Alice Johnson' },
      { id: 'participant_2', name: 'David Cole' },
    ],
    maxParticipants: 8,
    isPublic: false,
    isLive: true,
    password: 'secret123',
  },
];

const mockAvailableParties: WatchParty[] = [
  {
    id: 'party_2',
    title: 'Sci-Fi Watch Club',
    description: 'A public room for premiere nights, chat reactions, and shared playback.',
    hostName: 'John Doe',
    videoTitle: 'Digital Dreams',
    videoPoster: '/api/placeholder/movie/poster2',
    startTime: '2026-04-17T21:00:00.000Z',
    participants: [{ id: 'participant_3', name: 'Alice Johnson' }],
    maxParticipants: 10,
    isPublic: true,
    isLive: false,
  },
];

function formatPartyTime(value: string) {
  return new Date(value).toLocaleString();
}

export default function WatchPartyFeature() {
  const [isWatchPartyEnabled, setIsWatchPartyEnabled] = useState(false);
  const [activeParty, setActiveParty] = useState<WatchParty | null>(null);
  const [myParties, setMyParties] = useState<WatchParty[]>([]);
  const [availableParties, setAvailableParties] = useState<WatchParty[]>([]);
  const [showCreateParty, setShowCreateParty] = useState(false);
  const [showJoinParty, setShowJoinParty] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [newPartyData, setNewPartyData] = useState<NewPartyForm>(defaultFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWatchPartyData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 250));
      setMyParties(mockMyParties);
      setAvailableParties(mockAvailableParties);
    } catch (loadError) {
      console.error('Failed to load watch party data:', loadError);
      setError('Failed to load watch party data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isWatchPartyEnabled) {
      return;
    }

    void loadWatchPartyData();
  }, [isWatchPartyEnabled, loadWatchPartyData]);

  const handleCreateParty = async () => {
    if (!newPartyData.title.trim() || !newPartyData.videoId.trim()) {
      setError('Add a party title and a video before creating a room.');
      return;
    }

    const createdParty: WatchParty = {
      id: `party_${Date.now()}`,
      title: newPartyData.title.trim(),
      description: newPartyData.description.trim() || 'Private watch party',
      hostName: 'You',
      videoTitle: newPartyData.videoId.trim(),
      videoPoster: '/api/placeholder/movie/poster',
      startTime: new Date().toISOString(),
      participants: [{ id: 'current_user', name: 'You', isHost: true }],
      maxParticipants: newPartyData.maxParticipants,
      isPublic: newPartyData.isPublic,
      isLive: true,
      password: newPartyData.isPublic ? undefined : newPartyData.password || undefined,
    };

    setMyParties((previous) => [createdParty, ...previous]);
    setActiveParty(createdParty);
    setShowCreateParty(false);
    setNewPartyData(defaultFormState);
  };

  const handleJoinParty = (party: WatchParty) => {
    setActiveParty(party);
    setShowJoinParty(false);
    setJoinCode('');
    setError(null);
  };

  const handleJoinByCode = () => {
    const matchedParty = availableParties.find((party) => party.password === joinCode.trim());

    if (!matchedParty) {
      setError('That party code is invalid.');
      return;
    }

    handleJoinParty(matchedParty);
  };

  const handleCopyInvite = async () => {
    if (!activeParty || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(activeParty.password ?? activeParty.id);
    } catch (copyError) {
      console.error('Failed to copy party code:', copyError);
      setError('Could not copy the invite code.');
    }
  };

  return (
    <div className="watch-party-feature space-y-8">
      <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-white shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Watch Party</p>
            <h2 className="text-3xl font-semibold">Host premium shared viewing sessions.</h2>
            <p className="max-w-2xl text-sm text-slate-300">
              Bring together live playback, private rooms, and audience engagement in one streamlined screening flow.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsWatchPartyEnabled((value) => !value)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                isWatchPartyEnabled
                  ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40'
                  : 'bg-white/10 text-white ring-1 ring-white/10'
              }`}
            >
              {isWatchPartyEnabled ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isWatchPartyEnabled ? 'Enabled' : 'Enable parties'}
            </button>

            <button
              type="button"
              onClick={() => setShowCreateParty(true)}
              disabled={!isWatchPartyEnabled}
              className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Users className="h-4 w-4" />
              Create party
            </button>

            <button
              type="button"
              onClick={() => setShowJoinParty(true)}
              disabled={!isWatchPartyEnabled}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Join party
            </button>
          </div>
        </div>
      </section>

      {!isWatchPartyEnabled ? (
        <section className="rounded-3xl border border-dashed border-white/10 bg-slate-950/40 p-10 text-center text-white">
          <Users className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h3 className="text-2xl font-semibold">Watch parties are currently turned off.</h3>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300">
            Enable the feature to unlock private rooms, public screening sessions, and real-time audience participation.
          </p>
        </section>
      ) : (
        <div className="space-y-8">
          {isLoading ? (
            <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-8 text-sm text-slate-300">
              Loading watch party rooms...
            </div>
          ) : null}

          {activeParty ? (
            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 text-white">
                <div className="relative aspect-video bg-slate-900">
                  <Image
                    src={activeParty.videoPoster}
                    alt={activeParty.videoTitle}
                    fill
                    className="object-cover opacity-80"
                  />
                </div>

                <div className="space-y-4 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-200">
                        <span className="h-2 w-2 rounded-full bg-red-400" />
                        {activeParty.isLive ? 'Live room' : 'Scheduled room'}
                      </div>
                      <h3 className="text-2xl font-semibold">{activeParty.title}</h3>
                      <p className="mt-2 text-sm text-slate-300">{activeParty.description}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveParty(null)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm"
                    >
                      <X className="h-4 w-4" />
                      Leave party
                    </button>
                  </div>

                  <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Host</p>
                      <p className="mt-1 font-medium">{activeParty.hostName}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Now showing</p>
                      <p className="mt-1 font-medium">{activeParty.videoTitle}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Start time</p>
                      <p className="mt-1 font-medium">{formatPartyTime(activeParty.startTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Capacity</p>
                      <p className="mt-1 font-medium">
                        {activeParty.participants.length}/{activeParty.maxParticipants} attendees
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/60 p-6 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Participants</h3>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                    {activeParty.participants.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {activeParty.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">{participant.name}</p>
                        <p className="text-xs text-slate-400">{participant.isHost ? 'Host' : 'Viewer'}</p>
                      </div>
                      {participant.isHost ? <Check className="h-4 w-4 text-amber-300" /> : null}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => void handleCopyInvite()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-3 text-sm font-medium"
                >
                  <Share2 className="h-4 w-4" />
                  Copy invite code
                </button>
              </aside>
            </section>
          ) : null}

          <section className="space-y-6">
            <div className="flex items-center justify-between text-white">
              <div>
                <h3 className="text-2xl font-semibold">My parties</h3>
                <p className="text-sm text-slate-300">Rooms you host or manage.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{myParties.length}</span>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {myParties.map((party) => (
                <article
                  key={party.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 text-white"
                >
                  <div className="relative aspect-video bg-slate-900">
                    <Image src={party.videoPoster} alt={party.videoTitle} fill className="object-cover opacity-80" />
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xl font-semibold">{party.title}</h4>
                        <p className="mt-2 text-sm text-slate-300">{party.description}</p>
                      </div>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                        {party.isLive ? 'Live' : 'Scheduled'}
                      </span>
                    </div>
                    <div className="grid gap-2 text-sm text-slate-300">
                      <p>Host: {party.hostName}</p>
                      <p>Video: {party.videoTitle}</p>
                      <p>Start: {formatPartyTime(party.startTime)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveParty(party)}
                      className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950"
                    >
                      <Play className="h-4 w-4" />
                      Open room
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between text-white">
              <div>
                <h3 className="text-2xl font-semibold">Available parties</h3>
                <p className="text-sm text-slate-300">Join public rooms or private sessions with an invite code.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                {availableParties.length}
              </span>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {availableParties.map((party) => (
                <article
                  key={party.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 text-white"
                >
                  <div className="relative aspect-video bg-slate-900">
                    <Image src={party.videoPoster} alt={party.videoTitle} fill className="object-cover opacity-80" />
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xl font-semibold">{party.title}</h4>
                        <p className="mt-2 text-sm text-slate-300">{party.description}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${
                          party.isPublic
                            ? 'bg-emerald-500/15 text-emerald-200'
                            : 'bg-amber-500/15 text-amber-200'
                        }`}
                      >
                        {party.isPublic ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                        {party.isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                    <div className="grid gap-2 text-sm text-slate-300">
                      <p>Host: {party.hostName}</p>
                      <p>Video: {party.videoTitle}</p>
                      <p>Start: {formatPartyTime(party.startTime)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleJoinParty(party)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium"
                    >
                      <Users className="h-4 w-4" />
                      Join room
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {showCreateParty ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl shadow-black/40">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold">Create watch party</h3>
                <p className="text-sm text-slate-300">Set up a premium group screening in minutes.</p>
              </div>
              <button type="button" onClick={() => setShowCreateParty(false)} className="rounded-full border border-white/10 p-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-slate-300">Party title</span>
                <input
                  type="text"
                  value={newPartyData.title}
                  onChange={(event) => setNewPartyData((value) => ({ ...value, title: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-slate-300">Description</span>
                <textarea
                  rows={3}
                  value={newPartyData.description}
                  onChange={(event) => setNewPartyData((value) => ({ ...value, description: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Video ID or title</span>
                <input
                  type="text"
                  value={newPartyData.videoId}
                  onChange={(event) => setNewPartyData((value) => ({ ...value, videoId: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Max participants</span>
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={newPartyData.maxParticipants}
                  onChange={(event) =>
                    setNewPartyData((value) => ({
                      ...value,
                      maxParticipants: Number.parseInt(event.target.value || '8', 10),
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-slate-300">Privacy</span>
                <select
                  value={newPartyData.isPublic ? 'public' : 'private'}
                  onChange={(event) =>
                    setNewPartyData((value) => ({ ...value, isPublic: event.target.value === 'public' }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </label>

              {!newPartyData.isPublic ? (
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">Invite code</span>
                  <input
                    type="text"
                    value={newPartyData.password}
                    onChange={(event) => setNewPartyData((value) => ({ ...value, password: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
                  />
                </label>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateParty(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreateParty()}
                className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Create party
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showJoinParty ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl shadow-black/40">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold">Join watch party</h3>
                <p className="text-sm text-slate-300">Use an invite code or jump into an available room.</p>
              </div>
              <button type="button" onClick={() => setShowJoinParty(false)} className="rounded-full border border-white/10 p-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Invite code</span>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleJoinByCode();
                    }
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
                />
              </label>

              <div className="space-y-3">
                {availableParties.map((party) => (
                  <button
                    key={party.id}
                    type="button"
                    onClick={() => handleJoinParty(party)}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left"
                  >
                    <div>
                      <p className="font-medium">{party.title}</p>
                      <p className="text-sm text-slate-300">Hosted by {party.hostName}</p>
                    </div>
                    <span className="text-xs text-slate-400">{party.participants.length}/{party.maxParticipants}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowJoinParty(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleJoinByCode}
                className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Join by code
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="inline-flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="rounded-full border border-red-200/20 p-1">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
