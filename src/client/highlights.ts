// Client-side highlights functionality

// Types
type Highlight = {
  id: string;
  startOffset: number;
  endOffset: number;
  highlightedText: string;
  isStale: boolean;
  createdAt: number;
};

// State
let highlights: Highlight[] = [];
let popup: HTMLElement | null = null;
let currentSelection: { text: string; range: Range } | null = null;

// Initialize highlights on page load
export const initHighlights = (): void => {
  const contentArea = document.querySelector(".content");
  if (!contentArea) {
    return;
  }

  // Fetch existing highlights for this page
  fetchHighlights();

  // Listen for text selection
  document.addEventListener("mouseup", handleTextSelection);
  document.addEventListener("touchend", handleTextSelection);

  // Close popup when clicking outside
  document.addEventListener("click", (e) => {
    if (popup && !popup.contains(e.target as Node)) {
      hidePopup();
    }
  });
};

// Fetch highlights for current page
const fetchHighlights = async (): Promise<void> => {
  try {
    const currentPath = window.location.pathname.replace("/view/", "");
    const response = await fetch(
      `/api/highlights/resource?path=${encodeURIComponent(currentPath)}`
    );

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    highlights = data.highlights || [];

    // Render highlights on the page
    renderHighlights();
  } catch (err) {
    console.error("[highlights] Failed to fetch highlights:", err);
  }
};

// Handle text selection
const handleTextSelection = (e: Event): void => {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    hidePopup();
    return;
  }

  const selectedText = selection.toString().trim();
  if (!selectedText) {
    hidePopup();
    return;
  }

  // Make sure selection is within content area
  const contentArea = document.querySelector(".content");
  if (!contentArea) {
    return;
  }

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const parentElement = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;

  if (!(parentElement && contentArea.contains(parentElement))) {
    hidePopup();
    return;
  }

  // Store current selection
  currentSelection = {
    text: selectedText,
    range: range.cloneRange(),
  };

  // Show popup near selection
  showPopup(e as MouseEvent);
};

// Show highlight creation popup
const showPopup = (e: MouseEvent): void => {
  if (!popup) {
    popup = createPopup();
    document.body.appendChild(popup);
  }

  // Position popup near cursor
  const x = e.pageX;
  const y = e.pageY;

  popup.style.left = `${x}px`;
  popup.style.top = `${y - 50}px`; // Position above cursor
  popup.style.display = "block";
};

// Hide popup
const hidePopup = (): void => {
  if (popup) {
    popup.style.display = "none";
  }
  currentSelection = null;
};

// Create popup element with notes textarea
const createPopup = (): HTMLElement => {
  const div = document.createElement("div");
  div.className = "highlight-popup";
  div.innerHTML = `
    <textarea 
      class="highlight-notes-input" 
      placeholder="Add a note (optional)"
      rows="2"
      style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--fg); font-size: 13px; resize: vertical; margin-bottom: 8px; font-family: inherit;"
    ></textarea>
    <button class="highlight-create-btn" type="button">
      Create Highlight
    </button>
  `;

  // Add click handler
  const btn = div.querySelector(".highlight-create-btn");
  if (btn) {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await createHighlight();
    });
  }

  return div;
};

// Create highlight via API
const createHighlight = async (): Promise<void> => {
  if (!currentSelection) {
    return;
  }

  try {
    // Calculate offsets in the document
    const contentArea = document.querySelector(".content");
    if (!contentArea) {
      return;
    }

    const _fullText = contentArea.textContent || "";
    const range = currentSelection.range;

    // Find the start offset by getting all text before the selection
    const preRange = document.createRange();
    preRange.selectNodeContents(contentArea);
    preRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preRange.toString().length;
    const endOffset = startOffset + currentSelection.text.length;

    // Get notes from textarea
    const notesInput = popup?.querySelector(".highlight-notes-input") as HTMLTextAreaElement;
    const notes = notesInput?.value.trim() || undefined;

    // Send to API
    const currentPath = window.location.pathname.replace("/view/", "");
    const response = await fetch("/api/highlights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resourcePath: currentPath,
        startOffset,
        endOffset,
        highlightedText: currentSelection.text,
        notes,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create highlight");
    }

    const data = await response.json();

    // Add to local state
    highlights.push({
      id: data.id,
      startOffset,
      endOffset,
      highlightedText: currentSelection.text,
      isStale: false,
      createdAt: Date.now(),
    });

    // Re-render highlights
    renderHighlights();

    // Clear textarea
    if (notesInput) {
      notesInput.value = "";
    }

    // Hide popup and clear selection
    hidePopup();
    window.getSelection()?.removeAllRanges();
  } catch (err) {
    console.error("[highlights] Failed to create highlight:", err);
    // TODO: Replace with non-obtrusive UI notification
  }
};

// Render highlights on the page
const renderHighlights = (): void => {
  const contentArea = document.querySelector(".content");
  if (!contentArea) {
    return;
  }

  // Remove existing highlight marks
  const existingMarks = contentArea.querySelectorAll("mark.llmd-highlight");
  for (const mark of existingMarks) {
    const parent = mark.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
    }
  }

  // Normalize text nodes after removal
  contentArea.normalize();

  if (highlights.length === 0) {
    return;
  }

  // Sort highlights by start offset (reverse so we can apply from end to start)
  const sortedHighlights = [...highlights].sort((a, b) => b.startOffset - a.startOffset);

  // Get all text content
  const _fullText = contentArea.textContent || "";

  // Apply each highlight
  for (const highlight of sortedHighlights) {
    try {
      // Find the text nodes that contain this highlight
      const walker = document.createTreeWalker(contentArea, NodeFilter.SHOW_TEXT);

      let currentOffset = 0;
      let startNode: Node | null = null;
      let startNodeOffset = 0;
      let endNode: Node | null = null;
      let endNodeOffset = 0;

      // Find start and end nodes
      let node: Node | null = walker.nextNode();
      while (node) {
        const nodeLength = node.textContent?.length || 0;
        const nodeEnd = currentOffset + nodeLength;

        if (
          startNode === null &&
          currentOffset <= highlight.startOffset &&
          highlight.startOffset < nodeEnd
        ) {
          startNode = node;
          startNodeOffset = highlight.startOffset - currentOffset;
        }

        if (currentOffset < highlight.endOffset && highlight.endOffset <= nodeEnd) {
          endNode = node;
          endNodeOffset = highlight.endOffset - currentOffset;
          break;
        }

        currentOffset = nodeEnd;
        node = walker.nextNode();
      }

      if (!(startNode && endNode)) {
        continue;
      }

      // Create range and wrap in mark element
      const range = document.createRange();
      range.setStart(startNode, startNodeOffset);
      range.setEnd(endNode, endNodeOffset);

      const mark = document.createElement("mark");
      mark.className = highlight.isStale ? "llmd-highlight llmd-highlight-stale" : "llmd-highlight";
      mark.dataset.highlightId = highlight.id;
      mark.title = highlight.isStale ? "This highlight may be outdated" : "";

      range.surroundContents(mark);
    } catch (err) {
      console.error("[highlights] Failed to render highlight:", err);
    }
  }
};
