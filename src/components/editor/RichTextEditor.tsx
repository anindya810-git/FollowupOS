'use client'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useState } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon,
  Quote, Heading2, Undo2, Redo2, Code, Pilcrow,
} from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  signatureHtml?: string | null
}

function ToolbarButton({
  active, onClick, disabled, children, title,
}: {
  active?: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      disabled={disabled}
      className={`h-7 w-7 inline-flex items-center justify-center rounded text-[rgb(11_18_32/70%)] hover:bg-[rgb(11_18_32/6%)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${
        active ? 'bg-[rgb(11_18_32/10%)] text-ink' : ''
      }`}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor, signatureHtml }: { editor: Editor; signatureHtml?: string | null }) {
  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-rule bg-paper-2 flex-wrap">
      <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="w-px h-4 bg-rule mx-1" />
      <ToolbarButton title="Heading" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Paragraph" active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()}>
        <Pilcrow className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="w-px h-4 bg-rule mx-1" />
      <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Code" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="w-px h-4 bg-rule mx-1" />
      <ToolbarButton
        title="Insert link"
        active={editor.isActive('link')}
        onClick={() => {
          const previous = editor.getAttributes('link').href as string | undefined
          const url = window.prompt('URL', previous || 'https://')
          if (url === null) return
          if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
            return
          }
          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
        }}
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <span className="w-px h-4 bg-rule mx-1" />
      <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <Undo2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <Redo2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      {signatureHtml ? (
        <>
          <span className="w-px h-4 bg-rule mx-1" />
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault() }}
            onClick={() => {
              editor.chain().focus().insertContent('<p>—</p>' + signatureHtml).run()
            }}
            className="text-[11px] px-2 h-7 rounded hover:bg-[rgb(11_18_32/6%)] text-[rgb(11_18_32/70%)] transition-colors"
          >
            Insert signature
          </button>
        </>
      ) : null}
    </div>
  )
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your reply…',
  minHeight = 160,
  signatureHtml,
}: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-action underline' } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-3 py-2.5 text-ink',
        style: `min-height: ${minHeight}px;`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    immediatelyRender: false,
  })

  // Sync external value changes (e.g. "Use this draft" button)
  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value, editor])

  if (!mounted || !editor) {
    return (
      <div className="border border-rule rounded-md bg-white" style={{ minHeight: minHeight + 40 }}>
        <div className="h-9 border-b border-rule bg-paper-2" />
        <div className="p-3 text-sm text-[rgb(11_18_32/30%)]">Loading editor…</div>
      </div>
    )
  }

  return (
    <div className="border border-rule rounded-md bg-white overflow-hidden focus-within:border-[rgb(11_18_32/30%)] transition-colors">
      <Toolbar editor={editor} signatureHtml={signatureHtml} />
      <EditorContent editor={editor} />
    </div>
  )
}
