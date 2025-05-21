import mongoose from "mongoose";

const workoutSchema = new mongoose.Schema({
    name: String,
    description: String,
    allExercises: {
        warmUp: [String],
        mainWorkout: [String],
        coolDown: [String],
    },
    coach: String,
});

export default mongoose.model("Workout", workoutSchema);
