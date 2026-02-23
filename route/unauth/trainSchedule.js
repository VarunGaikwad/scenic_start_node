const express = require("express");
const Holidays = require("date-holidays");
const hd = new Holidays("JP");
const { buildSchedule } = require("../../data");

const trainScheduleRoute = express.Router();

let schedulePromise = buildSchedule();

trainScheduleRoute.get("/stations", async (req, res) => {
  const schedule = await schedulePromise;
  const stations = Object.keys(schedule.OUTBOUND.WEEKDAY);
  res.status(200).json(stations);
});

trainScheduleRoute.get("/", async (req, res) => {
  const { origin, destination, date } = req.query;
  if (!origin || !destination || !date) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const schedule = await schedulePromise;
  const stations = Object.keys(schedule.OUTBOUND.WEEKDAY);

  if (!stations.includes(origin) || !stations.includes(destination)) {
    return res.status(400).json({ error: "Invalid stations" });
  }

  const originIndex = stations.indexOf(origin);
  const destinationIndex = stations.indexOf(destination);
  const bound = originIndex < destinationIndex ? "OUTBOUND" : "INBOUND";

  const dateObj = new Date(date);
  const holidays = hd.getHolidays(dateObj.getFullYear());
  const isHoliday =
    dateObj.getDay() === 0 ||
    dateObj.getDay() === 6 ||
    holidays.some(
      ({ start, end }) =>
        dateObj >= new Date(start) && dateObj <= new Date(end || start),
    );

  const dayType = isHoliday ? "HOLIDAY" : "WEEKDAY";
  const temp = schedule[bound][dayType];

  res.status(200).json({
    [origin]: temp[origin]?.departure || [],
    [destination]: temp[destination]?.arrival || [],
  });
});

module.exports = trainScheduleRoute;
