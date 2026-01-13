import { SkeletonLoader } from "@/components/exercises/skeleton-loader";

export default function ExercisesLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <SkeletonLoader className="h-10 w-64 mb-2" />
        <SkeletonLoader className="h-5 w-96" />
      </div>
      <SkeletonLoader count={20} />
    </div>
  );
}
