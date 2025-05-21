import express from "express";
import Statistic from "../models/Statistic.js";
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const statistics = await Statistic.find();
        res.json(statistics);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/", (req, res) => {
    const newStatistic = req.body;
    mockStatistics.push(newStatistic);
    res.status(201).json(newStatistic);
});

export default router;
