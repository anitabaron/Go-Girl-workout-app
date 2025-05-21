import mongoose from "mongoose";

const exerciseSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ["Warm-up", "Main Workout", "Cool-down"],
    },
    title: {
        type: String,
        required: true,
    },
    description: String,
    work: {
        reps: Number,
        duration: Number,
        restTime: Number,
    },
    sets: Number,
    restAfterAll: Number,
    sides: {
        type: String,
        enum: ["yes", "no"],
    },
    level: {
        type: Number,
        enum: [1, 2, 3],
    },
    details: String,
});

export default mongoose.model("Exercise", exerciseSchema);
