import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import SyncButton from '../components/SyncButton';
import { getSyncStatus, getStudents } from '../services/api';

function timeAgo(isoString) {
  if (!isoString) return 'Never';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  return new Date(isoString).toLocaleString();
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
      <div style={{ flex: 1, height: '1rem', background: '#e0e0e0', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
      <div style={{ width: '100px', height: '1rem', background: '#e0e0e0', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
    </div>
  );
}

export default function Dashboard() {
  const [lastSyncAt, setLastSyncAt]   = useState(null);
  const [syncMessage, setSyncMessage] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  useEffect(() => {
    getSyncStatus()
      .then(({ data }) => {
        setLastSyncAt(data.lastSyncAt);
        setError(null);
      })
      .catch((err) => {
        setError('Failed to load sync status. Please try again.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    getStudents(page, PAGE_SIZE)
      .then(({ data }) => {
        setStudents(data.students);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  function handleSyncComplete(data) {
    setLastSyncAt(new Date().toISOString());
    setSyncMessage(data?.message || 'Sync complete.');
    setTimeout(() => setSyncMessage(null), 3000);
  }

  function handleRetry() {
    setLoading(true);
    setError(null);
    getSyncStatus()
      .then(({ data }) => {
        setLastSyncAt(data.lastSyncAt);
        setError(null);
      })
      .catch((err) => {
        setError('Failed to load sync status. Please try again.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
          <SyncButton onSyncComplete={handleSyncComplete} lastSyncTime={lastSyncAt} />
        </div>

        {syncMessage && (
          <p style={{ color: '#2e7d32', background: '#f1f8e9', padding: '0.6rem 1rem', borderRadius: 6, fontSize: '0.9rem' }}
             role="status">
            ✓ {syncMessage}
          </p>
        )}

        {loading ? (
          <div style={{ marginTop: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.75rem' }}>Loading sync status...</p>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <style>{`
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
              }
            `}</style>
          </div>
        ) : error ? (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#ffebee', borderRadius: 6, border: '1px solid #ef5350' }}>
            <p style={{ color: '#c62828', margin: '0 0 0.75rem 0' }} role="alert">
              {error}
            </p>
            <button
              onClick={handleRetry}
              style={{
                padding: '0.5rem 1rem',
                background: '#ef5350',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', color: '#888' }}>
            Last synced: <strong>{timeAgo(lastSyncAt)}</strong>
          </p>
        )}
      </div>
    </>
  );
}
