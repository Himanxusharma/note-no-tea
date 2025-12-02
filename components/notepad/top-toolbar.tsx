"use client"

import {
  FilePlus,
  FolderOpen,
  Save,
  Search,
  Undo,
  Redo,
  Settings,
  Moon,
  Sun,
  PanelLeft,
  Clock,
  Keyboard,
  Maximize,
  FileText,
  Plus,
  Calendar,
  Clock3,
  CalendarClock,
  Minus,
  CheckSquare,
  Quote,
  Code,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Theme, NoteFile } from "../notepad-app"

interface TopToolbarProps {
  onNewFile: () => void
  onOpen: () => void
  onSave: () => void
  onSearch: () => void
  onSettings: () => void
  onToggleTheme: () => void
  onToggleSidebar: () => void
  onKeyboardShortcuts: () => void
  onUndo: () => void
  onRedo: () => void
  onInsert: (type: string) => void
  canUndo: boolean
  canRedo: boolean
  theme: Theme
  autoSave: boolean
  recentFiles: NoteFile[]
  onSelectRecentFile: (id: string) => void
  showSaveNotification: boolean
  onToggleDistractionFree: () => void
}

export function TopToolbar({
  onNewFile,
  onOpen,
  onSave,
  onSearch,
  onSettings,
  onToggleTheme,
  onToggleSidebar,
  onKeyboardShortcuts,
  onUndo,
  onRedo,
  onInsert,
  canUndo,
  canRedo,
  theme,
  autoSave,
  recentFiles,
  onSelectRecentFile,
  showSaveNotification,
  onToggleDistractionFree,
}: TopToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <header className="flex items-center justify-between border-b border-border gradient-toolbar px-3 md:px-6 py-2 md:py-3 shadow-soft">
        <div className="flex items-center gap-1 md:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleSidebar}
                className="h-8 w-8 md:h-9 md:w-9 btn-hover-lift"
                aria-label="Toggle Sidebar"
              >
                <PanelLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle Sidebar (Ctrl+Shift+E)</p>
            </TooltipContent>
          </Tooltip>

          <div className="hidden sm:block h-6 w-px bg-border" aria-hidden="true" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onNewFile} 
                className="h-8 w-8 md:h-9 md:w-9 btn-hover-lift"
                aria-label="New File"
              >
                <FilePlus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>New File (Ctrl+N)</p>
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 md:h-9 md:w-9 btn-hover-lift"
                    aria-label="Recent Files"
                  >
                    <Clock className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Recent Files</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-56 glassmorphic shadow-soft-lg">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Recent Files</div>
              <DropdownMenuSeparator />
              {recentFiles.length > 0 ? (
                recentFiles.map((file) => (
                  <DropdownMenuItem key={file.id} onClick={() => onSelectRecentFile(file.id)}>
                    <FileText className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                    <span className="truncate">{file.name}</span>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="px-2 py-3 text-xs text-muted-foreground">No recent files</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpen}
                className="hidden sm:flex h-8 w-8 md:h-9 md:w-9 btn-hover-lift"
                aria-label="Open File"
              >
                <FolderOpen className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open File (Ctrl+O)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSave}
                className="hidden sm:flex h-8 w-8 md:h-9 md:w-9 btn-hover-lift"
                aria-label="Save File"
              >
                <Save className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Save File (Ctrl+S)</p>
            </TooltipContent>
          </Tooltip>

          <div className="hidden md:block h-6 w-px bg-border" aria-hidden="true" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onSearch} 
                className="h-8 w-8 md:h-9 md:w-9 btn-hover-lift"
                aria-label="Search and Replace"
              >
                <Search className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Search & Replace (Ctrl+F)</p>
            </TooltipContent>
          </Tooltip>

          <div className="hidden md:block h-6 w-px bg-border" aria-hidden="true" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onUndo}
                disabled={!canUndo}
                className="hidden md:flex h-8 w-8 md:h-9 md:w-9 btn-hover-lift disabled:opacity-30"
                aria-label="Undo"
              >
                <Undo className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Undo (Ctrl+Z)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRedo}
                disabled={!canRedo}
                className="hidden md:flex h-8 w-8 md:h-9 md:w-9 btn-hover-lift disabled:opacity-30"
                aria-label="Redo"
              >
                <Redo className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Redo (Ctrl+Shift+Z)</p>
            </TooltipContent>
          </Tooltip>

          <div className="hidden md:block h-6 w-px bg-border" aria-hidden="true" />

          {/* Quick Add Task Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onInsert("todo")}
                className="h-8 w-8 md:h-9 md:w-9 btn-hover-lift"
                aria-label="Add Task"
              >
                <CheckSquare className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add Task (Ctrl+Shift+T)</p>
            </TooltipContent>
          </Tooltip>

          {/* Insert Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 md:h-9 md:w-9 btn-hover-lift"
                    aria-label="Insert content"
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Insert</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-48 bg-background/60 backdrop-blur-md border border-border/30 shadow-lg">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground/80">Insert</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onInsert("date")}>
                <Calendar className="mr-2 h-4 w-4" strokeWidth={1.5} />
                <span>Date</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onInsert("time")}>
                <Clock3 className="mr-2 h-4 w-4" strokeWidth={1.5} />
                <span>Time</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onInsert("datetime")}>
                <CalendarClock className="mr-2 h-4 w-4" strokeWidth={1.5} />
                <span>Date & Time</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onInsert("line")}>
                <Minus className="mr-2 h-4 w-4" strokeWidth={1.5} />
                <span>Horizontal Line</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onInsert("todo")}>
                <CheckSquare className="mr-2 h-4 w-4" strokeWidth={1.5} />
                <span>Todo Item</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onInsert("quote")}>
                <Quote className="mr-2 h-4 w-4" strokeWidth={1.5} />
                <span>Quote Block</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onInsert("code")}>
                <Code className="mr-2 h-4 w-4" strokeWidth={1.5} />
                <span>Code Block</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1 md:gap-3">
          {autoSave && showSaveNotification && (
            <span className="hidden md:inline text-xs text-muted-foreground animate-in fade-in-50 duration-300 save-ripple">
              Saved
            </span>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleDistractionFree}
                className="hidden sm:flex h-8 w-8 md:h-9 md:w-9 btn-hover-lift"
                aria-label="Focus Mode"
              >
                <Maximize className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Focus Mode (Distraction Free)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onKeyboardShortcuts}
                className="hidden sm:flex h-8 w-8 md:h-9 md:w-9 btn-hover-lift"
                aria-label="Keyboard Shortcuts"
              >
                <Keyboard className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Keyboard Shortcuts (Ctrl+K)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onSettings} 
                className="h-8 w-8 md:h-9 md:w-9 btn-hover-lift"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleTheme}
                className="h-8 w-8 md:h-9 md:w-9 btn-hover-lift"
                aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                ) : (
                  <Sun className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle Theme</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  )
}
