"use client"

import { Keyboard, Command } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const shortcuts = [
    { keys: ["Ctrl", "N"], action: "New File" },
    { keys: ["Ctrl", "O"], action: "Open File" },
    { keys: ["Ctrl", "S"], action: "Save File" },
    { keys: ["Ctrl", "Shift", "S"], action: "Save As" },
    { keys: ["Ctrl", "F"], action: "Search" },
    { keys: ["Ctrl", "H"], action: "Find & Replace" },
    { keys: ["Ctrl", "Z"], action: "Undo" },
    { keys: ["Ctrl", "Y"], action: "Redo" },
    { keys: ["Ctrl", "Shift", "T"], action: "Add Task" },
    { keys: ["Ctrl", "Shift", "E"], action: "Toggle Sidebar" },
    { keys: ["Ctrl", "/"], action: "Comment Toggle" },
    { keys: ["Ctrl", "K"], action: "Keyboard Shortcuts" },
    { keys: ["Ctrl", "B"], action: "Bold" },
    { keys: ["Ctrl", "I"], action: "Italic" },
    { keys: ["Ctrl", ","], action: "Settings" },
    { keys: ["F11"], action: "Distraction-Free Mode" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 py-4">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 sm:py-2.5 px-2 sm:px-3 rounded-lg hover:bg-muted/50 transition-colors gap-2"
            >
              <span className="text-xs sm:text-sm text-foreground flex-shrink-0">{shortcut.action}</span>
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                {shortcut.keys.map((key, keyIndex) => (
                  <div key={keyIndex} className="flex items-center gap-0.5 sm:gap-1">
                    <kbd className="inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium bg-muted border border-border rounded shadow-sm min-w-[24px] sm:min-w-[28px]">
                      {key === "Ctrl" ? <Command className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : key}
                    </kbd>
                    {keyIndex < shortcut.keys.length - 1 && <span className="text-muted-foreground text-[10px] sm:text-xs">+</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 text-xs bg-muted border border-border rounded">Ctrl+K</kbd> anytime to
            view shortcuts
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
