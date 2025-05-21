import express from "express";
import Workout from "../models/Workout.js";
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const workouts = await Workout.find();
        res.json(workouts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const newWorkout = new Workout(req.body);
        const saved = await newWorkout.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
