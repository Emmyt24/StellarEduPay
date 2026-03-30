import { useState, useEffect } from "react";
import SyncButton from "../components/SyncButton";
import AuditLog from "../components/AuditLog";
import { getSyncStatus, getPaymentSummary } from "../services/api";

function timeAgo(isoString) {
  if (!isoString) return "Never";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
  return new Date(isoString).toLocaleString();
}

export default function Dashboard() {
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [syncMessage, setSyncMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Search & filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchStudents = useCallback((p = page) => {
    setLoading(true);
    setError(null);
    return getStudents(p, PAGE_SIZE)
      .then(({ data }) => {
        setLastSyncAt(data.lastSyncAt);
        setError(null);
      })
      .catch((err) => {
        setError("Failed to load sync status. Please try again.");
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load: sync status + first page of students
  useEffect(() => {
    setSummaryLoading(true);
    getPaymentSummary()
      .then(({ data }) => setSummary(data))
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, []);

  useEffect(() => {
    getPaymentSummary()
      .then(({ data }) => setSummary(data))
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, []);

  // Client-side filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const matchesSearch =
        !q ||
        (s.name || "").toLowerCase().includes(q) ||
        (s.studentId || s.student_id || "").toLowerCase().includes(q);

      const paid = s.hasPaid ?? s.has_paid ?? false;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "paid" && paid) ||
        (statusFilter === "unpaid" && !paid);

      return matchesSearch && matchesStatus;
    });
  }, [students, search, statusFilter]);

  function handleSyncComplete(data) {
    setLastSyncAt(new Date().toISOString());
    setSyncMessage(data?.message || "Sync complete.");
    setTimeout(() => setSyncMessage(null), 3000);
    getPaymentSummary()
      .then(({ data: s }) => setSummary(s))
      .catch(() => {});
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
        setError("Failed to load sync status. Please try again.");
        console.error(err);
      })
      .finally(() => setLoading(false));
  }

  const cards = [
    { label: "Total Students", value: summary?.totalStudents, cls: "" },
    { label: "Paid", value: summary?.paidCount, cls: "paid" },
    { label: "Unpaid", value: summary?.unpaidCount, cls: "unpaid" },
    {
      label: "XLM Collected",
      value: summary
        ? `${summary.totalXlmCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })} XLM`
        : null,
      cls: "xlm",
    },
  ];

  return (
    <>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.75rem; }
        .summary-card { background: #fff; border: 1px solid #e0e0e0; border-radius: 10px; padding: 1rem 1.25rem; }
        .summary-card .label { font-size: 0.78rem; color: #888; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.35rem; }
        .summary-card .value { font-size: 1.6rem; font-weight: 700; color: #1a1a1a; line-height: 1; }
        .summary-card.paid .value { color: #2e7d32; }
        .summary-card.unpaid .value { color: #e65100; }
        .summary-card.xlm .value { color: #1565c0; }
        .summary-skeleton { height: 1.6rem; width: 60%; background: #e0e0e0; border-radius: 4px; animation: pulse 1.5s infinite; }
      `}</style>

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
          }}
        >
          <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
          <SyncButton
            onSyncComplete={handleSyncComplete}
            lastSyncTime={lastSyncAt}
          />
        </div>

        {/* Toast */}
        {syncMessage && (
          <p
            style={{
              color: "#2e7d32",
              background: "#f1f8e9",
              padding: "0.6rem 1rem",
              borderRadius: 6,
              fontSize: "0.9rem",
            }}
            role="status"
          >
            ✓ {syncMessage}
          </p>
        )}

        {/* Sync status */}
        {loading ? (
          <p style={{ fontSize: "0.85rem", color: "#888" }}>
            Loading sync status…
          </p>
        ) : error ? (
          <div
            style={{
              padding: "1rem",
              background: "#ffebee",
              borderRadius: 6,
              border: "1px solid #ef5350",
              marginBottom: "1rem",
            }}
          >
            <p
              style={{ color: "#c62828", margin: "0 0 0.75rem 0" }}
              role="alert"
            >
              {error}
            </p>
            <button
              onClick={handleRetry}
              style={{
                padding: "0.5rem 1rem",
                background: "#ef5350",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <p
            style={{
              fontSize: "0.85rem",
              color: "#888",
              marginBottom: "1.5rem",
            }}
          >
            Last synced: <strong>{timeAgo(lastSyncAt)}</strong>
          </p>
        )}

        {/* Summary cards */}
        <div className="summary-cards" aria-label="Payment summary statistics">
          {cards.map(({ label, value, cls }) => (
            <div key={label} className={`summary-card ${cls}`}>
              <div className="label">{label}</div>
              {summaryLoading || value == null ? (
                <div className="summary-skeleton" aria-hidden="true" />
              ) : (
                <div className="value">{value}</div>
              )}
            </div>
          ))}
        </div>

        {/* Audit Log */}
        <AuditLog limit={10} />
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
