import axios from "axios";

const API_KEY = process.env.REACT_APP_NINJAS_API_KEY || "";
const BASE_URL = "https://api.api-ninjas.com/v1";

const api = axios.create({
  baseURL: BASE_URL,
  headers: API_KEY ? { "X-Api-Key": API_KEY } : {},
});

export const API_MUSCLE_TO_GROUP = {
  chest: "chest",
  lats: "back",
  middle_back: "back",
  lower_back: "back",
  neck: "back",
  quadriceps: "legs",
  hamstrings: "legs",
  calves: "legs",
  glutes: "legs",
  abductors: "legs",
  adductors: "legs",
  traps: "shoulders",
  biceps: "arms",
  triceps: "arms",
  forearms: "arms",
  abdominals: "core",
};

export function mapApiMuscleToGroup(apiMuscle) {
  return API_MUSCLE_TO_GROUP[apiMuscle] || "other";
}

export function filterByGroup(results, group) {
  if (group === "all") return results;
  return results.filter((ex) => mapApiMuscleToGroup(ex.muscle) === group);
}

export async function searchExercises({ name }) {
  const params = {};
  if (name && name.trim()) params.name = name.trim();
  const { data } = await api.get("/exercises", { params });
  return data;
}
