const STORAGE_KEY = "skydashboard.location.v1";
const TIME_FORMAT_KEY = "skydashboard.timeformat.v1";
const BANNER_DOCK_KEY = "skydashboard.bannerDocked.v1";
const SUNSET_CACHE_KEY = "skydashboard.sunsetForecast.v1";
const SUNSET_WEATHER_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const statusEl = document.getElementById("location-status");
const locationButton = document.getElementById("get-location");
const cityInput = document.getElementById("city-input");
const useCityButton = document.getElementById("use-city");
const timeFormatButton = document.getElementById("toggle-time-format");
const bannerEl = document.getElementById("observer-banner");
const bannerDockButton = document.getElementById("toggle-banner-dock");
const moonTable = document.getElementById("moon-table");
const sunTable = document.getElementById("sun-table");
const observerTable = document.getElementById("observer-table");
const sunsetRefreshButton = document.getElementById("sunset-refresh");

const ui = {
  moonriseTime: document.getElementById("moonrise-time"),
  moonriseCountdown: document.getElementById("moonrise-countdown"),
  moonsetTime: document.getElementById("moonset-time"),
  moonsetCountdown: document.getElementById("moonset-countdown"),
  moonHorizonStatus: document.getElementById("moon-horizon-status"),
  moonAltitudeInline: document.getElementById("moon-altitude-inline"),
  moonAzimuthInline: document.getElementById("moon-azimuth-inline"),
  sunriseTime: document.getElementById("sunrise-time"),
  sunriseCountdown: document.getElementById("sunrise-countdown"),
  sunsetTime: document.getElementById("sunset-time"),
  sunsetCountdown: document.getElementById("sunset-countdown"),
  solarNoonTime: document.getElementById("solar-noon-time"),
  solarNoonCountdown: document.getElementById("solar-noon-countdown"),
  sunHorizonStatus: document.getElementById("sun-horizon-status"),
  sunAltitudeInline: document.getElementById("sun-altitude-inline"),
  sunAzimuthInline: document.getElementById("sun-azimuth-inline"),
  moonPhaseLabel: document.getElementById("moon-phase-label"),
  moonIllumination: document.getElementById("moon-illumination"),
  moonDaysNew: document.getElementById("moon-days-new"),
  moonDaysFull: document.getElementById("moon-days-full"),
  moonNewCountdown: document.getElementById("moon-new-countdown"),
  moonFullCountdown: document.getElementById("moon-full-countdown"),
  lunarEclipseTime: document.getElementById("lunar-eclipse-time"),
  lunarEclipseCountdown: document.getElementById("lunar-eclipse-countdown"),
  moonVisual: document.getElementById("moon-visual"),
  moonLitPath: document.getElementById("moon-lit-path"),
  sunVisual: document.getElementById("sun-visual"),
  sunSolsticeSummer: document.getElementById("sun-solstice-summer"),
  sunSolsticeWinter: document.getElementById("sun-solstice-winter"),
  summerSolsticeCountdown: document.getElementById("summer-solstice-countdown"),
  winterSolsticeCountdown: document.getElementById("winter-solstice-countdown"),
  solarEclipseTime: document.getElementById("solar-eclipse-time"),
  solarEclipseCountdown: document.getElementById("solar-eclipse-countdown"),
  twilightPhase: document.getElementById("twilight-phase"),
  civilDuskTime: document.getElementById("civil-dusk-time"),
  civilDuskCountdown: document.getElementById("civil-dusk-countdown"),
  nauticalDuskTime: document.getElementById("nautical-dusk-time"),
  nauticalDuskCountdown: document.getElementById("nautical-dusk-countdown"),
  astroDuskTime: document.getElementById("astro-dusk-time"),
  astroDuskCountdown: document.getElementById("astro-dusk-countdown"),
  astroDawnTime: document.getElementById("astro-dawn-time"),
  astroDawnCountdown: document.getElementById("astro-dawn-countdown"),
  nauticalDawnTime: document.getElementById("nautical-dawn-time"),
  nauticalDawnCountdown: document.getElementById("nautical-dawn-countdown"),
  civilDawnTime: document.getElementById("civil-dawn-time"),
  civilDawnCountdown: document.getElementById("civil-dawn-countdown"),
  city: document.getElementById("city"),
  locationSource: document.getElementById("location-source"),
  lat: document.getElementById("lat"),
  lon: document.getElementById("lon"),
  cachedAt: document.getElementById("cached-at"),
  sunsetCard: document.querySelector(".sunset-card"),
  sunsetScoreLabel: document.getElementById("sunset-score-label"),
  sunsetTimeInline: document.getElementById("sunset-time-inline"),
  sunsetRankInline: document.getElementById("sunset-rank-inline"),
  sunsetUpdatedInline: document.getElementById("sunset-updated-inline"),
  sunsetHeaderUpdated: document.getElementById("sunset-header-updated"),
  sunsetWeatherHour: document.getElementById("sunset-weather-hour"),
  sunsetWeatherModel: document.getElementById("sunset-weather-model"),
  sunsetOverallLabel: document.getElementById("sunset-overall-label"),
  sunsetOverallScore: document.getElementById("sunset-overall-score"),
  sunsetOverallTier: document.getElementById("sunset-overall-tier"),
  sunsetCloudsValue: document.getElementById("sunset-clouds-value"),
  sunsetCloudsScore: document.getElementById("sunset-clouds-score"),
  sunsetCloudsImpact: document.getElementById("sunset-clouds-impact"),
  sunsetHumidityValue: document.getElementById("sunset-humidity-value"),
  sunsetHumidityScore: document.getElementById("sunset-humidity-score"),
  sunsetHumidityImpact: document.getElementById("sunset-humidity-impact"),
  sunsetVisibilityValue: document.getElementById("sunset-visibility-value"),
  sunsetVisibilityScore: document.getElementById("sunset-visibility-score"),
  sunsetVisibilityImpact: document.getElementById("sunset-visibility-impact"),
  sunsetWindValue: document.getElementById("sunset-wind-value"),
  sunsetWindScore: document.getElementById("sunset-wind-score"),
  sunsetWindImpact: document.getElementById("sunset-wind-impact"),
  sunsetRainValue: document.getElementById("sunset-rain-value"),
  sunsetRainScore: document.getElementById("sunset-rain-score"),
  sunsetRainImpact: document.getElementById("sunset-rain-impact"),
  sunsetFetchStatus: document.getElementById("sunset-fetch-status"),
};

let currentLocation = null;
let use24Hour = false;
let bannerDocked = false;
let eclipseCache = {
  key: null,
  computedAt: 0,
  lunarDate: null,
  solarDate: null,
};
let sunsetForecastState = {
  requestKey: null,
  status: "idle",
  data: null,
  error: "",
  lastFetchedAt: 0,
};

function loadTimeFormat() {
  const raw = localStorage.getItem(TIME_FORMAT_KEY);
  if (!raw) return false;
  return raw === "24h";
}

function saveTimeFormat(value) {
  localStorage.setItem(TIME_FORMAT_KEY, value ? "24h" : "12h");
}

function loadBannerDocked() {
  return localStorage.getItem(BANNER_DOCK_KEY) === "true";
}

function saveBannerDocked(value) {
  localStorage.setItem(BANNER_DOCK_KEY, value ? "true" : "false");
}

function loadSunsetForecastCache() {
  const raw = localStorage.getItem(SUNSET_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function saveSunsetForecastCache(value) {
  localStorage.setItem(SUNSET_CACHE_KEY, JSON.stringify(value));
}

function loadCachedLocation() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function saveLocation(location) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
}

function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function inferLocationSource(location) {
  if (location && (location.source === "gps" || location.source === "city")) {
    return location.source;
  }
  return Number.isFinite(location?.accuracy) ? "gps" : "city";
}

function formatAngle(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  return `${value.toFixed(1)}\u00b0`;
}

function formatCoord(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  return value.toFixed(4);
}

function azimuthToCompass(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const normalized = ((value % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % directions.length;
  return directions[index];
}

function formatAzimuthLabel(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  return `${formatAngle(value)} ${azimuthToCompass(value)}`;
}

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad) {
  return (rad * 180) / Math.PI;
}

function normalizeRadians(angle) {
  let value = angle;
  while (value <= -Math.PI) value += Math.PI * 2;
  while (value > Math.PI) value -= Math.PI * 2;
  return value;
}

function buildMoonTerminatorPath(phaseDeg, waxing) {
  const alpha = 180 - phaseDeg;
  const k = Math.cos((alpha * Math.PI) / 180);
  if (!Number.isFinite(k)) return "";
  // The unrotated SVG is treated as having the bright limb on the right.
  // Waxing phases must therefore render right-lit before any sky rotation
  // is applied, or the local tilt will appear flipped by 180 degrees.
  const dir = waxing ? 1 : -1;
  const steps = 80;
  const cx = 50;
  const cy = 50;
  const radius = 48;
  const terminator = [];
  const limb = [];

  for (let i = 0; i <= steps; i += 1) {
    const y = -1 + (2 * i) / steps;
    const base = Math.sqrt(Math.max(0, 1 - y * y));
    const xTerminator = -dir * k * base;
    terminator.push({
      x: cx + xTerminator * radius,
      y: cy + y * radius,
    });
  }

  for (let i = steps; i >= 0; i -= 1) {
    const y = -1 + (2 * i) / steps;
    const base = Math.sqrt(Math.max(0, 1 - y * y));
    const xLimb = dir * base;
    limb.push({
      x: cx + xLimb * radius,
      y: cy + y * radius,
    });
  }

  const parts = [];
  if (terminator.length > 0) {
    parts.push(`M ${terminator[0].x.toFixed(2)} ${terminator[0].y.toFixed(2)}`);
    for (let i = 1; i < terminator.length; i += 1) {
      parts.push(`L ${terminator[i].x.toFixed(2)} ${terminator[i].y.toFixed(2)}`);
    }
    for (let i = 0; i < limb.length; i += 1) {
      parts.push(`L ${limb[i].x.toFixed(2)} ${limb[i].y.toFixed(2)}`);
    }
    parts.push("Z");
  }

  return parts.join(" ");
}

function formatTime(astroTime) {
  if (!astroTime || !astroTime.date) return "No event";
  return astroTime.date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: !use24Hour,
  });
}

function formatDateTime(date) {
  if (!(date instanceof Date)) return "No event";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: !use24Hour,
  });
}

function formatCountdown(targetDate, now) {
  if (!targetDate) return "--";
  const diffMs = targetDate.getTime() - now.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  if (Math.abs(diffSeconds) < 1) return "Now";
  const sign = diffSeconds < 0 ? "\u2212" : "\u00a0";
  const totalSeconds = Math.abs(diffSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours === 0) {
    return `${sign}${String(minutes).padStart(2, "0")}m ${String(
      seconds
    ).padStart(2, "0")}s`;
  }
  return `${sign}${String(hours).padStart(2, "0")}h ${String(minutes).padStart(
    2,
    "0"
  )}m ${String(
    seconds
  ).padStart(2, "0")}s`;
}

function formatSkyEventCountdown(targetDate, now, maxHours = 48) {
  if (!(targetDate instanceof Date) || !(now instanceof Date)) {
    return "--";
  }
  const diffHours = Math.abs(targetDate.getTime() - now.getTime()) / 3600000;
  if (!Number.isFinite(diffHours) || diffHours > maxHours) {
    return "--";
  }
  return formatCountdown(targetDate, now);
}

function formatCountdownWithin24h(targetDate, now) {
  if (!targetDate) return "--";
  if (!isWithin24Hours(targetDate, now)) return "";
  return formatCountdown(targetDate, now);
}

function isWithin24Hours(targetDate, now) {
  if (!(targetDate instanceof Date) || !(now instanceof Date)) return false;
  const diffMs = targetDate.getTime() - now.getTime();
  return Math.abs(diffMs) <= 24 * 60 * 60 * 1000;
}

function formatDaysUntil(targetDate, now) {
  if (!targetDate) return "--";
  const diffDays = (targetDate.getTime() - now.getTime()) / 86400000;
  if (Math.abs(diffDays) < 0.01) return "Now";
  return `${diffDays.toFixed(1)}d`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatLocalDateKey(date) {
  if (!(date instanceof Date)) return "unknown";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseOffsetDate(dateTimeText, utcOffsetSeconds) {
  if (typeof dateTimeText !== "string") return null;
  const match = dateTimeText.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "0"] = match;
  const utcMs =
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    ) - utcOffsetSeconds * 1000;
  return new Date(utcMs);
}

function formatScore(score) {
  if (!Number.isFinite(score)) return "--";
  return `${Math.round(score)}/100`;
}

function formatImpact(impact) {
  if (!Number.isFinite(impact)) return "--";
  return `+${impact.toFixed(1)}`;
}

function formatShortDateTime(date) {
  if (!(date instanceof Date)) return "--";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: !use24Hour,
  });
}

function normalizeAstroDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value.date instanceof Date) return value.date;
  if (value.time) return normalizeAstroDate(value.time);
  if (typeof value.toDate === "function") return value.toDate();
  return null;
}

function nextPhaseDateFallback(targetDeg, now, currentPhaseDeg) {
  const stepHours = 6;
  const maxDays = 40;
  const maxSteps = Math.ceil((maxDays * 24) / stepHours);
  const base = currentPhaseDeg;
  const targetUnwrapped = base + ((targetDeg - base + 360) % 360);

  let prevDate = new Date(now.getTime());
  let prevRaw = base;
  let offset = 0;
  let prevUnwrapped = base;

  for (let i = 1; i <= maxSteps; i++) {
    const nextDate = new Date(now.getTime() + i * stepHours * 3600000);
    const raw = Astronomy.MoonPhase(nextDate);
    if (raw < prevRaw - 180) {
      offset += 360;
    }
    const unwrapped = raw + offset;
    if (prevUnwrapped <= targetUnwrapped && unwrapped >= targetUnwrapped) {
      let lo = prevDate;
      let hi = nextDate;
      for (let j = 0; j < 24; j++) {
        const mid = new Date((lo.getTime() + hi.getTime()) / 2);
        const midRaw = Astronomy.MoonPhase(mid);
        let midOffset = offset;
        if (midRaw < prevRaw - 180) {
          midOffset -= 360;
        }
        const midUnwrapped = midRaw + midOffset;
        if (midUnwrapped >= targetUnwrapped) {
          hi = mid;
        } else {
          lo = mid;
        }
      }
      return hi;
    }
    prevDate = nextDate;
    prevRaw = raw;
    prevUnwrapped = unwrapped;
  }
  return null;
}

function getSunLongitude(date) {
  if (typeof Astronomy.SunPosition === "function") {
    const pos = Astronomy.SunPosition(date);
    if (typeof pos.elon === "number") return pos.elon;
    if (typeof pos.lon === "number") return pos.lon;
    if (typeof pos.eclipticLon === "number") return pos.eclipticLon;
  }
  if (typeof Astronomy.Ecliptic === "function" && Astronomy.Body?.Sun) {
    const ecl = Astronomy.Ecliptic(Astronomy.Body.Sun, date);
    if (typeof ecl.elon === "number") return ecl.elon;
    if (typeof ecl.lon === "number") return ecl.lon;
  }
  return null;
}

function nextSunLongitudeFallback(targetDeg, now, currentLon) {
  if (currentLon === null || currentLon === undefined) return null;
  const stepHours = 6;
  const maxDays = 370;
  const maxSteps = Math.ceil((maxDays * 24) / stepHours);
  const base = currentLon;
  const targetUnwrapped = base + ((targetDeg - base + 360) % 360);

  let prevDate = new Date(now.getTime());
  let prevRaw = base;
  let offset = 0;
  let prevUnwrapped = base;

  for (let i = 1; i <= maxSteps; i++) {
    const nextDate = new Date(now.getTime() + i * stepHours * 3600000);
    const raw = getSunLongitude(nextDate);
    if (raw === null || raw === undefined) return null;
    if (raw < prevRaw - 180) {
      offset += 360;
    }
    const unwrapped = raw + offset;
    if (prevUnwrapped <= targetUnwrapped && unwrapped >= targetUnwrapped) {
      let lo = prevDate;
      let hi = nextDate;
      for (let j = 0; j < 28; j++) {
        const mid = new Date((lo.getTime() + hi.getTime()) / 2);
        const midRaw = getSunLongitude(mid);
        if (midRaw === null || midRaw === undefined) break;
        let midOffset = offset;
        if (midRaw < prevRaw - 180) {
          midOffset -= 360;
        }
        const midUnwrapped = midRaw + midOffset;
        if (midUnwrapped >= targetUnwrapped) {
          hi = mid;
        } else {
          lo = mid;
        }
      }
      return hi;
    }
    prevDate = nextDate;
    prevRaw = raw;
    prevUnwrapped = unwrapped;
  }
  return null;
}

function computeSunAltitude(date, observer, refraction) {
  const sunEquator = Astronomy.Equator(
    Astronomy.Body.Sun,
    date,
    observer,
    true,
    true
  );
  const sunHorizontal = Astronomy.Horizon(
    date,
    observer,
    sunEquator.ra,
    sunEquator.dec,
    refraction
  );
  return sunHorizontal.altitude;
}

function computeBodyHorizontal(body, date, observer, refraction) {
  const equator = Astronomy.Equator(body, date, observer, true, true);
  return Astronomy.Horizon(date, observer, equator.ra, equator.dec, refraction);
}

function describeHorizonStatus(body, observer, now, currentAltitude) {
  if (!(now instanceof Date) || !observer || !Number.isFinite(currentAltitude)) {
    return "--";
  }
  if (currentAltitude <= 0) {
    return "Below Horizon";
  }

  const refraction = Astronomy.Refraction ? Astronomy.Refraction.Normal : true;
  const sampleDate = new Date(now.getTime() + 5 * 60000);

  try {
    const futureHorizontal = computeBodyHorizontal(
      body,
      sampleDate,
      observer,
      refraction
    );
    if (!Number.isFinite(futureHorizontal.altitude)) {
      return "--";
    }
    return futureHorizontal.altitude >= currentAltitude ? "Rising" : "Setting";
  } catch (err) {
    return "--";
  }
}

function findNextSunAltitudeCrossing(targetAlt, direction, now, observer) {
  const stepMinutes = 10;
  const maxHours = 48;
  const maxSteps = Math.ceil((maxHours * 60) / stepMinutes);
  const refraction = false;
  let prevDate = new Date(now.getTime());
  let prevAlt = computeSunAltitude(prevDate, observer, refraction);

  for (let i = 1; i <= maxSteps; i++) {
    const nextDate = new Date(now.getTime() + i * stepMinutes * 60000);
    const nextAlt = computeSunAltitude(nextDate, observer, refraction);
    const crossed =
      direction < 0
        ? prevAlt > targetAlt && nextAlt <= targetAlt
        : prevAlt < targetAlt && nextAlt >= targetAlt;

    if (crossed) {
      let lo = prevDate;
      let hi = nextDate;
      for (let j = 0; j < 24; j++) {
        const mid = new Date((lo.getTime() + hi.getTime()) / 2);
        const midAlt = computeSunAltitude(mid, observer, refraction);
        const midCrossed =
          direction < 0
            ? midAlt <= targetAlt
            : midAlt >= targetAlt;
        if (midCrossed) {
          hi = mid;
        } else {
          lo = mid;
        }
      }
      return hi;
    }
    prevDate = nextDate;
    prevAlt = nextAlt;
  }
  return null;
}

function twilightPhaseLabel(altitude) {
  if (altitude >= 0) return "Day";
  if (altitude >= -6) return "Civil Twilight";
  if (altitude >= -12) return "Nautical Twilight";
  if (altitude >= -18) return "Astronomical Twilight";
  return "Night";
}

function sortEventRows(tableEl, countdownMap, now) {
  if (!tableEl || !tableEl.tBodies.length) return;
  const tbody = tableEl.tBodies[0];
  const rows = Array.from(tbody.rows);
  const fixedTop = rows.filter((row) => row.dataset.fixed === "top");
  const fixedMiddle = rows.filter((row) => row.dataset.fixed === "middle");
  const fixedBottom = rows.filter((row) => row.dataset.fixed === "bottom");
  const sortable = rows.filter(
    (row) =>
      row.dataset.fixed !== "top" &&
      row.dataset.fixed !== "middle" &&
      row.dataset.fixed !== "bottom" &&
      row.querySelector("strong.countdown[id]")
  );

  const scored = sortable.map((row) => {
    const countdownEl = row.querySelector("strong.countdown[id]");
    const key = countdownEl ? countdownEl.id : null;
    const date = key ? countdownMap[key] : null;
    const diff = date instanceof Date ? date.getTime() - now.getTime() : null;
    const past = diff === null ? 1 : diff < 0 ? 1 : 0;
    const order = diff === null ? Number.POSITIVE_INFINITY : Math.abs(diff);
    return { row, past, order };
  });

  scored.sort((a, b) => {
    if (a.past !== b.past) return a.past - b.past;
    return a.order - b.order;
  });

  const reordered = [
    ...fixedTop,
    ...scored.map((item) => item.row),
    ...fixedMiddle,
    ...fixedBottom,
  ];
  reordered.forEach((row) => tbody.appendChild(row));
}

function formatDeltaMinutes(diffMinutes) {
  if (diffMinutes === null || diffMinutes === undefined) return "--";
  const rounded = Math.round(diffMinutes);
  if (!Number.isFinite(rounded)) return "--";
  if (rounded === 0) return "+0m";
  const sign = rounded > 0 ? "+" : "-";
  const totalMinutes = Math.abs(rounded);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${sign}${String(minutes).padStart(2, "0")}m`;
  }
  return `${sign}${String(hours).padStart(2, "0")}h ${String(minutes).padStart(
    2,
    "0"
  )}m`;
}

function updateSunDeltas(tableEl, countdownMap, options = {}) {
  if (!tableEl || !tableEl.tBodies.length) return;
  const hideWhenFarKeys = options.hideWhenFarKeys || new Set();
  const now = options.now instanceof Date ? options.now : null;
  const rows = Array.from(tableEl.tBodies[0].rows);
  let prevDate = null;
  let prevTemporalGroup = null;
  rows.forEach((row) => {
    const countdownEl = row.querySelector("strong.countdown[id]");
    const deltaEl = row.querySelector("strong.delta");
    if (!deltaEl) return;
    const key = countdownEl ? countdownEl.id : null;
    const currentDate = key ? countdownMap[key] : null;
    const currentTemporalGroup =
      currentDate instanceof Date && now
        ? currentDate >= now
          ? "future"
          : "past"
        : null;
    const hideDeltaForFarEvent =
      key && hideWhenFarKeys.has(key) && now && !isWithin24Hours(currentDate, now);
    if (hideDeltaForFarEvent) {
      deltaEl.textContent = "";
      if (currentDate instanceof Date) {
        prevDate = currentDate;
        prevTemporalGroup = currentTemporalGroup;
      }
      return;
    }
    if (
      !(currentDate instanceof Date) ||
      !(prevDate instanceof Date) ||
      !currentTemporalGroup ||
      !prevTemporalGroup ||
      currentTemporalGroup !== prevTemporalGroup
    ) {
      deltaEl.textContent = "--";
    } else {
      const diffMinutes = (currentDate.getTime() - prevDate.getTime()) / 60000;
      deltaEl.textContent = formatDeltaMinutes(diffMinutes);
    }
    if (currentDate instanceof Date) {
      prevDate = currentDate;
      prevTemporalGroup = currentTemporalGroup;
    }
  });
}

function phaseLabel(degrees) {
  const labels = [
    "New Moon",
    "Waxing Crescent",
    "First Quarter",
    "Waxing Gibbous",
    "Full Moon",
    "Waning Gibbous",
    "Third Quarter",
    "Waning Crescent",
  ];
  const index = Math.floor(((degrees + 22.5) % 360) / 45);
  return labels[index] || "--";
}

function buildObserver(lat, lon, height) {
  if (typeof Astronomy.MakeObserver === "function") {
    return Astronomy.MakeObserver(lat, lon, height);
  }
  if (typeof Astronomy.Observer === "function") {
    try {
      return new Astronomy.Observer(lat, lon, height);
    } catch (err) {
      return Astronomy.Observer(lat, lon, height);
    }
  }
  return { latitude: lat, longitude: lon, height };
}

function computeMoonTiltDegrees(moonHorizontal, sunHorizontal) {
  if (!moonHorizontal || !sunHorizontal) return null;
  if (
    !Number.isFinite(moonHorizontal.altitude) ||
    !Number.isFinite(moonHorizontal.azimuth) ||
    !Number.isFinite(sunHorizontal.altitude) ||
    !Number.isFinite(sunHorizontal.azimuth)
  ) {
    return null;
  }

  const zUnit = { x: 0, y: 0, z: 1 };

  const moonAlt = toRadians(moonHorizontal.altitude);
  const moonAz = toRadians(moonHorizontal.azimuth);
  const sunAlt = toRadians(sunHorizontal.altitude);
  const sunAz = toRadians(sunHorizontal.azimuth);

  const moonVec = {
    x: Math.cos(moonAlt) * Math.sin(moonAz),
    y: Math.cos(moonAlt) * Math.cos(moonAz),
    z: Math.sin(moonAlt),
  };
  const sunVec = {
    x: Math.cos(sunAlt) * Math.sin(sunAz),
    y: Math.cos(sunAlt) * Math.cos(sunAz),
    z: Math.sin(sunAlt),
  };

  const moonMag = Math.hypot(moonVec.x, moonVec.y, moonVec.z);
  const sunMag = Math.hypot(sunVec.x, sunVec.y, sunVec.z);
  if (!Number.isFinite(moonMag) || !Number.isFinite(sunMag)) return null;
  const m = {
    x: moonVec.x / moonMag,
    y: moonVec.y / moonMag,
    z: moonVec.z / moonMag,
  };
  const s = {
    x: sunVec.x / sunMag,
    y: sunVec.y / sunMag,
    z: sunVec.z / sunMag,
  };

  const mDotZ = m.x * zUnit.x + m.y * zUnit.y + m.z * zUnit.z;
  const upRaw = {
    x: zUnit.x - mDotZ * m.x,
    y: zUnit.y - mDotZ * m.y,
    z: zUnit.z - mDotZ * m.z,
  };
  const upMag = Math.hypot(upRaw.x, upRaw.y, upRaw.z);
  if (upMag < 1e-6) return null;
  const up = {
    x: upRaw.x / upMag,
    y: upRaw.y / upMag,
    z: upRaw.z / upMag,
  };

  const rightRaw = {
    x: m.y * up.z - m.z * up.y,
    y: m.z * up.x - m.x * up.z,
    z: m.x * up.y - m.y * up.x,
  };
  const rightMag = Math.hypot(rightRaw.x, rightRaw.y, rightRaw.z);
  if (rightMag < 1e-6) return null;
  const right = {
    x: rightRaw.x / rightMag,
    y: rightRaw.y / rightMag,
    z: rightRaw.z / rightMag,
  };

  const sDotM = s.x * m.x + s.y * m.y + s.z * m.z;
  const sProjRaw = {
    x: s.x - sDotM * m.x,
    y: s.y - sDotM * m.y,
    z: s.z - sDotM * m.z,
  };
  const sProjMag = Math.hypot(sProjRaw.x, sProjRaw.y, sProjRaw.z);
  if (sProjMag < 1e-6) return null;
  const sProj = {
    x: sProjRaw.x / sProjMag,
    y: sProjRaw.y / sProjMag,
    z: sProjRaw.z / sProjMag,
  };

  const angle = Math.atan2(
    sProj.x * right.x + sProj.y * right.y + sProj.z * right.z,
    sProj.x * up.x + sProj.y * up.y + sProj.z * up.z
  );

  const tilt = normalizeRadians(angle - Math.PI / 2);
  return toDegrees(tilt);
}

function pickLunarEclipseStart(info) {
  if (!info) return null;
  const candidates = [
    info.sd_penum,
    info.sd_partial,
    info.sd_total,
    info.peak,
  ];
  for (let i = 0; i < candidates.length; i += 1) {
    const date = normalizeAstroDate(candidates[i]);
    if (date instanceof Date) return date;
  }
  return null;
}

function isBodyAboveHorizon(body, date, observer) {
  if (!(date instanceof Date) || !observer) return false;
  try {
    const refraction = Astronomy.Refraction ? Astronomy.Refraction.Normal : true;
    const equator = Astronomy.Equator(body, date, observer, true, true);
    const horizontal = Astronomy.Horizon(
      date,
      observer,
      equator.ra,
      equator.dec,
      refraction
    );
    return Number.isFinite(horizontal.altitude) && horizontal.altitude > 0;
  } catch (err) {
    return false;
  }
}

function findNextVisibleLunarEclipse(now, observer) {
  if (typeof Astronomy.SearchLunarEclipse !== "function") return null;
  const toAstroTime =
    typeof Astronomy.MakeTime === "function"
      ? (d) => Astronomy.MakeTime(d)
      : (d) => d;
  const stepDays = 40;
  const maxChecks = 20;

  for (let i = 0; i < maxChecks; i += 1) {
    const searchStart = new Date(now.getTime() + i * stepDays * 86400000);
    let info = null;
    try {
      info = Astronomy.SearchLunarEclipse(toAstroTime(searchStart));
    } catch (err) {
      return null;
    }
    if (!info) return null;
    const startDate = pickLunarEclipseStart(info);
    if (!(startDate instanceof Date) || startDate <= now) continue;
    const peakDate = normalizeAstroDate(info.peak);
    if (
      isBodyAboveHorizon(Astronomy.Body.Moon, startDate, observer) ||
      isBodyAboveHorizon(Astronomy.Body.Moon, peakDate, observer)
    ) {
      return startDate;
    }
  }
  return null;
}

function findNextLocalSolarEclipseStart(now, observer) {
  if (typeof Astronomy.SearchLocalSolarEclipse !== "function") return null;
  const startTime =
    typeof Astronomy.MakeTime === "function" ? Astronomy.MakeTime(now) : now;
  try {
    const info = Astronomy.SearchLocalSolarEclipse(startTime, observer);
    if (!info) return null;
    const startDate = normalizeAstroDate(info.partial_begin);
    if (startDate instanceof Date) return startDate;
    return normalizeAstroDate(info.peak);
  } catch (err) {
    return null;
  }
}

function locationCacheKey(location) {
  if (!location) return "none";
  const lat = Number.isFinite(location.latitude) ? location.latitude.toFixed(3) : "na";
  const lon = Number.isFinite(location.longitude) ? location.longitude.toFixed(3) : "na";
  const elev = Number.isFinite(location.elevation) ? location.elevation.toFixed(0) : "0";
  return `${lat}|${lon}|${elev}`;
}

function getCachedEclipseDates(now, observer, location) {
  const key = locationCacheKey(location);
  const staleMs = 6 * 60 * 60 * 1000;
  const isStale = now.getTime() - eclipseCache.computedAt > staleMs;
  const keyChanged = eclipseCache.key !== key;
  const lunarExpired =
    eclipseCache.lunarDate instanceof Date && eclipseCache.lunarDate <= now;
  const solarExpired =
    eclipseCache.solarDate instanceof Date && eclipseCache.solarDate <= now;

  if (keyChanged || isStale || lunarExpired || solarExpired) {
    eclipseCache = {
      key,
      computedAt: now.getTime(),
      lunarDate: findNextVisibleLunarEclipse(now, observer),
      solarDate: findNextLocalSolarEclipseStart(now, observer),
    };
  }

  return {
    lunarDate: eclipseCache.lunarDate,
    solarDate: eclipseCache.solarDate,
  };
}

function sunsetLocationKey(location) {
  if (!location) return "none";
  const lat = Number.isFinite(location.latitude) ? location.latitude.toFixed(3) : "na";
  const lon = Number.isFinite(location.longitude) ? location.longitude.toFixed(3) : "na";
  return `${lat}|${lon}`;
}

function sunsetRequestKey(location, dayKey) {
  return `${sunsetLocationKey(location)}|${dayKey}`;
}

function scoreByTargetRange(value, target, falloff, minScore = 0) {
  if (!Number.isFinite(value)) return minScore;
  return clamp(100 - Math.abs(value - target) * falloff, minScore, 100);
}

function rankSunsetScore(score) {
  if (score >= 80) return { key: "amazing", label: "Amazing", emoji: "FIRE" };
  if (score >= 60) return { key: "good", label: "Good", emoji: "GLOW" };
  if (score >= 30) return { key: "decent", label: "Decent", emoji: "WARM" };
  return { key: "poor", label: "Poor", emoji: "DIM" };
}

function scoreSunsetFactors(sample) {
  const lowClouds = Number(sample.cloud_cover_low);
  const midClouds = Number(sample.cloud_cover_mid);
  const highClouds = Number(sample.cloud_cover_high);
  const humidity = Number(sample.relative_humidity_2m);
  const visibilityKm = Number(sample.visibility) / 1000;
  const windKph = Number(sample.wind_speed_10m);
  const rainMm = Number(sample.precipitation);
  const rainChance = Number(sample.precipitation_probability);
  const requiredValues = [
    lowClouds,
    midClouds,
    highClouds,
    humidity,
    visibilityKm,
    windKph,
    rainMm,
    rainChance,
  ];
  if (requiredValues.some((value) => !Number.isFinite(value))) {
    throw new Error("Forecast missing required sunset factors");
  }

  const cloudsScore =
    scoreByTargetRange(lowClouds, 18, 3.2) * 0.45 +
    scoreByTargetRange(midClouds, 42, 2.1) * 0.35 +
    scoreByTargetRange(highClouds, 32, 2.5) * 0.2;
  const humidityScore = scoreByTargetRange(humidity, 58, 2.1);
  const visibilityScore = clamp(((visibilityKm - 4) / 20) * 100, 0, 100);
  const windScore =
    windKph < 4
      ? clamp((windKph / 4) * 65, 0, 65)
      : windKph <= 18
        ? clamp(65 + ((18 - Math.abs(windKph - 11)) / 14) * 35, 0, 100)
        : clamp(100 - (windKph - 18) * 5, 0, 100);
  const rainPenalty = clamp(rainMm * 24 + rainChance * 0.55, 0, 100);
  const rainScore = 100 - rainPenalty;

  const factors = [
    {
      key: "clouds",
      label: "Clouds",
      value: `L ${Math.round(lowClouds)}% M ${Math.round(midClouds)}% H ${Math.round(highClouds)}%`,
      score: cloudsScore,
      weight: 0.35,
    },
    {
      key: "humidity",
      label: "Humidity",
      value: `${Math.round(humidity)}% RH`,
      score: humidityScore,
      weight: 0.2,
    },
    {
      key: "visibility",
      label: "Visibility",
      value: `${visibilityKm.toFixed(1)} km`,
      score: visibilityScore,
      weight: 0.2,
    },
    {
      key: "wind",
      label: "Wind",
      value: `${windKph.toFixed(0)} km/h`,
      score: windScore,
      weight: 0.15,
    },
    {
      key: "rain",
      label: "Rain",
      value: `${rainMm.toFixed(1)} mm / ${Math.round(rainChance)}%`,
      score: rainScore,
      weight: 0.1,
    },
  ];

  let total = 0;
  factors.forEach((factor) => {
    factor.impact = factor.score * factor.weight;
    total += factor.impact;
  });
  const rank = rankSunsetScore(total);

  return {
    score: total,
    rank,
    factors,
  };
}

function hydrateSunsetForecast(data) {
  if (!data || typeof data !== "object") return null;
  return {
    ...data,
    sunsetDate: data.sunsetDate ? new Date(data.sunsetDate) : null,
    sample: data.sample
      ? {
          ...data.sample,
          time: data.sample.time ? new Date(data.sample.time) : null,
        }
      : null,
  };
}

function pickBestSunsetSample(hourly, targetDate, utcOffsetSeconds) {
  const times = Array.isArray(hourly?.time) ? hourly.time : [];
  let bestIndex = -1;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (let i = 0; i < times.length; i += 1) {
    const sampleDate = parseOffsetDate(times[i], utcOffsetSeconds);
    if (!(sampleDate instanceof Date) || Number.isNaN(sampleDate.getTime())) {
      continue;
    }
    const diff = Math.abs(sampleDate.getTime() - targetDate.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = i;
    }
  }
  if (bestIndex < 0) return null;
  return {
    time: parseOffsetDate(times[bestIndex], utcOffsetSeconds),
    cloud_cover: hourly.cloud_cover?.[bestIndex],
    cloud_cover_low: hourly.cloud_cover_low?.[bestIndex],
    cloud_cover_mid: hourly.cloud_cover_mid?.[bestIndex],
    cloud_cover_high: hourly.cloud_cover_high?.[bestIndex],
    relative_humidity_2m: hourly.relative_humidity_2m?.[bestIndex],
    visibility: hourly.visibility?.[bestIndex],
    wind_speed_10m: hourly.wind_speed_10m?.[bestIndex],
    precipitation_probability: hourly.precipitation_probability?.[bestIndex],
    precipitation: hourly.precipitation?.[bestIndex],
  };
}

function renderSunsetFactor(factor) {
  const valueEl = ui[`sunset${factor.label}Value`];
  const scoreEl = ui[`sunset${factor.label}Score`];
  const impactEl = ui[`sunset${factor.label}Impact`];
  if (valueEl) valueEl.textContent = factor.value;
  if (scoreEl) scoreEl.textContent = formatScore(factor.score);
  if (impactEl) impactEl.textContent = formatImpact(factor.impact);
}

function renderSunsetForecast() {
  const forecast = sunsetForecastState.data;
  const sunsetDate = currentLocation
    ? pickRiseSet(
        Astronomy.Body.Sun,
        buildObserver(
          currentLocation.latitude,
          currentLocation.longitude,
          currentLocation.elevation || 0
        ),
        -1,
        new Date()
      )
    : null;

  ui.sunsetTimeInline.textContent = `Sunset: ${formatTime({ date: sunsetDate })}`;

  if (!forecast) {
    ui.sunsetCard?.removeAttribute("data-rank");
    ui.sunsetScoreLabel.textContent = "--";
    ui.sunsetRankInline.textContent =
      sunsetForecastState.error || "Prediction unavailable";
    ui.sunsetUpdatedInline.textContent =
      sunsetForecastState.status === "loading"
        ? "Weather: loading..."
        : "Weather: waiting for data";
    ui.sunsetHeaderUpdated.textContent = "Updated: --";
    ui.sunsetWeatherHour.textContent = "--";
    ui.sunsetWeatherModel.textContent = "--";
    ui.sunsetOverallLabel.textContent = "--";
    ui.sunsetOverallScore.textContent = "--";
    ui.sunsetOverallTier.textContent = "--";
    [
      ["Clouds", "clouds"],
      ["Humidity", "humidity"],
      ["Visibility", "visibility"],
      ["Wind", "wind"],
      ["Rain", "rain"],
    ].forEach(([label]) => {
      ui[`sunset${label}Value`].textContent = "--";
      ui[`sunset${label}Score`].textContent = "--";
      ui[`sunset${label}Impact`].textContent = "--";
    });
    ui.sunsetFetchStatus.textContent =
      sunsetForecastState.status === "loading" ? "Loading" : "--";
    return;
  }

  ui.sunsetCard?.setAttribute("data-rank", forecast.rank.key);
  ui.sunsetScoreLabel.textContent = `${Math.round(forecast.score)}/100`;
  ui.sunsetRankInline.textContent = `${forecast.rank.label} sunset outlook`;
  ui.sunsetUpdatedInline.textContent = `Weather: ${forecast.summary}`;
  ui.sunsetWeatherHour.textContent = formatTime({ date: forecast.sample.time });
  ui.sunsetOverallLabel.textContent = forecast.rank.label;
  ui.sunsetOverallScore.textContent = formatScore(forecast.score);
  ui.sunsetOverallTier.textContent = forecast.rank.emoji;
  forecast.factors.forEach(renderSunsetFactor);
  const fetchedAtLabel = formatShortDateTime(new Date(forecast.fetchedAt));
  ui.sunsetHeaderUpdated.textContent = `Updated: ${fetchedAtLabel}`;
  ui.sunsetFetchStatus.textContent = forecast.cached ? "Cached" : "Live";
  ui.sunsetWeatherModel.textContent = "Sample";
}

async function fetchSunsetForecast(location, sunsetDate) {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    timezone: "auto",
    forecast_days: "2",
    hourly:
      "cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,relative_humidity_2m,visibility,wind_speed_10m,precipitation_probability,precipitation",
    daily: "sunset",
  });
  const response = await fetch(`${SUNSET_WEATHER_ENDPOINT}?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch sunset weather");
  const payload = await response.json();
  const utcOffsetSeconds = Number(payload.utc_offset_seconds) || 0;
  const sunsetSeries = Array.isArray(payload?.daily?.sunset) ? payload.daily.sunset : [];
  let apiSunsetDate = sunsetDate;
  if (sunsetSeries.length > 0) {
    const parsed = parseOffsetDate(sunsetSeries[0], utcOffsetSeconds);
    if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) {
      apiSunsetDate = parsed;
    }
  }
  const sample = pickBestSunsetSample(payload.hourly, apiSunsetDate, utcOffsetSeconds);
  if (!sample || !(sample.time instanceof Date)) {
    throw new Error("Forecast missing sunset-hour weather");
  }
  const scored = scoreSunsetFactors(sample);
  const summary = `${scored.rank.label} based on sunset-hour conditions`;
  return {
    ...scored,
    sample,
    sunsetDate: apiSunsetDate,
    fetchedAt: Date.now(),
    sourceLabel: payload.timezone_abbreviation || payload.timezone || "Forecast",
    summary,
  };
}

async function ensureSunsetForecast(options = {}) {
  const force = options.force === true;
  if (!currentLocation) {
    sunsetForecastState = {
      requestKey: null,
      status: "idle",
      data: null,
      error: "Set a location to load weather.",
      lastFetchedAt: 0,
    };
    renderSunsetForecast();
    return;
  }

  const now = new Date();
  const dayKey = formatLocalDateKey(now);
  const key = sunsetRequestKey(currentLocation, dayKey);
  const sunsetDate = pickRiseSet(
    Astronomy.Body.Sun,
    buildObserver(
      currentLocation.latitude,
      currentLocation.longitude,
      currentLocation.elevation || 0
    ),
    -1,
    now
  );
  if (!(sunsetDate instanceof Date)) {
    sunsetForecastState.error = "Sunset time unavailable for this location.";
    sunsetForecastState.data = null;
    renderSunsetForecast();
    return;
  }

  if (!force && sunsetForecastState.requestKey === key && sunsetForecastState.data) {
    renderSunsetForecast();
    return;
  }

  const cached = loadSunsetForecastCache();
  if (
    !force &&
    cached &&
    cached.requestKey === key &&
    Date.now() - cached.fetchedAt < 60 * 60 * 1000
  ) {
    const hydrated = hydrateSunsetForecast(cached.data);
    sunsetForecastState = {
      requestKey: key,
      status: "ready",
      data: hydrated ? { ...hydrated, cached: true } : null,
      error: "",
      lastFetchedAt: cached.fetchedAt,
    };
    renderSunsetForecast();
    if (isOffline()) return;
  }

  if (isOffline()) {
    if (!sunsetForecastState.data) {
      sunsetForecastState = {
        requestKey: key,
        status: "error",
        data: null,
        error: "Offline. Sunset prediction needs weather data.",
        lastFetchedAt: 0,
      };
    }
    renderSunsetForecast();
    return;
  }

  if (sunsetForecastState.status === "loading" && sunsetForecastState.requestKey === key) {
    return;
  }

  sunsetForecastState = {
    requestKey: key,
    status: "loading",
    data: sunsetForecastState.data,
    error: "",
    lastFetchedAt: sunsetForecastState.lastFetchedAt,
  };
  renderSunsetForecast();

  try {
    const data = await fetchSunsetForecast(currentLocation, sunsetDate);
    if (sunsetForecastState.requestKey !== key) {
      return;
    }
    sunsetForecastState = {
      requestKey: key,
      status: "ready",
      data: { ...data, cached: false },
      error: "",
      lastFetchedAt: data.fetchedAt,
    };
    saveSunsetForecastCache({
      requestKey: key,
      fetchedAt: data.fetchedAt,
      data: sunsetForecastState.data,
    });
  } catch (err) {
    if (sunsetForecastState.requestKey !== key) {
      return;
    }
    sunsetForecastState = {
      requestKey: key,
      status: "error",
      data: sunsetForecastState.data,
      error: err.message || "Unable to load sunset forecast.",
      lastFetchedAt: sunsetForecastState.lastFetchedAt,
    };
  }

  renderSunsetForecast();
}

function localDayBounds(date) {
  if (!(date instanceof Date)) {
    return { start: null, end: null };
  }
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function pickRiseSet(body, observer, direction, now) {
  const { start, end } = localDayBounds(now);
  if (!start || !end) return null;
  const yesterday = new Date(start);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(end);

  const yesterdayEvent = normalizeAstroDate(
    Astronomy.SearchRiseSet(body, observer, direction, yesterday, 1, 0)
  );
  const todayEvent = normalizeAstroDate(
    Astronomy.SearchRiseSet(body, observer, direction, start, 1, 0)
  );
  const tomorrowEvent = normalizeAstroDate(
    Astronomy.SearchRiseSet(body, observer, direction, tomorrow, 1, 0)
  );

  const candidates = [yesterdayEvent, todayEvent, tomorrowEvent].filter(
    (value) => value instanceof Date
  );
  const pastRecent = candidates
    .filter((value) => value <= now)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const upcoming = candidates
    .filter((value) => value >= now)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  if (pastRecent) {
    const hoursAgo = (now.getTime() - pastRecent.getTime()) / 3600000;
    if (hoursAgo <= 4) {
      return pastRecent;
    }
  }

  if (upcoming) {
    return upcoming;
  }

  return pastRecent || null;
}

function findSolarNoon(now, observer) {
  if (!(now instanceof Date) || !observer) return null;
  const { start: startOfDay } = localDayBounds(now);
  if (!(startOfDay instanceof Date)) return null;
  const sunrise = Astronomy.SearchRiseSet(
    Astronomy.Body.Sun,
    observer,
    +1,
    startOfDay,
    1,
    0
  );
  const sunset = Astronomy.SearchRiseSet(
    Astronomy.Body.Sun,
    observer,
    -1,
    startOfDay,
    1,
    0
  );
  const sunriseDate = normalizeAstroDate(sunrise);
  const sunsetDate = normalizeAstroDate(sunset);
  if (!(sunriseDate instanceof Date) || !(sunsetDate instanceof Date)) {
    return null;
  }
  return new Date((sunriseDate.getTime() + sunsetDate.getTime()) / 2);
}

async function reverseGeocodeCity(latitude, longitude) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
  const response = await fetch(url, {
    headers: {
      "Accept-Language": "en",
    },
  });
  if (!response.ok) throw new Error("Failed to fetch city");
  const data = await response.json();
  const address = data.address || {};
  return (
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.county ||
    address.state ||
    "Unknown"
  );
}

function updateLocationDisplay(location) {
  if (!location) {
    ui.city.textContent = "--";
    ui.locationSource.textContent = "--";
    ui.lat.textContent = "--";
    ui.lon.textContent = "--";
    ui.cachedAt.textContent = "--";
    return;
  }

  ui.city.textContent = location.city || "--";
  ui.locationSource.textContent = (location.source || "--").toUpperCase();
  ui.lat.textContent = formatCoord(location.latitude);
  ui.lon.textContent = formatCoord(location.longitude);
  ui.cachedAt.textContent = new Date(location.cachedAt).toLocaleString();
}

function getLocationLabel(location) {
  if (!location) return "location";
  if (location.city) return location.city;
  if (
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude)
  ) {
    return `${formatCoord(location.latitude)}, ${formatCoord(location.longitude)}`;
  }
  return "location";
}

function applyBannerDockState() {
  if (!bannerEl || !bannerDockButton) return;
  bannerEl.classList.toggle("is-docked", bannerDocked);
  bannerDockButton.setAttribute("aria-expanded", bannerDocked ? "false" : "true");
  bannerDockButton.setAttribute("title", bannerDocked ? "Show observer controls" : "Dock observer controls");
  const label = bannerDockButton.querySelector(".dock-toggle-label");
  if (label) {
    label.textContent = bannerDocked ? "Show" : "Dock";
  }
}

function updateDashboard() {
  if (!currentLocation) {
    renderSunsetForecast();
    return;
  }

  const now = new Date();
  const dayKey = formatLocalDateKey(now);
  const sunsetKey = sunsetRequestKey(currentLocation, dayKey);
  if (sunsetForecastState.requestKey !== sunsetKey || !sunsetForecastState.data) {
    ensureSunsetForecast();
  }
  const observer = buildObserver(
    currentLocation.latitude,
    currentLocation.longitude,
    currentLocation.elevation || 0
  );

  const moonPhaseDeg = Astronomy.MoonPhase(now);
  const illum = (1 - Math.cos((moonPhaseDeg * Math.PI) / 180)) / 2;
  ui.moonPhaseLabel.textContent = phaseLabel(moonPhaseDeg);
  ui.moonIllumination.textContent = `Illumination: ${(illum * 100).toFixed(0)}%`;
  const waxing = moonPhaseDeg < 180;
  if (ui.moonLitPath) {
    ui.moonLitPath.setAttribute(
      "d",
      buildMoonTerminatorPath(moonPhaseDeg, waxing)
    );
  }

  let nextNew = null;
  let nextFull = null;
  try {
    if (typeof Astronomy.SearchMoonPhase === "function") {
      const startTime =
        typeof Astronomy.MakeTime === "function" ? Astronomy.MakeTime(now) : now;
      nextNew = Astronomy.SearchMoonPhase(0, startTime, 1);
      nextFull = Astronomy.SearchMoonPhase(180, startTime, 1);
    }
  } catch (err) {
    nextNew = null;
    nextFull = null;
  }
  const nextNewDate = normalizeAstroDate(nextNew);
  const nextFullDate = normalizeAstroDate(nextFull);
  const fallbackNew =
    nextNewDate || nextPhaseDateFallback(0, now, moonPhaseDeg);
  const fallbackFull =
    nextFullDate || nextPhaseDateFallback(180, now, moonPhaseDeg);
  ui.moonDaysNew.textContent = formatDaysUntil(
    fallbackNew,
    now
  );
  ui.moonDaysFull.textContent = formatDaysUntil(
    fallbackFull,
    now
  );
  if (ui.moonNewCountdown) {
    ui.moonNewCountdown.textContent = formatCountdownWithin24h(fallbackNew, now);
  }
  if (ui.moonFullCountdown) {
    ui.moonFullCountdown.textContent = formatCountdownWithin24h(fallbackFull, now);
  }

  let nextSummer = null;
  let nextWinter = null;
  try {
    if (typeof Astronomy.SearchSunLongitude === "function") {
      const startTime =
        typeof Astronomy.MakeTime === "function" ? Astronomy.MakeTime(now) : now;
      nextSummer = Astronomy.SearchSunLongitude(90, startTime);
      nextWinter = Astronomy.SearchSunLongitude(270, startTime);
    }
  } catch (err) {
    nextSummer = null;
    nextWinter = null;
  }
  const nextSummerDate = normalizeAstroDate(nextSummer);
  const nextWinterDate = normalizeAstroDate(nextWinter);
  const currentLon = getSunLongitude(now);
  const fallbackSummer =
    nextSummerDate || nextSunLongitudeFallback(90, now, currentLon);
  const fallbackWinter =
    nextWinterDate || nextSunLongitudeFallback(270, now, currentLon);
  ui.sunSolsticeSummer.textContent = formatDaysUntil(fallbackSummer, now);
  ui.sunSolsticeWinter.textContent = formatDaysUntil(fallbackWinter, now);
  if (ui.summerSolsticeCountdown) {
    ui.summerSolsticeCountdown.textContent = formatCountdownWithin24h(
      fallbackSummer,
      now
    );
  }
  if (ui.winterSolsticeCountdown) {
    ui.winterSolsticeCountdown.textContent = formatCountdownWithin24h(
      fallbackWinter,
      now
    );
  }

  const refraction = Astronomy.Refraction ? Astronomy.Refraction.Normal : true;

  const moonHorizontal = computeBodyHorizontal(
    Astronomy.Body.Moon,
    now,
    observer,
    refraction
  );

  ui.moonHorizonStatus.textContent = describeHorizonStatus(
    Astronomy.Body.Moon,
    observer,
    now,
    moonHorizontal.altitude
  );
  ui.moonAltitudeInline.textContent = `Altitude: ${formatAngle(
    moonHorizontal.altitude
  )}`;
  ui.moonAzimuthInline.textContent = `Azimuth: ${formatAzimuthLabel(
    moonHorizontal.azimuth
  )}`;
  ui.moonVisual?.classList.toggle(
    "below-horizon",
    Number.isFinite(moonHorizontal.altitude) && moonHorizontal.altitude < 0
  );

  const sunHorizontal = computeBodyHorizontal(
    Astronomy.Body.Sun,
    now,
    observer,
    refraction
  );

  ui.sunHorizonStatus.textContent = describeHorizonStatus(
    Astronomy.Body.Sun,
    observer,
    now,
    sunHorizontal.altitude
  );
  ui.sunAltitudeInline.textContent = `Altitude: ${formatAngle(
    sunHorizontal.altitude
  )}`;
  ui.sunAzimuthInline.textContent = `Azimuth: ${formatAzimuthLabel(
    sunHorizontal.azimuth
  )}`;
  ui.sunVisual?.classList.toggle(
    "below-horizon",
    Number.isFinite(sunHorizontal.altitude) && sunHorizontal.altitude < 0
  );

  const moonTilt = computeMoonTiltDegrees(moonHorizontal, sunHorizontal);
  if (Number.isFinite(moonTilt)) {
    ui.moonVisual.style.setProperty("--tilt", `${moonTilt.toFixed(1)}deg`);
  } else {
    ui.moonVisual.style.setProperty("--tilt", "0deg");
  }

  const moonriseDate = pickRiseSet(Astronomy.Body.Moon, observer, +1, now);
  const moonsetDate = pickRiseSet(Astronomy.Body.Moon, observer, -1, now);
  const sunriseDate = pickRiseSet(Astronomy.Body.Sun, observer, +1, now);
  const sunsetDate = pickRiseSet(Astronomy.Body.Sun, observer, -1, now);
  const solarNoonDate = findSolarNoon(now, observer);

  ui.moonriseTime.textContent = formatTime({ date: moonriseDate });
  ui.moonriseCountdown.textContent = formatSkyEventCountdown(moonriseDate, now);
  ui.moonsetTime.textContent = formatTime({ date: moonsetDate });
  ui.moonsetCountdown.textContent = formatSkyEventCountdown(moonsetDate, now);
  ui.sunriseTime.textContent = formatTime({ date: sunriseDate });
  ui.sunriseCountdown.textContent = formatSkyEventCountdown(sunriseDate, now);
  ui.sunsetTime.textContent = formatTime({ date: sunsetDate });
  ui.sunsetCountdown.textContent = formatSkyEventCountdown(sunsetDate, now);
  ui.solarNoonTime.textContent = formatTime({ date: solarNoonDate });
  ui.solarNoonCountdown.textContent = formatSkyEventCountdown(solarNoonDate, now);

  const sunAltNoRefraction = computeSunAltitude(now, observer, false);
  ui.twilightPhase.textContent = twilightPhaseLabel(sunAltNoRefraction);

  const civilDusk = findNextSunAltitudeCrossing(-6, -1, now, observer);
  const nauticalDusk = findNextSunAltitudeCrossing(-12, -1, now, observer);
  const astroDusk = findNextSunAltitudeCrossing(-18, -1, now, observer);
  const civilDawn = findNextSunAltitudeCrossing(-6, +1, now, observer);
  const nauticalDawn = findNextSunAltitudeCrossing(-12, +1, now, observer);
  const astroDawn = findNextSunAltitudeCrossing(-18, +1, now, observer);

  ui.civilDuskTime.textContent = formatTime({ date: civilDusk });
  ui.civilDuskCountdown.textContent = formatSkyEventCountdown(civilDusk, now);
  ui.nauticalDuskTime.textContent = formatTime({ date: nauticalDusk });
  ui.nauticalDuskCountdown.textContent = formatSkyEventCountdown(
    nauticalDusk,
    now
  );
  ui.astroDuskTime.textContent = formatTime({ date: astroDusk });
  ui.astroDuskCountdown.textContent = formatSkyEventCountdown(astroDusk, now);
  ui.civilDawnTime.textContent = formatTime({ date: civilDawn });
  ui.civilDawnCountdown.textContent = formatSkyEventCountdown(civilDawn, now);
  ui.nauticalDawnTime.textContent = formatTime({ date: nauticalDawn });
  ui.nauticalDawnCountdown.textContent = formatSkyEventCountdown(
    nauticalDawn,
    now
  );
  ui.astroDawnTime.textContent = formatTime({ date: astroDawn });
  ui.astroDawnCountdown.textContent = formatSkyEventCountdown(astroDawn, now);

  const eclipseDates = getCachedEclipseDates(now, observer, currentLocation);
  const lunarEclipseDate = eclipseDates.lunarDate;
  const solarEclipseDate = eclipseDates.solarDate;
  ui.lunarEclipseTime.textContent = lunarEclipseDate
    ? formatDateTime(lunarEclipseDate)
    : "No event";
  ui.lunarEclipseCountdown.textContent = formatCountdownWithin24h(
    lunarEclipseDate,
    now
  );
  ui.solarEclipseTime.textContent = solarEclipseDate
    ? formatDateTime(solarEclipseDate)
    : "No event";
  ui.solarEclipseCountdown.textContent = formatCountdownWithin24h(
    solarEclipseDate,
    now
  );

  sortEventRows(
    moonTable,
    {
      "moonrise-countdown": moonriseDate,
      "moonset-countdown": moonsetDate,
      "moon-new-countdown": fallbackNew,
      "moon-full-countdown": fallbackFull,
      "lunar-eclipse-countdown": lunarEclipseDate,
    },
    now
  );
  updateSunDeltas(
    moonTable,
    {
      "moonrise-countdown": moonriseDate,
      "moonset-countdown": moonsetDate,
      "moon-new-countdown": fallbackNew,
      "moon-full-countdown": fallbackFull,
      "lunar-eclipse-countdown": lunarEclipseDate,
    },
    {
      now,
      hideWhenFarKeys: new Set([
        "moon-new-countdown",
        "moon-full-countdown",
        "lunar-eclipse-countdown",
      ]),
    }
  );
  const sunCountdowns = {
    "sunrise-countdown": sunriseDate,
    "sunset-countdown": sunsetDate,
    "solar-noon-countdown": solarNoonDate,
    "civil-dusk-countdown": civilDusk,
    "nautical-dusk-countdown": nauticalDusk,
    "astro-dusk-countdown": astroDusk,
    "astro-dawn-countdown": astroDawn,
    "nautical-dawn-countdown": nauticalDawn,
    "civil-dawn-countdown": civilDawn,
    "summer-solstice-countdown": fallbackSummer,
    "winter-solstice-countdown": fallbackWinter,
    "solar-eclipse-countdown": solarEclipseDate,
  };
  sortEventRows(
    sunTable,
    sunCountdowns,
    now
  );
  updateSunDeltas(sunTable, sunCountdowns, {
    now,
    hideWhenFarKeys: new Set([
      "summer-solstice-countdown",
      "winter-solstice-countdown",
      "solar-eclipse-countdown",
    ]),
  });

  renderSunsetForecast();
}

function setStatus(message) {
  statusEl.textContent = message;
}

function setLocation(location, options = {}) {
  const { statusMessage } = options;
  const source = inferLocationSource(location);
  const normalizedLocation = { ...location, source };
  currentLocation = normalizedLocation;
  saveLocation(normalizedLocation);
  updateLocationDisplay(normalizedLocation);
  if (statusMessage) {
    setStatus(statusMessage);
  } else {
    setStatus(
      `Using ${source} location ${getLocationLabel(normalizedLocation)}.`
    );
  }
  updateDashboard();
  ensureSunsetForecast();
}

async function enrichLocationCity(location) {
  if (location.city) return location;
  if (isOffline()) {
    return location.source === "gps" ? { ...location, city: "Unknown" } : location;
  }
  try {
    const city = await reverseGeocodeCity(
      location.latitude,
      location.longitude
    );
    return { ...location, city };
  } catch (err) {
    return location;
  }
}

async function forwardGeocodeCity(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
    query
  )}`;
  const response = await fetch(url, {
    headers: {
      "Accept-Language": "en",
    },
  });
  if (!response.ok) throw new Error("Failed to fetch city coordinates");
  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error("City not found");
  }
  return results[0];
}

async function useCityLookup() {
  const query = cityInput ? cityInput.value.trim() : "";
  if (!query) {
    setStatus("Enter a city name first.");
    return;
  }
  setStatus("Looking up city...");
  try {
    const result = await forwardGeocodeCity(query);
    const latitude = Number.parseFloat(result.lat);
    const longitude = Number.parseFloat(result.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("Invalid coordinates");
    }
    const cityName = (result.display_name || query).split(",")[0].trim();
    const location = {
      latitude,
      longitude,
      accuracy: null,
      cachedAt: Date.now(),
      city: cityName || query,
      source: "city",
    };
    setLocation(location);
  } catch (err) {
    setStatus(`City lookup failed: ${err.message}`);
  }
}

function getLocation() {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not supported in this browser.");
    return;
  }

  if (!window.isSecureContext) {
    setStatus("Geolocation requires HTTPS or http://localhost.");
    return;
  }

  setStatus("Requesting location...");
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      let location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        cachedAt: Date.now(),
        source: "gps",
      };
      if (isOffline()) {
        location = { ...location, city: "Unknown" };
        setLocation(location, {
          statusMessage: "Using GPS location offline. City unavailable.",
        });
        return;
      }

      setLocation(location, {
        statusMessage: "Using GPS location. Looking up city name...",
      });

      location = await enrichLocationCity(location);
      setLocation(location, {
        statusMessage: `Using GPS location ${getLocationLabel(location)}.`,
      });
    },
    (error) => {
      const codeMap = {
        1: "Permission denied",
        2: "Position unavailable",
        3: "Timeout",
      };
      const codeLabel = codeMap[error.code] || "Unknown error";
      setStatus(`Location error: ${codeLabel} (${error.message})`);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10 * 60 * 1000,
      timeout: 15000,
    }
  );
}

locationButton.addEventListener("click", getLocation);
useCityButton.addEventListener("click", useCityLookup);
cityInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    useCityLookup();
  }
});

timeFormatButton.addEventListener("click", () => {
  use24Hour = !use24Hour;
  saveTimeFormat(use24Hour);
  timeFormatButton.textContent = use24Hour ? "Time: 24h" : "Time: 12h";
  updateDashboard();
  renderSunsetForecast();
});

bannerDockButton.addEventListener("click", () => {
  bannerDocked = !bannerDocked;
  saveBannerDocked(bannerDocked);
  applyBannerDockState();
});

sunsetRefreshButton?.addEventListener("click", () => {
  ensureSunsetForecast({ force: true });
});

const cached = loadCachedLocation();
if (cached) {
  setLocation(cached, {
    statusMessage: `Using cached ${inferLocationSource(cached)} location from ${new Date(
      cached.cachedAt
    ).toLocaleString()}.`,
  });

  enrichLocationCity(cached).then((updated) => {
    if (updated !== cached) {
      setLocation(updated, {
        statusMessage: `Using cached ${inferLocationSource(updated)} location from ${new Date(
          updated.cachedAt
        ).toLocaleString()}.`,
      });
    }
  });
} else {
  updateLocationDisplay(null);
}

setInterval(updateDashboard, 1000);

use24Hour = loadTimeFormat();
timeFormatButton.textContent = use24Hour ? "Time: 24h" : "Time: 12h";
bannerDocked = loadBannerDocked();
applyBannerDockState();
renderSunsetForecast();

window.addEventListener("online", () => {
  ensureSunsetForecast({ force: true });
});

window.addEventListener("offline", () => {
  renderSunsetForecast();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
