const express = require("express");
const trainScheduleRoute = express.Router();
const Holidays = require("date-holidays");
const hd = new Holidays("JP");
const { buildSchedule } = require("../../data");
const holidayCache = {};

let schedule = {};
let stations = [];
let stationIndexMap = {};

(async () => {
  try {
    schedule = await buildSchedule();
    stations = Object.keys(schedule.OUTBOUND.WEEKDAY);
    stations.forEach((station, index) => {
      stationIndexMap[station] = index;
    });
    console.log("Schedule builder done");
  } catch (err) {
    console.error("Schedule build failed:", err);
  }
})();

trainScheduleRoute.get("/stations", (req, res) => {
  if (!schedule.OUTBOUND) {
    return res.status(503).json({ error: "Schedule not ready yet" });
  }

  res.status(200).json(stations);
});

trainScheduleRoute.get("/", (req, res) => {
  if (!schedule.OUTBOUND) {
    return res.status(503).json({ error: "Schedule not ready yet" });
  }

  const { origin, destination, date } = req.query;

  if (!origin || !destination || !date) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  if (origin === destination) {
    return res
      .status(400)
      .json({ error: "Origin and destination cannot be same" });
  }

  const dateObject = new Date(`${date}T00:00:00`);

  if (Number.isNaN(dateObject.getTime())) {
    return res.status(400).json({ error: "Invalid Date" });
  }

  if (
    stationIndexMap[origin] === undefined ||
    stationIndexMap[destination] === undefined
  ) {
    return res.status(400).json({ error: "Invalid origin or destination" });
  }

  const originIndex = stationIndexMap[origin];
  const destinationIndex = stationIndexMap[destination];

  const whichBound = originIndex < destinationIndex ? "OUTBOUND" : "INBOUND";

  const holidayList = getHolidaysForYear(dateObject.getFullYear());

  const isHoliday =
    dateObject.getDay() === 0 ||
    dateObject.getDay() === 6 ||
    holidayList.some(({ start, end }) => {
      const startDate = new Date(start);
      const endDate = new Date(end || start);
      return dateObject >= startDate && dateObject <= endDate;
    });

  const dayType = isHoliday ? "HOLIDAY" : "WEEKDAY";
  const tempObject = schedule?.[whichBound]?.[dayType];

  if (!tempObject) {
    return res.status(500).json({ error: "Schedule data corrupted" });
  }
  const response = {
    [origin]: tempObject[origin]?.departure || [],
    [destination]: tempObject[destination]?.arrival || [],
  };

  return res.status(200).json(response);
});

module.exports = trainScheduleRoute;

function getHolidaysForYear(year) {
  if (!holidayCache[year]) {
    holidayCache[year] = hd.getHolidays(year);
  }
  return holidayCache[year];
}
