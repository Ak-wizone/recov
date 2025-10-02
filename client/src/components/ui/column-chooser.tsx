import { useState, useEffect } from "react";
import { Column } from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

interface ColumnChooserProps<TData> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: Column<TData, unknown>[];
  onApply: (columnVisibility: Record<string, boolean>) => void;
  onReset: () => void;
  defaultColumnVisibility?: Record<string, boolean>;
}

export function ColumnChooser<TData>({
  open,
  onOpenChange,
  columns,
  onApply,
  onReset,
  defaultColumnVisibility = {},
}: ColumnChooserProps<TData>) {
  const [tempVisibility, setTempVisibility] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    if (open) {
      const currentVisibility: Record<string, boolean> = {};
      columns.forEach((column) => {
        if (column.getCanHide()) {
          currentVisibility[column.id] = column.getIsVisible();
        }
      });
      setTempVisibility(currentVisibility);
    }
  }, [open, columns]);

  const visibleColumns = columns.filter(
    (column) => column.getCanHide() && column.columnDef.header
  );

  const allVisible = visibleColumns.every(
    (column) => tempVisibility[column.id] !== false
  );
  const someVisible =
    visibleColumns.some((column) => tempVisibility[column.id] !== false) &&
    !allVisible;

  const handleToggleAll = () => {
    const newVisibility: Record<string, boolean> = {};
    visibleColumns.forEach((column) => {
      newVisibility[column.id] = !allVisible;
    });
    setTempVisibility(newVisibility);
  };

  const handleToggleColumn = (columnId: string) => {
    setTempVisibility((prev) => ({
      ...prev,
      [columnId]: prev[columnId] === false ? true : false,
    }));
  };

  const handleApply = () => {
    onApply(tempVisibility);
    onOpenChange(false);
  };

  const handleReset = () => {
    onReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="dialog-column-chooser">
        <DialogHeader>
          <DialogTitle data-testid="text-column-chooser-title">Column Visibility</DialogTitle>
          <DialogDescription data-testid="text-column-chooser-description">
            Show or hide columns in the table
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="flex items-center space-x-2 pb-4 border-b">
            <Checkbox
              id="select-all"
              checked={allVisible}
              onCheckedChange={handleToggleAll}
              aria-label="Toggle all columns"
              data-testid="checkbox-select-all-columns"
              className={someVisible ? "opacity-50" : ""}
            />
            <Label
              htmlFor="select-all"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {allVisible ? "Deselect All" : "Select All"}
            </Label>
          </div>
          <ScrollArea className="h-[300px] mt-4">
            <div className="space-y-3">
              {visibleColumns.map((column) => {
                const isVisible = tempVisibility[column.id] !== false;
                const columnHeader =
                  typeof column.columnDef.header === "string"
                    ? column.columnDef.header
                    : column.id;

                return (
                  <div
                    key={column.id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`column-${column.id}`}
                      checked={isVisible}
                      onCheckedChange={() => handleToggleColumn(column.id)}
                      aria-label={`Toggle ${columnHeader} column`}
                      data-testid={`checkbox-column-${column.id}`}
                    />
                    <Label
                      htmlFor={`column-${column.id}`}
                      className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {columnHeader}
                    </Label>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            data-testid="button-reset-columns"
          >
            Reset to Default
          </Button>
          <Button onClick={handleApply} data-testid="button-apply-columns">
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
