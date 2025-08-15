// src/components/common/FloatingPanel.vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useCanvasStore } from '@/stores/canvasStore';
import { draggable } from '@/directives/draggable.js';

const props = defineProps({
  panelId: { type: String, required: true },
  title: { type: String, default: 'Painel' },
  initialPosition: { type: Object, default: () => ({ top: 100, left: 100 }) },
  initialSize: { type: Object, default: () => ({ width: 280, height: 400 }) },
});

const store = useCanvasStore();
const panelRef = ref(null);

const panelState = store.getPanelState(props.panelId);

// Lógica de Redimensionamento
let isResizing = false;
let resizeDirection = '';
let startPos = { x: 0, y: 0 };
let startSize = { width: 0, height: 0 };
let startPanelPos = { top: 0, left: 0 };

function startResize(e, direction) {
  isResizing = true;
  resizeDirection = direction;
  startPos = { x: e.clientX, y: e.clientY };
  const rect = panelRef.value.getBoundingClientRect();
  startSize = { width: rect.width, height: rect.height };
  startPanelPos = { top: rect.top, left: rect.left };

  document.addEventListener('mousemove', onResize);
  document.addEventListener('mouseup', stopResize);
}

function onResize(e) {
  if (!isResizing) return;

  const dx = e.clientX - startPos.x;
  const dy = e.clientY - startPos.y;

  let newWidth = startSize.width;
  let newHeight = startSize.height;
  let newTop = startPanelPos.top;
  let newLeft = startPanelPos.left;

  if (resizeDirection.includes('right')) newWidth = startSize.width + dx;
  if (resizeDirection.includes('bottom')) newHeight = startSize.height + dy;
  if (resizeDirection.includes('left')) {
    newWidth = startSize.width - dx;
    newLeft = startPanelPos.left + dx;
  }
  if (resizeDirection.includes('top')) {
    newHeight = startSize.height - dy;
    newTop = startPanelPos.top + dy;
  }

  // Aplica tamanho mínimo
  panelState.size.width = Math.max(250, newWidth);
  panelState.size.height = Math.max(150, newHeight);

  if (panelState.size.width > 250) panelState.position.left = newLeft;
  if (panelState.size.height > 150) panelState.position.top = newTop;
}

function stopResize() {
  isResizing = false;
  document.removeEventListener('mousemove', onResize);
  document.removeEventListener('mouseup', stopResize);
}

function closePanel() {
  store.closePanel(props.panelId);
}

function togglePin() {
  store.updatePanelState(props.panelId, { isPinned: !panelState.isPinned });
}

onMounted(() => {
    // Atualiza a posição inicial na store
    store.updatePanelState(props.panelId, {
        position: props.initialPosition,
        size: props.initialSize
    });
});
</script>

<template>
  <div
    v-if="panelState.isVisible"
    class="floating-panel"
    ref="panelRef"
    v-draggable
    :style="{
      top: `${panelState.position.top}px`,
      left: `${panelState.position.left}px`,
      width: `${panelState.size.width}px`,
      height: `${panelState.size.height}px`
    }"
  >
    <header class="panel-header draggable-handle">
      <h5 class="panel-title">{{ title }}</h5>
      <div class="panel-actions">
        <button
          class="pin-btn"
          :class="{ 'is-pinned': panelState.isPinned }"
          @click="togglePin"
          title="Fixar painel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5M10 17h4M16 4.5l-4-4-4 4M16 4.5V12a4 4 0 0 1-4 4h0a4 4 0 0 1-4-4V4.5"/></svg>
        </button>
        <button class="close-btn" @click="closePanel">&times;</button>
      </div>
    </header>

    <div class="panel-content">
      <slot></slot>
    </div>

    <div class="resize-handle top" @mousedown.prevent.stop="startResize($event, 'top')"></div>
    <div class="resize-handle right" @mousedown.prevent.stop="startResize($event, 'right')"></div>
    <div class="resize-handle bottom" @mousedown.prevent.stop="startResize($event, 'bottom')"></div>
    <div class="resize-handle left" @mousedown.prevent.stop="startResize($event, 'left')"></div>
    <div class="resize-handle top-left" @mousedown.prevent.stop="startResize($event, 'top-left')"></div>
    <div class="resize-handle top-right" @mousedown.prevent.stop="startResize($event, 'top-right')"></div>
    <div class="resize-handle bottom-right" @mousedown.prevent.stop="startResize($event, 'bottom-right')"></div>
    <div class="resize-handle bottom-left" @mousedown.prevent.stop="startResize($event, 'bottom-left')"></div>
  </div>
</template>

<style scoped>
.floating-panel {
  position: absolute;
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 205;
  display: flex;
  flex-direction: column;
  min-width: 250px;
  min-height: 150px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-2) var(--spacing-3);
  border-bottom: 1px solid var(--c-border);
  background-color: var(--c-surface-dark);
  flex-shrink: 0;
  border-top-left-radius: var(--radius-lg);
  border-top-right-radius: var(--radius-lg);
}

.panel-title {
  font-weight: var(--fw-semibold);
  color: var(--c-text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}

.pin-btn, .close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text-secondary);
  border-radius: var(--radius-sm);
}

.pin-btn:hover, .close-btn:hover {
  background-color: var(--c-border);
}

.pin-btn.is-pinned {
  color: var(--c-white);
  background-color: var(--c-primary);
}

.close-btn {
  font-size: 1.5rem;
  line-height: 1;
}

.panel-content {
  padding: var(--spacing-4);
  overflow: auto;
  flex-grow: 1;
}

/* Handles de Redimensionamento */
.resize-handle {
    position: absolute;
    z-index: 10;
}
.resize-handle.top, .resize-handle.bottom { width: 100%; height: 6px; cursor: ns-resize; }
.resize-handle.left, .resize-handle.right { width: 6px; height: 100%; cursor: ew-resize; }
.resize-handle.top { top: -3px; left: 0; }
.resize-handle.bottom { bottom: -3px; left: 0; }
.resize-handle.left { top: 0; left: -3px; }
.resize-handle.right { top: 0; right: -3px; }
.resize-handle.top-left { top: -4px; left: -4px; width: 12px; height: 12px; cursor: nwse-resize; }
.resize-handle.top-right { top: -4px; right: -4px; width: 12px; height: 12px; cursor: nesw-resize; }
.resize-handle.bottom-left { bottom: -4px; left: -4px; width: 12px; height: 12px; cursor: nesw-resize; }
.resize-handle.bottom-right { bottom: -4px; right: -4px; width: 12px; height: 12px; cursor: nwse-resize; }
</style>
