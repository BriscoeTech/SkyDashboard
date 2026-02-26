const STORAGE_KEY = "skydashboard.location.v1";
const TIME_FORMAT_KEY = "skydashboard.timeformat.v1";
const statusEl = document.getElementById("location-status");
const locationButton = document.getElementById("get-location");
const manualEntry = document.getElementById("manual-entry");
const cityInput = document.getElementById("city-input");
const useCityButton = document.getElementById("use-city");
const timeFormatButton = document.getElementById("toggle-time-format");
const moonTable = document.getElementById("moon-table");
const sunTable = document.getElementById("sun-table");
const observerTable = document.getElementById("observer-table");

const ui = {
  moonriseTime: document.getElementById("moonrise-time"),
  moonriseCountdown: document.getElementById("moonrise-countdown"),
  moonsetTime: document.getElementById("moonset-time"),
  moonsetCountdown: document.getElementById("moonset-countdown"),
  moonAltitude: document.getElementById("moon-altitude"),
  moonAzimuth: document.getElementById("moon-azimuth"),
  sunriseTime: document.getElementById("sunrise-time"),
  sunriseCountdown: document.getElementById("sunrise-countdown"),
  sunsetTime: document.getElementById("sunset-time"),
  sunsetCountdown: document.getElementById("sunset-countdown"),
  sunAltitude: document.getElementById("sun-altitude"),
  sunAzimuth: document.getElementById("sun-azimuth"),
  moonPhaseLabel: document.getElementById("moon-phase-label"),
  moonIllumination: document.getElementById("moon-illumination"),
  moonDaysNew: document.getElementById("moon-days-new"),
  moonDaysFull: document.getElementById("moon-days-full"),
  moonVisual: document.getElementById("moon-visual"),
  moonLitPath: document.getElementById("moon-lit-path"),
  sunSolsticeSummer: document.getElementById("sun-solstice-summer"),
  sunSolsticeWinter: document.getElementById("sun-solstice-winter"),
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
  lat: document.getElementById("lat"),
  lon: document.getElementById("lon"),
  cachedAt: document.getElementById("cached-at"),
};

let currentLocation = null;
let use24Hour = false;

function loadTimeFormat() {
  const raw = localStorage.getItem(TIME_FORMAT_KEY);
  if (!raw) return false;
  return raw === "24h";
}

function saveTimeFormat(value) {
  localStorage.setItem(TIME_FORMAT_KEY, value ? "24h" : "12h");
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

function formatDaysUntil(targetDate, now) {
  if (!targetDate) return "--";
  const diffDays = (targetDate.getTime() - now.getTime()) / 86400000;
  if (Math.abs(diffDays) < 0.01) return "Now";
  return `${diffDays.toFixed(1)}d`;
}

function normalizeAstroDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value.date instanceof Date) return value.date;
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

function updateSunDeltas(tableEl, countdownMap) {
  if (!tableEl || !tableEl.tBodies.length) return;
  const rows = Array.from(tableEl.tBodies[0].rows);
  let prevDate = null;
  rows.forEach((row) => {
    const countdownEl = row.querySelector("strong.countdown[id]");
    const deltaEl = row.querySelector("strong.delta");
    if (!deltaEl) return;
    const key = countdownEl ? countdownEl.id : null;
    const currentDate = key ? countdownMap[key] : null;
    if (!(currentDate instanceof Date) || !(prevDate instanceof Date)) {
      deltaEl.textContent = "--";
    } else {
      const diffMinutes = (currentDate.getTime() - prevDate.getTime()) / 60000;
      deltaEl.textContent = formatDeltaMinutes(diffMinutes);
    }
    if (currentDate instanceof Date) {
      prevDate = currentDate;
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
    x: up.y * m.z - up.z * m.y,
    y: up.z * m.x - up.x * m.z,
    z: up.x * m.y - up.y * m.x,
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

function pickRiseSet(body, observer, direction, now) {
  const next = Astronomy.SearchRiseSet(body, observer, direction, now, 1, 0);
  const prevStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const prev = Astronomy.SearchRiseSet(body, observer, direction, prevStart, 1, 0);
  const prevDate = prev && prev.date && prev.date <= now ? prev.date : null;
  const nextDate = next && next.date ? next.date : null;

  if (prevDate) {
    const hoursAgo = (now.getTime() - prevDate.getTime()) / 3600000;
    if (hoursAgo <= 4) {
      return prevDate;
    }
  }

  if (nextDate) {
    return nextDate;
  }

  return prevDate;
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
    ui.lat.textContent = "--";
    ui.lon.textContent = "--";
    ui.cachedAt.textContent = "--";
    return;
  }

  ui.city.textContent = location.city || "--";
  ui.lat.textContent = formatCoord(location.latitude);
  ui.lon.textContent = formatCoord(location.longitude);
  ui.cachedAt.textContent = new Date(location.cachedAt).toLocaleString();
}

function updateDashboard() {
  if (!currentLocation) return;

  const now = new Date();
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

  const refraction = Astronomy.Refraction ? Astronomy.Refraction.Normal : true;

  const moonEquator = Astronomy.Equator(
    Astronomy.Body.Moon,
    now,
    observer,
    true,
    true
  );
  const moonHorizontal = Astronomy.Horizon(
    now,
    observer,
    moonEquator.ra,
    moonEquator.dec,
    refraction
  );

  ui.moonAltitude.textContent = formatAngle(moonHorizontal.altitude);
  ui.moonAzimuth.textContent = formatAngle(moonHorizontal.azimuth);

  const sunEquator = Astronomy.Equator(
    Astronomy.Body.Sun,
    now,
    observer,
    true,
    true
  );
  const sunHorizontal = Astronomy.Horizon(
    now,
    observer,
    sunEquator.ra,
    sunEquator.dec,
    refraction
  );

  ui.sunAltitude.textContent = formatAngle(sunHorizontal.altitude);
  ui.sunAzimuth.textContent = formatAngle(sunHorizontal.azimuth);

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

  ui.moonriseTime.textContent = formatTime({ date: moonriseDate });
  ui.moonriseCountdown.textContent = formatCountdown(moonriseDate, now);
  ui.moonsetTime.textContent = formatTime({ date: moonsetDate });
  ui.moonsetCountdown.textContent = formatCountdown(moonsetDate, now);
  ui.sunriseTime.textContent = formatTime({ date: sunriseDate });
  ui.sunriseCountdown.textContent = formatCountdown(sunriseDate, now);
  ui.sunsetTime.textContent = formatTime({ date: sunsetDate });
  ui.sunsetCountdown.textContent = formatCountdown(sunsetDate, now);

  const sunAltNoRefraction = computeSunAltitude(now, observer, false);
  ui.twilightPhase.textContent = twilightPhaseLabel(sunAltNoRefraction);

  const civilDusk = findNextSunAltitudeCrossing(-6, -1, now, observer);
  const nauticalDusk = findNextSunAltitudeCrossing(-12, -1, now, observer);
  const astroDusk = findNextSunAltitudeCrossing(-18, -1, now, observer);
  const civilDawn = findNextSunAltitudeCrossing(-6, +1, now, observer);
  const nauticalDawn = findNextSunAltitudeCrossing(-12, +1, now, observer);
  const astroDawn = findNextSunAltitudeCrossing(-18, +1, now, observer);

  ui.civilDuskTime.textContent = formatTime({ date: civilDusk });
  ui.civilDuskCountdown.textContent = formatCountdown(civilDusk, now);
  ui.nauticalDuskTime.textContent = formatTime({ date: nauticalDusk });
  ui.nauticalDuskCountdown.textContent = formatCountdown(nauticalDusk, now);
  ui.astroDuskTime.textContent = formatTime({ date: astroDusk });
  ui.astroDuskCountdown.textContent = formatCountdown(astroDusk, now);
  ui.civilDawnTime.textContent = formatTime({ date: civilDawn });
  ui.civilDawnCountdown.textContent = formatCountdown(civilDawn, now);
  ui.nauticalDawnTime.textContent = formatTime({ date: nauticalDawn });
  ui.nauticalDawnCountdown.textContent = formatCountdown(nauticalDawn, now);
  ui.astroDawnTime.textContent = formatTime({ date: astroDawn });
  ui.astroDawnCountdown.textContent = formatCountdown(astroDawn, now);

  sortEventRows(
    moonTable,
    {
      "moonrise-countdown": moonriseDate,
      "moonset-countdown": moonsetDate,
    },
    now
  );
  updateSunDeltas(
    moonTable,
    {
      "moonrise-countdown": moonriseDate,
      "moonset-countdown": moonsetDate,
    }
  );
  const sunCountdowns = {
    "sunrise-countdown": sunriseDate,
    "sunset-countdown": sunsetDate,
    "civil-dusk-countdown": civilDusk,
    "nautical-dusk-countdown": nauticalDusk,
    "astro-dusk-countdown": astroDusk,
    "astro-dawn-countdown": astroDawn,
    "nautical-dawn-countdown": nauticalDawn,
    "civil-dawn-countdown": civilDawn,
  };
  sortEventRows(
    sunTable,
    sunCountdowns,
    now
  );
  updateSunDeltas(sunTable, sunCountdowns);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function setLocation(location) {
  currentLocation = location;
  saveLocation(location);
  updateLocationDisplay(location);
  showManualEntry(false);
  setStatus(
    `Using cached location from ${new Date(location.cachedAt).toLocaleString()}.`
  );
  updateDashboard();
}

function showManualEntry(show) {
  if (!manualEntry) return;
  manualEntry.classList.toggle("hidden", !show);
}

async function enrichLocationCity(location) {
  if (location.city) return location;
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
    };
    setLocation(location);
  } catch (err) {
    setStatus(`City lookup failed: ${err.message}`);
    showManualEntry(true);
  }
}

function getLocation() {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not supported in this browser.");
    showManualEntry(true);
    return;
  }

  if (!window.isSecureContext) {
    setStatus("Geolocation requires HTTPS or http://localhost.");
    showManualEntry(true);
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
      };
      location = await enrichLocationCity(location);
      setLocation(location);
    },
    (error) => {
      const codeMap = {
        1: "Permission denied",
        2: "Position unavailable",
        3: "Timeout",
      };
      const codeLabel = codeMap[error.code] || "Unknown error";
      setStatus(`Location error: ${codeLabel} (${error.message})`);
      showManualEntry(true);
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
});

const cached = loadCachedLocation();
if (cached) {
  enrichLocationCity(cached).then((updated) => {
    if (updated !== cached) {
      saveLocation(updated);
    }
    setLocation(updated);
  });
} else {
  updateLocationDisplay(null);
}

setInterval(updateDashboard, 1000);

use24Hour = loadTimeFormat();
timeFormatButton.textContent = use24Hour ? "Time: 24h" : "Time: 12h";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
