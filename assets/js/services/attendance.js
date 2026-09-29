import { mutate } from "./api.js";
export const timeIn = () => mutate("time_in");
export const timeOut = () => mutate("time_out");
