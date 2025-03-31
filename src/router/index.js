import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import WorkoutsListView from "../views/WorkoutsListView.vue";
import WorkoutsView from "../views/WorkoutsView.vue";
import AddWorkoutView from "../views/AddWorkoutView.vue";
import ExercisesListView from "../views/ExercisesListView.vue";
import ExercisesView from "../views/ExerciseView.vue";
import AddExerciseView from "../views/AddExerciseView.vue";
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
      component: WorkoutsListView,
    },
    {
      path: "/workouts/:id",
      name: "workout",
      component: WorkoutsView,
    },
    {
      path: "/workouts/add",
      name: "add-workout",
      component: AddWorkoutView,
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
      path: "/exercises/add",
      name: "add-exercise",
      component: AddExerciseView,
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
