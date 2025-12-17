// Collapsible directories and table of contents

// Initialize collapsible directories
const initCollapsibleDirectories = () => {
  const dirLabels = document.querySelectorAll(".dir-label");

  for (const labelNode of Array.from(dirLabels)) {
    const label = labelNode as HTMLElement;
    // Add chevron icon to directory labels
    const chevron = document.createElement("span");
    chevron.className = "dir-chevron";
    chevron.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    label.insertBefore(chevron, label.firstChild);

    // Make directory label clickable
    label.style.cursor = "pointer";

    // Toggle collapsed state on click
    label.addEventListener("click", (e: Event) => {
      e.preventDefault();
      const dirItem = label.closest(".dir-item");
      if (dirItem) {
        dirItem.classList.toggle("collapsed");
      }
    });
  }
};

// Initialize collapsible table of contents
const initCollapsibleToc = () => {
  const toc = document.querySelector(".toc");
  if (!toc) {
    return;
  }

  const tocHeader = toc.querySelector("h3");
  if (!tocHeader) {
    return;
  }

  // Add chevron icon
  const chevron = document.createElement("span");
  chevron.className = "toc-chevron";
  chevron.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
  tocHeader.style.cursor = "pointer";
  tocHeader.insertBefore(chevron, tocHeader.firstChild);

  // Start collapsed by default
  toc.classList.add("collapsed");

  // Toggle collapsed state on click
  tocHeader.addEventListener("click", () => {
    toc.classList.toggle("collapsed");
  });
};

// Initialize on page load
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initCollapsibleDirectories();
    initCollapsibleToc();
  });
}
