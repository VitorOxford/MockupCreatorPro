// src/directives/draggable.js
export const draggable = {
  mounted(el, binding) {
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;

    const handle = el.querySelector('.draggable-handle') || el;
    handle.style.cursor = 'move';

    // Acessa a store a partir do contexto da aplicação
    const store = binding.instance?.$pinia.state.value.canvas;
    const panelId = binding.value?.panelId;

    if (!store || !panelId) {
        console.error('Draggable directive requires a panelId and access to the canvas store.');
        return;
    }

    const onMouseDown = (e) => {
      if (e.target.closest('input, button, .resize-handle')) return;
      if (e.button !== 0) return;

      isDragging = true;
      const rect = el.getBoundingClientRect();

      // Calcula o offset em relação à posição do painel, não ao viewport
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;

      const newTop = e.clientY - offsetY;
      const newLeft = e.clientX - offsetX;

      el.style.top = `${newTop}px`;
      el.style.left = `${newLeft}px`;
    };

    const onMouseUp = (e) => {
      if (!isDragging) return;
      isDragging = false;

      // Salva a posição final na store
      const newTop = e.clientY - offsetY;
      const newLeft = e.clientX - offsetX;
      store.updatePanelState(panelId, { position: { top: newTop, left: newLeft } });

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
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
