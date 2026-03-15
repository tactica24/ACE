'use client';

import { useState } from 'react';

export default function AuthLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) throw new Error('Login failed');
      window.location.href = '/browse';
    } catch {
      alert('Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}



