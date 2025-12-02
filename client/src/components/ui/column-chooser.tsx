import { useState } from "react";
import { Column } from "@tanstack/react-table";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { Input } from "@/components/ui/input";
import { GripVertical, Search } from "lucide-react";

interface SortableItemProps {
  id: string;
  column: Column<any, unknown>;
  columnHeader: string;
}

function SortableItem({ id, column, columnHeader }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const isVisible = column.getIsVisible();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 ${
        isDragging ? "bg-gray-100 dark:bg-gray-800 shadow-lg" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </button>
      <Checkbox
        id={`column-${column.id}`}
        checked={isVisible}
        onCheckedChange={(checked) => column.toggleVisibility(!!checked)}
        aria-label={`Toggle ${columnHeader} column`}
        data-testid={`checkbox-column-${column.id}`}
      />
      <Label
        htmlFor={`column-${column.id}`}
        className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
      >
        {columnHeader}
      </Label>
    </div>
  );
}

interface ColumnChooserProps<TData> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: Column<TData, unknown>[];
  onReset: () => void;
  onColumnOrderChange?: (newOrder: string[]) => void;
}

export function ColumnChooser<TData>({
  open,
  onOpenChange,
  columns,
  onReset,
  onColumnOrderChange,
}: ColumnChooserProps<TData>) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const visibleColumns = columns.filter(
    (column) => column.getCanHide() && column.columnDef.header
  );

  // Get current column order from table
  const [columnOrder, setColumnOrder] = useState<string[]>(() => 
    visibleColumns.map(col => col.id)
  );

  // Update column order when columns change
  const orderedColumns = [...visibleColumns].sort((a, b) => {
    const aIndex = columnOrder.indexOf(a.id);
    const bIndex = columnOrder.indexOf(b.id);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // Filter by search
  const filteredColumns = orderedColumns.filter((column) => {
    const header = typeof column.columnDef.header === "string" 
      ? column.columnDef.header 
      : column.id;
    return header.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
    setColumnOrder(visibleColumns.map(col => col.id));
    onOpenChange(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columnOrder.indexOf(active.id as string);
      const overIndex = columnOrder.indexOf(over.id as string);
      
      // If items are not in order list yet, find their position
      let activeIdx = oldIndex;
      let overIdx = overIndex;
      
      if (activeIdx === -1) {
        activeIdx = orderedColumns.findIndex(c => c.id === active.id);
      }
      if (overIdx === -1) {
        overIdx = orderedColumns.findIndex(c => c.id === over.id);
      }

      const newOrder = arrayMove(
        columnOrder.length ? columnOrder : orderedColumns.map(c => c.id),
        activeIdx,
        overIdx
      );
      
      setColumnOrder(newOrder);
      
      // Notify parent about order change
      if (onColumnOrderChange) {
        onColumnOrderChange(newOrder);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]" data-testid="dialog-column-chooser">
        <DialogHeader>
          <DialogTitle data-testid="text-column-chooser-title">Column Visibility</DialogTitle>
          <DialogDescription data-testid="text-column-chooser-description">
            Show or hide columns in the table. Drag to reorder.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {/* Search input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search all columns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-columns"
            />
          </div>
          
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
          <ScrollArea className="h-[350px] mt-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredColumns.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {filteredColumns.map((column) => {
                    const columnHeader =
                      typeof column.columnDef.header === "string"
                        ? column.columnDef.header
                        : column.id;

                    return (
                      <SortableItem
                        key={column.id}
                        id={column.id}
                        column={column}
                        columnHeader={columnHeader}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
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
