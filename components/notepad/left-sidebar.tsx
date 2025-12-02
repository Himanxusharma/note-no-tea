"use client"

import type React from "react"

import { useState } from "react"
import { FileText, Clock, MoreVertical, Trash2, Edit2, Copy, Lock, Unlock, KeyRound, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { NoteFile } from "../notepad-app"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ContextMenu, buildFileContextMenu } from "./context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface TodoItem {
  text: string
  checked: boolean
  lineIndex: number
}

interface LeftSidebarProps {
  files: NoteFile[]
  activeFileId: string
  onSelectFile: (id: string) => void
  onDeleteFile: (id: string) => void
  onRenameFile: (id: string, newName: string) => void
  onDuplicateFile: (id: string) => void
  onDecryptFile: (id: string, password: string) => boolean
  onCloseSidebar: () => void
  content: string
  onContentChange?: (content: string) => void
}

export function LeftSidebar({
  files,
  activeFileId,
  onSelectFile,
  onDeleteFile,
  onRenameFile,
  onDuplicateFile,
  onDecryptFile,
  onCloseSidebar,
  content,
  onContentChange,
}: LeftSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; fileId: string } | null>(null)
  const [unlockDialog, setUnlockDialog] = useState<{ open: boolean; fileId: string; fileName: string } | null>(null)
  const [unlockPassword, setUnlockPassword] = useState("")
  const [unlockError, setUnlockError] = useState("")
  const [newTodoText, setNewTodoText] = useState("")
  const [isAddingTodo, setIsAddingTodo] = useState(false)

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length
  const charCount = content.length

  // Parse todos from content
  const parseTodos = (): { pending: TodoItem[]; done: TodoItem[] } => {
    const lines = content.split("\n")
    const pending: TodoItem[] = []
    const done: TodoItem[] = []

    lines.forEach((line, index) => {
      const uncheckedMatch = line.match(/^\[ \] (.+)$/)
      const checkedMatch = line.match(/^\[x\] (.+)$/)

      if (uncheckedMatch) {
        pending.push({ text: uncheckedMatch[1], checked: false, lineIndex: index })
      } else if (checkedMatch) {
        done.push({ text: checkedMatch[1], checked: true, lineIndex: index })
      }
    })

    return { pending, done }
  }

  const { pending: pendingTodos, done: doneTodos } = parseTodos()

  // Toggle a todo item
  const toggleTodo = (todo: TodoItem) => {
    if (!onContentChange) return

    const lines = content.split("\n")
    if (todo.checked) {
      // Uncheck: change [x] to [ ]
      lines[todo.lineIndex] = `[ ] ${todo.text}`
    } else {
      // Check: change [ ] to [x]
      lines[todo.lineIndex] = `[x] ${todo.text}`
    }
    onContentChange(lines.join("\n"))
  }

  // Add a new todo
  const addTodo = () => {
    if (!onContentChange || !newTodoText.trim()) return

    const newTodoLine = `[ ] ${newTodoText.trim()}`
    const lines = content.split("\n")
    
    // Find a good place to insert (after existing unchecked todos, or at start)
    let insertIndex = 0
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^\[ \] /)) {
        insertIndex = i + 1
      }
    }

    // If no todos found, add after any header-like content
    if (insertIndex === 0 && lines.length > 0) {
      // Skip initial content that looks like a header
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        if (lines[i].trim() && !lines[i].match(/^\[.\] /)) {
          insertIndex = i + 1
        } else {
          break
        }
      }
    }

    lines.splice(insertIndex, 0, newTodoLine)
    onContentChange(lines.join("\n"))
    setNewTodoText("")
    setIsAddingTodo(false)
  }

  // Delete a todo
  const deleteTodo = (todo: TodoItem) => {
    if (!onContentChange) return

    const lines = content.split("\n")
    lines.splice(todo.lineIndex, 1)
    onContentChange(lines.join("\n"))
  }

  const startRename = (file: NoteFile) => {
    setEditingId(file.id)
    setEditName(file.name)
  }

  const finishRename = () => {
    if (editingId && editName.trim()) {
      onRenameFile(editingId, editName.trim())
    }
    setEditingId(null)
  }

  const handleFileContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, fileId })
  }

  const handleDuplicate = (fileId: string) => {
    onDuplicateFile(fileId)
  }

  const handleMove = (fileId: string) => {
    // Note: Move to folder would require folder structure implementation
    // For now, we'll show a notification that this feature requires folders
    alert("Move to folder requires folder structure. Create folders first!")
  }

  const handleFileClick = (file: NoteFile) => {
    if (file.encrypted) {
      // Show unlock dialog for encrypted files
      setUnlockDialog({ open: true, fileId: file.id, fileName: file.name })
      setUnlockPassword("")
      setUnlockError("")
    } else {
      onSelectFile(file.id)
    }
  }

  const handleUnlock = () => {
    if (!unlockDialog || !unlockPassword.trim()) {
      setUnlockError("Please enter a password")
      return
    }

    const success = onDecryptFile(unlockDialog.fileId, unlockPassword)
    if (success) {
      setUnlockDialog(null)
      setUnlockPassword("")
      setUnlockError("")
      onSelectFile(unlockDialog.fileId)
    } else {
      setUnlockError("Wrong password. Please try again.")
    }
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onCloseSidebar}
      />
      <aside className="fixed md:relative inset-y-0 left-0 z-50 w-72 max-w-[85vw] md:max-w-none border-r border-border glassmorphic shadow-soft flex flex-col sidebar-expand md:z-auto">
      <div className="p-4 md:p-6 border-b border-sidebar-border">
        <h2 className="text-sm font-medium text-sidebar-foreground mb-4">Files</h2>
        <div className="space-y-1">
          {files.map((file, index) => (
            <div
              key={file.id}
              className={`group flex items-center justify-between rounded-lg px-3 py-2 transition-all duration-200 cursor-pointer tab-slide-in ${
                file.id === activeFileId
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                  : "hover:bg-sidebar-accent/50"
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => handleFileClick(file)}
              onContextMenu={(e) => handleFileContextMenu(e, file.id)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {file.encrypted ? (
                  <Lock className="h-4 w-4 flex-shrink-0 text-amber-500" strokeWidth={1.5} />
                ) : (
                  <FileText className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                )}
                {editingId === file.id ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={finishRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") finishRename()
                      if (e.key === "Escape") setEditingId(null)
                    }}
                    className="h-6 text-sm"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-sm truncate">{file.name}</span>
                )}
                {file.encrypted && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    Encrypted
                  </span>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glassmorphic shadow-soft-lg">
                  <DropdownMenuItem onClick={() => startRename(file)}>
                    <Edit2 className="h-3 w-3 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate(file.id)}>
                    <Copy className="h-3 w-3 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDeleteFile(file.id)} className="text-destructive">
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </div>

      {/* Todo Section - Minimalist Design */}
      <div className="p-4 md:p-6 border-b border-sidebar-border flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Tasks
          </h2>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setIsAddingTodo(true)}
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Add Todo Input - Minimalist */}
        {isAddingTodo && (
          <div className="mb-4">
            <input
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-sm placeholder:text-muted-foreground/50 transition-colors"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTodoText.trim()) addTodo()
                if (e.key === "Escape") {
                  setIsAddingTodo(false)
                  setNewTodoText("")
                }
              }}
              onBlur={() => {
                if (!newTodoText.trim()) {
                  setIsAddingTodo(false)
                }
              }}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Empty State */}
          {pendingTodos.length === 0 && doneTodos.length === 0 && !isAddingTodo && (
            <button
              className="w-full text-left py-3 text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              onClick={() => setIsAddingTodo(true)}
            >
              + Add a task...
            </button>
          )}

          {/* Pending Todos */}
          <div className="space-y-0.5">
            {pendingTodos.map((todo, idx) => (
              <div
                key={`pending-${idx}`}
                className="group flex items-center gap-3 py-2 cursor-pointer"
                onClick={() => toggleTodo(todo)}
              >
                <div className="w-4 h-4 rounded border border-muted-foreground/40 group-hover:border-foreground transition-colors flex-shrink-0" />
                <span className="text-sm flex-1 truncate text-foreground/90 group-hover:text-foreground transition-colors">
                  {todo.text}
                </span>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteTodo(todo)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>

          {/* Done Section */}
          {doneTodos.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-2">
                Completed · {doneTodos.length}
              </p>
              <div className="space-y-0.5">
                {doneTodos.map((todo, idx) => (
                  <div
                    key={`done-${idx}`}
                    className="group flex items-center gap-3 py-1.5 cursor-pointer opacity-40 hover:opacity-60 transition-opacity"
                    onClick={() => toggleTodo(todo)}
                  >
                    <div className="w-4 h-4 rounded border border-foreground/30 bg-foreground/30 flex-shrink-0 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm flex-1 truncate line-through">
                      {todo.text}
                    </span>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteTodo(todo)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 md:p-6 border-b border-sidebar-border">
        <h2 className="text-sm font-medium text-sidebar-foreground mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" strokeWidth={1.5} />
          Recent
        </h2>
        <div className="space-y-2">
          {files.slice(0, 3).map((file) => (
            <button
              key={file.id}
              onClick={() => onSelectFile(file.id)}
              className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors truncate"
            >
              {file.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-6 mt-auto">
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Words</span>
            <span className="font-medium">{wordCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Characters</span>
            <span className="font-medium">{charCount}</span>
          </div>
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildFileContextMenu(
            () => onSelectFile(contextMenu.fileId),
            () => {
              const file = files.find((f) => f.id === contextMenu.fileId)
              if (file) startRename(file)
            },
            () => handleDuplicate(contextMenu.fileId),
            () => handleMove(contextMenu.fileId),
            () => onDeleteFile(contextMenu.fileId),
          )}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Unlock Encrypted File Dialog */}
      <Dialog open={unlockDialog?.open || false} onOpenChange={(open) => !open && setUnlockDialog(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md glassmorphic">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-500" />
              Unlock File
            </DialogTitle>
            <DialogDescription>
              Enter password to unlock "{unlockDialog?.fileName}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="unlock-password">Password</Label>
              <Input
                id="unlock-password"
                type="password"
                placeholder="Enter password..."
                value={unlockPassword}
                onChange={(e) => {
                  setUnlockPassword(e.target.value)
                  setUnlockError("")
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUnlock()
                }}
                autoFocus
              />
            </div>
            {unlockError && (
              <p className="text-sm text-destructive flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {unlockError}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setUnlockDialog(null)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleUnlock} className="flex-1">
              <Unlock className="h-4 w-4 mr-2" />
              Unlock
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
    </>
  )
}
