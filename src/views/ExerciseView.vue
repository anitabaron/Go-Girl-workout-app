<script setup></script>
<template>
  <section class="bg-goLightPink">
    <div class="container m-auto py-10 px-6">
      <div class="grid grid-cols-1 md:grid-cols-70/30 w-full gap-6">
        <main>
          <div
            class="bg-white p-6 rounded-lg shadow-md text-center md:text-left"
          >
            <div class="text-gray-500 mb-4">Warm-up</div>
            <h1 class="text-3xl font-bold mb-4">Jumping Jacks</h1>
          </div>

          <div class="bg-white p-6 rounded-lg shadow-md mt-6">
            <h3 class="text-goMidRed text-lg font-bold mb-6">
              Exercise Description
            </h3>

            <p class="mb-4">
              Perform dynamic jumping jacks to increase heart rate and warm up
              the muscles. Keep a steady pace, maintain an upright posture, and
              land softly to reduce impact on the joints.
            </p>
            <p class="mb-4">Reps: 30</p>
            <p class="mb-4">Duration: 40 sec</p>
            <h3 class="text-goMidRed text-lg font-bold mb-2">Series</h3>

            <p class="mb-4">3</p>
          </div>
        </main>

        <!-- Sidebar -->
        <aside>
          <!-- Company Info -->
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-xl font-bold mb-6">Info</h3>

            <h2 class="text-2xl">About Warm-up</h2>

            <p class="my-2">
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Harum,
              assumenda.
            </p>

            <hr class="my-4" />

            <h3 class="text-xl">More:</h3>

            <p class="my-2 bg-goLightPink p-2 font-bold">www.warm-up.com</p>
          </div>

          <!-- Manage -->
          <div class="bg-white p-6 rounded-lg shadow-md mt-6">
            <h3 class="text-xl font-bold mb-6">Manage Exercise</h3>
            <a
              href="/exercises/add"
              class="bg-goDarkPink hover:bg-red-600 text-white text-center font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline mt-4 block"
              >Edit Exercise</a
            >
            <button
              class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline mt-4 block"
            >
              Delete Exercise
            </button>
          </div>
        </aside>
      </div>
    </div>
  </section>
</template>
