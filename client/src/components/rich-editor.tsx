"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Table as TableIcon,
  TableProperties,
  ImageIcon,
  Undo,
  Redo,
} from "lucide-react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Extension } from "@tiptap/react";

// Custom extension to handle image paste/drop as base64
const ImagePasteHandler = Extension.create({
  name: "imagePasteHandler",
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey("imagePasteHandler"),
        props: {
          handlePaste(_view, event) {
            const items = event.clipboardData?.items;
            if (!items) return false;

            for (const item of items) {
              if (item.type.startsWith("image/")) {
                event.preventDefault();
                const file = item.getAsFile();
                if (!file) continue;
                const reader = new FileReader();
                reader.onload = (e) => {
                  const base64 = e.target?.result as string;
                  editor.chain().focus().setImage({ src: base64 }).run();
                };
                reader.readAsDataURL(file);
                return true;
              }
            }
            return false;
          },
          handleDrop(_view, event) {
            const files = event.dataTransfer?.files;
            if (!files || files.length === 0) return false;

            for (const file of files) {
              if (file.type.startsWith("image/")) {
                event.preventDefault();
                const reader = new FileReader();
                reader.onload = (e) => {
                  const base64 = e.target?.result as string;
                  editor.chain().focus().setImage({ src: base64 }).run();
                };
                reader.readAsDataURL(file);
                return true;
              }
            }
            return false;
          },
        },
      }),
    ];
  },
});

// Custom TableCell that preserves inline styles (background-color, color, etc.)
const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
    };
  },
});

const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
    };
  },
});

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export function RichEditor({ content, onChange }: RichEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      CustomTableCell,
      CustomTableHeader,
      Image.configure({ inline: false, allowBase64: true }),
      ImagePasteHandler,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[250px] px-4 py-3",
      },
    },
  });

  if (!editor) return null;

  const ToolButton = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title?: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 ${active ? "bg-slate-200 text-slate-900" : "text-slate-600"}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );

  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        editor.chain().focus().setImage({ src: base64 }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-slate-50">
        <ToolButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="굵게"
        >
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="기울임"
        >
          <Italic className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="밑줄"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="취소선"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolButton>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <ToolButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="제목 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="제목 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="제목 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolButton>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <ToolButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="글머리 기호"
        >
          <List className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="번호 매기기"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolButton>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <ToolButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="왼쪽 정렬"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="가운데 정렬"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="오른쪽 정렬"
        >
          <AlignRight className="h-4 w-4" />
        </ToolButton>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <div className="flex items-center gap-1">
          <input
            type="color"
            className="w-6 h-6 rounded cursor-pointer border-0"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            title="글자 색상"
          />
          <ToolButton
            onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()}
            active={editor.isActive("highlight")}
            title="형광펜"
          >
            <Highlighter className="h-4 w-4" />
          </ToolButton>
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <ToolButton
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          title="표 삽입"
        >
          <TableIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().deleteTable().run()}
          title="표 삭제"
        >
          <TableProperties className="h-4 w-4" />
        </ToolButton>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <ToolButton onClick={handleImageUpload} title="이미지 삽입">
          <ImageIcon className="h-4 w-4" />
        </ToolButton>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <ToolButton onClick={() => editor.chain().focus().undo().run()} title="실행 취소">
          <Undo className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().redo().run()} title="다시 실행">
          <Redo className="h-4 w-4" />
        </ToolButton>
      </div>

      {/* Editor Content */}
      <div className="max-h-[300px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .tiptap table {
          border-collapse: collapse;
          margin: 0.5rem 0;
          width: 100%;
        }
        .tiptap th,
        .tiptap td {
          border: 1px solid #d1d5db;
          padding: 0.375rem 0.625rem;
          min-width: 80px;
        }
        .tiptap th {
          background-color: #f3f4f6;
          font-weight: 600;
        }
        .tiptap p {
          margin: 0.25rem 0;
        }
        .tiptap img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 0.5rem 0;
        }
        .tiptap img.ProseMirror-selectednode {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
