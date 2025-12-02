"use client"
import { useState, useEffect } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"

export function Navbar() {
  const [year, setYear] = useState<number | null>(null)

  useEffect(() => {
    setYear(new Date().getFullYear())
  }, [])

  return (
    <TooltipProvider delayDuration={300}>
      <nav className="flex items-center justify-between border-b border-border bg-card px-4 md:px-6 py-3">
        {/* Left spacer for centering */}
        <div className="flex-1" />

        {/* Centered brand name */}
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Random Notes</h1>

        {/* Copyright on the right */}
        <div className="flex-1 flex justify-end">
          <span className="text-xs text-muted-foreground">© {year ?? "2025"}</span>
        </div>
      </nav>
    </TooltipProvider>
  )
}
