// src/directives/draggable.js
export const draggable = {
  mounted(el, binding) {
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;

    // Procura por um handle específico, senão usa o próprio elemento
    const handle = el.querySelector('.draggable-handle') || el;
    handle.style.cursor = 'move';

    const store = binding.instance?.$pinia.state.value.canvas;
    const panelId = el.__vueParentComponent.props.panelId;

    const onMouseDown = (e) => {
      // Impede o drag se o clique for num input, botão, ou handle de resize
      if (e.target.closest('input, button, .resize-handle')) return;
      if (e.button !== 0) return;

      isDragging = true;
      const rect = el.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      el.style.top = `${e.clientY - offsetY}px`;
      el.style.left = `${e.clientX - offsetX}px`;
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;

      // Salva a posição final na store
      if (store && panelId) {
        store.panels[panelId].position.top = parseInt(el.style.top, 10);
        store.panels[panelId].position.left = parseInt(el.style.left, 10);
      }

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    handle.addEventListener('mousedown', onMouseDown);

    el.__vDraggableCleanup = () => {
      handle.removeEventListener('mousedown', onMouseDown);
    };
  },
  unmounted(el) {
    if (el.__vDraggableCleanup) {
      el.__vDraggableCleanup();
    }
  },
};
