"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { tasksApi } from "@/lib/api";
import { useAuth, useIsManager } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Clock,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Send,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Task, TaskComment } from "@/types";
import {
  toLocaleDateStringIST,
  toLocaleStringIST,
  nowIST,
} from "@/lib/date-utils";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";

const statusColors = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const priorityColors = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
};

export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const isManager = useIsManager();
  const [commentText, setCommentText] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

  const { data: taskData, isLoading: loadingTask } = useSWR(
    id ? `task-${id}` : null,
    () => tasksApi.get(id as string),
  );

  const { data: commentsData, isLoading: loadingComments } = useSWR(
    id ? `task-comments-${id}` : null,
    () => tasksApi.getComments(id as string),
  );

  const refreshTaskData = useCallback(async () => {
    await Promise.all([mutate(`task-${id}`), mutate(`task-comments-${id}`)]);
  }, [id]);

  useHeaderRefresh({
    onRefresh: refreshTaskData,
    enabled: Boolean(id),
  });

  const task = taskData as Task;
  const comments = (commentsData || []) as TaskComment[];

  const handleStatusChange = async (newStatus: string) => {
    try {
      await tasksApi.update(id as string, { status: newStatus });
      toast.success("Task status updated");
      mutate(`task-${id}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsPostingComment(true);
    try {
      await tasksApi.addComment(id as string, commentText);
      setCommentText("");
      mutate(`task-comments-${id}`);
      toast.success("Comment posted");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setIsPostingComment(false);
    }
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < nowIST() && task.status !== "completed";
  };

  if (loadingTask) return <TaskDetailSkeleton />;

  if (!task) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Task not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/sales/tasks")}
        >
          Back to Tasks
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/sales/tasks")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              {task.title}
              <Badge
                className={priorityColors[task.priority]}
                variant="secondary"
              >
                {task.priority}
              </Badge>
            </h1>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <Badge
                  className={statusColors[task.status]}
                  variant="secondary"
                >
                  {task.status.replace("_", " ")}
                </Badge>
              </span>
              {task.dueDate && (
                <span
                  className={`flex items-center gap-1 ${
                    isOverdue(task.dueDate) ? "text-red-600 font-medium" : ""
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Due {toLocaleDateStringIST(task.dueDate)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {task.status !== "completed" && (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleStatusChange("completed")}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Complete
            </Button>
          )}
          {isManager && (
            <Button
              variant="outline"
              onClick={() => router.push(`/sales/tasks/${id}/edit`)}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 whitespace-pre-wrap">
                {task.description || "No description provided."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Comment List */}
              <div className="space-y-4">
                {loadingComments ? (
                  <Skeleton className="h-20" />
                ) : comments.length === 0 ? (
                  <p className="text-slate-500 text-sm">No comments yet</p>
                ) : (
                  comments.map((comment: any) => (
                    <div key={comment.id} className="flex gap-4">
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarImage src={comment.users?.avatar_url} />
                        <AvatarFallback>
                          {comment.users?.full_name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-sm">
                            {comment.users?.full_name || "Unknown User"}
                          </span>
                          <span className="text-xs text-slate-400">
                            {toLocaleStringIST(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment */}
              <form
                onSubmit={handlePostComment}
                className="flex gap-4 items-start"
              >
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage src={user?.avatarUrl || undefined} />
                  <AvatarFallback>{user?.fullName?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!commentText.trim() || isPostingComment}
                  >
                    <Send className="w-3 h-3 mr-2" />
                    Post Comment
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase text-slate-500 font-semibold tracking-wider">
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Assigned To</span>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">A</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm">
                    {/* In a real app we'd fetch assignee details. For now we just show ID or placeholder */}
                    User {task.assignedTo.slice(0, 4)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Created By</span>
                <span className="text-sm">
                  User {task.assignedBy.slice(0, 4)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Created On</span>
                <span className="text-sm">
                  {toLocaleDateStringIST(task.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TaskDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-1/2" />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-60" />
        </div>
        <Skeleton className="h-60" />
      </div>
    </div>
  );
}
