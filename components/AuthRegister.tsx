'use client';

import { useState } from 'react';

export default function AuthRegister() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, password })
      });
      if (!res.ok) throw new Error('Register failed');
      window.location.href = '/browse';
    } catch {
      alert('Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="input" placeholder="Phone (e.g. +234...)" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create account'}
      </button>
    </form>
  );
}



