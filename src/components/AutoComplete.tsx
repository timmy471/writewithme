'use client';

import StarterKit from '@tiptap/starter-kit';
import BulletList from '@tiptap/extension-bullet-list';
import ListItem from '@tiptap/extension-list-item';
import Heading from '@tiptap/extension-heading';
import { PulseLoader } from 'react-spinners';
import { useEffect, useRef, useState } from 'react';
import Placeholder from '@tiptap/extension-placeholder';
import { useEditor, EditorContent } from '@tiptap/react';
import { keymap } from 'prosemirror-keymap';

export default function WriteWithMe() {
  const [suggestion, setSuggestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({}),
      Heading.configure({
        levels: [1, 2],
      }),
      Placeholder.configure({
        placeholder: 'Start typing...',
      }),
      BulletList,
      ListItem,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const { from } = editor.state.selection;

      const textBefore = editor.state.doc.textBetween(
        Math.max(0, from - 200),
        from,
        '\n',
        '\n'
      );

      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      if (textBefore.trim().length > 0 && isFocused) {
        debounceTimeout.current = setTimeout(() => {
          fetchSuggestion(textBefore);
        }, 800);
      } else {
        setSuggestion('');
      }
    },
  });

  useEffect(() => {
    if (!editor) return;

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    editor.on('focus', handleFocus);
    editor.on('blur', handleBlur);

    editor.registerPlugin(
      keymap({
        Tab: () => {
          // Prevent auto-nesting list
          return true; // prevent default
        },
      })
    );

    return () => {
      editor.off('focus', handleFocus);
      editor.off('blur', handleBlur);
    };
  }, [editor]);

  const fetchSuggestion = async (text: string) => {
    if (!text.trim()) {
      setSuggestion('');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/gemini-autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSuggestion(data.suggestion || '');
    } catch (err) {
      console.error('API Error:', err);
      setSuggestion('');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && suggestion) {
        e.preventDefault();
        editor?.commands.insertContent(suggestion.trimStart());
        setSuggestion('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, suggestion]);

  return (
    <div className='mx-auto mt-10 p-6 bg-white rounded-xl shadow-sm'>
      <label className='block text-xl font-semibold mb-4 text-gray-800'>
        ✍️ Write with me
      </label>

      <div className='mb-3 flex flex-wrap gap-2'>
        <button
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`px-2 py-1 rounded border text-sm ${
            editor?.isActive('bold') ? 'bg-blue-200' : 'bg-white'
          }`}>
          Bold
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 rounded border text-sm ${
            editor?.isActive('italic') ? 'bg-blue-200' : 'bg-white'
          }`}>
          Italic
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2 py-1 rounded border text-sm ${
            editor?.isActive('heading', { level: 1 }) ? 'bg-blue-200' : 'bg-white'
          }`}>
          H1
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 rounded border text-sm ${
            editor?.isActive('heading', { level: 2 }) ? 'bg-blue-200' : 'bg-white'
          }`}>
          H2
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 rounded border text-sm ${
            editor?.isActive('bulletList') ? 'bg-blue-200' : 'bg-white'
          }`}>
          • Bullet
        </button>
        {/* <button
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 rounded border text-sm ${
            editor?.isActive('orderedList') ? 'bg-blue-200' : 'bg-white'
          }`}>
          1. Numbered
        </button> */}
      </div>

      <div className='prose'>
        <div className='relative'>
          <EditorContent
            editor={editor}
            className={`w-full min-h-[200px] p-3 text-gray-900 border rounded focus:outline-none focus:ring-2 ${
              isFocused ? 'border-blue-300 ring-blue-200' : 'border-gray-300'
            }`}
          />
        </div>

        <div className='mt-2 flex items-center gap-2 min-h-8'>
          {isLoading && <PulseLoader color='#6b7280' size={8} />}
          {suggestion && (
            <>
              <span className='text-gray-600'>Suggest: {suggestion}</span>
              <span className='text-sm text-gray-400'>(Tab to accept)</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
