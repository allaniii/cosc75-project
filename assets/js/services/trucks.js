import { mutate } from "./api.js";
export const saveTruck = (p) => mutate("truck_save", p);
export const deleteTruck = (id) => mutate("truck_delete", { id });
export const archiveTruck = (id) => mutate("truck_archive", { id });
