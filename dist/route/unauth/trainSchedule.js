"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = __importDefault(require("../../supabase"));
const date_holidays_1 = __importDefault(require("date-holidays"));
const BUCKET_NAME = "LRT";
const hd = new date_holidays_1.default("JP");
const trainScheduleRoute = (0, express_1.Router)();
let scheduleCache = null;
async function loadSchedule() {
    if (scheduleCache)
        return scheduleCache;
    const { data, error } = await supabase_1.default.storage
        .from(BUCKET_NAME)
        .download("train-schedule.json");
    if (error)
        throw error;
    const jsonStr = await data.text();
    scheduleCache = JSON.parse(jsonStr);
    return scheduleCache;
}
trainScheduleRoute.get("/stations", async (_req, res) => {
    try {
        const schedule = await loadSchedule();
        const stations = Object.keys(schedule.OUTBOUND.WEEKDAY);
        res.status(200).json(stations);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load schedule" });
    }
});
trainScheduleRoute.get("/", async (req, res) => {
    const { origin, destination, date } = req.query;
    if (!origin ||
        !destination ||
        !date ||
        typeof origin !== "string" ||
        typeof destination !== "string" ||
        typeof date !== "string") {
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
        const isHoliday = dateObj.getDay() === 0 ||
            dateObj.getDay() === 6 ||
            (Array.isArray(holidayCheck) && holidayCheck.length > 0) ||
            holidayCheck;
        const dayType = isHoliday ? "HOLIDAY" : "WEEKDAY";
        const temp = schedule[bound][dayType];
        res.status(200).json({
            [origin]: temp[origin]?.departure || [],
            [destination]: temp[destination]?.arrival || [],
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load schedule" });
    }
});
exports.default = trainScheduleRoute;
