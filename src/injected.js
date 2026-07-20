(() => {
  "use strict";

  const VERSION = "__VERSION__";
  const STORAGE_KEY = "codex-micro-plus.encoder-mode";
  const MODE = "conversation-scroll";
  const LABEL = "Conversation scrolling";
  const DESCRIPTION = "Scroll the active conversation up and down";
  const NATIVE_LABELS = new Set(["Composer navigation", "Reasoning only"]);

  if (globalThis.__codexMicroPlus?.version === VERSION) return;
  globalThis.__codexMicroPlus?.dispose?.();

  let disposed = false;
  let observer = null;
  let updateScheduled = false;
  let scrollTimer = null;

  const modeEnabled = () => localStorage.getItem(STORAGE_KEY) === MODE;

  function directTextElements(root) {
    return [...root.querySelectorAll("span, div")].filter((element) => {
      const ownText = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join("")
        .trim();
      return ownText.length > 0;
    });
  }

  function setOwnText(element, text) {
    const textNode = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.textContent = text;
    else element.append(document.createTextNode(text));
  }

  function elementText(element) {
    return (element?.textContent ?? "").replace(/\s+/g, " ").trim();
  }

  function findKnobRow() {
    const descriptions = [...document.querySelectorAll("span, p, div")].filter(
      (element) => elementText(element) === "Choose what turning the knob controls",
    );
    for (const description of descriptions) {
      let candidate = description.parentElement;
      for (let depth = 0; candidate && depth < 7; depth += 1, candidate = candidate.parentElement) {
        if (candidate.querySelector("button") && elementText(candidate).length < 500) return candidate;
      }
    }
    return null;
  }

  function findKnobTrigger() {
    const row = findKnobRow();
    if (!row) return null;
    return [...row.querySelectorAll("button")].find((button) => {
      const text = elementText(button);
      return NATIVE_LABELS.has(text) || text.includes(LABEL) || button.dataset.codexMicroPlusTrigger === "true";
    }) ?? null;
  }

  function syncTrigger() {
    const trigger = findKnobTrigger();
    if (!trigger) return;
    trigger.dataset.codexMicroPlusTrigger = "true";

    const textElements = directTextElements(trigger);
    const labelElement =
      textElements.find((element) => NATIVE_LABELS.has(elementText(element))) ??
      textElements.find((element) => elementText(element) === LABEL);
    if (!labelElement) return;

    if (modeEnabled()) {
      if (!labelElement.dataset.codexMicroPlusOriginal) {
        labelElement.dataset.codexMicroPlusOriginal = elementText(labelElement);
      }
      setOwnText(labelElement, LABEL);
    } else if (labelElement.dataset.codexMicroPlusOriginal) {
      setOwnText(labelElement, labelElement.dataset.codexMicroPlusOriginal);
      delete labelElement.dataset.codexMicroPlusOriginal;
    }
  }

  function selectConversationScrolling(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    localStorage.setItem(STORAGE_KEY, MODE);
    syncTrigger();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }),
    );
    setTimeout(syncTrigger, 0);
  }

  function injectMenuOption() {
    const menus = [...document.querySelectorAll('[role="menu"], [role="listbox"]')];
    for (const menu of menus) {
      if (menu.querySelector('[data-codex-micro-plus-option="true"]')) continue;
      const items = [...menu.querySelectorAll('[role="menuitem"], [role="option"]')];
      const template = items.find((item) => elementText(item).includes("Reasoning only"));
      if (!template) continue;

      const option = template.cloneNode(true);
      option.dataset.codexMicroPlusOption = "true";
      option.removeAttribute("data-highlighted");
      option.removeAttribute("data-state");
      option.setAttribute("aria-checked", modeEnabled() ? "true" : "false");
      option.tabIndex = -1;

      const textElements = directTextElements(option);
      const labelElement = textElements.find((element) => elementText(element) === "Reasoning only");
      const descriptionElement = textElements.find((element) =>
        elementText(element).includes("Open and adjust reasoning effort"),
      );
      if (labelElement) setOwnText(labelElement, LABEL);
      if (descriptionElement) setOwnText(descriptionElement, DESCRIPTION);
      if (!labelElement) option.textContent = `${LABEL} ${DESCRIPTION}`;

      option.addEventListener("click", selectConversationScrolling, true);
      option.addEventListener("pointerdown", (event) => event.stopImmediatePropagation(), true);
      template.parentElement?.append(option);
    }
  }

  function scheduleUiUpdate() {
    if (updateScheduled || disposed) return;
    updateScheduled = true;
    requestAnimationFrame(() => {
      updateScheduled = false;
      syncTrigger();
      injectMenuOption();
    });
  }

  function handleNativeModeSelection(event) {
    const item = event.target instanceof Element
      ? event.target.closest('[role="menuitem"], [role="option"]')
      : null;
    if (!item || item.dataset.codexMicroPlusOption === "true") return;
    const text = elementText(item);
    if (![...NATIVE_LABELS].some((label) => text.includes(label))) return;
    localStorage.removeItem(STORAGE_KEY);
    setTimeout(syncTrigger, 0);
  }

  function scrollableCandidates() {
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    return [...document.querySelectorAll("main, section, div")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          element.scrollHeight > element.clientHeight + 20 &&
          /(auto|scroll)/.test(style.overflowY) &&
          rect.width > Math.min(360, viewportWidth * 0.35) &&
          rect.height > Math.min(220, viewportHeight * 0.3) &&
          rect.right > viewportWidth * 0.5
        );
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const hasMessages = Boolean(
          element.querySelector(
            '[data-message-author-role], [data-testid*="conversation-turn"], article, [data-turn-id]',
          ),
        );
        const centerAligned = rect.left < viewportWidth * 0.55 && rect.right > viewportWidth * 0.55;
        const settingsPenalty = element.closest('[role="dialog"]') ? 500_000 : 0;
        const score =
          rect.width * rect.height +
          (hasMessages ? 2_000_000 : 0) +
          (centerAligned ? 500_000 : 0) -
          settingsPenalty;
        return { element, score };
      })
      .sort((left, right) => right.score - left.score);
  }

  function scrollConversation(direction) {
    const candidate = scrollableCandidates()[0]?.element ?? document.scrollingElement;
    if (!candidate) return false;

    const distance = Math.max(140, Math.min(320, candidate.clientHeight * 0.24));
    candidate.scrollBy({ top: direction * distance, left: 0, behavior: "smooth" });
    globalThis.__codexMicroPlus.lastScroll = {
      direction,
      distance,
      targetTag: candidate.tagName,
      targetClass: String(candidate.className ?? "").slice(0, 160),
      at: Date.now(),
    };
    return true;
  }

  function handleMicroMessage(event) {
    const payload = event.data;
    const input = payload?.type === "codex-micro-hid-event" ? payload.event : null;
    const isEncoderTurn =
      input?.act === 2 && (input.key === "ENC_CW" || input.key === "ENC_CC");
    if (!modeEnabled() || !isEncoderTurn) return;

    event.stopImmediatePropagation();
    event.stopPropagation();
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      scrollTimer = null;
      scrollConversation(input.key === "ENC_CW" ? 1 : -1);
    }, 0);
  }

  window.addEventListener("message", handleMicroMessage, true);
  window.addEventListener("click", handleNativeModeSelection, true);

  function startUiObserver() {
    if (disposed) return;
    if (!document.documentElement) {
      document.addEventListener("DOMContentLoaded", startUiObserver, { once: true });
      return;
    }
    observer = new MutationObserver(scheduleUiUpdate);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    scheduleUiUpdate();
  }

  startUiObserver();

  globalThis.__codexMicroPlus = {
    version: VERSION,
    get enabled() {
      return modeEnabled();
    },
    enable() {
      localStorage.setItem(STORAGE_KEY, MODE);
      scheduleUiUpdate();
    },
    disable() {
      localStorage.removeItem(STORAGE_KEY);
      scheduleUiUpdate();
    },
    scroll: scrollConversation,
    lastScroll: null,
    dispose() {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("message", handleMicroMessage, true);
      window.removeEventListener("click", handleNativeModeSelection, true);
      if (scrollTimer) clearTimeout(scrollTimer);
    },
  };
})();
