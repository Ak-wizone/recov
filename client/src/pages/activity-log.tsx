import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Mail, MessageSquare, Users, Calendar, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

export default function ActivityLog() {
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["/api/activity-logs"],
  });

  const filteredActivities = activities
    .filter((a: any) => filterType === "all" || a.interactionType === filterType)
    .filter((a: any) => 
      searchTerm === "" || 
      a.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const getTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      call: Phone,
      email: Mail,
      whatsapp: MessageSquare,
      meeting: Users,
      other: Calendar,
    };
    const Icon = icons[type] || Calendar;
    return <Icon className="h-4 w-4" />;
  };

  const getOutcomeBadge = (outcome: string) => {
    const config: Record<string, { variant: any; icon: any }> = {
      answered: { variant: "default", icon: CheckCircle2 },
      payment_promised: { variant: "default", icon: CheckCircle2 },
      partial_payment: { variant: "secondary", icon: CheckCircle2 },
      not_answered: { variant: "outline", icon: XCircle },
      busy: { variant: "outline", icon: Clock },
      switched_off: { variant: "outline", icon: AlertCircle },
      dispute: { variant: "destructive", icon: AlertCircle },
    };
    const { variant, icon: Icon } = config[outcome] || { variant: "secondary", icon: Clock };
    return (
      <Badge variant={variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {outcome?.replace('_', ' ')}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-12 w-64 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6" data-testid="page-activity-log">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Activity Log</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Complete history of customer interactions
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600 dark:text-slate-400">Total Activities</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{activities.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0" data-testid="card-calls">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {activities.filter((a: any) => a.interactionType === 'call').length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0" data-testid="card-emails">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {activities.filter((a: any) => a.interactionType === 'email').length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0" data-testid="card-whatsapp">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {activities.filter((a: any) => a.interactionType === 'whatsapp').length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0" data-testid="card-meetings">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {activities.filter((a: any) => a.interactionType === 'meeting').length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-500 to-slate-600 text-white border-0" data-testid="card-other">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Other
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {activities.filter((a: any) => a.interactionType === 'other').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-filters">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Input
            placeholder="Search by customer or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
            data-testid="input-search"
          />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48" data-testid="select-filter-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="call">Calls</SelectItem>
              <SelectItem value="email">Emails</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="meeting">Meetings</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card data-testid="card-activity-table">
        <CardHeader>
          <CardTitle>Activity History ({filteredActivities.length})</CardTitle>
          <CardDescription>Chronological log of all customer interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Logged By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity: any) => (
                <TableRow key={activity.id} data-testid={`row-activity-${activity.id}`}>
                  <TableCell className="text-sm">
                    {new Date(activity.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{activity.customerName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      {getTypeIcon(activity.interactionType)}
                      {activity.interactionType}
                    </Badge>
                  </TableCell>
                  <TableCell>{getOutcomeBadge(activity.outcome)}</TableCell>
                  <TableCell className="max-w-md truncate">{activity.notes || "—"}</TableCell>
                  <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                    {activity.loggedByUserName}
                  </TableCell>
                </TableRow>
              ))}
              {filteredActivities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No activities found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
