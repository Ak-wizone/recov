const STORAGE_KEY = "recov_sales_persons";

const DEFAULT_SALES_PERSONS = [
  "Manpreet Bedi",
  "Bilal Ahamad",
  "Anjali Dhiman",
  "Princi Soni"
];

export function getSalesPersons(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SALES_PERSONS;
    }
    return DEFAULT_SALES_PERSONS;
  } catch (error) {
    console.error("Error reading sales persons from localStorage:", error);
    return DEFAULT_SALES_PERSONS;
  }
}

export function saveSalesPersons(salesPersons: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(salesPersons));
  } catch (error) {
    console.error("Error saving sales persons to localStorage:", error);
  }
}

export function addSalesPerson(name: string): boolean {
  const salesPersons = getSalesPersons();
  const trimmedName = name.trim();
  
  if (!trimmedName) {
    return false;
  }
  
  if (salesPersons.some(sp => sp.toLowerCase() === trimmedName.toLowerCase())) {
    return false;
  }
  
  salesPersons.push(trimmedName);
  saveSalesPersons(salesPersons);
  return true;
}

export function deleteSalesPerson(name: string): boolean {
  const salesPersons = getSalesPersons();
  const filtered = salesPersons.filter(sp => sp !== name);
  
  if (filtered.length === salesPersons.length) {
    return false;
  }
  
  saveSalesPersons(filtered);
  return true;
}
