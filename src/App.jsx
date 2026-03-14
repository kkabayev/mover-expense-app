import { useEffect, useMemo, useState } from "react";

const mileageRate = 0.67;

const emptyEntry = {
  date: "",
  startOdometer: "",
  endOdometer: "",
  businessMiles: "",
  purpose: "",
  parkingTolls: "",
  otherExpenses: "",
  notes: "",
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function toNumber(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

export default function App() {
  const [activeTab, setActiveTab] = useState("daily");
  const [entry, setEntry] = useState(emptyEntry);

  const [dailyLogs, setDailyLogs] = useState(() => {
    const saved = localStorage.getItem("dailyLogs");
    return saved ? JSON.parse(saved) : [];
  });

  const [phoneRows, setPhoneRows] = useState(() => {
    const saved = localStorage.getItem("phoneRows");
    return saved
      ? JSON.parse(saved)
      : months.map((month) => ({
          month,
          totalBill: "",
          workPercent: "",
          deductibleAmount: "",
          notes: "",
        }));
  });

  useEffect(() => {
    localStorage.setItem("dailyLogs", JSON.stringify(dailyLogs));
  }, [dailyLogs]);

  useEffect(() => {
    localStorage.setItem("phoneRows", JSON.stringify(phoneRows));
  }, [phoneRows]);

  const calculatedMiles = useMemo(() => {
    const start = toNumber(entry.startOdometer);
    const end = toNumber(entry.endOdometer);

    if (end > start && start > 0) {
      return (end - start).toFixed(1);
    }

    return entry.businessMiles;
  }, [entry.startOdometer, entry.endOdometer, entry.businessMiles]);

  const summary = useMemo(() => {
    const totalMiles = dailyLogs.reduce(
      (sum, row) => sum + toNumber(row.businessMiles),
      0
    );
    const mileageDeduction = totalMiles * mileageRate;
    const totalParking = dailyLogs.reduce(
      (sum, row) => sum + toNumber(row.parkingTolls),
      0
    );
    const totalOtherExpenses = dailyLogs.reduce(
      (sum, row) => sum + toNumber(row.otherExpenses),
      0
    );
    const phoneDeduction = phoneRows.reduce(
      (sum, row) => sum + toNumber(row.deductibleAmount),
      0
    );

    return {
      totalMiles,
      mileageDeduction,
      totalParking,
      totalOtherExpenses,
      phoneDeduction,
      grandTotal:
        mileageDeduction +
        totalParking +
        totalOtherExpenses +
        phoneDeduction,
    };
  }, [dailyLogs, phoneRows]);

  function handleEntryChange(field, value) {
    setEntry((prev) => ({ ...prev, [field]: value }));
  }

  async function saveEntry() {
    const miles = toNumber(calculatedMiles);

    if (!entry.date || !entry.purpose || miles <= 0) {
      alert("Please enter at least a date, business purpose, and miles.");
      return;
    }

    const newEntry = {
      id: Date.now(),
      ...entry,
      businessMiles: String(miles),
    };

    setDailyLogs((prev) => [newEntry, ...prev]);
    setEntry(emptyEntry);

    try {
      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbx7su4IhemLrNdIZ72EUUeG0Q0rjsUWAu5YKKPQIQzzUFEOu6lDEiKCcwzdlaNplj4l/exec",
        {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify(newEntry),
        }
      );

      const text = await response.text();
      alert("Google Sheet response: " + text);
    } catch (error) {
      alert("Google Sheet send failed");
      console.error(error);
    }
  }

  function deleteEntry(id) {
    if (!window.confirm("Delete this entry?")) {
      return;
    }

    setDailyLogs((prev) => prev.filter((row) => row.id !== id));
  }

  function updatePhoneRow(index, field, value) {
    setPhoneRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: value };

      const totalBill = toNumber(
        field === "totalBill" ? value : row.totalBill
      );
      const workPercent = toNumber(
        field === "workPercent" ? value : row.workPercent
      );

      row.deductibleAmount =
        totalBill > 0 && workPercent > 0
          ? ((totalBill * workPercent) / 100).toFixed(2)
          : "";

      updated[index] = row;
      return updated;
    });
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>1099 Mover Expense Tracker</h1>
        <p style={styles.subtitle}>
          Track daily mileage, work expenses, and monthly phone deductions.
        </p>

        <div style={styles.summaryGrid}>
          <div style={styles.card}>
            <h3>Total Business Miles</h3>
            <p style={styles.bigNumber}>{summary.totalMiles.toFixed(1)}</p>
          </div>
          <div style={styles.card}>
            <h3>Mileage Deduction</h3>
            <p style={styles.bigNumber}>
              {formatMoney(summary.mileageDeduction)}
            </p>
            <small>Rate: {formatMoney(mileageRate)} per mile</small>
          </div>
          <div style={styles.card}>
            <h3>Phone Deduction</h3>
            <p style={styles.bigNumber}>
              {formatMoney(summary.phoneDeduction)}
            </p>
          </div>
          <div style={styles.card}>
            <h3>Total Tracked Deduction</h3>
            <p style={styles.bigNumber}>{formatMoney(summary.grandTotal)}</p>
          </div>
        </div>

        <div style={styles.tabBar}>
          <button
            style={activeTab === "daily" ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab("daily")}
          >
            Daily Log
          </button>
          <button
            style={activeTab === "phone" ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab("phone")}
          >
            Phone Tracking
          </button>
          <button
            style={activeTab === "summary" ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab("summary")}
          >
            Summary
          </button>
        </div>

        {activeTab === "daily" && (
          <div style={styles.section}>
            <div style={styles.card}>
              <h2>Add Daily Entry</h2>

              <div style={styles.formGrid}>
                <div>
                  <label>Date</label>
                  <input
                    type="date"
                    value={entry.date}
                    onChange={(e) => handleEntryChange("date", e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label>Starting Odometer</label>
                  <input
                    type="number"
                    value={entry.startOdometer}
                    onChange={(e) =>
                      handleEntryChange("startOdometer", e.target.value)
                    }
                    style={styles.input}
                  />
                </div>

                <div>
                  <label>Ending Odometer</label>
                  <input
                    type="number"
                    value={entry.endOdometer}
                    onChange={(e) =>
                      handleEntryChange("endOdometer", e.target.value)
                    }
                    style={styles.input}
                  />
                </div>

                <div>
                  <label>Business Miles</label>
                  <input
                    type="number"
                    value={calculatedMiles}
                    onChange={(e) =>
                      handleEntryChange("businessMiles", e.target.value)
                    }
                    style={styles.input}
                  />
                </div>

                <div>
                  <label>Parking / Tolls</label>
                  <input
                    type="number"
                    value={entry.parkingTolls}
                    onChange={(e) =>
                      handleEntryChange("parkingTolls", e.target.value)
                    }
                    style={styles.input}
                  />
                </div>

                <div>
                  <label>Other Work Expenses</label>
                  <input
                    type="number"
                    value={entry.otherExpenses}
                    onChange={(e) =>
                      handleEntryChange("otherExpenses", e.target.value)
                    }
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <label>Job Location / Business Purpose</label>
                <input
                  type="text"
                  value={entry.purpose}
                  onChange={(e) => handleEntryChange("purpose", e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={{ marginTop: "12px" }}>
                <label>Notes</label>
                <input
                  type="text"
                  value={entry.notes}
                  onChange={(e) => handleEntryChange("notes", e.target.value)}
                  style={styles.input}
                />
              </div>

              <button style={styles.primaryButton} onClick={saveEntry}>
                Save Entry
              </button>
            </div>

            <div style={styles.card}>
              <h2>Saved Entries</h2>

              {dailyLogs.length === 0 ? (
                <p>No entries yet.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Purpose</th>
                        <th style={styles.th}>Miles</th>
                        <th style={styles.th}>Parking/Tolls</th>
                        <th style={styles.th}>Other</th>
                        <th style={styles.th}>Notes</th>
                        <th style={styles.th}>Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyLogs.map((row) => (
                        <tr key={row.id}>
                          <td style={styles.td}>{row.date}</td>
                          <td style={styles.td}>{row.purpose}</td>
                          <td style={styles.td}>{row.businessMiles}</td>
                          <td style={styles.td}>
                            {formatMoney(toNumber(row.parkingTolls))}
                          </td>
                          <td style={styles.td}>
                            {formatMoney(toNumber(row.otherExpenses))}
                          </td>
                          <td style={styles.td}>{row.notes}</td>
                          <td style={styles.td}>
                            <button
                              style={styles.deleteButton}
                              onClick={() => deleteEntry(row.id)}
                            >
                              X
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "phone" && (
          <div style={styles.card}>
            <h2>Monthly Cell Phone Tracking</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Month</th>
                    <th style={styles.th}>Total Bill</th>
                    <th style={styles.th}>Work Use %</th>
                    <th style={styles.th}>Deductible Amount</th>
                    <th style={styles.th}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {phoneRows.map((row, index) => (
                    <tr key={row.month}>
                      <td style={styles.td}>{row.month}</td>
                      <td style={styles.td}>
                        <input
                          type="number"
                          value={row.totalBill}
                          onChange={(e) =>
                            updatePhoneRow(index, "totalBill", e.target.value)
                          }
                          style={styles.input}
                        />
                      </td>
                      <td style={styles.td}>
                        <input
                          type="number"
                          value={row.workPercent}
                          onChange={(e) =>
                            updatePhoneRow(index, "workPercent", e.target.value)
                          }
                          style={styles.input}
                        />
                      </td>
                      <td style={styles.td}>
                        {formatMoney(toNumber(row.deductibleAmount))}
                      </td>
                      <td style={styles.td}>
                        <input
                          type="text"
                          value={row.notes}
                          onChange={(e) =>
                            updatePhoneRow(index, "notes", e.target.value)
                          }
                          style={styles.input}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "summary" && (
          <div style={styles.card}>
            <h2>Year Summary</h2>
            <div style={styles.summaryList}>
              <div style={styles.summaryRow}>
                <span>Total business miles</span>
                <strong>{summary.totalMiles.toFixed(1)}</strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Mileage deduction</span>
                <strong>{formatMoney(summary.mileageDeduction)}</strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Parking and tolls</span>
                <strong>{formatMoney(summary.totalParking)}</strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Other work expenses</span>
                <strong>{formatMoney(summary.totalOtherExpenses)}</strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Phone deduction</span>
                <strong>{formatMoney(summary.phoneDeduction)}</strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Total tracked deduction</span>
                <strong>{formatMoney(summary.grandTotal)}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f4f6f8",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
  },
  title: {
    marginBottom: "8px",
  },
  subtitle: {
    color: "#555",
    marginBottom: "20px",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    marginBottom: "20px",
  },
  bigNumber: {
    fontSize: "28px",
    fontWeight: "bold",
    margin: "10px 0",
  },
  tabBar: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  tab: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    backgroundColor: "#fff",
    cursor: "pointer",
  },
  activeTab: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "1px solid #1d4ed8",
    backgroundColor: "#1d4ed8",
    color: "#fff",
    cursor: "pointer",
  },
  section: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "20px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginTop: "6px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    boxSizing: "border-box",
  },
  primaryButton: {
    marginTop: "16px",
    padding: "12px 18px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#16a34a",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
  },
  deleteButton: {
    padding: "6px 10px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#dc2626",
    color: "#fff",
    cursor: "pointer",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "10px",
  },
  th: {
    textAlign: "left",
    borderBottom: "1px solid #ddd",
    padding: "10px",
    backgroundColor: "#f8fafc",
  },
  td: {
    borderBottom: "1px solid #eee",
    padding: "10px",
    verticalAlign: "top",
  },
  summaryList: {
    display: "grid",
    gap: "12px",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid #eee",
    paddingBottom: "8px",
  },
};