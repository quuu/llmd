// Client-side highlights summary for markdown pages

// Helper: format date
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

// Helper: scroll to highlight
const scrollToHighlight = (highlightId: string): void => {
  const highlight = document.querySelector(`[data-highlight-id="${highlightId}"]`);
  if (highlight) {
    highlight.scrollIntoView({ behavior: "smooth", block: "center" });
    // Flash animation
    highlight.classList.add("highlight-flash");
    setTimeout(() => {
      highlight.classList.remove("highlight-flash");
    }, 1000);
  }
};

// Initialize highlights summary
export const initHighlightsSummary = (): void => {
  const contentArea = document.querySelector(".content");
  if (!contentArea) {
    return;
  }

  // Get current file path from window location
  const pathname = window.location.pathname;
  if (!pathname.startsWith("/view/")) {
    return;
  }

  const filePath = pathname.slice(6); // Remove "/view/"

  // Fetch highlights for this file
  fetch(`/api/highlights/resource?path=${encodeURIComponent(filePath)}`)
    .then((res) => res.json())
    .then((data) => {
      const highlights = data.highlights || [];
      if (highlights.length === 0) {
        return;
      }

      // Create summary section
      const summary = document.createElement("div");
      summary.className = "highlights-summary";
      summary.innerHTML = `
        <div style="background: var(--code-bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
          <h3 style="font-size: 0.875rem; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; opacity: 0.8; display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 16px;">✨</span>
            Highlights (${highlights.length})
          </h3>
          <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px;">
            ${highlights
              .map(
                (h: {
                  id: string;
                  highlightedText: string;
                  isStale: boolean;
                  createdAt: number;
                }) => {
                  const staleIcon = h.isStale
                    ? '<span style="color: #f44336; margin-left: 4px;" title="Stale - file has changed">⚠️</span>'
                    : "";
                  const staleLine = h.isStale
                    ? ' style="text-decoration: line-through; opacity: 0.5;"'
                    : "";
                  const previewText =
                    h.highlightedText.length > 80
                      ? `${h.highlightedText.slice(0, 80)}...`
                      : h.highlightedText;

                  return `
                    <li style="margin: 8px 0; padding: 8px; background: var(--bg); border-radius: 4px; border-left: 3px solid var(--accent); cursor: pointer; transition: background 0.2s;" 
                        onmouseover="this.style.background='var(--hover)'" 
                        onmouseout="this.style.background='var(--bg)'"
                        onclick="(${scrollToHighlight.toString()})('${h.id}')">
                      <div${staleLine}>${previewText}</div>
                      <div style="opacity: 0.5; font-size: 12px; margin-top: 4px;">
                        ${formatDate(h.createdAt)}${staleIcon}
                      </div>
                    </li>
                  `;
                }
              )
              .join("")}
          </ul>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
            <a href="/highlights" style="color: var(--accent); text-decoration: none; font-size: 13px; font-weight: 500;">
              View all highlights →
            </a>
          </div>
        </div>
      `;

      // Insert summary before the first heading or at the start
      const firstHeading = contentArea.querySelector("h1, h2");
      if (firstHeading) {
        firstHeading.parentNode?.insertBefore(summary, firstHeading);
      } else {
        contentArea.insertBefore(summary, contentArea.firstChild);
      }
    })
    .catch((err) => {
      console.error("Failed to load highlights summary:", err);
    });
};
