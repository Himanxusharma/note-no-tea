"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import type { NoteFile, SyntaxTheme, AppSettings } from "../notepad-app"
import { TextSelectionToolbar } from "./text-selection-toolbar"
import { ContextMenu, buildEditorContextMenu, buildSelectionContextMenu } from "./context-menu"

interface EditorAreaProps {
  file: NoteFile
  onContentChange: (content: string) => void
  syntaxTheme: SyntaxTheme
  splitView: "none" | "vertical" | "horizontal"
  autoSave: boolean
  settings: AppSettings
  onClipboardAdd: (text: string) => void
  onToggleWordWrap: () => void
  distractionFree?: boolean
  onToggleDistractionFree?: () => void
}

function convertToHTML(text: string): string {
  let html = text
  html = html.replace(/^# (.+)$/gm, '<h2 class="text-2xl font-bold my-2">$1</h2>')

  // Convert bold **text** to <strong>text</strong>
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  // Convert italic *text* to <em>text</em>
  html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>")
  
  // Convert colored highlights =={color}:text== to <mark>text</mark>
  html = html.replace(/==\{yellow\}:(.+?)==/g, '<mark class="bg-yellow-200 dark:bg-yellow-500/30 px-0.5">$1</mark>')
  html = html.replace(/==\{green\}:(.+?)==/g, '<mark class="bg-green-200 dark:bg-green-500/30 px-0.5">$1</mark>')
  html = html.replace(/==\{blue\}:(.+?)==/g, '<mark class="bg-blue-200 dark:bg-blue-500/30 px-0.5">$1</mark>')
  html = html.replace(/==\{pink\}:(.+?)==/g, '<mark class="bg-pink-200 dark:bg-pink-500/30 px-0.5">$1</mark>')
  // Fallback for plain ==text== (default yellow)
  html = html.replace(/==(.+?)==/g, '<mark class="bg-yellow-200 dark:bg-yellow-500/30 px-0.5">$1</mark>')
  
  // Convert strikethrough ~~text~~ to <del>text</del>
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>")

  // Convert unchecked checkbox [ ] to interactive checkbox - Minimalist style
  // Note: Must match before newlines are converted to <br>
  // contenteditable="false" prevents cursor from entering the checkbox element
  html = html.replace(
    /\[ \] (.+?)(?=\n|$)/g,
    '<span class="todo-item" data-checked="false" contenteditable="false"><span class="todo-checkbox"></span><span class="todo-text">$1</span></span>'
  )
  
  // Convert checked checkbox [x] to interactive checkbox (with strikethrough) - Minimalist style
  html = html.replace(
    /\[x\] (.+?)(?=\n|$)/g,
    '<span class="todo-item" data-checked="true" contenteditable="false"><span class="todo-checkbox"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"></path></svg></span><span class="todo-text">$1</span></span>'
  )

  // Convert newlines to <br>
  html = html.replace(/\n/g, "<br>")
  return html
}

function convertToPlainText(html: string): string {
  let text = html
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "# $1")

  // Remove <br> and replace with newlines
  text = text.replace(/<br\s*\/?>/gi, "\n")
  // Convert <strong> back to **text**
  text = text.replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
  // Convert <em> back to *text*
  text = text.replace(/<em>(.*?)<\/em>/gi, "*$1*")
  // Convert <mark> back to ==text==
  text = text.replace(/<mark[^>]*>(.*?)<\/mark>/gi, "==$1==")
  // Convert <del> back to ~~text~~
  text = text.replace(/<del>(.*?)<\/del>/gi, "~~$1~~")
  
  // Convert checked todo items back to [x] format
  text = text.replace(/<span[^>]*data-checked="true"[^>]*>.*?<span class="todo-text[^>]*>([^<]*)<\/span><\/span>/gi, "[x] $1")
  // Convert unchecked todo items back to [ ] format
  text = text.replace(/<span[^>]*data-checked="false"[^>]*>.*?<span class="todo-text[^>]*>([^<]*)<\/span><\/span>/gi, "[ ] $1")
  
  // Remove any other HTML tags
  text = text.replace(/<[^>]*>/g, "")
  // Remove zero-width spaces (used for cursor positioning)
  text = text.replace(/\u200B/g, "")
  return text
}

export function EditorArea({
  file,
  onContentChange,
  syntaxTheme,
  splitView,
  settings,
  onClipboardAdd,
  onToggleWordWrap,
  distractionFree,
  onToggleDistractionFree,
}: EditorAreaProps) {
  const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null)
  const [selectedText, setSelectedText] = useState("")
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; hasSelection: boolean } | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null)
  // Store the actual Range object to restore selection after context menu actions
  const savedRangeRef = useRef<Range | null>(null)
  const savedTextRef = useRef<string>("")
  // Track if user is actively editing to prevent innerHTML sync from resetting cursor
  const isEditingRef = useRef<boolean>(false)

  // Handle checkbox toggle and move to Done section
  const handleCheckboxToggle = (lineText: string, isCurrentlyChecked: boolean) => {
    const lines = file.content.split("\n")
    
    // Find the "Done" section or create marker for it
    const doneHeaderIndex = lines.findIndex(line => line.trim().toLowerCase() === "# done" || line.trim().toLowerCase() === "done:")
    
    // Find the line that matches the todo item
    const todoPattern = isCurrentlyChecked ? `[x] ${lineText}` : `[ ] ${lineText}`
    const lineIndex = lines.findIndex(line => line.trim() === todoPattern)
    
    if (lineIndex === -1) return
    
    // Remove the line from its current position
    lines.splice(lineIndex, 1)
    
    if (isCurrentlyChecked) {
      // Unchecking - move from Done back to todos (top of file, after any existing unchecked items)
      const newLine = `[ ] ${lineText}`
      // Find the last unchecked todo or insert at top
      let insertIndex = 0
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith("[ ]")) {
          insertIndex = i + 1
        } else if (lines[i].trim().toLowerCase() === "# done" || lines[i].trim().toLowerCase() === "done:") {
          break
        }
      }
      lines.splice(insertIndex, 0, newLine)
    } else {
      // Checking - move to Done section
      const newLine = `[x] ${lineText}`
      
      // Find or create Done section
      let doneIndex = lines.findIndex(line => line.trim().toLowerCase() === "# done" || line.trim().toLowerCase() === "done:")
      
      if (doneIndex === -1) {
        // No Done section exists, create one at the end
        lines.push("") // Empty line before Done
        lines.push("# Done")
        lines.push(newLine)
      } else {
        // Insert after Done header
        lines.splice(doneIndex + 1, 0, newLine)
      }
    }
    
    onContentChange(lines.join("\n"))
  }

  // Handle click on the editor to detect checkbox clicks
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    
    // Check if clicked on a todo item or its children
    const todoItem = target.closest(".todo-item") as HTMLElement
    if (todoItem) {
      e.preventDefault()
      e.stopPropagation()
      
      const isChecked = todoItem.dataset.checked === "true"
      const textSpan = todoItem.querySelector(".todo-text")
      const lineText = textSpan?.textContent || ""
      
      if (lineText) {
        handleCheckboxToggle(lineText, isChecked)
      }
    }
  }

  useEffect(() => {
    // Skip innerHTML sync while user is actively editing to preserve cursor position
    if (isEditingRef.current) {
      isEditingRef.current = false
      return
    }
    if (editorRef.current) {
      const htmlContent = convertToHTML(file.content)
      if (editorRef.current.innerHTML !== htmlContent) {
        editorRef.current.innerHTML = htmlContent
      }
    }
  }, [file.content])

  const handleSelection = () => {
    const editor = editorRef.current
    if (!editor) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      setSelectionPos(null)
      setSelectedText("")
      setSelectionRange(null)
      return
    }

    const text = selection.toString()

    if (text.length > 0) {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const editorRect = editor.getBoundingClientRect()

      setSelectionPos({
        x: Math.min(Math.max(rect.left + rect.width / 2, editorRect.left + 50), editorRect.right - 100),
        y: Math.max(rect.top - 40, editorRect.top + 10),
      })
      setSelectedText(text)
      // Store the actual Range object for later use
      setSelectionRange({ start: 0, end: 0 }) // Placeholder, we'll use the actual selection
    } else {
      setSelectionPos(null)
      setSelectedText("")
      setSelectionRange(null)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const selection = window.getSelection()
    const hasSelection = selection && selection.toString().length > 0

    // Save the selection range before opening context menu
    if (hasSelection && selection.rangeCount > 0) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange()
      savedTextRef.current = selection.toString()
    } else {
      savedRangeRef.current = null
      savedTextRef.current = ""
    }

    setContextMenu({ x: e.clientX, y: e.clientY, hasSelection: !!hasSelection })
    if (hasSelection) {
      setSelectionRange({ start: 0, end: 0 }) // Placeholder
    }
  }

  const handleCut = async () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const selectedText = selection.toString()

    if (selectedText) {
      await navigator.clipboard.writeText(selectedText)
      onClipboardAdd(selectedText)
      selection.deleteFromDocument()

      // Update content
      if (editorRef.current) {
        const plainText = convertToPlainText(editorRef.current.innerHTML)
        onContentChange(plainText)
      }
    }
  }

  const handleCopy = async () => {
    const selection = window.getSelection()
    if (!selection) return

    const selectedText = selection.toString()

    if (selectedText) {
      await navigator.clipboard.writeText(selectedText)
      onClipboardAdd(selectedText)
    }
  }

  const handlePasteEvent = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()

    const text = e.clipboardData.getData("text/plain")

    // Insert text at current cursor position
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.deleteContents()
      range.insertNode(document.createTextNode(text))

      // Move cursor to end of inserted text
      range.collapse(false)
      selection.removeAllRanges()
      selection.addRange(range)

      // Update content
      if (editorRef.current) {
        const plainText = convertToPlainText(editorRef.current.innerHTML)
        onContentChange(plainText)
      }
    }
  }

  const handlePaste = () => {
    document.execCommand("paste")

    // Update content after paste
    setTimeout(() => {
      if (editorRef.current) {
        const plainText = convertToPlainText(editorRef.current.innerHTML)
        onContentChange(plainText)
      }
    }, 0)
  }

  const handleSelectAll = () => {
    const selection = window.getSelection()
    const range = document.createRange()
    if (editorRef.current) {
      range.selectNodeContents(editorRef.current)
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }

  const handleDuplicateLine = () => {
    // This feature is less straightforward with contenteditable, keeping basic implementation
    if (editorRef.current) {
      const plainText = convertToPlainText(editorRef.current.innerHTML)
      const lines = plainText.split("\n")
      const selection = window.getSelection()
      // Simple implementation - just duplicate the first line for now
      lines.splice(1, 0, lines[0])
      onContentChange(lines.join("\n"))
    }
  }

  const handleDeleteLine = () => {
    if (!editorRef.current) return
    
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    const plainText = convertToPlainText(editorRef.current.innerHTML)
    const lines = plainText.split("\n")
    
    if (lines.length === 0) return
    
    // Get the text content before the cursor to determine which line we're on
    const preCaretRange = document.createRange()
    preCaretRange.selectNodeContents(editorRef.current)
    preCaretRange.setEnd(range.startContainer, range.startOffset)
    
    // Count newlines before cursor to find current line number
    const textBeforeCursor = preCaretRange.toString()
    const currentLineIndex = textBeforeCursor.split("\n").length - 1
    
    // Delete the current line
    if (currentLineIndex >= 0 && currentLineIndex < lines.length) {
      lines.splice(currentLineIndex, 1)
      onContentChange(lines.join("\n"))
    }
    
    setContextMenu(null)
  }

  const handleFormat = () => {
    if (!editorRef.current) return
    const plainText = convertToPlainText(editorRef.current.innerHTML)

    try {
      const formatted = JSON.stringify(JSON.parse(plainText), null, 2)
      onContentChange(formatted)
    } catch {
      const content = plainText
      if (content.includes("<")) {
        const formatted = content
          .replace(/></g, ">\n<")
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line)
          .join("\n")
        onContentChange(formatted)
      }
    }
  }

  const handleToggleWordWrap = () => {
    onToggleWordWrap()
  }

  const handleClearAll = () => {
    onContentChange("")
    setContextMenu(null)
  }


  const handleHighlight = (color: string) => {
    // Get the saved text first
    const textToHighlight = savedTextRef.current
    
    if (!textToHighlight) {
      console.log("No saved text for highlight")
      setContextMenu(null)
      return
    }

    // Use string replacement - add colored highlight syntax =={color}:text==
    if (editorRef.current) {
      const currentContent = convertToPlainText(editorRef.current.innerHTML)
      const highlightSyntax = `=={${color}}:${textToHighlight}==`
      const newContent = currentContent.replace(textToHighlight, highlightSyntax)
      onContentChange(newContent)
    }

    savedRangeRef.current = null
    savedTextRef.current = ""
    setSelectionPos(null)
    setSelectionRange(null)
    setContextMenu(null)
  }

  const handleClearFormatting = () => {
    // Get the saved text first
    const textToClear = savedTextRef.current
    
    if (!textToClear) {
      console.log("No saved text for clear formatting")
      setContextMenu(null)
      return
    }

    if (editorRef.current) {
      // Get the current plain text content (with markdown syntax)
      const currentContent = convertToPlainText(editorRef.current.innerHTML)
      
      // Find and remove formatting around the selected text
      // The selectedText is the rendered text, we need to find its formatted version in the content
      let newContent = currentContent
      
      // Remove bold formatting: **text** -> text
      newContent = newContent.replace(new RegExp(`\\*\\*${escapeRegExp(textToClear)}\\*\\*`, 'g'), textToClear)
      
      // Remove italic formatting: *text* -> text
      newContent = newContent.replace(new RegExp(`\\*${escapeRegExp(textToClear)}\\*`, 'g'), textToClear)
      
      // Remove highlight formatting: =={color}:text== or ==text== -> text
      newContent = newContent.replace(new RegExp(`==\\{[^}]+\\}:${escapeRegExp(textToClear)}==`, 'g'), textToClear)
      newContent = newContent.replace(new RegExp(`==${escapeRegExp(textToClear)}==`, 'g'), textToClear)
      
      // Remove strikethrough formatting: ~~text~~ -> text
      newContent = newContent.replace(new RegExp(`~~${escapeRegExp(textToClear)}~~`, 'g'), textToClear)
      
      // Remove heading formatting: # text -> text (at start of line)
      newContent = newContent.replace(new RegExp(`^# ${escapeRegExp(textToClear)}`, 'gm'), textToClear)
      
      onContentChange(newContent)
    }

    savedRangeRef.current = null
    savedTextRef.current = ""
    setContextMenu(null)
    setSelectionPos(null)
  }
  
  // Helper function to escape special regex characters
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  const handleConvertCase = (caseType: "upper" | "lower" | "title") => {
    // Get the saved text first
    const textToConvert = savedTextRef.current
    
    if (!textToConvert) {
      console.log("No saved text for convert case")
      setContextMenu(null)
      return
    }

    let convertedText = textToConvert

    // Apply case conversion
    if (caseType === "upper") {
      convertedText = textToConvert.toUpperCase()
    } else if (caseType === "lower") {
      convertedText = textToConvert.toLowerCase()
    } else if (caseType === "title") {
      // Title case: capitalize first letter of each word
      convertedText = textToConvert.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
    }

    // Use string replacement in the content (most reliable method)
    if (editorRef.current) {
      const currentContent = convertToPlainText(editorRef.current.innerHTML)
      // Replace only the first occurrence of the selected text
      const newContent = currentContent.replace(textToConvert, convertedText)
      onContentChange(newContent)
    }

    savedRangeRef.current = null
    savedTextRef.current = ""
    setContextMenu(null)
    setSelectionPos(null)
  }

  const handleBold = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const selectedText = selection.toString()
    if (!selectedText) return

    const range = selection.getRangeAt(0)
    
    // Check if already bold by looking at parent elements
    let isAlreadyBold = false
    let boldParent: HTMLElement | null = null
    
    let node: Node | null = range.commonAncestorContainer
    while (node && node !== editorRef.current) {
      if (node.nodeName === "STRONG" || node.nodeName === "B") {
        isAlreadyBold = true
        boldParent = node as HTMLElement
        break
      }
      node = node.parentNode
    }

    if (isAlreadyBold && boldParent) {
      // Remove bold - replace <strong> with its text content
      const textNode = document.createTextNode(boldParent.textContent || "")
      boldParent.parentNode?.replaceChild(textNode, boldParent)
    } else {
      // Add bold
      range.deleteContents()
      const boldNode = document.createElement("strong")
      boldNode.textContent = selectedText
      range.insertNode(boldNode)
    }

    // Update the plain text content
    if (editorRef.current) {
      const plainText = convertToPlainText(editorRef.current.innerHTML)
      onContentChange(plainText)
    }

    setSelectionPos(null)
    setSelectionRange(null)
  }

  const handleItalic = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const selectedText = selection.toString()
    if (!selectedText) return

    const range = selection.getRangeAt(0)
    
    // Check if already italic by looking at parent elements
    let isAlreadyItalic = false
    let italicParent: HTMLElement | null = null
    
    let node: Node | null = range.commonAncestorContainer
    while (node && node !== editorRef.current) {
      if (node.nodeName === "EM" || node.nodeName === "I") {
        isAlreadyItalic = true
        italicParent = node as HTMLElement
        break
      }
      node = node.parentNode
    }

    if (isAlreadyItalic && italicParent) {
      // Remove italic - replace <em> with its text content
      const textNode = document.createTextNode(italicParent.textContent || "")
      italicParent.parentNode?.replaceChild(textNode, italicParent)
    } else {
      // Add italic
      range.deleteContents()
      const italicNode = document.createElement("em")
      italicNode.textContent = selectedText
      range.insertNode(italicNode)
    }

    // Update the plain text content
    if (editorRef.current) {
      const plainText = convertToPlainText(editorRef.current.innerHTML)
      onContentChange(plainText)
    }

    setSelectionPos(null)
    setSelectionRange(null)
  }

  const handleHighlightSelection = () => {
    // For floating toolbar - get current selection
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    
    const textToHighlight = selection.toString()
    if (!textToHighlight) return
    
    // Apply yellow highlight using string replacement
    if (editorRef.current) {
      const currentContent = convertToPlainText(editorRef.current.innerHTML)
      const highlightSyntax = `=={yellow}:${textToHighlight}==`
      const newContent = currentContent.replace(textToHighlight, highlightSyntax)
      onContentChange(newContent)
    }
    
    setSelectionPos(null)
    setSelectionRange(null)
  }

  const handleBulletPoints = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    
    // Get the selected content as HTML to properly handle <br> tags
    const fragment = range.cloneContents()
    const tempDiv = document.createElement("div")
    tempDiv.appendChild(fragment)
    
    // Replace <br> tags with newlines, then get text content
    tempDiv.innerHTML = tempDiv.innerHTML.replace(/<br\s*\/?>/gi, "\n")
    const selectedText = tempDiv.textContent || ""

    if (selectedText) {
      // Split by newlines
      const lines = selectedText.split("\n").filter((line) => line.trim().length > 0)
      
      // Check if all non-empty lines already have bullet points
      const bulletPattern = /^[\s]*[•\-\*]\s*/
      const allHaveBullets = lines.every((line) => bulletPattern.test(line))
      
      let processedLines: string[]
      
      if (allHaveBullets) {
        // Remove bullets from all lines
        processedLines = lines.map((line) => line.replace(bulletPattern, "").trim())
      } else {
        // Toggle: add bullet to lines without, keep lines with bullets as is
        processedLines = lines.map((line) => {
          if (bulletPattern.test(line)) {
            // Already has bullet, keep it but normalize format with tab
            return `\t• ${line.replace(bulletPattern, "").trim()}`
          } else {
            // Add bullet with tab indentation
            return `\t• ${line.trim()}`
          }
        })
      }
      
      // Delete selected content
      range.deleteContents()
      
      // Create a document fragment with lines separated by <br>
      const docFragment = document.createDocumentFragment()
      processedLines.forEach((line, index) => {
        docFragment.appendChild(document.createTextNode(line))
        if (index < processedLines.length - 1) {
          docFragment.appendChild(document.createElement("br"))
        }
      })
      
      range.insertNode(docFragment)

      if (editorRef.current) {
        const plainText = convertToPlainText(editorRef.current.innerHTML)
        onContentChange(plainText)
      }
    }

    setSelectionPos(null)
    setSelectionRange(null)
  }

  const handleHeading = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const selectedText = selection.toString()
    if (!selectedText) return

    const range = selection.getRangeAt(0)
    range.deleteContents()

    const headingNode = document.createElement("h2")
    headingNode.className = "text-2xl font-bold my-2"
    headingNode.textContent = selectedText
    range.insertNode(headingNode)

    // Move cursor after heading
    range.setStartAfter(headingNode)
    range.setEndAfter(headingNode)
    selection.removeAllRanges()
    selection.addRange(range)

    if (editorRef.current) {
      const plainText = convertToPlainText(editorRef.current.innerHTML)
      onContentChange(plainText)
    }

    setSelectionPos(null)
    setSelectionRange(null)
  }

  const getSyntaxThemeClass = () => {
    switch (syntaxTheme) {
      case "monokai":
        return "bg-[#272822] text-[#F8F8F2]"
      case "solarized":
        return "bg-[#002b36] text-[#839496]"
      case "material":
        return "bg-[#263238] text-[#EEFFFF]"
      default:
        return "bg-background text-foreground"
    }
  }

  const editorStyle = {
    fontFamily:
      settings.fontFamily === "Inter"
        ? "var(--font-sans)"
        : settings.fontFamily === "JetBrains Mono" || settings.fontFamily === "Fira Code"
          ? "var(--font-mono)"
          : settings.fontFamily,
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineSpacing,
    caretColor: "var(--color-sidebar-primary)",
  }

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (editorRef.current) {
      // Set editing flag to prevent useEffect from resetting innerHTML and cursor
      isEditingRef.current = true
      let plainText = convertToPlainText(editorRef.current.innerHTML)
      
      // Auto-convert shortcuts to todo format:
      // "[] " -> "[ ] " (checkbox)
      // "- " at start of line -> "[ ] " (checkbox)
      // "* " at start of line -> "[ ] " (checkbox)
      const autoConvertPatterns = [
        { pattern: /\[\] /g, replacement: "[ ] " },
        { pattern: /^- $/gm, replacement: "[ ] " },
        { pattern: /^-$/gm, replacement: "[ ] " },
        { pattern: /\n- $/g, replacement: "\n[ ] " },
      ]
      
      let wasConverted = false
      autoConvertPatterns.forEach(({ pattern, replacement }) => {
        if (pattern.test(plainText)) {
          plainText = plainText.replace(pattern, replacement)
          wasConverted = true
        }
      })
      
      onContentChange(plainText)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      range.deleteContents()

      // Create a br element for the line break
      const br = document.createElement("br")
      range.insertNode(br)

      // Check if we're at the end of the editor (no content after the br)
      // In this case, we need to add another br or a text node for the cursor
      const isAtEnd = !br.nextSibling || 
        (br.nextSibling.nodeType === Node.TEXT_NODE && !br.nextSibling.textContent?.trim())

      if (isAtEnd) {
        // Add a second br element - browsers need this to show cursor on new line at end
        const br2 = document.createElement("br")
        br.parentNode?.insertBefore(br2, br.nextSibling)
      }

      // Move cursor after the first br (to the new line)
      const newRange = document.createRange()
      newRange.setStartAfter(br)
      newRange.collapse(true)
      selection.removeAllRanges()
      selection.addRange(newRange)

      if (editorRef.current) {
        // Set editing flag to prevent useEffect from resetting innerHTML and cursor
        isEditingRef.current = true
        const plainText = convertToPlainText(editorRef.current.innerHTML)
        onContentChange(plainText)
      }
    }
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden relative">
      {distractionFree && onToggleDistractionFree && (
        <button
          onClick={onToggleDistractionFree}
          className="fixed top-4 right-4 z-50 px-3 py-1.5 text-xs font-medium rounded-lg bg-foreground/10 hover:bg-foreground/20 text-foreground/70 hover:text-foreground transition-all duration-200 backdrop-blur-sm border border-border/50"
        >
          Exit Focus Mode
        </button>
      )}

      <div
        className={`flex-1 ${
          splitView === "vertical" ? "flex flex-col md:flex-row" : splitView === "horizontal" ? "flex flex-col" : ""
        } overflow-hidden`}
      >
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePasteEvent}
            onClick={handleEditorClick}
            onMouseUp={handleSelection}
            onKeyUp={handleSelection}
            onContextMenu={handleContextMenu}
            className={`flex-1 w-full resize-none px-4 md:px-8 lg:px-16 py-6 md:py-8 lg:py-12 focus:outline-none transition-colors overflow-auto ${getSyntaxThemeClass()} ${
              settings.enableTexture ? "texture-subtle" : ""
            }`}
            style={{
              ...editorStyle,
              whiteSpace: settings.wordWrap ? "pre-wrap" : "pre",
              overflowX: settings.wordWrap ? "hidden" : "auto",
            }}
            suppressContentEditableWarning
          />
        </div>

        {splitView !== "none" && (
          <div className="flex-1 flex flex-col overflow-hidden border-l border-border">
            <div
              contentEditable
              onInput={handleInput}
              onPaste={handlePasteEvent}
              onContextMenu={handleContextMenu}
              className={`flex-1 w-full resize-none px-4 md:px-8 lg:px-16 py-6 md:py-8 lg:py-12 focus:outline-none transition-colors overflow-auto ${getSyntaxThemeClass()} ${
                settings.enableTexture ? "texture-subtle" : ""
              }`}
              style={{
                ...editorStyle,
                whiteSpace: settings.wordWrap ? "pre-wrap" : "pre",
                overflowX: settings.wordWrap ? "hidden" : "auto",
              }}
              dangerouslySetInnerHTML={{ __html: convertToHTML(file.content) }}
              suppressContentEditableWarning
            />
          </div>
        )}
      </div>

      {selectionPos && (
        <TextSelectionToolbar
          x={selectionPos.x}
          y={selectionPos.y}
          selectedText={selectedText}
          onClose={() => {
            setSelectionPos(null)
            setSelectionRange(null)
          }}
          onBold={handleBold}
          onItalic={handleItalic}
          onHighlight={handleHighlightSelection}
          onBulletPoints={handleBulletPoints}
          onHeading={handleHeading}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={
            contextMenu.hasSelection
              ? buildSelectionContextMenu(
                  handleCut,
                  handleCopy,
                  handlePaste,
                  handleHighlight,
                  handleClearFormatting,
                  handleConvertCase,
                  handleClearAll,
                )
              : buildEditorContextMenu(
                  contextMenu.hasSelection,
                  handleCut,
                  handleCopy,
                  handlePaste,
                  handleSelectAll,
                  handleDuplicateLine,
                  handleDeleteLine,
                  handleFormat,
                  handleToggleWordWrap,
                  handleClearAll,
                )
          }
          onClose={() => {
            setContextMenu(null)
            setSelectionRange(null)
          }}
        />
      )}

    </main>
  )
}
