<script setup>
// Animated menu icon: three uneven "lines of a poem" that fold into an ✕.
defineProps({
  open: { type: Boolean, default: false },
});
</script>

<template>
  <span class="menu-toggle" :class="{ 'is-open': open }" aria-hidden="true">
    <span /><span /><span />
  </span>
</template>

<style>
.menu-toggle {
  position: relative;
  display: block;
  width: 20px;
  height: 14px;
}
.menu-toggle > span {
  position: absolute;
  left: 0;
  height: 1.5px;
  border-radius: 2px;
  background: currentColor;
  transform-origin: center;
  transition:
    top 0.32s cubic-bezier(0.65, 0, 0.35, 1),
    width 0.32s cubic-bezier(0.65, 0, 0.35, 1),
    transform 0.32s cubic-bezier(0.65, 0, 0.35, 1) 0.06s,
    opacity 0.2s ease;
}
/* Resting: uneven lines, like lines of verse */
.menu-toggle > span:nth-child(1) {
  top: 0;
  width: 20px;
}
.menu-toggle > span:nth-child(2) {
  top: 6.25px;
  width: 12px;
}
.menu-toggle > span:nth-child(3) {
  top: 12.5px;
  width: 16px;
}
/* Hover: the lines even out */
@media (hover: hover) {
  .menu-toggle-btn:hover .menu-toggle:not(.is-open) > span {
    width: 20px;
  }
}
/* Open: the outer lines meet in the middle and cross; the middle one slips away */
.menu-toggle.is-open > span:nth-child(1) {
  top: 6.25px;
  width: 20px;
  transform: rotate(45deg);
}
.menu-toggle.is-open > span:nth-child(2) {
  width: 0;
  opacity: 0;
}
.menu-toggle.is-open > span:nth-child(3) {
  top: 6.25px;
  width: 20px;
  transform: rotate(-45deg);
}
</style>
