"use client";
import React, { useRef, useCallback } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  onInit?: (editor: any) => void;
  placeholder?: string;
  minHeight?: number;
}

/**
 * Self-hosted TinyMCE editor (GPL2+ build, no API key required).
 * Scripts are served from /tinymce/tinymce.min.js (copied to public/tinymce).
 * Used by both Blog and Page CMS editors.
 */
export default function RichEditor({
  value,
  onChange,
  onInit,
  placeholder = "Start writing…",
  minHeight = 450,
}: RichEditorProps) {
  const editorRef = useRef<any>(null);

  const handleInit = useCallback((evt: any, editor: any) => {
    editorRef.current = editor;
    if (onInit) onInit(editor);
  }, [onInit]);

  const imageUploadHandler = useCallback(async (blobInfo: any) => {
    const formData = new FormData();
    formData.append("file", blobInfo.blob());
    const res = await apiFetch(`${API_BASE_URL}/settings/site/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.url;
  }, []);

  return (
    <Editor
      tinymceScriptSrc="/tinymce/tinymce.min.js"
      onInit={handleInit}
      initialValue={value}
      licenseKey="gpl"
      init={{
        height: minHeight,
        menubar: false,
        statusbar: true,
        branding: false,
        promotion: false,
        placeholder,
        skin: "oxide",
        content_css: "default",
        plugins: [
          "lists", "link", "image", "charmap", "preview",
          "searchreplace", "visualblocks", "code",
          "table", "wordcount", "anchor",
          "pagebreak", "fullscreen", "insertdatetime",
          "nonbreaking",
        ],
        toolbar:
          "undo redo | blocks | bold italic underline strikethrough | " +
          "alignleft aligncenter alignright alignjustify | " +
          "bullist numlist outdent indent | " +
          "link image table | pagebreak | " +
          "removeformat fullscreen code",
        block_formats:
          "Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Preformatted=pre; Blockquote=blockquote",
        images_upload_handler: imageUploadHandler,
        automatic_uploads: true,
        file_picker_types: "image",
        link_default_target: "_blank",
        link_assume_external_targets: true,
        relative_urls: false,
        remove_script_host: false,
        convert_urls: false,
        content_style:
          "body { font-family: 'Georgia', serif; font-size: 16px; line-height: 1.8; color: #0f172a; padding: 16px 20px; } " +
          "h1 { font-size: 2em; font-weight: 800; margin: 1em 0 0.4em; } " +
          "h2 { font-size: 1.5em; font-weight: 700; margin: 1em 0 0.4em; } " +
          "h3 { font-size: 1.2em; font-weight: 600; margin: 0.8em 0 0.3em; } " +
          "blockquote { border-left: 3px solid #e63946; padding-left: 14px; color: #475569; font-style: italic; margin: 1em 0; } " +
          "pre { background: #0a1628; color: #e2e8f0; padding: 14px; border-radius: 4px; font-family: monospace; font-size: 13px; } " +
          "a { color: #e63946; text-decoration: underline; } " +
          "img { max-width: 100%; border-radius: 4px; }",
        table_default_styles: { width: "100%" },
        table_cell_advtab: false,
        table_row_advtab: false,
        table_appearance_options: false,
      }}
      onEditorChange={onChange}
    />
  );
}
