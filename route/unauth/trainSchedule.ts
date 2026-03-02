import { Router, Request, Response } from "express";
import supabase from "../../supabase";
import Holidays from "date-holidays";

const BUCKET_NAME = "LRT";
const hd = new Holidays("JP");
const trainScheduleRoute = Router();

let scheduleCache: any = null;

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

trainScheduleRoute.get("/stations", async (_req: Request, res: Response) => {
  try {
    const schedule = await loadSchedule();
    const stations = Object.keys(schedule.OUTBOUND.WEEKDAY);
    res.status(200).json(stations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load schedule" });
  }
});

trainScheduleRoute.get("/", async (req: Request, res: Response) => {
  const { origin, destination, date } = req.query;
  if (
    !origin ||
    !destination ||
    !date ||
    typeof origin !== "string" ||
    typeof destination !== "string" ||
    typeof date !== "string"
  ) {
    return res.status(400).json({ error: "Missing or invalid parameters" });
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
    const holidayCheck = hd.isHoliday(dateObj);
    const isHoliday =
      dateObj.getDay() === 0 ||
      dateObj.getDay() === 6 ||
      (Array.isArray(holidayCheck) && holidayCheck.length > 0) ||
      holidayCheck;

    const dayType = isHoliday ? "HOLIDAY" : "WEEKDAY";
    const temp = schedule[bound][dayType];

    res.status(200).json({
      scheduleType: dayType.toLowerCase(),
      [origin]: temp[origin]?.departure || [],
      [destination]: temp[destination]?.arrival || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load schedule" });
  }
});

export default trainScheduleRoute;
