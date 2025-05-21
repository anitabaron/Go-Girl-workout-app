import express from "express";
import Exercise from "../models/Exercise.js";
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const exercise = await Exercise.find();
        res.json(exercise);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/", (req, res) => {
    const newExercise = req.body;
    mockExercises.push(newExercise);
    res.status(201).json(newExercise);
});

export default router;
