import { useEffect, useMemo, useState } from "react";
import "./App.css";

type Expense = {
  id: number;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes: string;
};

const STORAGE_KEY = "expense-tracker-expenses";
const BUDGET_KEY = "expense-tracker-budget";
const CATEGORY_OPTIONS = [
  "Housing",
  "Food",
  "Gas",
  "Utilities",
  "Health",
  "Shopping",
  "Saving",
  "Kids Fund",
  "Education",
  "Other",
];

const getInitialExpenses = (): Expense[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved) as Expense[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return map[char] ?? char;
  });

const getInitialBudget = (): number => {
  if (typeof window === "undefined") {
    return 62000;
  }

  const saved = window.localStorage.getItem(BUDGET_KEY);
  if (!saved) {
    return 62000;
  }

  const parsed = Number(saved);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 62000;
};

function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    getInitialExpenses(),
  );
  const [budget, setBudget] = useState<number>(() => getInitialBudget());
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    window.localStorage.setItem(BUDGET_KEY, String(budget));
  }, [budget]);

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  );

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyExpenses = useMemo(
    () => expenses.filter((expense) => expense.date.startsWith(currentMonth)),
    [currentMonth, expenses],
  );

  const monthlyTotal = useMemo(
    () => monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [monthlyExpenses],
  );

  const budgetRemaining = budget - monthlyTotal;
  const budgetProgress =
    budget > 0 ? Math.min((monthlyTotal / budget) * 100, 100) : 0;
  const isOverBudget = monthlyTotal > budget;

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesCategory =
        selectedCategory === "All" || expense.category === selectedCategory;
      const matchesSearch = `${expense.title} ${expense.notes}`
        .toLowerCase()
        .includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [expenses, search, selectedCategory]);

  const hasActiveFilter =
    search.trim().length > 0 || selectedCategory !== "All";

  const categorySummary = useMemo(() => {
    return CATEGORY_OPTIONS.map((name) => ({
      name,
      total: expenses
        .filter((expense) => expense.category === name)
        .reduce((sum, expense) => sum + expense.amount, 0),
    }));
  }, [expenses]);

  const resetForm = () => {
    setTitle("");
    setAmount("");
    setCategory(CATEGORY_OPTIONS[0]);
    setDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setEditingId(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanedAmount = Number(amount);

    if (!title.trim() || Number.isNaN(cleanedAmount) || cleanedAmount <= 0) {
      return;
    }

    if (editingId !== null) {
      setExpenses((currentExpenses) =>
        currentExpenses.map((expense) =>
          expense.id === editingId
            ? {
                ...expense,
                title: title.trim(),
                amount: cleanedAmount,
                category,
                date,
                notes: notes.trim(),
              }
            : expense,
        ),
      );

      resetForm();
      return;
    }

    const nextExpense: Expense = {
      id: Date.now(),
      title: title.trim(),
      amount: cleanedAmount,
      category,
      date,
      notes: notes.trim(),
    };

    setExpenses((currentExpenses) => [nextExpense, ...currentExpenses]);
    resetForm();
  };

  const removeExpense = (id: number) => {
    setExpenses((currentExpenses) =>
      currentExpenses.filter((expense) => expense.id !== id),
    );
  };

  const startEditExpense = (expense: Expense) => {
    setEditingId(expense.id);
    setTitle(expense.title);
    setAmount(String(expense.amount));
    setCategory(expense.category);
    setDate(expense.date);
    setNotes(expense.notes);
  };

  const exportToCsv = () => {
    const summaryRows = [
      ["Metric", "Value"],
      ["Total spending", totalExpenses.toFixed(2)],
      ["Entries", String(expenses.length)],
      ["Monthly budget", budget.toFixed(2)],
      ["Remaining", budgetRemaining.toFixed(2)],
      [],
      ["Title", "Amount", "Category", "Date", "Notes"],
    ];

    const rows = [
      ...summaryRows,
      ...filteredExpenses.map((expense) => [
        expense.title,
        expense.amount.toFixed(2),
        expense.category,
        expense.date,
        expense.notes,
      ]),
    ];

    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "")}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "expenses.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const exportToPdf = () => {
    const filteredTotal = filteredExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    const reportRows = filteredExpenses.length
      ? filteredExpenses
          .map(
            (expense) => `
              <tr>
                <td>${escapeHtml(expense.title)}</td>
                <td>${currencyFormatter.format(expense.amount)}</td>
                <td>${escapeHtml(expense.category)}</td>
                <td>${escapeHtml(expense.date)}</td>
                <td>${escapeHtml(expense.notes || "—")}</td>
              </tr>
            `,
          )
          .join("")
      : `<tr><td colspan="5">No expenses to report.</td></tr>`;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Expense Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #111827;
            }
            h1 {
              margin-bottom: 8px;
            }
            .meta {
              color: #6b7280;
              margin-bottom: 18px;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin-bottom: 20px;
            }
            .summary div {
              border: 1px solid #d1d5db;
              border-radius: 10px;
              padding: 12px;
              background: #f9fafb;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 10px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #f3f4f6;
            }
          </style>
        </head>
        <body>
          <h1>Expense Report</h1>
          <div class="meta">Generated on ${new Date().toLocaleDateString("en-PH")}</div>

          <div class="summary">
            <div>
              <strong>Total shown:</strong><br />
              ${currencyFormatter.format(filteredTotal)}
            </div>
            <div>
              <strong>Entries:</strong><br />
              ${filteredExpenses.length}
            </div>
            <div>
              <strong>Budget:</strong><br />
              ${currencyFormatter.format(budget)}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Date</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${reportRows}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Personal finance</p>
          <h1>Expense Tracker</h1>
          <p className="hero-copy">
            Track what you spend, spot patterns, and keep your budget under
            control.
          </p>
        </div>

        <div className="summary-grid">
          <article className="summary-card">
            <span>Total spending</span>
            <strong>{currencyFormatter.format(totalExpenses)}</strong>
          </article>
          <article className="summary-card">
            <span>Entries</span>
            <strong>{expenses.length}</strong>
          </article>
          <article className="summary-card budget-card">
            <span>Monthly budget</span>
            <strong>{currencyFormatter.format(budget)}</strong>
            <div className="budget-progress">
              <div
                className="budget-progress-bar"
                style={{ width: `${budgetProgress}%` }}
              />
            </div>
          </article>
          <article
            className={`summary-card remaining-card ${
              budgetRemaining >= 0 ? "remaining-positive" : "remaining-negative"
            }`}
          >
            <span>Remaining</span>
            <strong>
              {isOverBudget
                ? `${currencyFormatter.format(Math.abs(budgetRemaining))} over budget`
                : `${currencyFormatter.format(budgetRemaining)}`}
            </strong>
          </article>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="forms-stack">
          <form
            className="form-card budget-form"
            onSubmit={(event) => event.preventDefault()}
          >
            <h2>Set monthly budget</h2>
            <label>
              <span>Monthly budget</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={budget}
                onChange={(event) => setBudget(Number(event.target.value) || 0)}
              />
            </label>
          </form>

          <form className="form-card" onSubmit={handleSubmit}>
            <h2>{editingId !== null ? "Edit expense" : "Add expense"}</h2>

            <label>
              <span>Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Groceries"
                required
              />
            </label>

            <label>
              <span>Amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="42.90"
                required
              />
            </label>

            <label>
              <span>Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Date</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>

            <label>
              <span>Notes</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional details"
                rows={4}
              />
            </label>

            <div className="form-actions">
              <button type="submit" className="primary-button">
                {editingId !== null ? "Save changes" : "Save expense"}
              </button>
              {editingId !== null ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <section className="panel-card">
          <div className="panel-header">
            <h2>Expense breakdown</h2>
            <div className="filters">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
              />
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                <option value="All">All categories</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="dashboard-note">
            <strong>{currencyFormatter.format(monthlyTotal)}</strong>
            <span>spent this month</span>
          </div>

          <div className="export-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={exportToCsv}
            >
              Download Excel
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={exportToPdf}
            >
              Download PDF
            </button>
          </div>

          <div className="category-list">
            {categorySummary.map((item) => (
              <button
                key={item.name}
                type="button"
                className={`category-item ${
                  selectedCategory === item.name ? "category-item-active" : ""
                }`}
                onClick={() =>
                  setSelectedCategory((current) =>
                    current === item.name ? "All" : item.name,
                  )
                }
              >
                <span>{item.name}</span>
                <strong>{currencyFormatter.format(item.total)}</strong>
              </button>
            ))}
          </div>

          <div className="expense-list">
            {filteredExpenses.length === 0 ? (
              <p className="empty-state">
                {hasActiveFilter
                  ? "No expenses match your filters yet."
                  : "Please add your expenses"}
              </p>
            ) : (
              filteredExpenses.map((expense) => (
                <article key={expense.id} className="expense-item">
                  <div>
                    <h3>{expense.title}</h3>
                    <p>
                      {expense.category} • {expense.date}
                    </p>
                    {expense.notes ? <small>{expense.notes}</small> : null}
                  </div>
                  <div className="expense-actions">
                    <strong>{currencyFormatter.format(expense.amount)}</strong>
                    <button
                      type="button"
                      onClick={() => startEditExpense(expense)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeExpense(expense.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
