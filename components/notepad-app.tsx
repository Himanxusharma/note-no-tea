"use client"

import { useState, useEffect, useCallback } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Navbar } from "./notepad/navbar"
import { TopToolbar } from "./notepad/top-toolbar"
import { LeftSidebar } from "./notepad/left-sidebar"
import { EditorArea } from "./notepad/editor-area"
import { BottomStatusBar } from "./notepad/bottom-status-bar"
import { SearchReplaceDialog } from "./notepad/search-replace-dialog"
import { SettingsDialog } from "./notepad/settings-dialog"
import { EncryptionDialog } from "./notepad/encryption-dialog"
import { ClipboardHistoryPanel } from "./notepad/clipboard-history-panel"
import { KeyboardShortcutsDialog } from "./notepad/keyboard-shortcuts-dialog"
import { UndoHistoryDialog } from "./notepad/undo-history-dialog"
import { ExportDialog } from "./notepad/export-dialog"

export type Theme = "light" | "dark"
export type SyntaxTheme = "default" | "monokai" | "solarized" | "material"
export type FileType = "txt" | "md" | "code"
export type AccentColor = "default" | "mint" | "lavender" | "sunset" | "ocean" | "forest" | "slate"

export interface AppSettings {
  fontFamily: string
  fontSize: number
  lineSpacing: number
  autoSaveFrequency: number
  defaultFileFormat: string
  accentColor: AccentColor
  enableTexture: boolean
  wordWrap: boolean
}

export interface NoteFile {
  id: string
  name: string
  content: string
  fileType: FileType
  lastModified: Date
  encrypted?: boolean
  encryptedContent?: string
}

export interface ClipboardItem {
  id: string
  text: string
  timestamp: Date
}

interface HistoryEntry {
  content: string
  timestamp: Date
}

// Default welcome content - generated dynamically with current date/time
const getWelcomeContent = () => {
  const now = new Date()
  const dateStr = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit", 
    year: "numeric",
  })
  const timeStr = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  
  return `${dateStr}, ${timeStr}
─────────────────────`
}

// localStorage keys
const STORAGE_KEYS = {
  FILES: "notepad_files",
  ACTIVE_FILE_ID: "notepad_active_file_id",
  SETTINGS: "notepad_settings",
  THEME: "notepad_theme",
  RECENT_FILES: "notepad_recent_files",
}

// Helper to safely parse JSON from localStorage
const safeJSONParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

// Helper to restore Date objects from localStorage
const restoreFileDates = (files: NoteFile[]): NoteFile[] => {
  return files.map(file => ({
    ...file,
    lastModified: new Date(file.lastModified)
  }))
}

export function NotepadApp() {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<Theme>("light")
  const [syntaxTheme, setSyntaxTheme] = useState<SyntaxTheme>("default")
  const [sidebarOpen, setSidebarOpen] = useState(false) // Start closed, will open on desktop after mount
  const isMobile = useIsMobile()
  const [distractionFree, setDistractionFree] = useState(false)
  const [splitView, setSplitView] = useState<"none" | "vertical" | "horizontal">("none")
  const [autoSave, setAutoSave] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [encryptionOpen, setEncryptionOpen] = useState(false)
  const [clipboardOpen, setClipboardOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [undoHistoryOpen, setUndoHistoryOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [showSaveNotification, setShowSaveNotification] = useState(false)

  const [clipboardHistory, setClipboardHistory] = useState<ClipboardItem[]>([])

  const [settings, setSettings] = useState<AppSettings>({
    fontFamily: "Inter",
    fontSize: 15,
    lineSpacing: 1.6,
    autoSaveFrequency: 3000,
    defaultFileFormat: "txt",
    accentColor: "default",
    enableTexture: false,
    wordWrap: true,
  })

  const [files, setFiles] = useState<NoteFile[]>([])
  const [activeFileId, setActiveFileId] = useState("1")
  const [recentFiles, setRecentFiles] = useState<string[]>(["1"])

  const [history, setHistory] = useState<Map<string, HistoryEntry[]>>(new Map())
  const [historyIndex, setHistoryIndex] = useState<Map<string, number>>(new Map())

  // Computed value for active file
  const activeFile = files.find((f) => f.id === activeFileId) || files[0]

  // All useCallback hooks must be defined before any early return
  const addToClipboardHistory = useCallback((text: string) => {
    if (!text.trim()) return
    setClipboardHistory((prev) => {
      const filtered = prev.filter((item) => item.text !== text)
      const newItem: ClipboardItem = {
        id: Date.now().toString(),
        text,
        timestamp: new Date(),
      }
      return [newItem, ...filtered].slice(0, 20) // Keep last 20 items
    })
  }, [])

  const toggleDistractionFree = useCallback(() => {
    setDistractionFree((prev) => !prev)
  }, [])

  // Initialize files on client side only to avoid hydration mismatch
  // Load from localStorage if available, otherwise create default welcome file
  useEffect(() => {
    if (!mounted) {
      // Try to load saved data from localStorage
      const savedFiles = localStorage.getItem(STORAGE_KEYS.FILES)
      const savedActiveFileId = localStorage.getItem(STORAGE_KEYS.ACTIVE_FILE_ID)
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS)
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME)
      const savedRecentFiles = localStorage.getItem(STORAGE_KEYS.RECENT_FILES)

      if (savedFiles) {
        // Restore files from localStorage
        const parsedFiles = restoreFileDates(safeJSONParse<NoteFile[]>(savedFiles, []))
        if (parsedFiles.length > 0) {
          setFiles(parsedFiles)
          
          // Restore active file ID
          const activeId = savedActiveFileId || parsedFiles[0].id
          setActiveFileId(activeId)
          
          // Restore recent files
          if (savedRecentFiles) {
            setRecentFiles(safeJSONParse<string[]>(savedRecentFiles, [activeId]))
          }
          
          // Initialize history for all files
          const initialHistory = new Map<string, HistoryEntry[]>()
          const initialHistoryIndex = new Map<string, number>()
          parsedFiles.forEach(file => {
            initialHistory.set(file.id, [{ content: file.content, timestamp: new Date() }])
            initialHistoryIndex.set(file.id, 0)
          })
          setHistory(initialHistory)
          setHistoryIndex(initialHistoryIndex)
        } else {
          // No valid files, create default
          createDefaultFile()
        }
      } else {
        // No saved files, create default welcome file
        createDefaultFile()
      }

      // Restore settings
      if (savedSettings) {
        const parsedSettings = safeJSONParse<AppSettings>(savedSettings, settings)
        setSettings(parsedSettings)
      }

      // Restore theme
      if (savedTheme) {
        const parsedTheme = safeJSONParse<Theme>(savedTheme, "light")
        setTheme(parsedTheme)
      }

      setMounted(true)
    }
    
    function createDefaultFile() {
      const initialFile: NoteFile = {
        id: "1",
        name: "Welcome.txt",
        content: getWelcomeContent(),
        fileType: "txt",
        lastModified: new Date(),
      }
      setFiles([initialFile])
      setHistory(new Map([["1", [{ content: getWelcomeContent(), timestamp: new Date() }]]]))
      setHistoryIndex(new Map([["1", 0]]))
    }
  }, [mounted])

  // Set initial sidebar state: open on desktop, closed on mobile
  // Uses a ref to ensure this only runs once after initial mount
  const [sidebarInitialized, setSidebarInitialized] = useState(false)
  useEffect(() => {
    if (mounted && isMobile !== undefined && !sidebarInitialized) {
      setSidebarOpen(!isMobile)
      setSidebarInitialized(true)
    }
  }, [mounted, isMobile, sidebarInitialized])

  // Save files to localStorage whenever they change
  useEffect(() => {
    if (mounted && files.length > 0) {
      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files))
    }
  }, [mounted, files])

  // Save active file ID to localStorage
  useEffect(() => {
    if (mounted && activeFileId) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_FILE_ID, JSON.stringify(activeFileId))
    }
  }, [mounted, activeFileId])

  // Save settings to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
    }
  }, [mounted, settings])

  // Save theme to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(theme))
    }
  }, [mounted, theme])

  // Save recent files to localStorage
  useEffect(() => {
    if (mounted && recentFiles.length > 0) {
      localStorage.setItem(STORAGE_KEYS.RECENT_FILES, JSON.stringify(recentFiles))
    }
  }, [mounted, recentFiles])

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [theme])

  useEffect(() => {
    if (settings.accentColor !== "default") {
      document.documentElement.setAttribute("data-accent", settings.accentColor)
    } else {
      document.documentElement.removeAttribute("data-accent")
    }
  }, [settings.accentColor])

  useEffect(() => {
    if (!mounted) return // Don't add keyboard handlers until mounted
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "n":
            e.preventDefault()
            createNewFile()
            break
          case "f":
            e.preventDefault()
            setSearchOpen(true)
            break
          case "s":
            e.preventDefault()
            handleSave()
            break
          case "o":
            e.preventDefault()
            handleOpen()
            break
          case "e":
            if (e.shiftKey) {
              e.preventDefault()
              setSidebarOpen((prev) => !prev)
            } else {
              e.preventDefault()
              setExportOpen(true)
            }
            break
          case "k":
            e.preventDefault()
            setShortcutsOpen(true)
            break
          case "z":
            e.preventDefault()
            if (e.shiftKey) {
              handleRedo()
            } else {
              handleUndo()
            }
            break
          case "y":
            e.preventDefault()
            handleRedo()
            break
        }
      }
      if (e.key === "Escape" && distractionFree) {
        setDistractionFree(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mounted, activeFileId, history, historyIndex, distractionFree])

  useEffect(() => {
    if (autoSave && activeFile) {
      setShowSaveNotification(true)
      const timer = setTimeout(() => setShowSaveNotification(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [activeFile?.content, autoSave, activeFile])

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"))
  }

  const updateFileContent = (id: string, content: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, content, lastModified: new Date() } : f)))

    const fileHistory = history.get(id) || []
    const currentIndex = historyIndex.get(id) || 0

    const newHistory = fileHistory.slice(0, currentIndex + 1)
    newHistory.push({ content, timestamp: new Date() })

    if (newHistory.length > 50) {
      newHistory.shift()
    }

    setHistory(new Map(history.set(id, newHistory)))
    setHistoryIndex(new Map(historyIndex.set(id, newHistory.length - 1)))
  }

  const handleUndo = () => {
    const fileHistory = history.get(activeFileId) || []
    const currentIndex = historyIndex.get(activeFileId) || 0

    if (currentIndex > 0) {
      const newIndex = currentIndex - 1
      const previousContent = fileHistory[newIndex].content

      setFiles((prev) =>
        prev.map((f) => (f.id === activeFileId ? { ...f, content: previousContent, lastModified: new Date() } : f)),
      )
      setHistoryIndex(new Map(historyIndex.set(activeFileId, newIndex)))
    }
  }

  const handleRedo = () => {
    const fileHistory = history.get(activeFileId) || []
    const currentIndex = historyIndex.get(activeFileId) || 0

    if (currentIndex < fileHistory.length - 1) {
      const newIndex = currentIndex + 1
      const nextContent = fileHistory[newIndex].content

      setFiles((prev) =>
        prev.map((f) => (f.id === activeFileId ? { ...f, content: nextContent, lastModified: new Date() } : f)),
      )
      setHistoryIndex(new Map(historyIndex.set(activeFileId, newIndex)))
    }
  }

  const canUndo = () => {
    const currentIndex = historyIndex.get(activeFileId) || 0
    return currentIndex > 0
  }

  const canRedo = () => {
    const fileHistory = history.get(activeFileId) || []
    const currentIndex = historyIndex.get(activeFileId) || 0
    return currentIndex < fileHistory.length - 1
  }

  // Handle Insert from toolbar
  const handleInsert = (type: string) => {
    let textToInsert = ""
    const now = new Date()
    
    switch (type) {
      case "date":
        textToInsert = now.toLocaleDateString()
        break
      case "time":
        textToInsert = now.toLocaleTimeString()
        break
      case "datetime":
        textToInsert = now.toLocaleString()
        break
      case "line":
        textToInsert = "\n─────────────────────\n"
        break
      case "todo":
        textToInsert = "[ ] Todo item"
        break
      case "quote":
        textToInsert = "> Quote text here"
        break
      case "code":
        textToInsert = "```\ncode here\n```"
        break
      default:
        return
    }
    
    // Find the editor and insert at cursor position
    const editor = document.querySelector('[contenteditable="true"]') as HTMLDivElement
    if (editor) {
      editor.focus()
      
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        
        // Create text node and insert
        const textNode = document.createTextNode(textToInsert)
        range.insertNode(textNode)
        
        // Move cursor after inserted text
        range.setStartAfter(textNode)
        range.setEndAfter(textNode)
        selection.removeAllRanges()
        selection.addRange(range)
        
        // Get updated content and save
        const plainText = editor.innerText || editor.textContent || ""
        updateFileContent(activeFileId, plainText)
      } else {
        // Fallback: append to end if no selection
        const newContent = activeFile.content + (activeFile.content ? "\n" : "") + textToInsert
        updateFileContent(activeFileId, newContent)
      }
    } else {
      // Fallback if editor not found
      const newContent = activeFile.content + (activeFile.content ? "\n" : "") + textToInsert
      updateFileContent(activeFileId, newContent)
    }
  }

  const handleSave = () => {
    const blob = new Blob([activeFile.content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = activeFile.name
    a.click()
    URL.revokeObjectURL(url)
    setShowSaveNotification(true)
    setTimeout(() => setShowSaveNotification(false), 2000)
  }

  const handleOpen = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".txt,.md,.json,.html,.css,.js,.ts,.tsx,.jsx"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result as string
          const newFile: NoteFile = {
            id: Date.now().toString(),
            name: file.name,
            content,
            fileType: file.name.endsWith(".md") ? "md" : file.name.endsWith(".txt") ? "txt" : "code",
            lastModified: new Date(),
          }
          setFiles((prev) => [...prev, newFile])
          setActiveFileId(newFile.id)
          setRecentFiles((prev) => [newFile.id, ...prev.filter((id) => id !== newFile.id)].slice(0, 10))

          setHistory(new Map(history.set(newFile.id, [{ content, timestamp: new Date() }])))
          setHistoryIndex(new Map(historyIndex.set(newFile.id, 0)))
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const createNewFile = () => {
    const newFile: NoteFile = {
      id: Date.now().toString(),
      name: `Untitled.${settings.defaultFileFormat}`,
      content: "",
      fileType: settings.defaultFileFormat as FileType,
      lastModified: new Date(),
    }
    setFiles((prev) => [...prev, newFile])
    setActiveFileId(newFile.id)
    setRecentFiles((prev) => [newFile.id, ...prev.filter((id) => id !== newFile.id)].slice(0, 10))

    setHistory(new Map(history.set(newFile.id, [{ content: "", timestamp: new Date() }])))
    setHistoryIndex(new Map(historyIndex.set(newFile.id, 0)))
  }

  const deleteFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    if (activeFileId === id && files.length > 1) {
      setActiveFileId(files[0].id === id ? files[1].id : files[0].id)
    }
    setRecentFiles((prev) => prev.filter((fid) => fid !== id))

    history.delete(id)
    historyIndex.delete(id)
  }

  const renameFile = (id: string, newName: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, name: newName } : f)))
  }

  const duplicateFile = (id: string) => {
    const file = files.find((f) => f.id === id)
    if (file) {
      const nameParts = file.name.split(".")
      const extension = nameParts.pop() || ""
      const baseName = nameParts.join(".")
      const newFile: NoteFile = {
        id: Date.now().toString(),
        name: `${baseName} (copy).${extension}`,
        content: file.content,
        fileType: file.fileType,
        lastModified: new Date(),
      }
      setFiles((prev) => [...prev, newFile])
      setActiveFileId(newFile.id)
      setRecentFiles((prev) => [newFile.id, ...prev.filter((fid) => fid !== newFile.id)].slice(0, 10))
      setHistory(new Map(history.set(newFile.id, [{ content: newFile.content, timestamp: new Date() }])))
      setHistoryIndex(new Map(historyIndex.set(newFile.id, 0)))
    }
  }

  const selectFile = (id: string) => {
    setActiveFileId(id)
    setRecentFiles((prev) => [id, ...prev.filter((fid) => fid !== id)].slice(0, 10))
  }

  const encryptFile = (id: string, encryptedContent: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, encrypted: true, encryptedContent, content: "[Encrypted Content]" } : f)),
    )
  }

  const decryptFile = (id: string, decryptedContent: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, encrypted: false, encryptedContent: undefined, content: decryptedContent } : f,
      ),
    )
  }

  // Try to decrypt a file with password - returns true if successful
  const tryDecryptFile = (id: string, password: string): boolean => {
    const file = files.find((f) => f.id === id)
    if (!file || !file.encrypted || !file.encryptedContent) {
      return false
    }

    try {
      // Simple decryption (same as in encryption-dialog.tsx)
      const decoded = atob(file.encryptedContent)
      let result = ""
      for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(decoded.charCodeAt(i) ^ password.charCodeAt(i % password.length))
      }
      const decryptedContent = decodeURIComponent(escape(atob(result)))
      
      // If we got here without error, decryption succeeded
      decryptFile(id, decryptedContent)
      return true
    } catch {
      return false
    }
  }

  const toggleWordWrap = () => {
    setSettings((prev) => ({ ...prev, wordWrap: !prev.wordWrap }))
  }

  const recentFilesList = recentFiles.map((id) => files.find((f) => f.id === id)).filter(Boolean) as NoteFile[]

  // Show loading state until mounted
  if (!mounted || !activeFile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      {!distractionFree && <Navbar />}

      {!distractionFree && (
        <TopToolbar
          onNewFile={createNewFile}
          onOpen={handleOpen}
          onSave={handleSave}
          onSearch={() => setSearchOpen(true)}
          onSettings={() => setSettingsOpen(true)}
          onToggleTheme={toggleTheme}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onKeyboardShortcuts={() => setShortcutsOpen(true)}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onInsert={handleInsert}
          canUndo={canUndo()}
          canRedo={canRedo()}
          theme={theme}
          autoSave={autoSave}
          recentFiles={recentFilesList}
          onSelectRecentFile={selectFile}
          showSaveNotification={showSaveNotification}
          onToggleDistractionFree={toggleDistractionFree}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {!distractionFree && sidebarOpen && (
          <LeftSidebar
            files={files}
            activeFileId={activeFileId}
            onSelectFile={selectFile}
            onDeleteFile={deleteFile}
            onRenameFile={renameFile}
            onDuplicateFile={duplicateFile}
            onDecryptFile={tryDecryptFile}
            onCloseSidebar={() => setSidebarOpen(false)}
            content={activeFile?.content || ""}
          />
        )}

        <EditorArea
          file={activeFile}
          onContentChange={(content) => updateFileContent(activeFile.id, content)}
          syntaxTheme={syntaxTheme}
          splitView={splitView}
          autoSave={autoSave}
          settings={settings}
          onClipboardAdd={addToClipboardHistory}
          onToggleWordWrap={toggleWordWrap}
          distractionFree={distractionFree}
          onToggleDistractionFree={toggleDistractionFree}
        />
      </div>

      {!distractionFree && (
        <BottomStatusBar
          content={activeFile?.content || ""}
          fileType={activeFile?.fileType || "txt"}
          autoSave={autoSave}
          onToggleAutoSave={() => setAutoSave(!autoSave)}
        />
      )}

      <SearchReplaceDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        content={activeFile?.content || ""}
        onContentChange={(content) => updateFileContent(activeFile.id, content)}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        syntaxTheme={syntaxTheme}
        onSyntaxThemeChange={setSyntaxTheme}
        distractionFree={distractionFree}
        onDistractionFreeChange={setDistractionFree}
        splitView={splitView}
        onSplitViewChange={setSplitView}
        onEncryptionOpen={() => setEncryptionOpen(true)}
        onClipboardOpen={() => setClipboardOpen(true)}
        onUndoHistoryOpen={() => setUndoHistoryOpen(true)}
        onExportOpen={() => setExportOpen(true)}
        settings={settings}
        onSettingsChange={setSettings}
        currentFile={activeFile}
      />

      <EncryptionDialog
        open={encryptionOpen}
        onOpenChange={setEncryptionOpen}
        file={activeFile}
        onEncrypt={encryptFile}
        onDecrypt={decryptFile}
      />

      <ClipboardHistoryPanel
        open={clipboardOpen}
        onOpenChange={setClipboardOpen}
        history={clipboardHistory}
        onPaste={(text) => {
          if (activeFile) {
            updateFileContent(activeFile.id, activeFile.content + text)
          }
        }}
        onClear={() => setClipboardHistory([])}
      />

      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      <UndoHistoryDialog
        open={undoHistoryOpen}
        onOpenChange={setUndoHistoryOpen}
        history={(history.get(activeFileId) || []).map((entry, index) => ({
          id: index.toString(),
          timestamp: entry.timestamp,
          preview: entry.content.substring(0, 100),
        }))}
        currentIndex={historyIndex.get(activeFileId) || 0}
        onRestore={(index) => {
          const fileHistory = history.get(activeFileId) || []
          if (index >= 0 && index < fileHistory.length) {
            const content = fileHistory[index].content
            setFiles((prev) =>
              prev.map((f) => (f.id === activeFileId ? { ...f, content, lastModified: new Date() } : f)),
            )
            setHistoryIndex(new Map(historyIndex.set(activeFileId, index)))
          }
          setUndoHistoryOpen(false)
        }}
      />

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} file={activeFile} />
    </div>
  )
}
