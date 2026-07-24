<script setup>
import darkBg from "../assets/images/background2.png";
</script>

<template>
  <div
    class="fixed inset-0 -z-10 [transform:translateZ(0)] [backface-visibility:hidden]"
  >
    <div
      class="absolute inset-0 bg-cover bg-center"
      :style="{ backgroundImage: `url(${darkBg})` }"
    ></div>
    <div
      class="absolute inset-0"
      style="box-shadow: inset 0 0 220px 90px rgba(0, 0, 0, 0.55)"
    ></div>
  </div>
</template>
