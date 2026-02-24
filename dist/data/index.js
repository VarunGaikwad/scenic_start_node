"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pdf_parse_1 = require("pdf-parse");
const supabase_1 = __importDefault(require("../supabase"));
const BUCKET_NAME = "LRT";
const FOOTER_LINES = 6;
const STATION_BLOCK_SIZE = 4;
async function parseSchedule(fileUrl, target, reverse = false) {
    const parser = new pdf_parse_1.PDFParse({ url: fileUrl });
    const result = await parser.getText();
    const textArray = result.text.split("\n");
    const alignStation = textArray.slice(1, -FOOTER_LINES);
    const _unAlignStation = reverse
        ? textArray.slice(-FOOTER_LINES, -STATION_BLOCK_SIZE).reverse()
        : textArray.slice(-FOOTER_LINES, -STATION_BLOCK_SIZE);
    if (!_unAlignStation.length)
        throw new Error("Station block extraction failed.");
    let arrivalIndex = 0;
    let departureIndex = 0;
    const typeMap = {
        着: "arrival",
        発: "departure",
    };
    for (let line of alignStation) {
        if (line.startsWith("列車名"))
            continue;
        let prefix = line.startsWith("着")
            ? "着"
            : line.startsWith("発")
                ? "発"
                : null;
        if (prefix) {
            const index = prefix === "着" ? arrivalIndex++ : departureIndex++;
            const station = _unAlignStation[index % _unAlignStation.length];
            line = `${station} ${line}`;
        }
        const parts = line.trim().split(/\s+/);
        const stationName = parts[0];
        const type = typeMap[parts[1]];
        const time = parts.slice(2);
        target[stationName] ?? (target[stationName] = { arrival: [], departure: [] });
        if (type) {
            target[stationName][type].push(...time);
        }
        else {
            target[stationName].arrival.push(...time);
            target[stationName].departure.push(...time);
        }
    }
}
function extractMetaFromUrl(url) {
    const filename = url.split("/").pop()?.replace(".pdf", "") || "";
    const [direction = "", dayType = ""] = filename.split("-");
    return {
        direction: direction.toUpperCase(),
        dayType: dayType.toUpperCase(),
        reverse: direction === "outbound",
    };
}
(async () => {
    var _a;
    try {
        const JSON_OUTPUT = {};
        const scheduleFiles = [
            "https://ljelbkjtlddtspgxkgdt.supabase.co/storage/v1/object/public/LRT/inbound-weekday.pdf",
            "https://ljelbkjtlddtspgxkgdt.supabase.co/storage/v1/object/public/LRT/outbound-weekday.pdf",
            "https://ljelbkjtlddtspgxkgdt.supabase.co/storage/v1/object/public/LRT/inbound-holiday.pdf",
            "https://ljelbkjtlddtspgxkgdt.supabase.co/storage/v1/object/public/LRT/outbound-holiday.pdf",
        ];
        for (const fileUrl of scheduleFiles) {
            const { direction, dayType, reverse } = extractMetaFromUrl(fileUrl);
            JSON_OUTPUT[direction] ?? (JSON_OUTPUT[direction] = {});
            (_a = JSON_OUTPUT[direction])[dayType] ?? (_a[dayType] = {});
            await parseSchedule(fileUrl, JSON_OUTPUT[direction][dayType], reverse);
        }
        // Upload to Supabase
        const fileName = "train-schedule.json";
        const { error } = await supabase_1.default.storage
            .from(BUCKET_NAME)
            .upload(fileName, Buffer.from(JSON.stringify(JSON_OUTPUT, null, 4)), {
            contentType: "application/json",
            upsert: true,
        });
        if (error)
            throw error;
        console.log(`✅ Schedule uploaded to Supabase bucket "${BUCKET_NAME}" as ${fileName}`);
    }
    catch (err) {
        console.error("❌ Schedule build/upload failed:", err);
        process.exit(1);
    }
})();
