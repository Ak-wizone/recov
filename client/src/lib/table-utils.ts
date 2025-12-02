import { rankItem } from "@tanstack/match-sorter-utils";
import { FilterFn } from "@tanstack/react-table";
import { apiRequest } from "./queryClient";

export const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value);
  addMeta({ itemRank });
  return itemRank.passed;
};

export interface TablePreferences {
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
  pageSize: number;
}

// Local storage key for fallback
export function getStorageKey(tableKey: string): string {
  return `dataTable_${tableKey}`;
}

// Fallback to localStorage
export function saveTablePreferencesLocal(
  tableKey: string,
  preferences: TablePreferences
): void {
  try {
    localStorage.setItem(getStorageKey(tableKey), JSON.stringify(preferences));
  } catch (error) {
    console.error("Failed to save table preferences to localStorage:", error);
  }
}

export function loadTablePreferencesLocal(
  tableKey: string
): TablePreferences | null {
  try {
    const stored = localStorage.getItem(getStorageKey(tableKey));
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Failed to load table preferences from localStorage:", error);
    return null;
  }
}

export function clearTablePreferencesLocal(tableKey: string): void {
  try {
    localStorage.removeItem(getStorageKey(tableKey));
  } catch (error) {
    console.error("Failed to clear table preferences from localStorage:", error);
  }
}

// API-based persistence (primary)
export async function saveTablePreferences(
  tableKey: string,
  preferences: TablePreferences
): Promise<void> {
  try {
    await apiRequest("POST", `/api/table-preferences/${tableKey}`, preferences);
    // Also save to localStorage as backup
    saveTablePreferencesLocal(tableKey, preferences);
  } catch (error) {
    console.error("Failed to save table preferences to API, using localStorage:", error);
    // Fallback to localStorage
    saveTablePreferencesLocal(tableKey, preferences);
  }
}

export async function loadTablePreferences(
  tableKey: string
): Promise<TablePreferences | null> {
  try {
    const response = await apiRequest("GET", `/api/table-preferences/${tableKey}`);
    const data = await response.json();
    
    if (data.exists && data.preferences) {
      // Update localStorage with server data
      saveTablePreferencesLocal(tableKey, data.preferences);
      return data.preferences;
    }
    
    // If not in database, check localStorage
    return loadTablePreferencesLocal(tableKey);
  } catch (error) {
    console.error("Failed to load table preferences from API, using localStorage:", error);
    // Fallback to localStorage
    return loadTablePreferencesLocal(tableKey);
  }
}

export async function clearTablePreferences(tableKey: string): Promise<void> {
  try {
    await apiRequest("DELETE", `/api/table-preferences/${tableKey}`);
    clearTablePreferencesLocal(tableKey);
  } catch (error) {
    console.error("Failed to clear table preferences from API:", error);
    clearTablePreferencesLocal(tableKey);
  }
}
