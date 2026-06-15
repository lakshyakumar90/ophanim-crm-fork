"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, Send, Trash2, Edit3 } from "lucide-react";
import { toLocaleStringIST } from "@/lib/date-utils";

export function LeadNotesSection({
  comments,
  isAdmin,
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
  isMobile = false,
}: {
  comments: any[];
  isAdmin: boolean;
  newComment: string;
  setNewComment: (value: string) => void;
  isAddingComment: boolean;
  handleAddComment: () => void;
  editingCommentId: string | null;
  editingCommentContent: string;
  setEditingCommentId: (id: string | null) => void;
  setEditingCommentContent: (content: string) => void;
  handleUpdateComment: (id: string) => void;
  handleDeleteComment: (id: string) => void;
  isMobile?: boolean;
}) {
  return (
    <div className={`space-y-4 ${isMobile ? "" : "h-full flex flex-col"}`}>
      {/* Add Comment */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({comments.length})
        </h3>
        <Textarea
          placeholder="Write your comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className="resize-none text-sm"
        />
        <Button
          onClick={handleAddComment}
          disabled={!newComment.trim() || isAddingComment}
          size="sm"
          className="w-full"
        >
          {isAddingComment ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Add Comment
            </>
          )}
        </Button>
      </div>

      {/* Comments List */}
      <div className={`${isMobile ? "" : "flex-1 overflow-hidden"}`}>
        {isMobile ? (
          <div className="space-y-3">
            {comments.length === 0 ? (
              <p className="text-slate-500 text-center py-4 text-sm">
                No comments yet
              </p>
            ) : (
              comments.map((comment: any) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  isAdmin={isAdmin}
                  editingCommentId={editingCommentId}
                  editingCommentContent={editingCommentContent}
                  setEditingCommentId={setEditingCommentId}
                  setEditingCommentContent={setEditingCommentContent}
                  handleUpdateComment={handleUpdateComment}
                  handleDeleteComment={handleDeleteComment}
                />
              ))
            )}
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="space-y-3 pr-4">
              {comments.length === 0 ? (
                <p className="text-slate-500 text-center py-8 text-sm">
                  No comments yet. Be the first to add one!
                </p>
              ) : (
                comments.map((comment: any) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    isAdmin={isAdmin}
                    editingCommentId={editingCommentId}
                    editingCommentContent={editingCommentContent}
                    setEditingCommentId={setEditingCommentId}
                    setEditingCommentContent={setEditingCommentContent}
                    handleUpdateComment={handleUpdateComment}
                    handleDeleteComment={handleDeleteComment}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

// Comment Item Component
function CommentItem({
  comment,
  isAdmin,
  editingCommentId,
  editingCommentContent,
  setEditingCommentId,
  setEditingCommentContent,
  handleUpdateComment,
  handleDeleteComment,
}: {
  comment: any;
  isAdmin: boolean;
  editingCommentId: string | null;
  editingCommentContent: string;
  setEditingCommentId: (id: string | null) => void;
  setEditingCommentContent: (content: string) => void;
  handleUpdateComment: (id: string) => void;
  handleDeleteComment: (id: string) => void;
}) {
  return (
    <div className="flex gap-3 p-3 bg-slate-50 rounded-lg">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
          {comment.user?.fullName?.charAt(0) || "U"}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="font-medium text-slate-900 text-sm truncate">
              {comment.user?.fullName || "Unknown User"}
            </span>
            <span className="text-xs text-slate-500">
              {toLocaleStringIST(comment.createdAt)}
            </span>
          </div>

          {/* Admin controls */}
          {isAdmin && (
            <div className="flex items-center shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => {
                  setEditingCommentId(comment.id);
                  setEditingCommentContent(comment.content);
                }}
              >
                <Edit3 className="h-3.5 w-3.5 text-slate-500" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleDeleteComment(comment.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            </div>
          )}
        </div>

        {/* Comment content or edit form */}
        {editingCommentId === comment.id ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editingCommentContent}
              onChange={(e) => setEditingCommentContent(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-sm"
                onClick={() => handleUpdateComment(comment.id)}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-sm"
                onClick={() => {
                  setEditingCommentId(null);
                  setEditingCommentContent("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1.5 text-slate-700 whitespace-pre-wrap text-sm">
            {comment.content}
          </p>
        )}
      </div>
    </div>
  );
}

