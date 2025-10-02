import { rankItem } from "@tanstack/match-sorter-utils";
import { FilterFn } from "@tanstack/react-table";

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

export function getStorageKey(tableKey: string): string {
  return `dataTable_${tableKey}`;
}

export function saveTablePreferences(
  tableKey: string,
  preferences: TablePreferences
): void {
  try {
    localStorage.setItem(getStorageKey(tableKey), JSON.stringify(preferences));
  } catch (error) {
    console.error("Failed to save table preferences:", error);
  }
}

export function loadTablePreferences(
  tableKey: string
): TablePreferences | null {
  try {
    const stored = localStorage.getItem(getStorageKey(tableKey));
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Failed to load table preferences:", error);
    return null;
  }
}

export function clearTablePreferences(tableKey: string): void {
  try {
    localStorage.removeItem(getStorageKey(tableKey));
  } catch (error) {
    console.error("Failed to clear table preferences:", error);
  }
}
