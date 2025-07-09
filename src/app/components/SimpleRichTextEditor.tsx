"use client";

import { useRef, useEffect, useState } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Link } from "lucide-react";

interface SimpleRichTextEditorProps {
  data: string;
  onChange: (data: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const SimpleRichTextEditor: React.FC<SimpleRichTextEditorProps> = ({
  data,
  onChange,
  placeholder,
  disabled,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = data || "";
      setIsLoaded(true);
    }
  }, [data]);

  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  };

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Enter key to create new lines properly
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      executeCommand("insertHTML", "<br><br>");
    }
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      executeCommand("createLink", url);
    }
  };

  return (
    <div
      className={`border border-gray-300 rounded-md ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-md flex-wrap">
        <button
          type="button"
          onClick={() => executeCommand("bold")}
          className="p-2 rounded hover:bg-gray-200 focus:outline-none focus:bg-gray-200"
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("italic")}
          className="p-2 rounded hover:bg-gray-200 focus:outline-none focus:bg-gray-200"
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("underline")}
          className="p-2 rounded hover:bg-gray-200 focus:outline-none focus:bg-gray-200"
          title="Underline"
        >
          <Underline size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button
          type="button"
          onClick={() => executeCommand("insertUnorderedList")}
          className="p-2 rounded hover:bg-gray-200 focus:outline-none focus:bg-gray-200"
          title="Bullet List"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("insertOrderedList")}
          className="p-2 rounded hover:bg-gray-200 focus:outline-none focus:bg-gray-200"
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button
          type="button"
          onClick={insertLink}
          className="p-2 rounded hover:bg-gray-200 focus:outline-none focus:bg-gray-200"
          title="Insert Link"
        >
          <Link size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <select
          onChange={(e) => executeCommand("formatBlock", e.target.value)}
          className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          defaultValue="div"
        >
          <option value="div">Normal</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="blockquote">Quote</option>
        </select>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className="min-h-[150px] max-h-[300px] overflow-y-auto p-3 focus:outline-none"
        style={{
          lineHeight: "1.5",
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />

      {/* Placeholder styling */}
      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          font-style: italic;
        }

        [contenteditable] h1 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.5em 0;
        }

        [contenteditable] h2 {
          font-size: 1.3em;
          font-weight: bold;
          margin: 0.5em 0;
        }

        [contenteditable] h3 {
          font-size: 1.1em;
          font-weight: bold;
          margin: 0.5em 0;
        }

        [contenteditable] blockquote {
          border-left: 4px solid #d1d5db;
          padding-left: 1em;
          margin: 0.5em 0;
          font-style: italic;
          color: #6b7280;
        }

        [contenteditable] ul,
        [contenteditable] ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }

        [contenteditable] li {
          margin: 0.25em 0;
        }

        [contenteditable] a {
          color: #3b82f6;
          text-decoration: underline;
        }

        [contenteditable] strong {
          font-weight: bold;
        }

        [contenteditable] em {
          font-style: italic;
        }

        [contenteditable] u {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default SimpleRichTextEditor;
