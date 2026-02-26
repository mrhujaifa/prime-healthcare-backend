import { addHours, addMinutes, format } from "date-fns";

const currentDate = new Date();
const startTime = "09:00";
const endTime = "10:00";

const startDateTime = new Date(
  addMinutes(
    addHours(
      `${format(currentDate, "yyyy-MM-dd")}`,
      Number(startTime.split(":")[0]),
    ),
    Number(startTime.split(":")[1]),
  ),
);

console.log(startDateTime);

const endDateTime = new Date(
  addMinutes(
    addHours(
      `${format(currentDate, "yyyy-MM-dd")}`,
      Number(endTime.split(":")[0]),
    ),
    Number(endTime.split(":")[1]),
  ),
);

console.log(endDateTime);
