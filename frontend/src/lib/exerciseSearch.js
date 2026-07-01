import exercises from "./workouts.JSON";

const PRIMARY_MUSCLE_TO_GROUP = {
  abs: "core",
  "anterior deltoids": "shoulders",
  biceps: "arms",
  brachialis: "arms",
  calves: "legs",
  "cardio / full body": "cardio",
  chest: "chest",
  core: "core",
  forearms: "arms",
  glutes: "legs",
  hamstrings: "legs",
  "inner thighs": "legs",
  "lateral deltoids": "shoulders",
  lats: "back",
  "lower abs": "core",
  "lower back": "back",
  "lower chest": "chest",
  "lower lower chest": "chest",
  obliques: "core",
  quadriceps: "legs",
  "rear deltoids": "shoulders",
  rhomboids: "back",
  shoulders: "shoulders",
  "tibialis anterior": "legs",
  trapezius: "back",
  triceps: "arms",
  "upper chest": "chest",
};

export function mapToGroup(primaryMuscle) {
  return PRIMARY_MUSCLE_TO_GROUP[primaryMuscle.toLowerCase()] || "other";
}

export function searchLocal({ query, group }) {
  let results = exercises;
  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    results = results.filter((ex) => ex.name.toLowerCase().includes(q));
  }
  if (group && group !== "all") {
    results = results.filter((ex) => mapToGroup(ex.primary_muscle) === group);
  }
  return results;
}
