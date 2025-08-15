<script setup>
import { computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useImageAdjustmentsStore } from '@/stores/imageAdjustmentsStore'

const store = useCanvasStore()
const adjustmentsStore = useImageAdjustmentsStore()

const targetLayerId = computed(() => store.workspace.contextMenuTargetLayerId);
const targetLayer = computed(() => store.layers.find(l => l.id === targetLayerId.value));

const canMergeDown = computed(() => {
    if (!targetLayerId.value) return false;
    const index = store.layers.findIndex(l => l.id === targetLayerId.value);
    return index > 0;
});

function onClick(action) {
  if(action) action();
  store.showContextMenu(false);
}
</script>

<template>
  <div
    class="context-menu-overlay"
    @click.self="onClick()"
    @contextmenu.prevent.self="onClick()"
  >
    <div
        class="context-menu"
        :style="{
        top: `${store.workspace.contextMenuPosition.y}px`,
        left: `${store.workspace.contextMenuPosition.x}px`,
        }"
    >
        <div class="menu-section">
            <div class="menu-item" @click="onClick(() => store.zoomIn())">
                <span class="icon">➕</span>
                <span class="text">Aproximar Zoom</span>
                <span class="shortcut">Ctrl +</span>
            </div>
            <div class="menu-item" @click="onClick(() => store.zoomOut())">
                <span class="icon">➖</span>
                <span class="text">Afastar Zoom</span>
                <span class="shortcut">Ctrl -</span>
            </div>
            <div class="menu-item" @click="onClick(() => store.zoomToFit())">
                <span class="icon">🎯</span>
                <span class="text">Ajustar à Tela</span>
                 <span class="shortcut">Ctrl 0</span>
            </div>
        </div>

        <template v-if="targetLayer">
            <div class="menu-divider"></div>
            <div class="menu-section">
                 <div class="menu-item" @click="onClick(() => store.duplicateLayer(targetLayerId))">
                    <span class="icon">📋</span>
                    <span class="text">Duplicar Camada</span>
                </div>
                <div class="menu-item" :class="{ disabled: !canMergeDown }" @click="canMergeDown && onClick(() => store.mergeDown(targetLayerId))">
                    <span class="icon">📥</span>
                    <span class="text">Mesclar para Baixo</span>
                </div>
                 <div class="menu-item" @click="onClick(() => store.togglePanel('layerHistory', true, targetLayerId))">
                    <span class="icon">📜</span>
                    <span class="text">Histórico de Alterações...</span>
                </div>
            </div>
            <div class="menu-divider"></div>
             <div class="menu-section">
                <div class="menu-item" @click="onClick(() => adjustmentsStore.openModal())">
                    <span class="icon">🎨</span>
                    <span class="text">Ajustes de Imagem...</span>
                </div>
                <div class="menu-item" @click="onClick(() => store.showResizeModal(true))">
                     <span class="icon">📏</span>
                    <span class="text">Redimensionar</span>
                </div>
            </div>
             <div class="menu-divider"></div>
            <div class="menu-section">
                <div class="menu-item" @click="onClick(() => store.flipLayer('horizontal'))">
                    <span class="icon">↔️</span>
                    <span class="text">Inverter Horizontalmente</span>
                </div>
                <div class="menu-item" @click="onClick(() => store.flipLayer('vertical'))">
                     <span class="icon">↕️</span>
                    <span class="text">Inverter Verticalmente</span>
                </div>
            </div>
            <div class="menu-divider"></div>
            <div class="menu-section">
                <div class="menu-item danger" @click="onClick(() => store.deleteLayer(targetLayerId))">
                    <span class="icon">🗑️</span>
                    <span class="text">Apagar Camada</span>
                </div>
            </div>
        </template>
    </div>
  </div>
</template>

<style scoped>
.context-menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 999;
}
.context-menu {
  position: absolute;
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  padding: var(--spacing-2);
  width: 260px;
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.8);
}
.menu-section {
    display: flex;
    flex-direction: column;
}
.menu-item {
    display: grid;
    grid-template-columns: 24px 1fr auto;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-2) var(--spacing-3);
    cursor: pointer;
    font-size: var(--fs-sm);
    white-space: nowrap;
    border-radius: var(--radius-md);
    transition: background-color 0.1s ease-in-out;
}
.menu-item:hover {
  background-color: var(--c-primary);
  color: var(--c-white);
}
.menu-item:hover .shortcut {
    color: rgba(255, 255, 255, 0.7);
}
.menu-item .icon {
    font-size: 16px;
    text-align: center;
}
.menu-item .text {
    font-weight: var(--fw-medium);
}
.menu-item .shortcut {
    font-size: var(--fs-xs);
    color: var(--c-text-tertiary);
    justify-self: end;
}
.menu-item.disabled {
  color: var(--c-text-tertiary);
  cursor: not-allowed;
  background-color: transparent !important;
}
.menu-divider {
  height: 1px;
  background: var(--c-border);
  margin: var(--spacing-2);
}
.menu-item.danger {
  color: #ff3333;
}
.menu-item.danger:hover {
  background-color: #ff3333;
  color: white;
}
</style>
