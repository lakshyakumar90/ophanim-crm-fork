"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { emailApi, leadsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Send,
  Users,
  AlertCircle,
  CheckCircle,
  Search,
} from "lucide-react";
import Link from "next/link";

export default function EmailComposePage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [sendResults, setSendResults] = useState<any>(null);

  // Check if email is configured
  const { data: emailInfo, isLoading: loadingInfo } = useSWR("email-info", () =>
    emailApi.getInfo().then((res) => res.data.data)
  );

  // Fetch leads with email
  const { data: leadsData, isLoading: loadingLeads } = useSWR(
    "leads-for-email",
    () => leadsApi.list({ limit: 500 }).then((res) => res.data.data)
  );

  const leads = leadsData || [];
  const isConfigured = emailInfo?.isConfigured;
  const maxPerBatch = emailInfo?.maxEmailsPerBatch || 50;

  // Filter leads based on search
  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const query = searchQuery.toLowerCase();
    return leads.filter(
      (lead: any) =>
        lead.name?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.company?.toLowerCase().includes(query)
    );
  }, [leads, searchQuery]);

  // Leads with valid email
  const leadsWithEmail = filteredLeads.filter((lead: any) => lead.email);

  const toggleLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      if (newSelected.size >= maxPerBatch) {
        toast.error(`Maximum ${maxPerBatch} recipients per batch`);
        return;
      }
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const selectAll = () => {
    const toSelect = leadsWithEmail.slice(0, maxPerBatch);
    setSelectedLeads(new Set(toSelect.map((l: any) => l.id)));
  };

  const clearSelection = () => {
    setSelectedLeads(new Set());
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }
    if (!body.trim()) {
      toast.error("Please enter email content");
      return;
    }
    if (selectedLeads.size === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    const emails = leadsWithEmail
      .filter((lead: any) => selectedLeads.has(lead.id))
      .map((lead: any) => ({
        to: lead.email,
        toName: lead.name,
        subject,
        html: body.replace(/\n/g, "<br>"),
        leadId: lead.id,
      }));

    setIsSending(true);
    try {
      const response = await emailApi.sendBulk(emails);
      const result = response.data.data;
      setSendResults(result);

      if (result.totalFailed === 0) {
        toast.success(`Successfully sent ${result.totalSent} emails`);
      } else {
        toast.warning(
          `Sent ${result.totalSent} emails, ${result.totalFailed} failed`
        );
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Failed to send emails"
      );
    } finally {
      setIsSending(false);
    }
  };

  if (loadingInfo) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900">
                  Email Not Configured
                </h3>
                <p className="text-yellow-800 text-sm mt-1">
                  You need to configure your email settings before sending
                  emails.
                </p>
                <Button asChild className="mt-4" size="sm">
                  <Link href="/settings">Configure Email Settings</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sendResults) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <CardTitle>Emails Sent</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">
                  {sendResults.totalSent}
                </p>
                <p className="text-sm text-green-700">Sent Successfully</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-3xl font-bold text-red-600">
                  {sendResults.totalFailed}
                </p>
                <p className="text-sm text-red-700">Failed</p>
              </div>
            </div>

            {sendResults.totalFailed > 0 && (
              <div className="border rounded-md p-4">
                <p className="font-medium text-sm mb-2">Failed emails:</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {sendResults.results
                    .filter((r: any) => !r.success)
                    .map((r: any, i: number) => (
                      <div key={i} className="text-sm text-red-600">
                        {r.email}: {r.error}
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button onClick={() => setSendResults(null)}>
                Send More Emails
              </Button>
              <Button variant="outline" onClick={() => router.push("/leads")}>
                Back to Leads
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compose Email</h1>
          <p className="text-muted-foreground">
            Send emails to your leads (max {maxPerBatch} per batch)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <CardTitle>Email Content</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Enter email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message *</Label>
              <Textarea
                id="body"
                placeholder="Write your email content here..."
                rows={12}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Plain text. Line breaks will be preserved.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recipients */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                <CardTitle>Recipients</CardTitle>
              </div>
              <Badge variant="outline">
                {selectedLeads.size} / {maxPerBatch} selected
              </Badge>
            </div>
            <CardDescription>
              Select leads to send this email to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Quick actions */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAll}
              >
                Select All (max {maxPerBatch})
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSelection}
              >
                Clear
              </Button>
            </div>

            {/* Lead list */}
            {loadingLeads ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : leadsWithEmail.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No leads with email addresses found
              </p>
            ) : (
              <div className="border rounded-md divide-y max-h-80 overflow-y-auto">
                {leadsWithEmail.map((lead: any) => (
                  <label
                    key={lead.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedLeads.has(lead.id)}
                      onCheckedChange={() => toggleLead(lead.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{lead.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {lead.email}
                      </p>
                    </div>
                    {lead.company && (
                      <Badge variant="secondary" className="text-xs">
                        {lead.company}
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Send Button */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          disabled={isSending || selectedLeads.size === 0 || !subject || !body}
          className="min-w-32"
        >
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send to {selectedLeads.size} Leads
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
