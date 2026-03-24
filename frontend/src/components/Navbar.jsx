import Link from 'next/link';

export default function Navbar() {
  return (
    <nav style={{ background: '#1a1a2e', padding: '0.75rem 2rem', display: 'flex', gap: '1.5rem' }}>
      <Link href="/" style={link}>Home</Link>
      <Link href="/pay-fees" style={link}>Pay Fees</Link>
      <Link href="/reports" style={link}>Reports</Link>
    </nav>
  );
}

const link = { color: '#fff', textDecoration: 'none', fontSize: '0.95rem' };
