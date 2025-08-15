<script setup>
import { RouterView } from 'vue-router'
import SubscriptionModal from '@/components/modals/SubscriptionModal.vue'
import ImageAdjustmentsModal from '@/components/modals/ImageAdjustmentsModal.vue'
import LoadingScreen from '@/components/common/LoadingScreen.vue' // <-- 1. IMPORTE AQUI
</script>

<template>
  <RouterView />
  <SubscriptionModal />
  <ImageAdjustmentsModal />
  <LoadingScreen /> </template>

<style>
/* Estilos globais podem vir aqui se necessário, mas para começar, pode deixar vazio */
</style>
