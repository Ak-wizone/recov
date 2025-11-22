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
  onReset: () => void;
}

export function ColumnChooser<TData>({
  open,
  onOpenChange,
  columns,
  onReset,
}: ColumnChooserProps<TData>) {
  const visibleColumns = columns.filter(
    (column) => column.getCanHide() && column.columnDef.header
  );

  const allVisible = visibleColumns.every((column) => column.getIsVisible());
  const someVisible =
    visibleColumns.some((column) => column.getIsVisible()) && !allVisible;

  const handleToggleAll = () => {
    visibleColumns.forEach((column) => {
      column.toggleVisibility(!allVisible);
    });
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
                const isVisible = column.getIsVisible();
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
                      onCheckedChange={column.getToggleVisibilityHandler()}
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
          <Button onClick={() => onOpenChange(false)} data-testid="button-apply-columns">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
