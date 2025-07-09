import React from "react";
// @ts-ignore
import { CKEditor } from "@ckeditor/ckeditor5-react";
// @ts-ignore
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

interface CKEditorWrapperProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const CKEditorWrapper: React.FC<CKEditorWrapperProps> = ({
  value,
  onChange,
  disabled = false,
}) => (
  <CKEditor
    editor={ClassicEditor}
    data={value}
    disabled={disabled}
    config={{
      // koi farq nahin para is se
      heading: {
        options: [
          {
            model: "paragraph",
            title: "Paragraph",
            class: "ck-heading_paragraph",
          },
          {
            model: "heading1",
            view: "h1",
            title: "Heading 1",
            class: "ck-heading_heading1",
          },
          {
            model: "heading2",
            view: "h2",
            title: "Heading 2",
            class: "ck-heading_heading2",
          },
          {
            model: "heading3",
            view: "h3",
            title: "Heading 3",
            class: "ck-heading_heading3",
          },
        ],
      },
    }}
    onChange={(_: any, editor: any) => {
      const data = editor.getData();
      onChange(data);
    }}
  />
);

export default CKEditorWrapper;
