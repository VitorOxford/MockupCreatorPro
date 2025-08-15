<script setup>
import { computed } from 'vue';
import { useCanvasStore } from '@/stores/canvasStore';
import { draggable } from '@/directives/draggable.js';

const props = defineProps({
  panelId: { type: String, required: true },
  title: { type: String, default: 'Painel' },
});

const store = useCanvasStore();

const panelState = computed(() => store.getPanelState(props.panelId));

function closePanel() {
  store.togglePanel(props.panelId, false);
}

function togglePin() {
  store.updatePanelState(props.panelId, { isPinned: !panelState.value.isPinned });
}
</script>

<template>
  <div
    v-if="panelState && panelState.isVisible"
    class="floating-panel"
    v-draggable="{ panelId: props.panelId }"
    :style="{
      top: `${panelState.position.top}px`,
      left: `${panelState.position.left}px`,
      width: `${panelState.size.width}px`,
      height: panelState.size.height === 'auto' ? 'auto' : `${panelState.size.height}px`
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
    <slot></slot>
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
  cursor: move;
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
</style>
