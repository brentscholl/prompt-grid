const STORAGE_KEY = "prompt-grid.prompts.v1";

const starterPrompts = [
  {
    id: "starter-commit-and-push",
    title: "Commit and push",
    body: "Double-check your work, then commit and push the changes.",
  },
  {
    id: "starter-double-check",
    title: "Double-check your work",
    body: "Double-check your work carefully. Review the full diff, look for regressions or missing edge cases, and verify the result before finishing.",
  },
  {
    id: "starter-review-diff",
    title: "Review the diff",
    body: "Review the full diff carefully and flag anything incorrect, incomplete, risky, or unrelated to the requested change.",
  },
];

const cardThemes = [
  {
    card: "border-indigo-400/25 bg-gradient-to-br from-indigo-500/15 via-slate-900 to-slate-900 hover:border-indigo-400/50 hover:shadow-indigo-950/40 focus-visible:outline-indigo-400",
    icon: "bg-indigo-400/10 text-indigo-300 ring-indigo-400/25",
    footer: "text-indigo-400 group-hover:text-indigo-300",
    edit: "hover:text-indigo-300 focus-visible:outline-indigo-400",
  },
  {
    card: "border-emerald-400/25 bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-900 hover:border-emerald-400/50 hover:shadow-emerald-950/40 focus-visible:outline-emerald-400",
    icon: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25",
    footer: "text-emerald-400 group-hover:text-emerald-300",
    edit: "hover:text-emerald-300 focus-visible:outline-emerald-400",
  },
  {
    card: "border-amber-400/25 bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 hover:border-amber-400/50 hover:shadow-amber-950/40 focus-visible:outline-amber-400",
    icon: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
    footer: "text-amber-400 group-hover:text-amber-300",
    edit: "hover:text-amber-300 focus-visible:outline-amber-400",
  },
  {
    card: "border-rose-400/25 bg-gradient-to-br from-rose-500/15 via-slate-900 to-slate-900 hover:border-rose-400/50 hover:shadow-rose-950/40 focus-visible:outline-rose-400",
    icon: "bg-rose-400/10 text-rose-300 ring-rose-400/25",
    footer: "text-rose-400 group-hover:text-rose-300",
    edit: "hover:text-rose-300 focus-visible:outline-rose-400",
  },
  {
    card: "border-sky-400/25 bg-gradient-to-br from-sky-500/15 via-slate-900 to-slate-900 hover:border-sky-400/50 hover:shadow-sky-950/40 focus-visible:outline-sky-400",
    icon: "bg-sky-400/10 text-sky-300 ring-sky-400/25",
    footer: "text-sky-400 group-hover:text-sky-300",
    edit: "hover:text-sky-300 focus-visible:outline-sky-400",
  },
  {
    card: "border-violet-400/25 bg-gradient-to-br from-violet-500/15 via-slate-900 to-slate-900 hover:border-violet-400/50 hover:shadow-violet-950/40 focus-visible:outline-violet-400",
    icon: "bg-violet-400/10 text-violet-300 ring-violet-400/25",
    footer: "text-violet-400 group-hover:text-violet-300",
    edit: "hover:text-violet-300 focus-visible:outline-violet-400",
  },
  {
    card: "border-teal-400/25 bg-gradient-to-br from-teal-500/15 via-slate-900 to-slate-900 hover:border-teal-400/50 hover:shadow-teal-950/40 focus-visible:outline-teal-400",
    icon: "bg-teal-400/10 text-teal-300 ring-teal-400/25",
    footer: "text-teal-400 group-hover:text-teal-300",
    edit: "hover:text-teal-300 focus-visible:outline-teal-400",
  },
  {
    card: "border-orange-400/25 bg-gradient-to-br from-orange-500/15 via-slate-900 to-slate-900 hover:border-orange-400/50 hover:shadow-orange-950/40 focus-visible:outline-orange-400",
    icon: "bg-orange-400/10 text-orange-300 ring-orange-400/25",
    footer: "text-orange-400 group-hover:text-orange-300",
    edit: "hover:text-orange-300 focus-visible:outline-orange-400",
  },
];

// Stable names are saved on cards; palette order only supplies initial defaults.
const cardColors = ["indigo", "emerald", "amber", "rose", "sky", "violet", "teal", "orange"];
const swatchColors = ["#818cf8", "#34d399", "#fbbf24", "#fb7185", "#38bdf8", "#a78bfa", "#2dd4bf", "#fb923c"];
const colorOptions = document.querySelector("#prompt-colors");
const grid = document.querySelector("#prompt-grid");
const dialog = document.querySelector("#prompt-dialog");
const form = document.querySelector("#prompt-form");
const titleInput = document.querySelector("#prompt-title");
const bodyInput = document.querySelector("#prompt-body");
const dialogTitle = document.querySelector("#dialog-title");
const deleteButton = document.querySelector("#delete-prompt-button");
const editorActions = document.querySelector("#editor-actions");
const deleteConfirmation = document.querySelector("#delete-confirmation");
const toast = document.querySelector("#toast");
const toastMessage = document.querySelector("#toast-message");
const statusPill = document.querySelector("#paste-status");
const statusDot = document.querySelector("#paste-status-dot");
const statusText = document.querySelector("#paste-status-text");

let prompts = loadPrompts();
let editingPromptId = null;
let toastTimer = null;
let activeCardId = null;
let pasteReady = false;
let accessibilityTrusted = false;
let suppressPasteUntil = 0;
let pointerDrag = null;

function loadPrompts() {
  let loaded;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    loaded = Array.isArray(saved) ? saved : starterPrompts;
  } catch {
    loaded = starterPrompts;
  }
  // Preserve each existing card's current appearance before any reordering occurs.
  const normalized = loaded.map((prompt, index) => ({
    ...prompt,
    color: cardColors.includes(prompt.color) ? prompt.color : cardColors[index % cardColors.length],
  }));
  if (loaded.some((prompt, index) => prompt.color !== normalized[index].color)) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)); } catch { /* Keep colors stable in this session if storage is unavailable. */ }
  }
  return normalized;
}

function savePrompts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `prompt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderPrompts() {
  // Keep pointer capture intact while native status updates arrive during a drag.
  if (pointerDrag) return;
  const cards = prompts
    .map(
      (prompt) => {
        const theme = cardThemes[Math.max(0, cardColors.indexOf(prompt.color))];
        return `
        <li data-drag-id="${escapeHtml(prompt.id)}" class="group relative min-h-52 cursor-pointer transition duration-150">
          <button type="button" data-paste-id="${escapeHtml(prompt.id)}" class="prompt-card flex h-full w-full cursor-pointer select-none flex-col rounded-2xl border p-5 text-left shadow-lg shadow-black/20 ring-offset-slate-950 transition duration-150 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-0 ${theme.card}">
            <span class="flex size-9 items-center justify-center rounded-lg text-sm font-semibold ring-1 ring-inset ${theme.icon}">${escapeHtml(prompt.title.trim().charAt(0).toUpperCase() || "P")}</span>
            <span class="mt-4 block pr-8 text-sm font-semibold text-white">${escapeHtml(prompt.title)}</span>
            <span class="mt-2 line-clamp-4 block whitespace-pre-line text-sm leading-6 text-slate-400">${escapeHtml(prompt.body)}</span>
          </button>
          <span data-drag-handle="${escapeHtml(prompt.id)}" class="absolute top-3.5 right-13.5 flex size-8 cursor-grab items-center justify-center rounded-lg bg-slate-800/90 text-slate-500 opacity-0 shadow-sm ring-1 ring-white/10 backdrop-blur transition group-hover:opacity-100" title="Drag to move" aria-label="Drag to move ${escapeHtml(prompt.title)}">
            <svg viewBox="0 0 20 20" fill="currentColor" class="size-4">
              <path d="M7 4.75A1.25 1.25 0 1 1 4.5 4.75 1.25 1.25 0 0 1 7 4.75Zm0 5.25A1.25 1.25 0 1 1 4.5 10 1.25 1.25 0 0 1 7 10Zm0 5.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm6.5-10.5a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm0 5.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm0 5.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" />
            </svg>
          </span>
          <button type="button" data-edit-id="${escapeHtml(prompt.id)}" class="absolute top-3.5 right-3.5 rounded-lg bg-slate-800/90 p-2 text-slate-500 opacity-0 shadow-sm ring-1 ring-white/10 backdrop-blur transition focus:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 group-hover:opacity-100 ${theme.edit}" aria-label="Edit ${escapeHtml(prompt.title)}">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4">
              <path d="m13.586 3.586-9.5 9.5A2 2 0 0 0 3.5 14.5v1.25a.75.75 0 0 0 .75.75H5.5a2 2 0 0 0 1.414-.586l9.5-9.5a2 2 0 0 0-2.828-2.828Z" />
              <path d="M12.5 5.5 14.5 7.5" />
            </svg>
          </button>
        </li>
      `;
      },
    )
    .join("");

  const addCard = `
    <li class="min-h-52">
      <button type="button" data-add-prompt class="flex h-full min-h-52 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/30 p-6 text-center transition hover:border-indigo-400/60 hover:bg-indigo-500/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400">
        <span class="flex size-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 shadow-sm ring-1 ring-white/10">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-5">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
        </span>
        <span class="mt-3 text-sm font-semibold text-white">Add a prompt</span>
        <span class="mt-1 text-xs text-slate-400">Create another one-click card</span>
      </button>
    </li>
  `;

  grid.innerHTML = cards + addCard;

  grid.querySelectorAll("[data-paste-id]").forEach((button) => {
    button.addEventListener("click", () => {
      if (Date.now() < suppressPasteUntil) return;
      pastePrompt(button.dataset.pasteId);
    });
  });

  grid.querySelectorAll("[data-edit-id]").forEach((button) => {
    button.addEventListener("click", () => openEditDialog(button.dataset.editId));
  });

  grid.querySelector("[data-add-prompt]")?.addEventListener("click", openAddDialog);
  enablePromptDragging();
}

/** Previews reordering without changing saved prompts until the pointer is released. */
function enablePromptDragging() {
  grid.querySelectorAll("[data-paste-id], [data-drag-handle]").forEach((cardButton) => {
    cardButton.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || pointerDrag) return;

      pointerDrag = {
        pointerId: event.pointerId,
        sourceId: cardButton.dataset.pasteId ?? cardButton.dataset.dragHandle,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        control: cardButton,
        isDragging: false,
      };
      cardButton.setPointerCapture(event.pointerId);
    });

    cardButton.addEventListener("pointermove", (event) => {
      if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
      pointerDrag.x = event.clientX;
      pointerDrag.y = event.clientY;

      const distance = Math.hypot(event.clientX - pointerDrag.startX, event.clientY - pointerDrag.startY);
      if (!pointerDrag.isDragging && distance < 8) return;

      if (!pointerDrag.isDragging) {
        startDragPreview();
      }

      event.preventDefault();
    });

    cardButton.addEventListener("pointerup", (event) => {
      if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;

      finishDragging(true);
    });

    cardButton.addEventListener("pointercancel", () => {
      finishDragging(false);
    });
    cardButton.addEventListener("lostpointercapture", () => finishDragging(false));
  });
}

/** Leaves a highlighted landing slot behind a floating copy of the picked-up card. */
function startDragPreview() {
  const drag = pointerDrag;
  drag.isDragging = true;
  drag.cards = [...grid.querySelectorAll("[data-drag-id]")];
  drag.order = [...drag.cards];
  drag.card = drag.control.closest("[data-drag-id]");
  const rect = drag.card.getBoundingClientRect();
  drag.offsetX = drag.startX - rect.left;
  drag.offsetY = drag.startY - rect.top;
  drag.ghost = drag.card.cloneNode(true);
  drag.ghost.classList.add("drag-ghost");
  drag.ghost.setAttribute("aria-hidden", "true");
  drag.ghost.inert = true;
  Object.assign(drag.ghost.style, { width: `${rect.width}px`, height: `${rect.height}px` });
  document.body.append(drag.ghost);
  drag.card.classList.add("drag-placeholder");
  // The add-card tile stays last while CSS order moves the preview cards.
  drag.addCard = grid.querySelector("[data-add-prompt]").closest("li");
  drag.addCard.style.order = drag.cards.length;
  document.body.classList.add("cursor-grabbing", "select-none");
  drag.frame = requestAnimationFrame(updateDragPreview);
}

/** Uses stable layout slots, rather than animated hit targets, to avoid jitter. */
function updateDragPreview(time) {
  const drag = pointerDrag;
  if (!drag?.isDragging) return;
  const elapsed = Math.min(32, time - (drag.lastFrame ?? time));
  drag.lastFrame = time;
  const edge = 72;
  const speed = drag.y < edge ? -Math.min(1, (edge - drag.y) / edge)
    : drag.y > innerHeight - edge ? Math.min(1, (drag.y - innerHeight + edge) / edge) : 0;
  window.scrollBy(0, speed * elapsed * 0.65);
  drag.ghost.style.transform = `translate3d(${drag.x - drag.offsetX}px, ${drag.y - drag.offsetY}px, 0) scale(1.025)`;

  const slots = drag.order.map((card) => {
    // offset geometry excludes the temporary FLIP animation transforms.
    let left = 0, top = 0;
    for (let node = card; node; node = node.offsetParent) {
      left += node.offsetLeft;
      top += node.offsetTop;
    }
    return { x: left - scrollX + card.offsetWidth / 2, y: top - scrollY + card.offsetHeight / 2 };
  });
  const centerX = drag.x - drag.offsetX + drag.card.offsetWidth / 2;
  const centerY = drag.y - drag.offsetY + drag.card.offsetHeight / 2;
  const distances = slots.map((slot) => Math.hypot(centerX - slot.x, centerY - slot.y));
  const current = drag.order.indexOf(drag.card);
  const target = distances.indexOf(Math.min(...distances));
  // A small dead zone prevents rapid swapping at the midpoint between slots.
  if (target !== current && distances[target] + 12 < distances[current]) {
    const before = new Map(drag.cards.map((card) => [card, card.getBoundingClientRect()]));
    drag.order.splice(current, 1);
    drag.order.splice(target, 0, drag.card);
    drag.order.forEach((card, index) => {
      card.getAnimations().forEach((animation) => animation.cancel());
      card.style.order = index;
    });
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    drag.cards.forEach((card) => {
      if (card === drag.card || reducedMotion) return;
      const after = card.getBoundingClientRect();
      const previous = before.get(card);
      card.animate([
        { transform: `translate(${previous.left - after.left}px, ${previous.top - after.top}px)` },
        { transform: "translate(0, 0)" },
      ], { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
  }
  drag.frame = requestAnimationFrame(updateDragPreview);
}

/** Commits exactly the visible preview, or restores the original order on cancellation. */
function finishDragging(commit) {
  const drag = pointerDrag;
  if (!drag) return;
  pointerDrag = null;
  if (drag.control.hasPointerCapture(drag.pointerId)) drag.control.releasePointerCapture(drag.pointerId);
  if (!drag.isDragging) return;
  cancelAnimationFrame(drag.frame);
  drag.ghost.remove();
  document.body.classList.remove("cursor-grabbing", "select-none");
  suppressPasteUntil = Date.now() + 300;
  const changed = drag.order.some((card, index) => card.dataset.dragId !== prompts[index].id);
  if (commit && changed) {
    const byId = new Map(prompts.map((prompt) => [prompt.id, prompt]));
    prompts = drag.order.map((card) => byId.get(card.dataset.dragId));
    savePrompts();
  }
  renderPrompts();
  if (commit && changed) showToast("Prompt order updated");
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && pointerDrag) finishDragging(false);
});
window.addEventListener("blur", () => finishDragging(false));

function openAddDialog() {
  editingPromptId = null;
  dialogTitle.textContent = "New prompt";
  titleInput.value = "";
  bodyInput.value = "";
  renderColorOptions(cardColors[prompts.length % cardColors.length]);
  deleteButton.classList.add("hidden");
  resetDeleteConfirmation();
  dialog.showModal();
  requestAnimationFrame(() => titleInput.focus());
}

function openEditDialog(id) {
  const prompt = prompts.find((item) => item.id === id);
  if (!prompt) return;

  editingPromptId = id;
  dialogTitle.textContent = "Edit prompt";
  titleInput.value = prompt.title;
  bodyInput.value = prompt.body;
  renderColorOptions(prompt.color);
  deleteButton.classList.remove("hidden");
  resetDeleteConfirmation();
  dialog.showModal();
  requestAnimationFrame(() => titleInput.focus());
}

/** Native radios provide keyboard selection, labels, and a visible selected swatch. */
function renderColorOptions(selectedColor) {
  colorOptions.innerHTML = cardColors.map((color, index) => `
    <label class="color-option" style="--swatch: ${swatchColors[index]}">
      <input type="radio" name="color" value="${color}" ${color === selectedColor ? "checked" : ""} />
      <span class="color-swatch" aria-hidden="true"><span>✓</span></span>
      <span class="color-name">${color.charAt(0).toUpperCase() + color.slice(1)}</span>
    </label>
  `).join("");
}

function closeDialog() {
  dialog.close();
  editingPromptId = null;
  resetDeleteConfirmation();
}

function resetDeleteConfirmation() {
  editorActions.classList.remove("hidden");
  editorActions.classList.add("flex");
  deleteConfirmation.classList.add("hidden");
  deleteConfirmation.classList.remove("flex");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();
  const selectedColor = new FormData(form).get("color");
  const color = cardColors.includes(selectedColor) ? selectedColor : cardColors[0];
  if (!title || !body) return;

  if (editingPromptId) {
    prompts = prompts.map((prompt) => (prompt.id === editingPromptId ? { ...prompt, title, body, color } : prompt));
  } else {
    prompts.push({ id: makeId(), title, body, color });
  }

  savePrompts();
  renderPrompts();
  closeDialog();
});

deleteButton.addEventListener("click", () => {
  if (!editingPromptId) return;

  editorActions.classList.add("hidden");
  editorActions.classList.remove("flex");
  deleteConfirmation.classList.remove("hidden");
  deleteConfirmation.classList.add("flex");
  document.querySelector("#confirm-delete-button").focus();
});

document.querySelector("#cancel-delete-button").addEventListener("click", resetDeleteConfirmation);

document.querySelector("#confirm-delete-button").addEventListener("click", () => {
  if (!editingPromptId) return;

  prompts = prompts.filter((item) => item.id !== editingPromptId);
  savePrompts();
  renderPrompts();
  closeDialog();
});

document.querySelector("#add-prompt-button").addEventListener("click", openAddDialog);
document.querySelector("#close-dialog-button").addEventListener("click", closeDialog);
document.querySelector("#cancel-dialog-button").addEventListener("click", closeDialog);
statusPill.addEventListener("click", () => {
  if (pasteReady) {
    showToast("Auto-paste is ready");
    return;
  }

  if (accessibilityTrusted) {
    showToast("Focus the Codex prompt field, then return here.", "warning");
    return;
  }

  globalThis.webkit?.messageHandlers?.promptGrid?.postMessage({ action: "requestAccessibility" });
});

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) closeDialog();
});

document.addEventListener("keydown", (event) => {
  if (event.metaKey && event.key.toLowerCase() === "n") {
    event.preventDefault();
    openAddDialog();
  }
});

async function pastePrompt(id) {
  const prompt = prompts.find((item) => item.id === id);
  if (!prompt) return;

  activeCardId = id;
  // Separate consecutive pasted prompts without changing the saved card text.
  const text = `${prompt.body.trimEnd()} `;
  const bridge = globalThis.webkit?.messageHandlers?.promptGrid;
  if (bridge) {
    bridge.postMessage({ action: "paste", text, id: prompt.id });
    return;
  }

  await copyInBrowser(text);
  showToast("Copied to clipboard");
}

async function copyInBrowser(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function showToast(message, tone = "success") {
  clearTimeout(toastTimer);
  toastMessage.textContent = message;
  document.querySelector("#toast-icon").className = `flex size-6 shrink-0 items-center justify-center rounded-full ${tone === "success" ? "bg-emerald-500" : "bg-amber-500"}`;
  toast.classList.add("toast-visible");
  toastTimer = setTimeout(() => toast.classList.remove("toast-visible"), 2400);
}

globalThis.promptGridNativeResult = function promptGridNativeResult(result) {
  if (result.mode === "pasted") {
    showToast("Sent paste to Codex");
  } else if (result.mode === "copyFailed") {
    showToast("Could not copy. Please try again.", "warning");
  } else if (result.mode === "setup") {
    showToast("Turn on Prompt Grid in Accessibility, then return here.", "warning");
  } else {
    showToast("Copied to clipboard");
  }

  activeCardId = null;
};

globalThis.promptGridNativeStatus = function promptGridNativeStatus(status) {
  accessibilityTrusted = Boolean(status.accessibilityTrusted);
  const codexAvailable = Boolean(status.codexAvailable);
  const ready = Boolean(accessibilityTrusted && codexAvailable);

  if (pasteReady !== ready) {
    pasteReady = ready;
    renderPrompts();
  }

  statusPill.className = ready
    ? "inline-flex shrink-0 cursor-default items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-400/20 ring-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
    : "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-amber-400/10 px-2 py-1 text-[11px] font-medium text-amber-300 ring-1 ring-amber-400/20 ring-inset hover:bg-amber-400/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400";
  statusDot.className = `size-1.5 rounded-full ${ready ? "bg-emerald-500" : "bg-amber-500"}`;
  statusText.textContent = ready ? "Auto-paste ready" : accessibilityTrusted ? "Focus Codex first" : "Enable auto-paste";
  statusPill.title = ready
    ? "Cards will paste into the current Codex prompt field."
    : accessibilityTrusted
      ? "Focus the Codex prompt field once so Prompt Grid knows where to return."
      : "Enable one-click pasting into Codex.";
};

renderPrompts();
globalThis.webkit?.messageHandlers?.promptGrid?.postMessage({ action: "status" });
