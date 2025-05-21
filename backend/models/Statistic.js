import mongoose from "mongoose";

const statisticSchema = new mongoose.Schema({
    date: {
        type: String, // Date
        required: true,
    },
    exercises: {
        type: Map,
        of: [Number],
        required: true,
    },
});

export default mongoose.model("Statistic", statisticSchema);
