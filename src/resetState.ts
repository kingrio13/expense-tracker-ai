export type Expense = {
  id: number;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes: string;
};

export const DEFAULT_BUDGET = 62000;

export const CATEGORY_OPTIONS = [
  "Tithing",
  "Housing",
  "Food",
  "Gas",
  "Utilities",
  "Health",
  "Shopping",
  "Saving",
  "Car",
  "Education",
  "Grooming",
  "Allowance",
  "Credit",
  "Trip",
  "Flexible Fund",
  "Other",
];

export const createResetState = () => ({
  expenses: [] as Expense[],
  budget: DEFAULT_BUDGET,
  title: "",
  amount: "",
  category: CATEGORY_OPTIONS[0],
  date: new Date().toISOString().slice(0, 10),
  notes: "",
  search: "",
  selectedCategory: "All" as string,
  editingId: null as number | null,
});
