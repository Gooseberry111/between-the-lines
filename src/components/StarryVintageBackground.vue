<script setup>
import { ref, onMounted } from "vue";

const stars = ref([]);

onMounted(() => {
  const arr = [];
  for (let i = 0; i < 300; i++) {
    arr.push({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: (Math.random() * 2.5 + 1.5).toFixed(1),
      delay: (Math.random() * 3).toFixed(1),
      opacity: (Math.random() * 0.5 + 0.3).toFixed(2),
    });
  }
  stars.value = arr;
});
</script>

<template>
  <div class="fixed inset-0 -z-10 bg-gradient-to-b from-[#16281c] to-[#060f09]">
    <div
      v-for="star in stars"
      :key="star.id"
      class="star absolute rounded-full bg-[#d9cdf0]"
      :style="{
        top: star.top + '%',
        left: star.left + '%',
        width: star.size + 'px',
        height: star.size + 'px',
        animationDuration: star.duration + 's',
        animationDelay: star.delay + 's',
        '--base-opacity': star.opacity,
      }"
    />
    <div
      class="absolute inset-0"
      style="box-shadow: inset 0 0 200px 70px rgba(6, 15, 9, 0.5)"
    ></div>
  </div>
</template>

<style scoped>
.star {
  opacity: var(--base-opacity);
  animation-name: twinkle;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}
@keyframes twinkle {
  from {
    opacity: 0.15;
  }
  to {
    opacity: 0.9;
  }
}
</style>
