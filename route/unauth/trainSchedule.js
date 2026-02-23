const express = require("express");
const supabase = require("../../supabase");
const BUCKET_NAME = "LRT";

const trainScheduleRoute = express.Router();

let scheduleCache = null;

async function loadSchedule() {
  if (scheduleCache) return scheduleCache;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download("train-schedule.json");

  if (error) throw error;

  const jsonStr = await data.text();
  scheduleCache = JSON.parse(jsonStr);
  return scheduleCache;
}

trainScheduleRoute.get("/stations", async (req, res) => {
  try {
    const schedule = await loadSchedule();
    const stations = Object.keys(schedule.OUTBOUND.WEEKDAY);
    res.status(200).json(stations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load schedule" });
  }
});

trainScheduleRoute.get("/", async (req, res) => {
  const { origin, destination, date } = req.query;
  if (!origin || !destination || !date) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    const schedule = await loadSchedule();
    const stations = Object.keys(schedule.OUTBOUND.WEEKDAY);

    if (!stations.includes(origin) || !stations.includes(destination)) {
      return res.status(400).json({ error: "Invalid stations" });
    }

    const originIndex = stations.indexOf(origin);
    const destinationIndex = stations.indexOf(destination);
    const bound = originIndex < destinationIndex ? "OUTBOUND" : "INBOUND";

    const dateObj = new Date(date);
    const isHoliday = dateObj.getDay() === 0 || dateObj.getDay() === 6; // optionally add your holiday logic

    const dayType = isHoliday ? "HOLIDAY" : "WEEKDAY";
    const temp = schedule[bound][dayType];

    res.status(200).json({
      [origin]: temp[origin]?.departure || [],
      [destination]: temp[destination]?.arrival || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load schedule" });
  }
});

module.exports = trainScheduleRoute;
