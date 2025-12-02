const STORAGE_KEY = "recov_sales_persons";
const BUSINESS_OWNER_KEY = "recov_business_owner";

export interface SalesPerson {
  name: string;
  email: string;
  phone: string;
}

export interface BusinessOwner {
  name: string;
  email: string;
  phone: string;
}

// No default sales persons - start with empty list
const DEFAULT_SALES_PERSONS: SalesPerson[] = [];

export function getSalesPersons(): SalesPerson[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Handle migration from old string[] format to new SalesPerson[] format
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return DEFAULT_SALES_PERSONS;
        // Check if it's old format (array of strings)
        if (typeof parsed[0] === 'string') {
          // Migrate to new format
          const migrated: SalesPerson[] = parsed.map((name: string) => ({
            name,
            email: '',
            phone: ''
          }));
          saveSalesPersons(migrated);
          return migrated;
        }
        return parsed;
      }
      return DEFAULT_SALES_PERSONS;
    }
    return DEFAULT_SALES_PERSONS;
  } catch (error) {
    console.error("Error reading sales persons from localStorage:", error);
    return DEFAULT_SALES_PERSONS;
  }
}

// Get just names for dropdown compatibility
export function getSalesPersonNames(): string[] {
  return getSalesPersons().map(sp => sp.name);
}

export function saveSalesPersons(salesPersons: SalesPerson[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(salesPersons));
  } catch (error) {
    console.error("Error saving sales persons to localStorage:", error);
  }
}

export function addSalesPerson(person: SalesPerson): boolean {
  const salesPersons = getSalesPersons();
  const trimmedName = person.name.trim();
  
  if (!trimmedName) {
    return false;
  }
  
  if (salesPersons.some(sp => sp.name.toLowerCase() === trimmedName.toLowerCase())) {
    return false;
  }
  
  salesPersons.push({
    name: trimmedName,
    email: person.email.trim(),
    phone: person.phone.trim()
  });
  saveSalesPersons(salesPersons);
  return true;
}

export function updateSalesPerson(oldName: string, updatedPerson: SalesPerson): boolean {
  const salesPersons = getSalesPersons();
  const index = salesPersons.findIndex(sp => sp.name === oldName);
  
  if (index === -1) {
    return false;
  }
  
  salesPersons[index] = {
    name: updatedPerson.name.trim(),
    email: updatedPerson.email.trim(),
    phone: updatedPerson.phone.trim()
  };
  saveSalesPersons(salesPersons);
  return true;
}

export function deleteSalesPerson(name: string): boolean {
  const salesPersons = getSalesPersons();
  const filtered = salesPersons.filter(sp => sp.name !== name);
  
  if (filtered.length === salesPersons.length) {
    return false;
  }
  
  saveSalesPersons(filtered);
  return true;
}

// Business Owner functions
export function getBusinessOwner(): BusinessOwner | null {
  try {
    const stored = localStorage.getItem(BUSINESS_OWNER_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.error("Error reading business owner from localStorage:", error);
    return null;
  }
}

export function saveBusinessOwner(owner: BusinessOwner): void {
  try {
    localStorage.setItem(BUSINESS_OWNER_KEY, JSON.stringify(owner));
  } catch (error) {
    console.error("Error saving business owner to localStorage:", error);
  }
}
