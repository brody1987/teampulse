"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, API_URL } from "@/lib/fetcher";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, KanbanSquare, Trash2, Users, Building2, User, Hash, Paperclip, Download, X, FileText, Image, FileSpreadsheet, File, Pencil, Calendar, UserCircle, Flag, Clock } from "lucide-react";
import { TaskDialog } from "@/components/task-dialog";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

interface TaskItem {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  sortOrder: number;
  assigneeId: number;
  assigneeName: string;
  completedAt: string;
  createdAt: string;
}

interface ProjectDetail {
  id: number;
  name: string;
  description: string;
  content: string | null;
  type: string;
  teamId: number;
  ownerId: number | null;
  ownerName: string | null;
  status: string;
  startDate: string;
  endDate: string;
  teamName: string;
  teamColor: string;
  tasks: TaskItem[];
  members: { id: number; memberId: number; memberName: string }[];
  metrics: { id: number; label: string; value: number }[];
}

interface Attachment {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
}

const priorityColors: Record<string, string> = {
  "긴급": "bg-red-100 text-red-700",
  "높음": "bg-orange-100 text-orange-700",
  "보통": "bg-blue-100 text-blue-700",
  "낮음": "bg-slate-100 text-slate-600",
};

const statusColors: Record<string, string> = {
  "대기": "bg-slate-100 text-slate-600",
  "진행중": "bg-blue-100 text-blue-700",
  "검토중": "bg-yellow-100 text-yellow-700",
  "완료": "bg-green-100 text-green-700",
};

const typeLabels: Record<string, { label: string; color: string; icon: typeof Building2 }> = {
  team: { label: "팀", color: "bg-blue-100 text-blue-700", icon: Building2 },
  collaboration: { label: "협업", color: "bg-purple-100 text-purple-700", icon: Users },
  individual: { label: "개인", color: "bg-green-100 text-green-700", icon: User },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return FileSpreadsheet;
  if (mimeType.includes("pdf") || mimeType.includes("document")) return FileText;
  return File;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const { data: project, isLoading, mutate } = useSWR<ProjectDetail>(`/api/projects/${params.id}`, fetcher);
  const { data: projectAttachments = [], mutate: mutateAttachments } = useSWR<Attachment[]>(
    params.id ? `/api/attachments?entityType=project&entityId=${params.id}` : null, fetcher
  );
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<(TaskItem & { projectId?: number }) | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
  const [viewTask, setViewTask] = useState<TaskItem | null>(null);

  // Fetch attachments for the viewed task
  const { data: taskAttachments = [] } = useSWR<Attachment[]>(
    viewTask ? `/api/attachments?entityType=task&entityId=${viewTask.id}` : null, fetcher
  );

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-slate-200 rounded" /><div className="h-64 bg-slate-200 rounded-lg" /></div>;
  if (!project) return <div>프로젝트를 찾을 수 없습니다.</div>;

  const completedCount = project.tasks.filter((t) => t.status === "완료").length;
  const progress = project.tasks.length > 0 ? Math.round((completedCount / project.tasks.length) * 100) : 0;
  const typeInfo = typeLabels[project.type] || typeLabels.team;
  const TypeIcon = typeInfo.icon;

  const handleDeleteTask = async () => {
    if (!deleteTaskId) return;
    await fetch(`${API_URL}/api/tasks/${deleteTaskId}`, { method: "DELETE" });
    toast.success("업무가 삭제되었습니다.");
    setDeleteTaskId(null);
    mutate();
  };

  return (
    <div>
      <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> 프로젝트 목록
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            <Badge variant="outline" className={typeInfo.color}>
              <TypeIcon className="h-3 w-3 mr-1" />
              {typeInfo.label}
            </Badge>
            {project.teamName && (
              <Badge variant="outline" style={{ backgroundColor: project.teamColor + "20", color: project.teamColor }}>
                {project.teamName}
              </Badge>
            )}
          </div>
          {project.description && <p className="text-slate-500">{project.description}</p>}
          <div className="text-sm text-slate-400 mt-2">{project.startDate} ~ {project.endDate}</div>
        </div>
        <div className="flex gap-2">
          <Link href={`/projects/${project.id}/board`}>
            <Button variant="outline"><KanbanSquare className="h-4 w-4 mr-2" /> 칸반보드</Button>
          </Link>
          <Button onClick={() => { setEditTask(null); setTaskDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> 업무 추가
          </Button>
        </div>
      </div>

      {/* 참여 멤버 (협업) / 담당자 (개인) */}
      {project.type === "collaboration" && project.members.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> 참여 멤버 ({project.members.length}명)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {project.members.map((m) => (
                <Badge key={m.id} variant="secondary" className="text-sm">
                  {m.memberName}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {project.type === "individual" && project.ownerName && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> 담당자
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="text-sm">{project.ownerName}</Badge>
          </CardContent>
        </Card>
      )}

      {/* 수치 데이터 */}
      {project.metrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {project.metrics.map((m) => (
            <Card key={m.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                  <Hash className="h-3.5 w-3.5" />
                  {m.label}
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {m.value.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 프로젝트 내용 (리치 텍스트) */}
      {project.content && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">프로젝트 내용</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: project.content }}
            />
          </CardContent>
        </Card>
      )}

      {/* 첨부파일 */}
      {projectAttachments.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Paperclip className="h-4 w-4" /> 첨부파일 ({projectAttachments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {projectAttachments.map((a) => {
                const Icon = getFileIcon(a.mimeType);
                return (
                  <div key={a.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-md group">
                    <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-700 truncate flex-1">{a.originalName}</span>
                    <span className="text-xs text-slate-400 shrink-0">{formatFileSize(a.fileSize)}</span>
                    <a href={`${API_URL}/api/attachments/${a.id}`} download className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Download className="h-3.5 w-3.5 text-slate-400 hover:text-blue-500" />
                    </a>
                    <button
                      onClick={async () => {
                        await fetch(`${API_URL}/api/attachments/${a.id}`, { method: "DELETE" });
                        mutateAttachments();
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">전체 진행률</span>
            <span className="text-sm text-slate-500">{completedCount}/{project.tasks.length} 완료 ({progress}%)</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div className="h-3 rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">업무 목록 ({project.tasks.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>업무</TableHead>
                <TableHead>담당자</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>우선순위</TableHead>
                <TableHead>마감일</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.tasks.map((task) => (
                <TableRow
                  key={task.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => setViewTask(task)}
                >
                  <TableCell>
                    <div className="font-medium">{task.title}</div>
                    {task.description && (
                      <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                        {task.description.replace(/<[^>]*>/g, " ").slice(0, 80)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{task.assigneeName || "-"}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[task.status] || ""}`}>
                      {task.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority] || ""}`}>
                      {task.priority}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">{task.dueDate || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditTask({ ...task, projectId: project.id });
                        setTaskDialogOpen(true);
                      }}>수정</Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => setDeleteTaskId(task.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {project.tasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">업무가 없습니다. 새 업무를 추가해보세요.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Task Detail Dialog */}
      <Dialog open={viewTask !== null} onOpenChange={(open) => { if (!open) setViewTask(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewTask && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-8">
                  <DialogTitle className="text-xl">{viewTask.title}</DialogTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setViewTask(null);
                      setEditTask({ ...viewTask, projectId: project.id });
                      setTaskDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> 수정
                  </Button>
                </div>
              </DialogHeader>

              {/* Meta info */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm py-2">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[viewTask.status] || ""}`}>
                    {viewTask.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Flag className="h-3.5 w-3.5 text-slate-400" />
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[viewTask.priority] || ""}`}>
                    {viewTask.priority}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <UserCircle className="h-3.5 w-3.5 text-slate-400" />
                  {viewTask.assigneeName || "미배정"}
                </div>
                {viewTask.dueDate && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {viewTask.dueDate}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <Clock className="h-3.5 w-3.5" />
                  생성: {viewTask.createdAt?.split("T")[0] || "-"}
                  {viewTask.completedAt && ` · 완료: ${viewTask.completedAt.split("T")[0]}`}
                </div>
              </div>

              {/* Description */}
              {viewTask.description ? (
                <div className="border rounded-lg p-4 bg-slate-50/50">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">설명</h4>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: viewTask.description }}
                  />
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-slate-50/50">
                  <p className="text-sm text-slate-400">설명이 없습니다.</p>
                </div>
              )}

              {/* Task Attachments */}
              {taskAttachments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" /> 첨부파일 ({taskAttachments.length})
                  </h4>
                  <div className="space-y-1.5">
                    {taskAttachments.map((a) => {
                      const Icon = getFileIcon(a.mimeType);
                      return (
                        <div key={a.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-md group">
                          <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="text-sm text-slate-700 truncate flex-1">{a.originalName}</span>
                          <span className="text-xs text-slate-400 shrink-0">{formatFileSize(a.fileSize)}</span>
                          <a href={`${API_URL}/api/attachments/${a.id}`} download onClick={(e) => e.stopPropagation()}>
                            <Download className="h-3.5 w-3.5 text-slate-400 hover:text-blue-500" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editTask as any}
        projectId={project.id}
        teamId={project.teamId}
        projectType={project.type}
        ownerId={project.ownerId}
        projectMembers={project.type === "collaboration" ? project.members : undefined}
        onSuccess={() => mutate()}
      />

      {/* Delete Confirmation */}
      <Dialog open={deleteTaskId !== null} onOpenChange={() => setDeleteTaskId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>업무 삭제</DialogTitle>
            <DialogDescription>이 업무를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTaskId(null)}>취소</Button>
            <Button variant="destructive" onClick={handleDeleteTask}>삭제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
