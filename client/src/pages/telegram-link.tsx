import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { TelegramLinkingCode, TelegramUserMapping } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Bot, Check, Copy, Loader2, Plus, RefreshCw, Trash2, User, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

export default function TelegramLink() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [unlinkUserId, setUnlinkUserId] = useState<string | null>(null);
  const [deleteCodeId, setDeleteCodeId] = useState<string | null>(null);

  // Tenant user check - platform admins cannot access this page
  const isTenantUser = user && user.tenantId;

  // Redirect if platform admin (no tenantId)
  if (!isTenantUser) {
    navigate("/tenant-registrations");
    return null;
  }

  // Fetch linking codes
  const { data: linkingCodes = [], isLoading: isLoadingCodes, refetch: refetchCodes } = useQuery<TelegramLinkingCode[]>({
    queryKey: ["/api/telegram/link-codes"],
  });

  // Fetch linked users
  const { data: linkedUsers = [], isLoading: isLoadingUsers, refetch: refetchUsers } = useQuery<TelegramUserMapping[]>({
    queryKey: ["/api/telegram/linked-users"],
  });

  // Generate new linking code mutation
  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/telegram/generate-link-code", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telegram/link-codes"] });
      toast({
        title: "Code generated",
        description: "Your linking code has been generated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete linking code mutation
  const deleteCodeMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/telegram/link-codes/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telegram/link-codes"] });
      toast({
        title: "Code deleted",
        description: "Linking code has been deleted successfully.",
      });
      setDeleteCodeId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unlink user mutation
  const unlinkMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/telegram/linked-users/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telegram/linked-users"] });
      toast({
        title: "User unlinked",
        description: "Telegram user has been unlinked successfully.",
      });
      setUnlinkUserId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unlink user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCopyCode = (code: string) => {
    // Copy the command format: /link CODE (without LINK- prefix)
    const commandText = `/link ${code.replace('LINK-', '')}`;
    navigator.clipboard.writeText(commandText);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Copied",
      description: "Command copied to clipboard",
    });
  };

  const handleGenerateCode = () => {
    generateCodeMutation.mutate();
  };

  const handleDeleteCode = (id: string) => {
    setDeleteCodeId(id);
  };

  const confirmDeleteCode = () => {
    if (deleteCodeId) {
      deleteCodeMutation.mutate(deleteCodeId);
    }
  };

  const handleUnlink = (id: string) => {
    setUnlinkUserId(id);
  };

  const confirmUnlink = () => {
    if (unlinkUserId) {
      unlinkMutation.mutate(unlinkUserId);
    }
  };

  const isCodeExpired = (expiresAt: Date) => {
    return new Date(expiresAt) < new Date();
  };

  if (isLoadingCodes || isLoadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            Telegram Bot Integration
          </h1>
          <p className="text-muted-foreground mt-2">
            Link your Telegram account to receive business intelligence updates
          </p>
        </div>
      </div>

      <Separator />

      {/* Quick Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to Link Your Telegram Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              1
            </div>
            <p className="text-sm">Generate a linking code below</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              2
            </div>
            <p className="text-sm">Open Telegram and search for the bot (configured by admin)</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              3
            </div>
            <p className="text-sm">Send the command: <code className="bg-muted px-2 py-1 rounded">/link YOUR_CODE</code></p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              4
            </div>
            <p className="text-sm">Once linked, you can send voice messages to query business data</p>
          </div>
        </CardContent>
      </Card>

      {/* Generate Code Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Linking Codes
          </CardTitle>
          <CardDescription>
            Generate a code to link your Telegram account (valid for 24 hours)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button
              onClick={handleGenerateCode}
              disabled={generateCodeMutation.isPending}
              data-testid="button-generate-code"
            >
              {generateCodeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate New Code
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => refetchCodes()}
              data-testid="button-refresh-codes"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {linkingCodes.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkingCodes.map((code) => {
                    const expired = isCodeExpired(code.expiresAt);
                    const used = code.isUsed;
                    const displayCode = `/link ${code.code.replace('LINK-', '')}`;

                    return (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono font-semibold" data-testid={`code-${code.code}`}>
                          <div className="flex items-center gap-2">
                            <span>{displayCode}</span>
                            {!used && !expired && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleCopyCode(code.code)}
                                data-testid={`button-copy-${code.code}`}
                              >
                                {copiedCode === code.code ? (
                                  <Check className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {used ? (
                            <Badge variant="secondary">Used</Badge>
                          ) : expired ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : (
                            <Badge variant="default">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(code.expiresAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDeleteCode(code.id)}
                            data-testid={`button-delete-${code.code}`}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No linking codes generated yet</p>
              <p className="text-sm mt-1">Click "Generate New Code" to create one</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Users Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Linked Telegram Users
          </CardTitle>
          <CardDescription>
            Telegram accounts linked to your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linkedUsers.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Linked</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.telegramFirstName} {user.telegramLastName}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {user.telegramUsername ? `@${user.telegramUsername}` : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(user.linkedAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.lastActivityAt
                          ? formatDistanceToNow(new Date(user.lastActivityAt), { addSuffix: true })
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        {user.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnlink(user.id)}
                          data-testid={`button-unlink-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No Telegram users linked yet</p>
              <p className="text-sm mt-1">Generate a code and link your Telegram account</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Code Confirmation Dialog */}
      <AlertDialog open={!!deleteCodeId} onOpenChange={(open) => !open && setDeleteCodeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Linking Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this linking code? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-code">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCode}
              disabled={deleteCodeMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete-code"
            >
              {deleteCodeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unlink Confirmation Dialog */}
      <AlertDialog open={!!unlinkUserId} onOpenChange={(open) => !open && setUnlinkUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Telegram User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink this Telegram user? They will need to link again to use the bot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-unlink">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnlink}
              disabled={unlinkMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-unlink"
            >
              {unlinkMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Unlinking...
                </>
              ) : (
                "Unlink"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
