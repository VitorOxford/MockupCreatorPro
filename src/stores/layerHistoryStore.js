// src/stores/layerHistoryStore.js
import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { useCanvasStore } from './canvasStore'

export const useLayerHistoryStore = defineStore('layerHistory', () => {
  // Estrutura para guardar o histórico de cada camada
  // { layerId: { history: [state1, state2, ...], currentIndex: 0 }, ... }
  const historyByLayer = reactive({})

  // Adiciona um estado inicial ou um novo estado ao histórico de uma camada
  function addLayerState(layerId, state, actionName = 'Alteração') {
    if (!historyByLayer[layerId]) {
      historyByLayer[layerId] = {
        history: [],
        currentIndex: -1,
      }
    }

    const layerHistory = historyByLayer[layerId]

    // Se o ponteiro não está no final, remove os estados "futuros" (redo)
    if (layerHistory.currentIndex < layerHistory.history.length - 1) {
      layerHistory.history.splice(layerHistory.currentIndex + 1)
    }

    // Adiciona o nome da ação ao estado para exibição no modal
    const stateWithMeta = {
        actionName,
        timestamp: new Date(),
        state: JSON.stringify(state)
    };

    layerHistory.history.push(stateWithMeta)
    layerHistory.currentIndex = layerHistory.history.length - 1
  }

  // Desfaz a última ação de uma camada específica
  function undo(layerId) {
    if (!historyByLayer[layerId]) return

    const layerHistory = historyByLayer[layerId]
    if (layerHistory.currentIndex > 0) {
      layerHistory.currentIndex--
      const canvasStore = useCanvasStore()
      const stateToRestore = JSON.parse(layerHistory.history[layerHistory.currentIndex].state)
      // Atualiza a camada sem criar um novo estado de histórico (para evitar loop)
      canvasStore.updateLayerFromHistory(layerId, stateToRestore)
    }
  }

  // Refaz a última ação desfeita de uma camada específica
  function redo(layerId) {
    if (!historyByLayer[layerId]) return

    const layerHistory = historyByLayer[layerId]
    if (layerHistory.currentIndex < layerHistory.history.length - 1) {
      layerHistory.currentIndex++
      const canvasStore = useCanvasStore()
      const stateToRestore = JSON.parse(layerHistory.history[layerHistory.currentIndex].state)
      canvasStore.updateLayerFromHistory(layerId, stateToRestore)
    }
  }

  // Reverte uma camada para um ponto específico no seu histórico
  function revertToState(layerId, historyIndex) {
    if (!historyByLayer[layerId] || historyIndex < 0 || historyIndex >= historyByLayer[layerId].history.length) return;

    const layerHistory = historyByLayer[layerId];
    layerHistory.currentIndex = historyIndex;

    const canvasStore = useCanvasStore();
    const stateToRestore = JSON.parse(layerHistory.history[historyIndex].state);
    canvasStore.updateLayerFromHistory(layerId, stateToRestore);
  }


  // Limpa o histórico de uma camada (usado ao apagar a camada)
  function clearLayerHistory(layerId) {
    delete historyByLayer[layerId]
  }

  return { historyByLayer, addLayerState, undo, redo, clearLayerHistory, revertToState }
})
