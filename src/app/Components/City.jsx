"use client"
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function City() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");
  const router = useRouter()

  // Fetch weather + forecast for a city and save to state/localStorage
  const fetchWeatherForCity = async (cityName) => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=3e68a0175c5cd3d3945191250173e530&units=metric`
      );
      const data = await res.json();

      if (data.cod !== 200) {
        setError("City not found");
        setWeather(null);
        return null;
      }

      const weatherObj = {
        temp: data.main.temp,
        temp_min: data.main.temp_min,
        temp_max: data.main.temp_max,
        condition: data.weather[0].main,
        description: data.weather[0].description,
        name: data.name,
        icon: data.weather[0].icon,
        wind_speed: data.wind?.speed,
        coord: data.coord,
      };

      setWeather(weatherObj);
      localStorage.setItem("weather", JSON.stringify(weatherObj));

      // fetch onecall forecast
      try {
        const { lat, lon } = data.coord || {};
        if (lat != null && lon != null) {
          const oneCallRes = await fetch(
            `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&units=metric&appid=3e68a0175c5cd3d3945191250173e530`
          );
          const oneCallData = await oneCallRes.json();
          localStorage.setItem("forecast", JSON.stringify(oneCallData));
        }
      } catch (err) {
        console.warn("Could not fetch forecast:", err);
      }

      setError("");
      return weatherObj;
    } catch (err) {
      setError("Error fetching weather data");
      return null;
    }
  };

  const keyDown = async (e) =>{
    if(e.key === "Enter"){
      if(!city){
        setError("Please enter a city");
        return;
      }
      const fetched = await fetchWeatherForCity(city);
      if (fetched) {
        router.push(`/display?city=${encodeURIComponent(city)}`)
      }
    }
  }

  const handleEnterClick = async () => {
    if(!city){
      setError("Please enter a city");
      return;
    }
    const fetched = await fetchWeatherForCity(city);
    if (fetched) {
      router.push(`/display?city=${encodeURIComponent(city)}`)
    }
  }

  return (
    <div className="relative flex flex-col items-center overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover justify-center min-h-screen overflow-hidden"
      >
        <source src="/260397_small.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/70 min-h-screen" />

      <motion.div
        initial={{ opacity: 0, y: 70 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="z-10 relative text-center text-white min-h-screen flex flex-col justify-center items-center space-y-7"
      >
        <h1 className="text-6xl font-bold">WEATHER TODAY</h1>

        <div className="border border-white rounded-lg flex items-center justify-center space-x-3 p-3 max-w-xl">
          <input
            type="text"
            placeholder="Enter City Here"
            className="w-2/3 h-10 px-3 text-center placeholder:text-gray-300 focus:outline-none text-white bg-transparent"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={keyDown}
          />

          <button
            onClick={handleEnterClick}
            className="px-4 py-2 bg-gray-500 text-white font-bold rounded hover:opacity-90 cursor-pointer"
          >
            Enter
          </button>
        </div>

        {error && <p className="text-red-500 mt-3">{error}</p>}

        {weather && (
           
          <div className="mt-6 space-y-2">
            <h2 className="text-3xl font-semibold">{weather.name}</h2>
            <p className="text-xl">{weather.temp}°C</p>
            <p className="capitalize">{weather.description}</p>
            <p>Condition: {weather.condition}</p>
            <img src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} alt="weather icon" />
          </div>
        )}
      </motion.div>
    </div>
  );
}
