'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Moon, Reply, Send, Smile, Sparkles, Sun, X } from '@/components/LiveIcons';
import { LIVE_CHAT_AVATARS, LIVE_CHAT_EMOJIS } from '@/lib/live-matches';

type ChatProfile = { handle: string; avatarEmoji: string };
type ReplyTarget = { id: string; content: string; author: ChatProfile | null };
type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  author: ChatProfile | null;
  replyTo: ReplyTarget | null;
  reactions: { emoji: string; count: number; reacted: boolean }[];
};

export default function LiveMatchChat({ matchId, loginPath, isSignedIn, initialProfile, enabled }: { matchId: string; loginPath: string; isSignedIn: boolean; initialProfile: ChatProfile | null; enabled: boolean }) {
  const [profile, setProfile] = useState(initialProfile);
  const [handle, setHandle] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('⚽');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState('');
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async () => {
    const response = await fetch(`/api/live-matches/${matchId}/chat`, { cache: 'no-store' });
    if (response.ok) {
      const payload = await response.json();
      setMessages(payload.messages ?? []);
    }
  }, [matchId]);

  useEffect(() => {
    void loadMessages();
    const timer = window.setInterval(() => void loadMessages(), 4000);
    return () => window.clearInterval(timer);
  }, [loadMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('ace-live-chat-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('ace-live-chat-theme', next);
      return next;
    });
  }

  function startReply(message: ChatMessage) {
    setReplyTarget({ id: message.id, content: message.content, author: message.author });
    setShowEmojis(false);
  }

  function addEmoji(emoji: string) {
    setContent((value) => `${value}${emoji}`);
  }

  async function createProfile(event: FormEvent) {
    event.preventDefault();
    setError('');
    const response = await fetch('/api/live-chat/profile', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ handle, avatarEmoji }) });
    const payload = await response.json();
    if (!response.ok) return setError(payload.error ?? 'Could not create chat identity.');
    setProfile(payload.profile);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!content.trim() || sending) return;
    setSending(true);
    setError('');
    const response = await fetch(`/api/live-matches/${matchId}/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content, parentId: replyTarget?.id }) });
    const payload = await response.json();
    if (!response.ok) setError(payload.error ?? 'Message not sent.');
    else {
      setContent('');
      setReplyTarget(null);
      setShowEmojis(false);
      await loadMessages();
    }
    setSending(false);
  }

  async function react(messageId: string, emoji: string) {
    if (!isSignedIn || !profile) return;
    setError('');
    const response = await fetch(`/api/live-matches/${matchId}/reactions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messageId, emoji }) });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? 'Reaction not saved.');
      return;
    }
    await loadMessages();
  }

  return <aside className="live-chat-panel" data-theme={theme}>
    <div className="live-chat-header">
      <div><span className="live-chat-online" /><div><strong>Match conversation</strong><span>{messages.length} recent messages</span></div></div>
      <button className="live-chat-theme-toggle" type="button" onClick={toggleTheme} aria-label={`Use ${theme === 'dark' ? 'light' : 'dark'} chat theme`} title={`Use ${theme === 'dark' ? 'light' : 'dark'} theme`}>
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </div>
    <div className="live-chat-feed" ref={scrollRef} aria-live="polite">
      {messages.length ? messages.map((message) => <article className="live-chat-message" key={message.id}>
        <span className="live-chat-avatar">{message.author?.avatarEmoji ?? '⚽'}</span>
        <div className="live-chat-message-body">
          <div className="live-chat-meta"><strong>@{message.author?.handle ?? 'fan'}</strong><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>
          {message.replyTo ? <div className="live-chat-reply-quote"><Reply size={13} /><span><strong>@{message.replyTo.author?.handle ?? 'fan'}</strong>{message.replyTo.content}</span></div> : null}
          <p>{message.content}</p>
          <div className="live-message-actions">
            <div className="live-message-reactions">{message.reactions.map((reaction) => <button className={reaction.reacted ? 'active' : ''} aria-pressed={reaction.reacted} aria-label={`${reaction.emoji} reaction, ${reaction.count}`} key={reaction.emoji} type="button" onClick={() => void react(message.id, reaction.emoji)}>{reaction.emoji} {reaction.count}</button>)}</div>
            {isSignedIn && profile && enabled ? <div className="live-message-tools"><button type="button" onClick={() => startReply(message)} aria-label={`Reply to @${message.author?.handle ?? 'fan'}`} title="Reply"><Reply size={14} /></button>{LIVE_CHAT_EMOJIS.slice(0, 3).map((emoji) => <button type="button" aria-label={`React with ${emoji}`} key={emoji} onClick={() => void react(message.id, emoji)}>{emoji}</button>)}</div> : null}
          </div>
        </div>
      </article>) : <div className="live-chat-empty"><MessageCircle size={32} /><strong>Kick off the conversation</strong><span>Share predictions, celebrate goals, keep it friendly.</span></div>}
    </div>

    {!enabled ? <div className="live-chat-locked">Chat has been closed for this match.</div> : !isSignedIn ? <div className="live-chat-signin"><Sparkles size={20} /><div><strong>Join the match room</strong><p>Sign in to chat and react. Your real name stays private.</p></div><Link className="btn btn-primary btn-compact" href={`/auth/login?next=${encodeURIComponent(loginPath)}`}>Sign in</Link></div> : !profile ? <form className="live-chat-identity" onSubmit={createProfile}><div><strong>Create your match-day identity</strong><p>This chat name is separate from your ACE account name.</p></div><label className="field"><span>Chat name</span><input value={handle} onChange={(event) => setHandle(event.target.value)} maxLength={20} placeholder="GoalHunter9" required /></label><div className="live-avatar-picker" aria-label="Choose an avatar">{LIVE_CHAT_AVATARS.map((emoji) => <button type="button" aria-label={`Use ${emoji} avatar`} aria-pressed={avatarEmoji === emoji} className={avatarEmoji === emoji ? 'active' : ''} key={emoji} onClick={() => setAvatarEmoji(emoji)}>{emoji}</button>)}</div>{error ? <p className="form-message error">{error}</p> : null}<button className="btn btn-primary">Enter conversation</button></form> : <div className="live-chat-composer-wrap">
      {replyTarget ? <div className="live-chat-replying"><Reply size={15} /><div><span>Replying to @{replyTarget.author?.handle ?? 'fan'}</span><p>{replyTarget.content}</p></div><button type="button" onClick={() => setReplyTarget(null)} aria-label="Cancel reply"><X size={16} /></button></div> : null}
      <form className="live-chat-composer" onSubmit={sendMessage}><button className="live-emoji-trigger" type="button" aria-label="Choose an emoji" aria-expanded={showEmojis} onClick={() => setShowEmojis((value) => !value)}><Smile size={19} /></button><input value={content} onChange={(event) => setContent(event.target.value)} maxLength={280} placeholder={replyTarget ? `Reply as @${profile.handle}` : `Message as @${profile.handle}`} /><span className="live-chat-character-count">{content.length}/280</span><button type="submit" disabled={sending || !content.trim()} aria-label="Send message"><Send size={18} /></button></form>
      {showEmojis ? <div className="live-composer-emojis" aria-label="Emoji picker">{LIVE_CHAT_EMOJIS.map((emoji) => <button type="button" aria-label={`Add ${emoji}`} key={emoji} onClick={() => addEmoji(emoji)}>{emoji}</button>)}</div> : null}
      {error ? <p className="form-message error">{error}</p> : null}
    </div>}
  </aside>;
}
