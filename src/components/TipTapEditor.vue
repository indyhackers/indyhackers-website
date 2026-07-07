<template>
  <div class="tiptap-editor-wrapper">
    <div v-if="editor" class="tiptap-toolbar">
      <button
        type="button"
        class="toolbar-btn"
        :class="{ 'is-active': editor.isActive('bold') }"
        title="Bold"
        aria-label="Bold"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <IMdiFormatBold />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        :class="{ 'is-active': editor.isActive('italic') }"
        title="Italic"
        aria-label="Italic"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <IMdiFormatItalic />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        :class="{ 'is-active': editor.isActive('strike') }"
        title="Strikethrough"
        aria-label="Strikethrough"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        <IMdiFormatStrikethrough />
      </button>

      <span class="toolbar-divider" aria-hidden="true"></span>

      <button
        type="button"
        class="toolbar-btn"
        :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
        title="Heading"
        aria-label="Heading"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        <IMdiFormatHeader2 />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
        title="Subheading"
        aria-label="Subheading"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        <IMdiFormatHeader3 />
      </button>

      <span class="toolbar-divider" aria-hidden="true"></span>

      <button
        type="button"
        class="toolbar-btn"
        :class="{ 'is-active': editor.isActive('bulletList') }"
        title="Bullet list"
        aria-label="Bullet list"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <IMdiFormatListBulleted />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        :class="{ 'is-active': editor.isActive('orderedList') }"
        title="Numbered list"
        aria-label="Numbered list"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        <IMdiFormatListNumbered />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        :class="{ 'is-active': editor.isActive('blockquote') }"
        title="Quote"
        aria-label="Quote"
        @click="editor.chain().focus().toggleBlockquote().run()"
      >
        <IMdiFormatQuoteClose />
      </button>
    </div>
    <editor-content :editor="editor" class="tiptap-editor" />
  </div>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

export default {
  components: {
    EditorContent
  },

  props: {
    modelValue: {
      type: String,
      default: ''
    }
  },

  emits: ['update:modelValue'],

  data() {
    return {
      // Left deeply reactive on purpose: it lets the toolbar's `editor.isActive(...)`
      // states re-render as the selection/formatting changes.
      editor: null
    }
  },

  mounted() {
    this.editor = new Editor({
      content: this.modelValue,
      extensions: [StarterKit],
      onUpdate: ({ editor }) => {
        this.$emit('update:modelValue', editor.getHTML())
      }
    })
  },

  watch: {
    modelValue(newValue) {
      if (this.editor && newValue !== this.editor.getHTML()) {
        this.editor.commands.setContent(newValue, false)
      }
    }
  },

  beforeUnmount() {
    this.editor?.destroy()
  }
}
</script>

<style scoped>
/* TipTap Editor */
.tiptap-editor-wrapper {
  border-radius: 5px;
  border: 1px solid color-mix(in srgb, var(--border) 30%, var(--surface-1));
  transition: border-color 0.3s ease;
  overflow: hidden;
}

.tiptap-editor-wrapper:focus-within {
  border-color: var(--focus-ring);
  box-shadow: 0 0 8px color-mix(in srgb, var(--focus-ring) 20%, transparent);
}

.tiptap-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.15rem;
  padding: 0.35rem 0.5rem;
  background: var(--surface-2);
  border-bottom: 1px solid color-mix(in srgb, var(--border) 30%, var(--surface-1));
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.9rem;
  height: 1.9rem;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 1.1rem;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.toolbar-btn:hover {
  background: color-mix(in srgb, var(--text-primary) 10%, transparent);
  color: var(--text-primary);
}

.toolbar-btn.is-active {
  background: color-mix(in srgb, var(--focus-ring) 20%, transparent);
  color: var(--text-primary);
}

.toolbar-divider {
  width: 1px;
  align-self: stretch;
  margin: 0.2rem 0.25rem;
  background: color-mix(in srgb, var(--border) 40%, transparent);
}

:deep(.tiptap-editor) {
  padding: 1rem;
}
</style>
