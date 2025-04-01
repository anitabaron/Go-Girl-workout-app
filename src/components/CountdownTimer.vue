<script setup>
import { ref, computed, onUnmounted } from "vue";

const minutes = ref(0);
const seconds = ref(0);
const savedMinutes = ref(0);
const savedSeconds = ref(0);
const totalTime = computed(() => minutes.value * 60 + seconds.value);
const timeLeft = ref(0);
const intervalId = ref(null);

const isRunning = ref(false);
const isPaused = ref(false);
const showWarning = ref(false);

// 🆕 Tryb "count-up", gdy czas = 00:00
const isCountUp = computed(() => totalTime.value === 0);

const startBeep = new Audio("/sounds/start.wav");
startBeep.volume = 0.3;
const warningBeep = new Audio("/sounds/warning.mp3");
warningBeep.volume = 0.3;
const endBeep = new Audio("/sounds/end.wav");
endBeep.volume = 0.3;

const formattedTime = computed(() => {
  const total =
    isRunning.value || isPaused.value
      ? timeLeft.value
      : minutes.value * 60 + seconds.value;

  const min = String(Math.floor(total / 60)).padStart(2, "0");
  const sec = String(total % 60).padStart(2, "0");
  return `${min}:${sec}`;
});

const progress = computed(() => {
  if (isCountUp.value || totalTime.value === 0) return 0;
  return (timeLeft.value / totalTime.value) * 100;
});

function start() {
  if (isRunning.value) return;

  if (!isPaused.value) {
    savedMinutes.value = minutes.value;
    savedSeconds.value = seconds.value;
    timeLeft.value = isCountUp.value ? 0 : totalTime.value;
  }

  startBeep.play();
  isRunning.value = true;
  isPaused.value = false;

  intervalId.value = setInterval(() => {
    if (isCountUp.value) {
      timeLeft.value++;
    } else {
      if (timeLeft.value > 0) {
        timeLeft.value--;

        if (timeLeft.value === 5) {
          showWarning.value = true;
          let count = 5;
          const warningInterval = setInterval(() => {
            warningBeep.play();
            count--;
            if (count === 0) clearInterval(warningInterval);
          }, 500);
        }
      } else {
        endBeep.play();
        pause();
      }
    }
  }, 1000);
}

function pause() {
  clearInterval(intervalId.value);
  isRunning.value = false;
  isPaused.value = true;
}

function reset() {
  pause();
  minutes.value = savedMinutes.value;
  seconds.value = savedSeconds.value;
  timeLeft.value = savedMinutes.value * 60 + savedSeconds.value;
  showWarning.value = false;
  isPaused.value = false;
  isRunning.value = false;
}

function adjustMinutes(amount) {
  minutes.value = Math.max(0, minutes.value + amount);
}

function adjustSeconds(amount) {
  const totalSec = minutes.value * 60 + seconds.value + amount;
  minutes.value = Math.floor(Math.max(0, totalSec) / 60);
  seconds.value = Math.max(0, totalSec % 60);
}

onUnmounted(() => clearInterval(intervalId.value));
</script>

<template>
  <div
    class="flex flex-col items-center justify-center min-h-screen bg-white p-4"
  >
    <div
      :class="[
        'relative w-[28rem] h-[28rem] mb-8 transition-all duration-500 flex items-center justify-center',
        showWarning ? 'bg-[#ffe3e7] rounded-full' : '',
      ]"
    >
      <svg class="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 100">
        <!-- BACKGROUND -->
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="#ffbdc8"
          stroke-width="9"
          fill="none"
        />
        <!-- PROGRESS (Tylko w trybie countdown) -->
        <circle
          v-if="!isCountUp"
          cx="50"
          cy="50"
          r="45"
          stroke="#f00b0d"
          stroke-width="6"
          fill="none"
          stroke-dasharray="282.74"
          :stroke-dashoffset="282.74 * (1 - progress / 100)"
          stroke-linecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>

      <div class="z-10 text-center">
        <div class="text-6xl font-light mb-4">
          {{ formattedTime }}
        </div>

        <div class="flex justify-center space-x-6 text-xl">
          <div class="flex flex-col items-center space-y-1">
            <span>Minutes</span>
            <div class="flex space-x-2">
              <button
                @click="adjustMinutes(1)"
                class="px-3 py-1 bg-gray-100 rounded hover:bg-pink-200"
              >
                +
              </button>
              <button
                @click="adjustMinutes(-1)"
                class="px-3 py-1 bg-gray-100 rounded hover:bg-pink-200"
              >
                -
              </button>
            </div>
          </div>

          <div class="flex flex-col items-center space-y-1">
            <span>Seconds</span>
            <div class="flex space-x-2">
              <button
                @click="adjustSeconds(1)"
                class="px-3 py-1 bg-gray-100 rounded hover:bg-pink-200"
              >
                +
              </button>
              <button
                @click="adjustSeconds(-1)"
                class="px-3 py-1 bg-gray-100 rounded hover:bg-pink-200"
              >
                -
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex space-x-6">
      <button
        @click="isRunning ? pause() : start()"
        class="w-20 h-20 rounded-full text-white text-base font-semibold transition duration-200 hover:scale-105 hover:shadow-lg"
        :class="isRunning ? 'bg-[#f00b0d]' : 'bg-[#f97a7d]'"
      >
        {{ isRunning ? "Pause" : "Start" }}
      </button>

      <button
        @click="reset"
        class="w-20 h-20 rounded-full text-white text-base font-semibold bg-[#f9444f] transition duration-200 hover:scale-105 hover:shadow-lg"
      >
        Reset
      </button>
    </div>
  </div>
</template>
