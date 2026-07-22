<template>
  <div class="fixed inset-0 -z-10 bg-parchment overflow-hidden">
    <svg
      class="absolute inset-0 h-full w-full opacity-[0.04]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="paperNoise">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="2"
          stitchTiles="stitch"
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#paperNoise)" />
    </svg>

    <div
      class="absolute -top-10 -left-10 h-64 w-64 rounded-full bg-brown/10 blur-3xl"
    ></div>
    <div
      class="absolute -bottom-16 -right-16 h-80 w-80 rounded-full bg-brown/10 blur-3xl"
    ></div>
    <div
      class="absolute top-1/3 -right-10 h-40 w-40 rounded-full bg-gold/10 blur-3xl"
    ></div>

    <div
      class="absolute inset-0"
      style="box-shadow: inset 0 0 180px 60px rgba(59, 47, 47, 0.25)"
    ></div>
  </div>
</template>
