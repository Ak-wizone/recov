import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getModuleVariables, type VariableDefinition, type VariableCategory } from "@/lib/email-variables";

interface VariablePickerProps {
  module: string;
  onInsertVariable: (variable: string) => void;
  className?: string;
}

export function VariablePicker({ module, onInsertVariable, className }: VariablePickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  const categories = getModuleVariables(module);

  const filterVariables = (variables: VariableDefinition[]) => {
    if (!searchTerm) return variables;
    return variables.filter(
      (v) =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.variable.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleDragStart = (e: React.DragEvent, variable: string) => {
    e.dataTransfer.setData("text/plain", variable);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleCopyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVariable(variable);
    setTimeout(() => setCopiedVariable(null), 2000);
  };

  const handleClickInsert = (variable: string) => {
    onInsertVariable(variable);
    handleCopyVariable(variable);
  };

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Email Variables</CardTitle>
        <CardDescription className="text-xs">
          Click to insert or drag & drop into your template
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search variables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-sm"
            data-testid="input-search-variables"
          />
        </div>

        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-4 pr-4">
            {categories.map((category) => {
              const filteredVars = filterVariables(category.variables);
              if (filteredVars.length === 0) return null;

              return (
                <div key={category.category} className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    {category.category}
                  </h4>
                  <div className="space-y-1">
                    {filteredVars.map((variable) => (
                      <TooltipProvider key={variable.variable}>
                        <Tooltip delayDuration={300}>
                          <TooltipTrigger asChild>
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, variable.variable)}
                              onClick={() => handleClickInsert(variable.variable)}
                              className="group flex items-center justify-between gap-2 rounded-md border bg-card p-2 cursor-pointer hover:bg-accent hover:border-primary transition-colors"
                              data-testid={`variable-${variable.variable.replace(/[{}]/g, '')}`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{variable.name}</p>
                                <p className="text-xs text-muted-foreground font-mono truncate">
                                  {variable.variable}
                                </p>
                              </div>
                              <div className="flex-shrink-0">
                                {copiedVariable === variable.variable ? (
                                  <Check className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold text-xs">{variable.name}</p>
                              <p className="text-xs text-muted-foreground">{variable.description}</p>
                              <p className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                Example: {variable.example}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </div>
              );
            })}

            {categories.every((cat) => filterVariables(cat.variables).length === 0) && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No variables found matching "{searchTerm}"
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="pt-3 border-t">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <div className="flex-shrink-0 mt-0.5">
              <Badge variant="outline" className="text-xs px-1 py-0">Tip</Badge>
            </div>
            <p>
              Click any variable to copy it to clipboard, or drag it directly into the Subject or Body fields
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
