import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import { starterFiles } from './lib/templates.js'
import { applyChanges, validateFiles } from './lib/files.js'

const createProjectId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return nanoid()
}

export const useStore = create(
  persist(
    (set) => ({
      // Auth
      user: null,
      authLoading: true,
      backendError: '',
      backendConfig: null,
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
          projectName: 'Studio / My first project',
          projectFiles: { 'index.html': '' },
          conversation: [],
          activeFile: 'index.html',
          previewKey: 0,
        }),
      setProjectName: (name) => set({ projectName: name }),
      setProjectFiles: (files) => set(state => ({ projectFiles: validateFiles(files), activeFile: Object.prototype.hasOwnProperty.call(files, state.activeFile) ? state.activeFile : Object.keys(files).sort()[0] || null })),
      updateFile: (path, content) =>
        set((state) => ({
          projectFiles: applyChanges(state.projectFiles, [{ type: 'write', path, content }]),
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
      storage: createJSONStorage(() => ({
        getItem: key => { try { return localStorage.getItem(key) } catch { return null } },
        setItem: (key, value) => { try { localStorage.setItem(key, value) } catch { window.dispatchEvent(new Event('buildora-storage-error')) } },
        removeItem: key => { try { localStorage.removeItem(key) } catch {} },
      })),
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
