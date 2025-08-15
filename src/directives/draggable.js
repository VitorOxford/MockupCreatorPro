// src/directives/draggable.js
import { useCanvasStore } from '@/stores/canvasStore';

export const draggable = {
  mounted(el, binding) {
    const store = useCanvasStore();
    const panelId = binding.value?.panelId;
    if (!store || !panelId) {
      console.error('Draggable directive requires a panelId.');
      return;
    }

    const handle = el.querySelector('.draggable-handle') || el;
    handle.style.cursor = 'move';

    let initialTop, initialLeft;
    let initialMouseX, initialMouseY;
    let isDragging = false;

    const onMouseDown = (e) => {
      if (e.target.closest('button, input, .resize-handle')) return;
      if (e.button !== 0) return;

      isDragging = true;

      // Guarda a posição inicial do painel e do mouse no momento do clique
      initialTop = el.offsetTop;
      initialLeft = el.offsetLeft;
      initialMouseX = e.clientX;
      initialMouseY = e.clientY;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp, { once: true });
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();

      // Calcula o quanto o mouse se moveu desde o clique inicial
      const dx = e.clientX - initialMouseX;
      const dy = e.clientY - initialMouseY;

      // Aplica essa mesma diferença à posição inicial do painel
      el.style.top = `${initialTop + dy}px`;
      el.style.left = `${initialLeft + dx}px`;
    };

    const onMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);

      // Salva a posição final no store para persistência
      store.updatePanelState(panelId, {
        position: {
          top: el.offsetTop,
          left: el.offsetLeft
        }
      });
    };

    handle.addEventListener('mousedown', onMouseDown);

    el.__vDraggableCleanup = () => {
      handle.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  },
  unmounted(el) {
    if (el.__vDraggableCleanup) {
      el.__vDraggableCleanup();
    }
  },
};
