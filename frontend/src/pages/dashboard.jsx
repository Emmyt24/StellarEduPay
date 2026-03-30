import { useState, useEffect, useCallback, useMemo } from "react";
import SyncButton from "../components/SyncButton";
import { getSyncStatus, getPaymentSummary, getStudents, registerStudent } from "../services/api";

const PAGE_SIZE = 10;

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

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    studentId: "",
    name: "",
    class: "",
    feeAmount: "",
  });
  const [formError, setFormError] = useState(null);

  // Search & filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
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
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSummary = useCallback(() => {
    setSummaryLoading(true);
    return getPaymentSummary()
      .then(({ data }) => setSummary(data))
      .catch(() => { })
      .finally(() => setSummaryLoading(false));
  }, []);

  useEffect(() => {
    setSummaryLoading(true);
    getPaymentSummary()
      .then(({ data }) => setSummary(data))
      .catch(() => { })
      .finally(() => setSummaryLoading(false));
  }, []);

  function handleSyncComplete(data) {
    setLastSyncAt(new Date().toISOString());
    setSyncMessage(data?.message || "Sync complete.");
    setTimeout(() => setSyncMessage(null), 3000);
    fetchSummary();
    fetchStudents(1);
  }

  const cards = [
    { label: "Total Students", value: summary?.totalStudents || summary?.total, cls: "" },
    { label: "Full Paid", value: summary?.paidCount || summary?.counts?.paid, cls: "paid" },
    { label: "Pending/Partial", value: (summary?.unpaidCount || 0) + (summary?.counts?.partial || 0), cls: "unpaid" },
    {
      label: "XLM Collected",
      value: summary
        ? `${(summary.totalXlmCollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })} XLM`
        : null,
      subValue: fiatConversion?.usd ? `~$${fiatConversion.usd.toLocaleString()} USD` : null,
      cls: "xlm",
    },
  ];

  // Build category cards from summary data
  const categoryCards = summary?.categoryBreakdown
    ? summary.categoryBreakdown.map(cat => ({
      label: cat.category,
      value: `${cat.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })} XLM`,
      count: cat.paymentCount,
      cls: "category",
    }))
    : [];

  return (
    <>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.75rem; }
        .summary-card { background: #fff; border: 1px solid #e0e0e0; border-radius: 10px; padding: 1rem 1.25rem; }
        .summary-card .label { font-size: 0.78rem; color: #888; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.35rem; }
        .summary-card .value { font-size: 1.6rem; font-weight: 700; color: #1a1a1a; line-height: 1; }
        .summary-card .sub-value { font-size: 0.9rem; font-weight: 400; color: #2e7d32; margin-top: 0.25rem; }
        .summary-card.paid .value { color: #2e7d32; }
        .summary-card.unpaid .value { color: #e65100; }
        .summary-card.xlm .value { color: #1565c0; }
        .summary-card.category .value { color: #6a1b9a; }
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
          <SyncButton onSyncComplete={handleSyncComplete} lastSyncTime={lastSyncAt} />
        </div>

        {/* Sync status alert */}
        {syncMessage && (
          <div style={{ background: "#ecfdf5", border: "1px solid #10b98122", padding: "0.75rem 1.25rem", borderRadius: 8, color: "#065f46", marginBottom: "1.5rem", fontSize: "0.95rem", fontWeight: 500 }}>
            ✓ {syncMessage}
          </div>
        )}

        {/* Sync status */}
        {loading ? (
          <p style={{ fontSize: "0.85rem", color: "#888" }}>Loading sync status…</p>
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
            <p style={{ color: "#c62828", margin: "0 0 0.75rem 0" }} role="alert">
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
        )}

        {/* Sync Status Info */}
        {!loading && (
          <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.5rem" }}>
            Last data refresh: <strong>{timeAgo(lastSyncAt)}</strong>
          </p>
        )}

        {/* Summary cards */}
        <div className="summary-cards" aria-label="Payment summary statistics">
          {cards.map(({ label, value, subValue, cls }) => (
            <div key={label} className={`summary-card ${cls}`}>
              <div className="label">{label}</div>
              {summaryLoading || value == null ? (
                <div className="summary-skeleton" />
              ) : (
                <>
                  <div className="value">{value}</div>
                  {subValue && <div className="sub-value">{subValue}</div>}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Filters and Search */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
          <input 
            placeholder="Search students..."
            className="form-control"
            style={{ maxWidth: "340px" }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select 
            className="form-control" 
            style={{ maxWidth: "180px" }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>

        {/* Student Table */}
        {studentsLoading ? (
          <p>Loading students...</p>
        ) : (
          <>
            <table className="student-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Total Fee</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.studentId}>
                    <td>{s.studentId}</td>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td>{s.class}</td>
                    <td>{s.feeAmount} XLM</td>
                    <td>
                      <span className={`badge ${s.status?.toLowerCase() || 'unpaid'}`}>
                        {s.status || 'Unpaid'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                      No students found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {pages > 1 && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                <button 
                  disabled={page === 1} 
                  onClick={() => setPage(page - 1)}
                  style={{ ...pageBtnStyle, opacity: page === 1 ? 0.5 : 1 }}
                >
                  Prev
                </button>
                <div style={{ display: "flex", alignItems: "center", padding: "0 1rem", fontSize: "0.9rem" }}>
                  Page {page} of {pages}
                </div>
                <button 
                  disabled={page === pages} 
                  onClick={() => setPage(page + 1)}
                  style={{ ...pageBtnStyle, opacity: page === pages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
