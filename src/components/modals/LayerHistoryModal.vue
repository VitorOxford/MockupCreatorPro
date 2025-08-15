<script setup>
import { computed, ref, watch } from 'vue';
import { useLayerHistoryStore } from '@/stores/layerHistoryStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { historyActionIcons } from '@/utils/icons';

const layerHistoryStore = useLayerHistoryStore();
const canvasStore = useCanvasStore();

const activeTab = ref('');

const targetLayerId = computed(() => canvasStore.workspace.historyModalTargetLayerId);
const targetLayer = computed(() => canvasStore.layers.find(l => l.id === targetLayerId.value));

const modalPosition = computed(() => {
  const pos = canvasStore.workspace.layerHistoryModalPosition;
  const leftOffset = window.innerWidth - 320 - 16;
  return { top: `${pos.y}px`, left: `${leftOffset}px` };
});

const groupedHistory = computed(() => {
  if (!targetLayerId.value || !layerHistoryStore.historyByLayer[targetLayerId.value]) {
    return [];
  }
  const historyData = layerHistoryStore.historyByLayer[targetLayerId.value];
  const reversedHistory = [...historyData.history].slice().reverse();

  if (reversedHistory.length === 0) return [];

  const groups = [];
  let currentGroup = { name: reversedHistory[0].actionName, items: [] };

  reversedHistory.forEach((item, index) => {
    const originalIndex = historyData.history.length - 1 - index;
    const itemWithIndex = { ...item, originalIndex };

    if (item.actionName === currentGroup.name) {
      currentGroup.items.push(itemWithIndex);
    } else {
      groups.push(currentGroup);
      currentGroup = { name: item.actionName, items: [itemWithIndex] };
    }
  });
  groups.push(currentGroup);
  return groups;
});

// Observa o histórico agrupado e define a primeira aba como ativa quando o modal abre
watch(groupedHistory, (newGroups) => {
  if (newGroups.length > 0 && !activeTab.value) {
    activeTab.value = newGroups[0].name;
  }
});

// Limpa a aba ativa quando o modal fecha
watch(() => canvasStore.workspace.isLayerHistoryModalVisible, (isVisible) => {
    if (!isVisible) {
        activeTab.value = '';
    }
});

function getIconPath(actionName) {
  return historyActionIcons[actionName] || historyActionIcons['default'];
}

function formatTimestamp(date) {
  return new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function handleRevertClick(originalIndex) {
  if (targetLayerId.value) {
    layerHistoryStore.revertToState(targetLayerId.value, originalIndex);
  }
}
</script>

<template>
  <div
    v-if="canvasStore.workspace.isLayerHistoryModalVisible"
    class="modal-overlay"
    @click.self="canvasStore.showLayerHistoryModal(false)"
  >
    <div class="history-modal" :style="modalPosition">
      <header class="modal-header">
        <h4 :title="targetLayer?.name">Histórico: {{ targetLayer?.name }}</h4>
        <button class="close-btn" @click="canvasStore.showLayerHistoryModal(false)">&times;</button>
      </header>

      <div class="tabs-nav">
        <button
          v-for="group in groupedHistory"
          :key="group.name"
          class="tab-button"
          :class="{ active: activeTab === group.name }"
          @click="activeTab = group.name"
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <path :d="getIconPath(group.name)"></path>
          </svg>
          <span>{{ group.name }}</span>
        </button>
      </div>

      <div class="history-list">
        <div v-if="groupedHistory.length === 0" class="empty-state">
          Nenhuma alteração registada.
        </div>
        <template v-for="group in groupedHistory" :key="group.name">
          <div v-if="activeTab === group.name" class="tab-content">
            <div
              v-for="item in group.items"
              :key="item.timestamp"
              class="history-item"
              :class="{ active: item.originalIndex === layerHistoryStore.historyByLayer[targetLayerId]?.currentIndex }"
              @click="handleRevertClick(item.originalIndex)"
            >
              <span class="timestamp">{{ formatTimestamp(item.timestamp) }}</span>
              <span class="revert-text">Reverter para este ponto</span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1500;
  background-color: transparent;
}
.history-modal {
  position: fixed;
  width: 320px;
  max-height: 70vh;
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 1501;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-3) var(--spacing-4);
  border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
}
h4 {
  font-size: var(--fs-base);
  font-weight: var(--fw-semibold);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.close-btn {
  font-size: 1.5rem;
  color: var(--c-text-secondary);
}
.tabs-nav {
  display: flex;
  overflow-x: auto;
  border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
  padding: 0 var(--spacing-2);
  background-color: var(--c-background);
}
.tab-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--c-text-secondary);
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}
.tab-button:hover {
  color: var(--c-text-primary);
}
.tab-button.active {
  color: var(--c-primary);
  border-bottom-color: var(--c-primary);
}
.history-list {
  flex-grow: 1;
  overflow-y: auto;
}
.tab-content {
  padding: var(--spacing-2);
}
.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
}
.history-item:hover {
  background-color: var(--c-surface-dark);
}
.history-item .revert-text {
  opacity: 0;
  font-size: var(--fs-xs);
  color: var(--c-text-secondary);
  transition: opacity 0.15s ease;
}
.history-item:hover .revert-text {
  opacity: 1;
}
.history-item.active {
  background-color: var(--c-primary);
  color: var(--c-white);
}
.timestamp {
  font-family: monospace;
}
.history-item.active .timestamp {
  color: var(--c-white);
  font-weight: var(--fw-semibold);
}
.history-item.active .revert-text {
  opacity: 1;
  color: rgba(255, 255, 255, 0.8);
}
.empty-state {
  text-align: center;
  padding: var(--spacing-6);
  color: var(--c-text-secondary);
  font-size: var(--fs-sm);
}
</style>
