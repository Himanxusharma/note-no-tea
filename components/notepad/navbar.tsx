"use client"
import { useState, useEffect } from "react"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

export function Navbar() {
  const [year, setYear] = useState<number | null>(null)
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    setYear(new Date().getFullYear())
  }, [])

  return (
    <TooltipProvider delayDuration={300}>
      <nav className="flex items-center justify-between border-b border-border bg-card px-4 md:px-6 py-3">
        {/* Left spacer for centering */}
        <div className="flex-1" />

        {/* Centered brand name with animated tea icon */}
        <Tooltip>
          <TooltipTrigger asChild>
            <h1 
              className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-1.5 cursor-default select-none"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <span>Note No</span>
              
              {/* Animated Tea Cup Container */}
              <span className={`relative inline-flex items-center justify-center transition-all duration-300 ${isHovering ? 'w-12 h-12 -my-2' : 'w-8 h-8'}`}>
                {/* Tea cup SVG */}
                <svg 
                  viewBox="0 0 32 32" 
                  className={`transition-all duration-300 ${isHovering ? 'w-9 h-9 rotate-[25deg] translate-x-0.5' : 'w-6 h-6'}`}
                >
                  {/* Cup body */}
                  <path 
                    d="M6 10 L6 22 Q6 26 12 26 L16 26 Q22 26 22 22 L22 10 Z" 
                    className="fill-amber-600 dark:fill-amber-500"
                  />
                  {/* Cup handle */}
                  <path 
                    d="M22 12 Q28 12 28 18 Q28 24 22 24" 
                    className="stroke-amber-600 dark:stroke-amber-500" 
                    strokeWidth="2.5" 
                    fill="none"
                  />
                  {/* Tea liquid */}
                  <ellipse 
                    cx="14" 
                    cy="12" 
                    rx="7" 
                    ry="2" 
                    className="fill-amber-800 dark:fill-amber-700"
                  />
                  {/* Steam lines */}
                  <g className={`transition-all duration-500 ${isHovering ? 'opacity-0' : 'opacity-60'}`}>
                    <path 
                      d="M10 6 Q11 3 10 0" 
                      className="stroke-muted-foreground" 
                      strokeWidth="1" 
                      fill="none" 
                      strokeLinecap="round"
                    />
                    <path 
                      d="M14 5 Q15 2 14 -1" 
                      className="stroke-muted-foreground" 
                      strokeWidth="1" 
                      fill="none" 
                      strokeLinecap="round"
                    />
                    <path 
                      d="M18 6 Q19 3 18 0" 
                      className="stroke-muted-foreground" 
                      strokeWidth="1" 
                      fill="none" 
                      strokeLinecap="round"
                    />
                  </g>
                </svg>

                {/* Spilling tea drops - appear on hover */}
                <span 
                  className={`absolute top-3 -right-1 flex flex-col gap-0.5 transition-all duration-300 ${
                    isHovering ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
                  }`}
                >
                  <span 
                    className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-500 animate-bounce" 
                    style={{ animationDelay: '0ms', animationDuration: '600ms' }}
                  />
                  <span 
                    className="w-1 h-1 rounded-full bg-amber-600 dark:bg-amber-500 animate-bounce ml-0.5" 
                    style={{ animationDelay: '100ms', animationDuration: '600ms' }}
                  />
                  <span 
                    className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-500 animate-bounce" 
                    style={{ animationDelay: '200ms', animationDuration: '600ms' }}
                  />
                </span>

                {/* Strike through line */}
                <span 
                  className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                    isHovering ? 'rotate-[25deg]' : ''
                  }`}
                >
                  <span className="w-7 h-0.5 bg-red-500 rotate-[-35deg] rounded-full" />
                </span>
              </span>
            </h1>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>No tea breaks, just notes! ☕️❌</p>
          </TooltipContent>
        </Tooltip>

        {/* Copyright on the right */}
        <div className="flex-1 flex justify-end">
          <span className="text-xs text-muted-foreground">© {year ?? "2025"}</span>
        </div>
      </nav>
    </TooltipProvider>
  )
}
