import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import WorkoutsView from "../views/WorkoutsView.vue";
import ExercisesView from "../views/ExercisesView.vue";
import StatisticsView from "../views/StatisticsView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/workouts",
      name: "workouts",
      component: WorkoutsView,
    },
    {
      path: "/exercises",
      name: "exercises",
      component: ExercisesView,
    },
    {
      path: "/statistics",
      name: "statistics",
      component: StatisticsView,
    },
  ],
});

export default router;
