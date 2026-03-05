"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, API_URL } from "@/lib/fetcher";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, GripVertical } from "lucide-react";
import { TaskDialog } from "@/components/task-dialog";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const COLUMNS = ["대기", "진행중", "검토중", "완료"] as const;
const columnColors: Record<string, string> = {
  "대기": "#94A3B8",
  "진행중": "#3B82F6",
  "검토중": "#F59E0B",
  "완료": "#10B981",
};
const priorityColors: Record<string, string> = {
  "긴급": "bg-red-100 text-red-700 border-red-200",
  "높음": "bg-orange-100 text-orange-700 border-orange-200",
  "보통": "bg-blue-100 text-blue-700 border-blue-200",
  "낮음": "bg-slate-100 text-slate-600 border-slate-200",
};

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  sortOrder: number;
  assigneeId: number;
  assigneeName: string;
}

interface ProjectDetail {
  id: number;
  name: string;
  type: string;
  teamId: number;
  ownerId: number | null;
  teamName: string;
  teamColor: string;
  tasks: Task[];
  members: { id: number; memberId: number; memberName: string }[];
}

function SortableCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group"
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${priorityColors[task.priority] || ""}`}>
              {task.priority}
            </span>
            {task.assigneeName && (
              <span className="text-xs text-slate-500">{task.assigneeName}</span>
            )}
          </div>
          {task.dueDate && (
            <p className="text-xs text-slate-400 mt-1">{task.dueDate}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="space-y-2 min-h-[50px]">
      {children}
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  return (
    <div className="bg-white border rounded-lg p-3 shadow-md">
      <p className="font-medium text-sm">{task.title}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${priorityColors[task.priority] || ""}`}>
          {task.priority}
        </span>
      </div>
    </div>
  );
}

export default function KanbanBoardPage() {
  const params = useParams();
  const { data: project, isLoading, mutate } = useSWR<ProjectDetail>(`/api/projects/${params.id}`, fetcher);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (isLoading) return <div className="animate-pulse"><div className="h-8 w-48 bg-slate-200 rounded mb-8" /><div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-96 bg-slate-200 rounded-lg" />)}</div></div>;
  if (!project) return <div>프로젝트를 찾을 수 없습니다.</div>;

  const tasks = localTasks ?? project.tasks;

  const getColumnTasks = (status: string) =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.sortOrder - b.sortOrder);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
    if (!localTasks) setLocalTasks([...project.tasks]);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !localTasks) return;

    const activeTask = localTasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // Determine target column
    const overId = over.id;
    let targetStatus: string;

    if (COLUMNS.includes(overId as any)) {
      targetStatus = overId as string;
    } else {
      const overTask = localTasks.find((t) => t.id === overId);
      if (!overTask) return;
      targetStatus = overTask.status;
    }

    if (activeTask.status !== targetStatus) {
      setLocalTasks(
        localTasks.map((t) =>
          t.id === active.id ? { ...t, status: targetStatus } : t
        )
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !localTasks) {
      setLocalTasks(null);
      return;
    }

    const movedTask = localTasks.find((t) => t.id === active.id);
    if (!movedTask) { setLocalTasks(null); return; }

    // Recompute sort orders for the column
    const columnTasks = localTasks
      .filter((t) => t.status === movedTask.status)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    // If dropped on a specific task, reorder within column
    if (over.id !== movedTask.status) {
      const overIndex = columnTasks.findIndex((t) => t.id === over.id);
      const activeIndex = columnTasks.findIndex((t) => t.id === active.id);
      if (overIndex !== -1 && activeIndex !== -1 && overIndex !== activeIndex) {
        const [moved] = columnTasks.splice(activeIndex, 1);
        columnTasks.splice(overIndex, 0, moved);
      }
    }

    const newOrder = columnTasks.map((t, i) => ({ id: t.id, sortOrder: i }));

    try {
      await fetch(`${API_URL}/api/tasks/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: active.id,
          newStatus: movedTask.status,
          newOrder,
        }),
      });
      mutate();
    } catch (e) {
      console.error("Reorder failed", e);
    }
    setLocalTasks(null);
  };

  return (
    <div>
      <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> {project.name}
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">칸반보드</h1>
        <Button onClick={() => { setEditTask(null); setTaskDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> 업무 추가
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = getColumnTasks(col);
            return (
              <div key={col} className="bg-slate-100 rounded-lg p-3 min-h-[400px]">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: columnColors[col] }} />
                  <h3 className="font-semibold text-sm text-slate-700">{col}</h3>
                  <Badge variant="secondary" className="ml-auto text-xs">{colTasks.length}</Badge>
                </div>
                <SortableContext
                  id={col}
                  items={colTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <DroppableColumn id={col}>
                    {colTasks.map((task) => (
                      <SortableCard
                        key={task.id}
                        task={task}
                        onClick={() => {
                          setEditTask({ ...task, projectId: project.id } as any);
                          setTaskDialogOpen(true);
                        }}
                      />
                    ))}
                  </DroppableColumn>
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

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
    </div>
  );
}
