"use client";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [query, setQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("weather");
    if (saved) setWeather(JSON.parse(saved));
    const f = localStorage.getItem("forecast");
    if (f) setForecast(JSON.parse(f));
  }, []);

  // If we have a saved weather object with coordinates but no forecast, fetch it once.
  useEffect(() => {
    if (!forecast && weather && weather.coord) {
      const { lat, lon } = weather.coord;
      if (lat != null && lon != null) {
        fetchAndStoreForecast(lat, lon).catch((e) => console.warn(e));
      }
    }
  }, [weather, forecast]);

  // If forecast is missing or weather lacks wind/rain, try fetching current weather by coords to populate those fields
  useEffect(() => {
    if (weather && weather.coord) {
      const { lat, lon } = weather.coord;
      const needWind = weather.wind_speed == null;
      const needRain = weather.rain == null;
      if ((needWind || needRain) && lat != null && lon != null) {
        fetchCurrentByCoords(lat, lon).catch((e) => console.warn(e));
      }
    }
  }, [weather]);

  // Helper: fetch current weather by coordinates to fill missing wind/rain when One Call isn't available
  const fetchCurrentByCoords = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=3e68a0175c5cd3d3945191250173e530&units=metric`
      );
      const data = await res.json();
      if (data && data.main) {
        const updated = {
          temp: data.main.temp ?? weather?.temp,
          temp_min: data.main.temp_min ?? weather?.temp_min,
          temp_max: data.main.temp_max ?? weather?.temp_max,
          condition: data.weather?.[0]?.main ?? weather?.condition,
          description: data.weather?.[0]?.description ?? weather?.description,
          name: data.name ?? weather?.name,
          icon: data.weather?.[0]?.icon ?? weather?.icon,
          coord: data.coord ?? weather?.coord,
          wind_speed: data.wind?.speed ?? weather?.wind_speed,
          rain: data.rain ?? weather?.rain,
        };
        setWeather(updated);
        localStorage.setItem("weather", JSON.stringify(updated));
      }
    } catch (err) {
      console.warn("fetchCurrentByCoords failed:", err);
    }
  };

  // helper to fetch forecast using saved coordinates (and update localStorage + state)
  const fetchAndStoreForecast = async (lat, lon) => {
    if (lat == null || lon == null) return;
    try {
      setLoadingForecast(true);
      const res = await fetch(
        `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&units=metric&appid=YOUR_API_KEY`
       
      );
      const data = await res.json();
      localStorage.setItem("forecast", JSON.stringify(data));
      setForecast(data);
    } catch (err) {
      console.warn("Forecast fetch failed:", err);
    } finally {
      setLoadingForecast(false);
    }
  };

  // helper to fetch current weather + forecast for a city name (used by search bar)
  const searchCity = async (cityName) => {
    if (!cityName) return;
    try {
      setSearchLoading(true);
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=3e68a0175c5cd3d3945191250173e530&units=metric`
      );
      const data = await res.json();
      if (data.cod !== 200) {
        alert("City not found");
        return;
      }
      const weatherObj = {
        temp: data.main.temp,
        temp_min: data.main.temp_min,
        temp_max: data.main.temp_max,
        condition: data.weather[0].main,
        description: data.weather[0].description,
        name: data.name,
        icon: data.weather[0].icon,
        coord: data.coord,
      };
      setWeather(weatherObj);
      localStorage.setItem("weather", JSON.stringify(weatherObj));

      // fetch onecall forecast
      if (data.coord) {
        await fetchAndStoreForecast(data.coord.lat, data.coord.lon);
      }
    } catch (err) {
      console.warn("Search failed:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  if (!weather) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div>Loading dashboard…</div>
      </div>
    );
  }

  const base = Math.round(weather.temp);

  // Helper: format a unix timestamp (seconds) + timezone_offset (seconds) to 12h label like "6 AM"
  const formatHour = (dtSeconds, tzOffsetSeconds = 0) => {
    const date = new Date((dtSeconds + tzOffsetSeconds) * 1000);
    const hour24 = date.getUTCHours();
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return `${hour12} ${suffix}`;
  };

  // Helper: format a numeric hour (0-23) to 12h label
  const formatHourNumber = (hour24) => {
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return `${hour12} ${suffix}`;
  };

  // Build hourly and weekly from One Call forecast if available, otherwise fall back to placeholders
  let hourly = [];
  let weekly = [];

  if (forecast && forecast.hourly && forecast.daily) {
    // timezone_offset provided by One Call (seconds)
    const tzOffset = forecast.timezone_offset || 0;

    // pick first 6 hourly entries (every hour). Format hour using timezone offset.
    hourly = forecast.hourly.slice(0, 6).map((h) => {
      return {
        time: formatHour(h.dt, tzOffset),
        temp: Math.round(h.temp),
        icon: h.weather?.[0]?.icon || weather.icon,
      };
    });

    weekly = forecast.daily.slice(0, 7).map((d, i) => {
      const date = new Date((d.dt + (forecast.timezone_offset || 0)) * 1000);
      const dayName = date.toLocaleDateString(undefined, { weekday: "short" });
      return {
        day: i === 0 ? "Today" : dayName,
        icon: d.weather?.[0]?.icon || weather.icon,
        high: Math.round(d.temp.max),
        low: Math.round(d.temp.min),
        label: d.weather?.[0]?.main || "",
      };
    });
  } else {
    const hours = [6, 9, 12, 15, 18, 21];
    hourly = hours.map((h, i) => ({
      time: formatHourNumber(h),
      temp: base + (i - 2),
      icon: weather.icon,
    }));

    const days = ["Today", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].slice(0, 7);
    weekly = days.map((d, i) => ({
      day: d,
      icon: weather.icon,
      high: Math.round((weather.temp_max ?? base + 5) + (i % 3)),
      low: Math.round((weather.temp_min ?? base - 3) - (i % 2)),
      // use the stored current condition as a neutral fallback label
      label: i === 0 ? (weather.condition || "") : "",
    }));
  }

  // Current metrics from forecast (if available)
  const current = forecast?.current || null;
  const realFeel = current?.feels_like ?? weather.temp;
  // OpenWeather returns wind_speed in m/s — convert to km/h
  const windKmh = current?.wind_speed != null
    ? +(current.wind_speed * 3.6).toFixed(1)
    : (weather?.wind_speed != null ? +(weather.wind_speed * 3.6).toFixed(1) : null);
  const uvIndex =
  forecast?.current?.uvi ??
  forecast?.daily?.[0]?.uvi ??
  "—";

  // Chance of precipitation: prefer hourly[0].pop, fall back to daily[0].pop. pop is 0..1
  // const chanceOfRainRaw = forecast?.hourly?.[0]?.pop ?? forecast?.daily?.[0]?.pop;

  // const chanceOfRainPercent = chanceOfRainRaw != null ? Math.round(chanceOfRainRaw * 100) : null;
  // // fallback to reported rain in weather object (mm) if pop not available
  // const rainMm = weather?.rain?.["1h"] ?? weather?.rain?.["3h"] ?? null;

  // raw localStorage read for debugging (client only)
  const storedForecastRaw = (typeof window !== "undefined") ? localStorage.getItem("forecast") : null;

  return (
    <div className="min-h-screen bg-[#0f1724] flex items-stretch">
      <div className="w-full h-screen bg-[#0f1724] rounded-3xl p-6">
        <div className="w-full h-full grid grid-cols-12 gap-12 items-stretch">
          {/* Search bar above main panel */}
          <div className="col-span-12 mb-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center space-x-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') searchCity(query); }}
                  className="w-full rounded-md px-4 py-2 bg-[#0b1622] text-white placeholder-gray-400 focus:outline-none"
                  placeholder="Search for cities"
                />
                <button
                  onClick={() => searchCity(query)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md"
                >
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          </div>
          {/* Sidebar */}
          <aside className="col-span-2 bg-[#0b1220] rounded-2xl p-4 flex flex-col items-center text-gray-300 h-full">
          <div className="w-12 h-12 bg-[#0f1724] rounded-xl flex items-center justify-center mb-6">☁️</div>
          <nav className="space-y-6 text-sm w-full">
            <div className="px-3 py-2 rounded-md bg-[#0f1724] text-white">Weather</div>
            <div className="px-3 py-2 rounded-md hover:bg-[#0f1724]">Cities</div>
            <div className="px-3 py-2 rounded-md hover:bg-[#0f1724]">Map</div>
            <div className="px-3 py-2 rounded-md hover:bg-[#0f1724]">Settings</div>
          </nav>
        </aside>

          {/* Main Panel */}
          <main className="col-span-7 h-full flex flex-col">
            <div className="bg-[#091021] rounded-2xl p-8 text-white h-full flex flex-col">
              <div className="flex-1 flex flex-col">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                  <div className="flex">
                  <div className="flex-1">
                    <div className="text-8xl font-semibold mb-15">{weather.name}</div>
                    {/* <div className="text-sm text-gray-400">Chance of rain: {chanceOfRainPercent != null ? `${chanceOfRainPercent}%` : (rainMm != null ? `${rainMm} mm` : '—')}</div> */}

                    <div className="mt-4 flex items-center space-x-4">
                      <button
                        onClick={() => fetchAndStoreForecast(weather?.coord?.lat, weather?.coord?.lon)}
                        className="text-xs bg-[#0f2740] px-3 py-1 rounded text-white"
                      >
                        {loadingForecast ? "Refreshing..." : "Refresh"}
                      </button>

                      <div>
                        <div className="text-8xl font-bold">{Math.round(weather.temp)}°</div>
                        <div className="text-sm text-gray-300 text-center">Real feel {Math.round(realFeel)}°</div>
                      </div>
                    </div>
                  </div>
                      <div className="flex flex-col items-center ml-90">
                         <div className="text-7xl text-center font-semibold ">{weather.condition}</div>
                        <img
                          src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                          alt={`icon-${weather.icon}`}
                          className=" w-85 h-85"
                        />
          
                      </div>
                  </div>
                </div>

                <div className="mt-6 bg-[#0b1622] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    {hourly.map((h, idx) => (
                      <div key={`${h.time}-${idx}`} className="flex-1 text-center">
                        <div className="text-xl text-gray-400">{h.time}</div>
                        <img
                          src={`https://openweathermap.org/img/wn/${h.icon}@2x.png`}
                          alt={`icon-${h.icon}`}
                          className="mx-auto w-12 h-12"
                        />
                        <div className="text-sm mt-1">{h.temp}°</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 gap-4">
                  <div className="bg-[#0b1622] w-6/10  flex justify-between items-center rounded-xl p-6 min-h-60">

                    <div>
                      <div className="text-xl text-gray-300">Air Conditions</div>
                      <div className="mt-4 grid grid-cols-2 gap-4 text-white">
                        <div>
                          <div className="text-xl text-gray-400">Real Feel</div>
                          <div className="text-4xl">{Math.round(realFeel)}°</div>
                        </div>
                      </div>
                    </div>

                      <div>
                        <div className="text-xl text-gray-400">Wind</div>
                        <div className="text-4xl">{windKmh != null ? `${windKmh} km/h` : "—"}</div>
                      </div>
                    </div>
                  </div>

                  {/* <div className="bg-[#0b1622] rounded-xl p-6">
                    <div className="text-4xl text-gray-300">UV Index</div>
                    <div className="mt-4 text-4xl">{uvIndex != null ? uvIndex : "—"}</div>
                  </div> */}
                </div>
              </div>
            
          </main>

          {/* Right column */}
          <aside className="col-span-3 h-full flex flex-col">
            <div className="bg-[#091021] rounded-2xl p-6 text-white h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-300">7-DAY FORECAST</div>
                <div className="text-xs text-gray-400">View</div>
              </div>

              <div className="space-y-20">
                {weekly.map((d, i) => (
                  <div key={`${d.day}-${i}`} className="flex items-center justify-between border-t-6 align-center border-gray-800/60 pt-3">
                    <div className="text-lg text-gray-300">{d.day}</div>
                    <div className="flex items-center space-x-3">
                      <img src={`https://openweathermap.org/img/wn/${d.icon}@2x.png`} alt={`icon-${d.icon}`} className="w-8 h-8" />
                      <div className="text-lg text-gray-300">{d.label}</div>
                      <div className="text-lg text-gray-300 ml-4">{d.high}/{d.low}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
