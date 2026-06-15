"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Pencil,
  Phone,
  Mail,
  Building,
  MapPin,
  Calendar,
  DollarSign,
  Globe,
  User,
  Clock,
  Tag,
  FileText,
  Loader2,
} from "lucide-react";
import { toLocaleDateStringIST } from "@/lib/date-utils";
import type { Lead } from "@/types";
import type { LeadDetailState } from "@/hooks/sales/useLeadDetail";
import { LeadNotesSection } from "@/components/leads/detail/LeadNotesSection";
import { LeadReminderWidget } from "@/components/leads/lead-reminder-widget";

interface LeadInfoTabProps {
  detail: LeadDetailState;
  lead: Lead;
}

export function LeadInfoTab({ detail, lead }: LeadInfoTabProps) {
  const {
    id,
    isAdmin,
    comments,
    reminders,
    refreshLeadData,
    createReminder,
    deleteReminder,
    markReminderDone,
    newComment,
    setNewComment,
    isAddingComment,
    handleAddComment,
    editingCommentId,
    editingCommentContent,
    setEditingCommentId,
    setEditingCommentContent,
    handleUpdateComment,
    handleDeleteComment,
    editingTimezone,
    setEditingTimezone,
    timezoneValue,
    setTimezoneValue,
    isSavingTimezone,
    editingClientResponse,
    setEditingClientResponse,
    clientResponseValue,
    setClientResponseValue,
    isSavingClientResponse,
    editingCountry,
    setEditingCountry,
    countryValue,
    setCountryValue,
    isSavingCountry,
    editingNalReason,
    setEditingNalReason,
    nalReasonValue,
    setNalReasonValue,
    isSavingNalReason,
    handleSaveTimezone,
    handleSaveClientResponse,
    handleSaveCountry,
    handleSaveNalReason,
  } = detail;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-4">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contact
              </p>
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-blue-600 hover:underline text-sm truncate"
                  >
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {lead.phone}
                  </a>
                </div>
              )}
              {lead.alternatePhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-300 shrink-0" />
                  <a
                    href={`tel:${lead.alternatePhone}`}
                    className="text-blue-500 hover:underline text-sm"
                  >
                    {lead.alternatePhone}{" "}
                    <span className="text-xs text-muted-foreground">(alt)</span>
                  </a>
                </div>
              )}
            </div>

            {(lead.address || lead.city || lead.state || lead.country || lead.pincode) && (
              <>
                <div className="border-t border-slate-100" />
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Location
                  </p>
                  {lead.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-sm">{lead.address}</span>
                    </div>
                  )}
                  {(lead.city || lead.state || lead.pincode) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-300 shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        {[lead.city, lead.state, lead.pincode].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-300 shrink-0" />
                    {editingCountry ? (
                      <>
                        <Input
                          value={countryValue}
                          onChange={(e) => setCountryValue(e.target.value)}
                          className="h-7 text-xs w-32"
                          placeholder="Country"
                        />
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={handleSaveCountry}
                          disabled={isSavingCountry}
                        >
                          {isSavingCountry ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setEditingCountry(false)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-muted-foreground">
                          {lead.country || "No country set"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs ml-auto"
                          onClick={() => {
                            setCountryValue(lead.country || "");
                            setEditingCountry(true);
                          }}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {(lead.industry || lead.designation || lead.website) && (
              <>
                <div className="border-t border-slate-100" />
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Business
                  </p>
                  {lead.industry && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-sm">{lead.industry}</span>
                    </div>
                  )}
                  {lead.designation && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-sm">{lead.designation}</span>
                    </div>
                  )}
                  {lead.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-slate-400 shrink-0" />
                      <a
                        href={
                          lead.website.startsWith("http")
                            ? lead.website
                            : `https://${lead.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm truncate"
                      >
                        {lead.website}
                      </a>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="border-t border-slate-100" />

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Details
              </p>
              {lead.source && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="capitalize text-sm">
                    Source:{" "}
                    <span className="font-medium">{lead.source.replace(/_/g, " ")}</span>
                  </span>
                </div>
              )}
              {lead.leadType && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="capitalize text-sm">
                    Type:{" "}
                    <span className="font-medium">{lead.leadType.replace(/_/g, " ")}</span>
                  </span>
                </div>
              )}
              {lead.leadValue != null && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-sm">
                    Value:{" "}
                    <span className="font-medium">
                      ₹{Number(lead.leadValue).toLocaleString()}
                    </span>
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                {editingTimezone ? (
                  <>
                    <Select value={timezoneValue} onValueChange={setTimezoneValue}>
                      <SelectTrigger className="h-7 text-xs w-40">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EST">EST - Eastern</SelectItem>
                        <SelectItem value="CST">CST - Central</SelectItem>
                        <SelectItem value="MST">MST - Mountain</SelectItem>
                        <SelectItem value="PST">PST - Pacific</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={handleSaveTimezone}
                      disabled={isSavingTimezone}
                    >
                      {isSavingTimezone ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => setEditingTimezone(false)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm">
                      Timezone:{" "}
                      <span className="font-medium">{lead.timezone || "Not set"}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs ml-auto"
                      onClick={() => {
                        setTimezoneValue(lead.timezone || "");
                        setEditingTimezone(true);
                      }}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
              {lead.tags && (
                <div className="flex items-start gap-2">
                  <Tag className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
                  <div className="flex flex-wrap gap-1">
                    {lead.tags
                      .split(/[,;]/)
                      .map((t: string) => t.trim())
                      .filter(Boolean)
                      .map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {lead.description && (
              <>
                <div className="border-t border-slate-100" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Description
                  </p>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                    {lead.description}
                  </p>
                </div>
              </>
            )}

            <div className="border-t border-slate-100" />

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-xs text-muted-foreground">
                  Created:{" "}
                  <span className="text-foreground">
                    {toLocaleDateStringIST(lead.createdAt)}
                  </span>
                </span>
              </div>
              {lead.updatedAt && lead.updatedAt !== lead.createdAt && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-300 shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    Last updated:{" "}
                    <span className="text-foreground">
                      {toLocaleDateStringIST(lead.updatedAt)}
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100" />

            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Assigned To:</span>
              {lead.assignee ? (
                <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={lead.assignee.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {lead.assignee.fullName?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{lead.assignee.fullName}</span>
                  </div>
                  <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700">
                    Assigned
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                  <User className="h-5 w-5 text-slate-400" />
                  <span className="text-sm text-slate-500 italic">Not assigned</span>
                  <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700">
                    Unassigned
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[300px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Context & Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">NAL Reason:</span>
                {!editingNalReason && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setNalReasonValue(lead.nalReason || "");
                      setEditingNalReason(true);
                    }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              {editingNalReason ? (
                <div className="mt-1 space-y-2">
                  <Textarea
                    value={nalReasonValue}
                    onChange={(e) => setNalReasonValue(e.target.value)}
                    rows={3}
                    className="text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleSaveNalReason}
                      disabled={isSavingNalReason}
                    >
                      {isSavingNalReason ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setEditingNalReason(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-slate-700 whitespace-pre-wrap">
                  {lead.nalReason ? (
                    lead.nalReason
                  ) : (
                    <span className="text-slate-400 italic">Not set</span>
                  )}
                </p>
              )}
            </div>
            <div className="text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Client Response:</span>
                {!editingClientResponse && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setClientResponseValue(lead.clientResponse || "");
                      setEditingClientResponse(true);
                    }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              {editingClientResponse ? (
                <div className="mt-1 space-y-2">
                  <Textarea
                    value={clientResponseValue}
                    onChange={(e) => setClientResponseValue(e.target.value)}
                    rows={3}
                    className="text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleSaveClientResponse}
                      disabled={isSavingClientResponse}
                    >
                      {isSavingClientResponse ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setEditingClientResponse(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-slate-700 whitespace-pre-wrap">
                  {lead.clientResponse ? (
                    lead.clientResponse
                  ) : (
                    <span className="text-slate-400 italic">Not set</span>
                  )}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <LeadReminderWidget
          leadId={id as string}
          reminders={reminders}
          onCreateReminder={createReminder}
          onDeleteReminder={deleteReminder}
          onMarkDone={markReminderDone}
          onRefresh={refreshLeadData}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <LeadNotesSection
            comments={comments}
            isAdmin={isAdmin}
            newComment={newComment}
            setNewComment={setNewComment}
            isAddingComment={isAddingComment}
            handleAddComment={handleAddComment}
            editingCommentId={editingCommentId}
            editingCommentContent={editingCommentContent}
            setEditingCommentId={setEditingCommentId}
            setEditingCommentContent={setEditingCommentContent}
            handleUpdateComment={handleUpdateComment}
            handleDeleteComment={handleDeleteComment}
          />
        </CardContent>
      </Card>
    </div>
  );
}
