import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'

const createProjectId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return nanoid()
}

const DEFAULT_PROJECT_FILES = {
  'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Website</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-white text-gray-900">
    <div id="app"></div>
    <script type="module" src="/main.js"></script>
  </body>
</html>`,
  'main.js': `document.getElementById('app').innerHTML = \`
  <main class="min-h-screen flex items-center justify-center px-6">
    <section class="text-center">
      <p class="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Buildora</p>
      <h1 class="mt-3 text-4xl font-bold tracking-tight text-gray-900">Your project starts here.</h1>
      <p class="mt-4 max-w-lg text-gray-600">Describe what you want in the chat and Buildora will create or update the project files.</p>
    </section>
  </main>
\`;
`,
}

export const useStore = create(
  persist(
    (set) => ({
      // Auth
      user: null,
      authLoading: true,
      setUser: (user) => set({ user, authLoading: false }),

      // Project
      projectId: null,
      projectName: 'Untitled Project',
      projectFiles: {},
      setProject: (project) =>
        set({
          projectId: project.id,
          projectName: project.name,
          projectFiles: project.files || {},
        }),
      newProject: () =>
        set({
          projectId: createProjectId(),
          projectName: 'Untitled Project',
          projectFiles: { ...DEFAULT_PROJECT_FILES },
          conversation: [],
          activeFile: 'index.html',
          previewKey: 0,
        }),
      setProjectName: (name) => set({ projectName: name }),
      setProjectFiles: (files) => set({ projectFiles: files }),
      updateFile: (path, content) =>
        set((state) => ({
          projectFiles: { ...state.projectFiles, [path]: content },
        })),
      deleteFile: (path) =>
        set((state) => {
          const files = { ...state.projectFiles }
          delete files[path]
          return {
            projectFiles: files,
            activeFile: state.activeFile === path ? null : state.activeFile,
          }
        }),
      applyOperations: (operations) =>
        set((state) => {
          const files = { ...state.projectFiles }
          for (const op of operations) {
            if (!op?.path) continue
            if (op.type === 'write') files[op.path] = op.content || ''
            if (op.type === 'delete') delete files[op.path]
          }
          const activeFile = state.activeFile && files[state.activeFile]
            ? state.activeFile
            : Object.keys(files).sort()[0] || null
          return { projectFiles: files, activeFile }
        }),

      // Conversation
      conversation: [],
      addMessage: (message) =>
        set((state) => ({
          conversation: [...state.conversation, { ...message, id: nanoid() }],
        })),
      setConversation: (messages) => set({ conversation: messages }),
      clearConversation: () => set({ conversation: [] }),

      // AI generation state
      isGenerating: false,
      progress: [],
      generatingError: null,
      setGenerating: (isGenerating) => set({ isGenerating }),
      setGeneratingError: (error) => set({ generatingError: error }),
      addProgress: (step) => {
        const id = nanoid()
        set((state) => ({
          progress: [...state.progress, { ...step, id }],
        }))
        return id
      },
      updateProgress: (id, updates) =>
        set((state) => ({
          progress: state.progress.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
      clearProgress: () => set({ progress: [] }),

      // UI state
      activeFile: null,
      previewKey: 0,
      setActiveFile: (path) => set({ activeFile: path }),
      refreshPreview: () => set((state) => ({ previewKey: state.previewKey + 1 })),
    }),
    {
      name: 'nexusai-builder-state',
      version: 2,
      migrate: (persistedState) => ({
        ...persistedState,
        projectId: typeof persistedState?.projectId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(persistedState.projectId)
          ? persistedState.projectId
          : createProjectId(),
      }),
      partialize: (state) => ({
        projectId: state.projectId,
        projectName: state.projectName,
        projectFiles: state.projectFiles,
        conversation: state.conversation,
        activeFile: state.activeFile,
      }),
    },
  ),
)
