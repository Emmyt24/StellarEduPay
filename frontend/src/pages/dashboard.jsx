import { useState, useEffect, useCallback } from 'react';
import SyncButton from '../components/SyncButton';
import { getStudents, getSyncStatus } from '../services/api';

const PAGE_SIZE = 20;

const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx/';

function truncateHash(hash) {
  if (!hash) return '—';
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function timeAgo(isoString) {
  if (!isoString) return 'Never';
  const mins = Math.floor((Date.now() - new Date(isoString)) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(isoString).toLocaleDateString();
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} style={{ padding: '0.75rem 1rem' }}>
          <div style={{ height: '0.85rem', background: '#e0e0e0', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
        </td>
      ))}
    </tr>
  );
}

export default function Dashboard() {
  const [students, setStudents]       = useState([]);
  const [total, setTotal]             = useState(0);
  const [pages, setPages]             = useState(1);
  const [page, setPage]               = useState(1);
  const [lastSyncAt, setLastSyncAt]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [syncMessage, setSyncMessage] = useState(null);

  const fetchStudents = useCallback((p = page) => {
    setLoading(true);
    setError(null);
    return getStudents(p, PAGE_SIZE)
      .then(({ data }) => {
        setStudents(data.students ?? data);
        setTotal(data.total ?? (data.students ?? data).length);
        setPages(data.pages ?? 1);
      })
      .catch(() => setError('Failed to load students. Please try again.'))
      .finally(() => setLoading(false));
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load: sync status + first page of students
  useEffect(() => {
    getSyncStatus()
      .then(({ data }) => setLastSyncAt(data.lastSyncAt))
      .catch(() => {});
    fetchStudents(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when page changes (skip initial mount — handled above)
  useEffect(() => {
    if (page !== 1) fetchStudents(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSyncComplete(data) {
    setLastSyncAt(new Date().toISOString());
    setSyncMessage(data?.message || 'Sync complete.');
    fetchStudents(page);
    setTimeout(() => setSyncMessage(null), 4000);
  }

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        table { border-collapse: collapse; width: 100%; }
        th, td { text-align: left; padding: 0.7rem 1rem; border-bottom: 1px solid #eee; font-size: 0.9rem; }
        th { background: #f5f5f5; font-weight: 600; white-space: nowrap; }
        tr:hover td { background: #fafafa; }
      `}</style>

      <div style={{ maxWidth: 1000, margin: '2rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#888' }}>
              Last synced: <strong>{timeAgo(lastSyncAt)}</strong>
              {total > 0 && <span> · {total} student{total !== 1 ? 's' : ''}</span>}
            </p>
          </div>
          <SyncButton onSyncComplete={handleSyncComplete} lastSyncTime={lastSyncAt} />
        </div>

        {/* Toast */}
        {syncMessage && (
          <p role="status" style={{ color: '#2e7d32', background: '#f1f8e9', padding: '0.6rem 1rem', borderRadius: 6, fontSize: '0.88rem', marginBottom: '1rem' }}>
            ✓ {syncMessage}
          </p>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: '1rem', background: '#ffebee', borderRadius: 6, border: '1px solid #ef5350', marginBottom: '1rem' }}>
            <p role="alert" style={{ color: '#c62828', margin: '0 0 0.6rem' }}>{error}</p>
            <button onClick={() => fetchStudents(page)} style={{ padding: '0.4rem 0.9rem', background: '#ef5350', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.88rem' }}>
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e0e0e0' }}>
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Class</th>
                <th>Fee Amount</th>
                <th>Status</th>
                <th>Last Tx Hash</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                : students.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>
                        No students found.
                      </td>
                    </tr>
                  )
                  : students.map((s) => (
                    <tr key={s.studentId}>
                      <td><code style={{ fontSize: '0.85rem' }}>{s.studentId}</code></td>
                      <td>{s.name}</td>
                      <td>{s.class}</td>
                      <td>{s.feeAmount != null ? `${s.feeAmount} XLM` : '—'}</td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: 12,
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          background: s.feePaid ? '#e8f5e9' : '#fff3e0',
                          color: s.feePaid ? '#2e7d32' : '#e65100',
                        }}>
                          {s.feePaid ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        {s.lastPaymentHash ? (
                          <a
                            href={`${EXPLORER_BASE}${s.lastPaymentHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={s.lastPaymentHash}
                            style={{ color: '#1565c0', fontSize: '0.82rem', fontFamily: 'monospace' }}
                          >
                            {truncateHash(s.lastPaymentHash)}
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.25rem', alignItems: 'center' }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading} style={pageBtnStyle}>
              ← Prev
            </button>
            <span style={{ fontSize: '0.88rem', color: '#555' }}>Page {page} of {pages}</span>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages || loading} style={pageBtnStyle}>
              Next →
            </button>
          </div>
        )}
      </div>
    </>
  );
}

const pageBtnStyle = {
  padding: '0.4rem 0.9rem',
  fontSize: '0.88rem',
  background: '#1a1a2e',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};
