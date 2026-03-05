"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import useSWR from "swr";
import { fetcher, API_URL } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, Image, FileSpreadsheet, File, Download } from "lucide-react";
import { toast } from "sonner";

interface Attachment {
  id: number;
  entityType: string;
  entityId: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

interface FileAttachmentProps {
  entityType: "project" | "task";
  entityId: number | null; // null when entity not yet created
  onPendingFilesChange?: (files: File[]) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv"))
    return FileSpreadsheet;
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text"))
    return FileText;
  return File;
}

export function FileAttachment({ entityType, entityId, onPendingFilesChange }: FileAttachmentProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const { data: attachments = [], mutate } = useSWR<Attachment[]>(
    entityId ? `/api/attachments?entityType=${entityType}&entityId=${entityId}` : null,
    fetcher
  );

  // Notify parent of pending files (for pre-creation upload)
  useEffect(() => {
    onPendingFilesChange?.(pendingFiles);
  }, [pendingFiles, onPendingFilesChange]);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!entityId) {
        // Entity not created yet — queue files
        setPendingFiles((prev) => [...prev, ...files]);
        return;
      }

      setUploading(true);
      setUploadingFiles(files);
      try {
        const formData = new FormData();
        formData.append("entityType", entityType);
        formData.append("entityId", String(entityId));
        for (const file of files) {
          formData.append("files", file);
        }

        const res = await fetch(`${API_URL}/api/attachments`, { method: "POST", body: formData });
        if (!res.ok) throw new Error();
        toast.success(`${files.length}개 파일이 업로드되었습니다.`);
        mutate();
      } catch {
        toast.error("파일 업로드에 실패했습니다.");
      } finally {
        setUploading(false);
        setUploadingFiles([]);
      }
    },
    [entityId, entityType, mutate]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) uploadFiles(files);
    },
    [uploadFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) uploadFiles(files);
    e.target.value = "";
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${API_URL}/api/attachments/${id}`, { method: "DELETE" });
      toast.success("파일이 삭제되었습니다.");
      mutate();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const allFiles = [
    ...attachments.map((a) => ({ type: "saved" as const, data: a })),
    ...uploadingFiles.map((f, i) => ({ type: "uploading" as const, data: f, index: i })),
    ...pendingFiles.map((f, i) => ({ type: "pending" as const, data: f, index: i })),
  ];

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-blue-400 bg-blue-50"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <Upload className={`h-6 w-6 mx-auto mb-1.5 ${dragOver ? "text-blue-500" : "text-slate-400"}`} />
        <p className="text-sm text-slate-500">
          {uploading ? "업로드 중..." : "클릭 또는 파일을 드래그하여 첨부"}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">여러 파일을 동시에 선택할 수 있습니다</p>
      </div>

      {/* File list */}
      {allFiles.length > 0 && (
        <div className="space-y-1.5">
          {allFiles.map((item, idx) => {
            if (item.type === "saved") {
              const a = item.data as Attachment;
              const Icon = getFileIcon(a.mimeType);
              return (
                <div
                  key={`saved-${a.id}`}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-md group"
                >
                  <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-700 truncate flex-1">{a.originalName}</span>
                  <span className="text-xs text-slate-400 shrink-0">{formatFileSize(a.fileSize)}</span>
                  <a
                    href={`${API_URL}/api/attachments/${a.id}`}
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-400 hover:text-blue-500" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                  </button>
                </div>
              );
            } else if (item.type === "uploading") {
              const f = item.data as File;
              const Icon = getFileIcon(f.type);
              return (
                <div
                  key={`uploading-${idx}`}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-md"
                >
                  <Icon className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="text-sm text-slate-700 truncate flex-1">{f.name}</span>
                  <span className="text-xs text-blue-500 shrink-0 flex items-center gap-1">
                    <span className="inline-block h-3 w-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    업로드중
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">{formatFileSize(f.size)}</span>
                </div>
              );
            } else {
              const f = item.data as File;
              const Icon = getFileIcon(f.type);
              return (
                <div
                  key={`pending-${idx}`}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-md group"
                >
                  <Icon className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-sm text-slate-700 truncate flex-1">{f.name}</span>
                  <span className="text-xs text-amber-500 shrink-0">대기중</span>
                  <span className="text-xs text-slate-400 shrink-0">{formatFileSize(f.size)}</span>
                  <button
                    type="button"
                    onClick={() => removePendingFile(item.index!)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                  </button>
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}

/** Upload pending files after entity creation */
export async function uploadPendingFiles(
  entityType: string,
  entityId: number,
  files: File[]
): Promise<void> {
  if (files.length === 0) return;
  const formData = new FormData();
  formData.append("entityType", entityType);
  formData.append("entityId", String(entityId));
  for (const file of files) {
    formData.append("files", file);
  }
  await fetch(`${API_URL}/api/attachments`, { method: "POST", body: formData });
}
