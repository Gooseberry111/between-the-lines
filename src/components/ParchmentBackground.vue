<script setup>
import floralBg from "../assets/images/background1.png";
</script>

<template>
  <div
    class="fixed inset-0 -z-10 bg-parchment [transform:translateZ(0)] [backface-visibility:hidden]"
  >
    <img :src="floralBg" alt="" class="h-full w-full object-cover" />
  </div>
</template>
