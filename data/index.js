const { PDFParse } = require("pdf-parse");
const fs = require("fs");
const path = require("path");
const outputPath = path.join(__dirname, "train-schedule.json");

const FOOTER_LINES = 6;
const STATION_BLOCK_SIZE = 4;

async function parseSchedule(fileUrl, target, reverse = false) {
  const parser = new PDFParse({ url: fileUrl });
  const result = await parser.getText();
  const textArray = result.text.split("\n");

  const alignStation = textArray.slice(1, -FOOTER_LINES);
  const _unAlignStation = reverse
    ? textArray.slice(-FOOTER_LINES, -STATION_BLOCK_SIZE).reverse()
    : textArray.slice(-FOOTER_LINES, -STATION_BLOCK_SIZE);

  if (!_unAlignStation.length) {
    throw new Error("Station block extraction failed.");
  }

  let arrivalIndex = 0;
  let departureIndex = 0;

  const typeMap = {
    着: "arrival",
    発: "departure",
  };

  for (let line of alignStation) {
    if (line.startsWith("列車名")) continue;

    let prefix = null;
    if (line.startsWith("着")) prefix = "着";
    else if (line.startsWith("発")) prefix = "発";

    if (prefix) {
      const index = prefix === "着" ? arrivalIndex++ : departureIndex++;
      const station = _unAlignStation[index % _unAlignStation.length];
      line = `${station} ${line}`;
    }

    const parts = line.trim().split(/\s+/);
    const stationName = parts[0];
    const type = typeMap[parts[1]];
    const time = parts.slice(2);

    target[stationName] ??= { arrival: [], departure: [] };

    if (type) {
      target[stationName][type].push(...time);
    } else {
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

async function buildSchedule() {
  const JSON_OUTPUT = {};

  const scheduleFiles = [
    "https://ljelbkjtlddtspgxkgdt.supabase.co/storage/v1/object/public/LRT/inbound-weekday.pdf",
    "https://ljelbkjtlddtspgxkgdt.supabase.co/storage/v1/object/public/LRT/outbound-weekday.pdf",
    "https://ljelbkjtlddtspgxkgdt.supabase.co/storage/v1/object/public/LRT/inbound-holiday.pdf",
    "https://ljelbkjtlddtspgxkgdt.supabase.co/storage/v1/object/public/LRT/outbound-holiday.pdf",
  ];

  for (const fileUrl of scheduleFiles) {
    const { direction, dayType, reverse } = extractMetaFromUrl(fileUrl);

    JSON_OUTPUT[direction] ??= {};
    JSON_OUTPUT[direction][dayType] ??= {};

    await parseSchedule(fileUrl, JSON_OUTPUT[direction][dayType], reverse);
  }

  // ✅ Ensure directory exists before writing
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  fs.writeFileSync(outputPath, JSON.stringify(JSON_OUTPUT, null, 4));

  return JSON_OUTPUT;
}

// ✅ Build schedule when script runs
(async () => {
  try {
    await buildSchedule();
    console.log(`✅ Schedule built and saved to ${outputPath}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Schedule build failed:", err);
    process.exit(1);
  }
})();
