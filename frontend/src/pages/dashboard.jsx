import { useState } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import SyncButton from '../components/SyncButton';

export default function Dashboard() {
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncMessage, setSyncMessage]   = useState(null);

  function handleSyncComplete(data) {
    const now = new Date().toISOString();
    setLastSyncTime(now);
    setSyncMessage(data?.message || 'Sync complete.');
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard | StellarEduPay</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
          <SyncButton onSyncComplete={handleSyncComplete} lastSyncTime={lastSyncTime} />
        </div>

        {syncMessage && (
          <p style={{ color: '#2e7d32', background: '#f1f8e9', padding: '0.6rem 1rem', borderRadius: 6, fontSize: '0.9rem' }}
             role="status">
            ✓ {syncMessage}
          </p>
        )}

        {lastSyncTime && (
          <p style={{ fontSize: '0.85rem', color: '#888' }}>
            Last synced: {new Date(lastSyncTime).toLocaleString()}
          </p>
        )}
      </div>
    </>
  );
}
