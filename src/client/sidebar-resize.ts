// Sidebar resizing functionality

const initSidebarResize = () => {
  const sidebar = document.querySelector<HTMLElement>(".sidebar");
  if (!sidebar) {
    return;
  }

  // Create resize handle
  const resizeHandle = document.createElement("div");
  resizeHandle.className = "sidebar-resize-handle";
  sidebar.appendChild(resizeHandle);

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  const startResize = (e: MouseEvent) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  };

  const doResize = (e: MouseEvent) => {
    if (!isResizing) {
      return;
    }

    const deltaX = e.clientX - startX;
    const newWidth = startWidth + deltaX;

    // Constrain width between 200px and 600px
    const constrainedWidth = Math.max(200, Math.min(600, newWidth));
    sidebar.style.width = `${constrainedWidth}px`;

    // Store width in localStorage
    localStorage.setItem("llmd-sidebar-width", constrainedWidth.toString());
  };

  const stopResize = () => {
    if (!isResizing) {
      return;
    }
    isResizing = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  resizeHandle.addEventListener("mousedown", startResize);
  document.addEventListener("mousemove", doResize);
  document.addEventListener("mouseup", stopResize);

  // Restore saved width
  const savedWidth = localStorage.getItem("llmd-sidebar-width");
  if (savedWidth) {
    const width = Number.parseInt(savedWidth, 10);
    if (width >= 200 && width <= 600) {
      sidebar.style.width = `${width}px`;
    }
  }
};

// Initialize on page load
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initSidebarResize();
  });
}
