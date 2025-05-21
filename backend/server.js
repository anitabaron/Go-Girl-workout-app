import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import workoutRoutes from "./routes/workouts.js";
import exerciseRoutes from "./routes/exercises.js";
import statisticsRoutes from "./routes/statistics.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
    .connect(MONGO_URI)
    .then(() => {
        mongoose.connection.once("open", () => {
            console.log("Connected to MongoDB database:", mongoose.connection.name);
        });

        console.log("MongoDB connected");
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => console.error("MongoDB connection error:", err));

app.use("/api/workouts", workoutRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/statistics", statisticsRoutes);
