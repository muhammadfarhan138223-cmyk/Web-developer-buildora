import React, { useEffect, useMemo, useState } from 'react'
import {
  FileCode2, FileJson, FileText, FileType, Plus, Save, Trash2,
} from 'lucide-react'
import { useStore } from '../store.js'

function getFileIcon(path) {
  const ext = path.split('.').pop()?.toLowerCase()
  if (ext === 'json') return <FileJson className="w-4 h-4 text-amber-500" />
  if (ext === 'md') return <FileText className="w-4 h-4 text-neutral-500" />
  if (ext === 'css') return <FileType className="w-4 h-4 text-blue-500" />
  if (ext === 'html') return <FileCode2 className="w-4 h-4 text-orange-500" />
  return <FileCode2 className="w-4 h-4 text-primary-500" />
}

export default function CodeView({ files, activeFile, setActiveFile }) {
  const fileList = useMemo(() => Object.keys(files).sort(), [files])
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [dirty, setDirty] = useState(false)
  const updateFile = useStore((s) => s.updateFile)
  const deleteFile = useStore((s) => s.deleteFile)
  const refreshPreview = useStore((s) => s.refreshPreview)

  const filteredFiles = fileList.filter((path) =>
    path.toLowerCase().includes(search.toLowerCase()),
  )

  const currentContent = activeFile ? files[activeFile] : null

  useEffect(() => {
    setDraft(currentContent ?? '')
    setDirty(false)
  }, [activeFile, currentContent])

  function selectFile(path) {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return
    setActiveFile(path)
  }

  function saveFile() {
    if (!activeFile) return
    updateFile(activeFile, draft)
    refreshPreview()
    setDirty(false)
  }

  function createFile() {
    const path = window.prompt('New file path', 'src/App.jsx')?.trim()
    if (!path) return
    if (files[path]) {
      window.alert('A file with that path already exists.')
      return
    }
    updateFile(path, '')
    setActiveFile(path)
  }

  function removeFile() {
    if (!activeFile) return
    if (!window.confirm(`Delete ${activeFile}?`)) return
    deleteFile(activeFile)
    refreshPreview()
  }

  function handleKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      saveFile()
    }
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="w-56 shrink-0 border-r border-neutral-200 bg-neutral-50 flex flex-col">
        <div className="p-2 border-b border-neutral-200 space-y-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full text-sm rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-300"
          />
          <button onClick={createFile} className="btn-secondary btn-sm w-full">
            <Plus className="w-4 h-4" />
            New file
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {filteredFiles.length === 0 ? (
            <p className="text-xs text-neutral-400 px-3 py-4 text-center">No files found</p>
          ) : (
            filteredFiles.map((path) => (
              <button
                key={path}
                onClick={() => selectFile(path)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                  activeFile === path
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {getFileIcon(path)}
                <span className="truncate font-mono text-xs">{path}</span>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-neutral-200 px-3 py-2 text-xs text-neutral-400">
          {fileList.length} {fileList.length === 1 ? 'file' : 'files'}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        {currentContent !== null && currentContent !== undefined ? (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {getFileIcon(activeFile)}
                <span className="font-mono text-sm text-neutral-700 truncate">{activeFile}</span>
                {dirty && <span className="text-xs text-amber-600">Unsaved</span>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={saveFile} disabled={!dirty} className="btn-primary btn-sm">
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Save</span>
                </button>
                <button onClick={removeFile} className="btn-ghost btn-sm text-error-600" title="Delete file">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setDirty(true)
              }}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="flex-1 w-full resize-none border-0 bg-neutral-950 p-4 text-sm font-mono leading-6 text-neutral-100 outline-none"
              aria-label={`Editing ${activeFile}`}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-neutral-50">
            <div className="text-center">
              <FileCode2 className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm text-neutral-400">Select a file to view and edit it</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
