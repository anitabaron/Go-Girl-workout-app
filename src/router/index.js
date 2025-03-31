import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import WorkoutsView from "../views/WorkoutsView.vue";
import ExercisesListView from "../views/ExercisesListView.vue";
import ExercisesView from "../views/ExerciseView.vue";
import StatisticsView from "../views/StatisticsView.vue";
import NoFoundView from "../views/NoFoundView.vue";

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
      component: ExercisesListView,
    },
    {
      path: "/exercises/:id",
      name: "exercise",
      component: ExercisesView,
    },
    {
      path: "/statistics",
      name: "statistics",
      component: StatisticsView,
    },
    {
      path: "/:catchAll(.*)",
      name: "not-found",
      component: NoFoundView,
    },
  ],
});

export default router;
