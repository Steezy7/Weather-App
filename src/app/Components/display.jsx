"use client";
import { useEffect, useState } from "react";

export default function Display() {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const savedWeather = localStorage.getItem("weather");
    if (savedWeather) {
      setWeather(JSON.parse(savedWeather));
    }
  }, []);

  if (!weather) {
    return <p>Loading weather data...</p>;
  }
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const offsets = [-2, 1, -1, 3, 2];
  const baseTemp = Math.round(weather.temp);

  const forecast = new Array(5).fill(null).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return {
      day: dayNames[d.getDay()],
      icon: weather.icon,
      temp: baseTemp + offsets[i],
    };
  });

  return (
    <div className="relative overflow-hidden min-h-screen h-screen">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/260397_small.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-white/60" />

      <main className="relative z-10 min-h-screen w-full flex flex-col items-center text-white">
        <header className="pt-10 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-wide">
            {weather.name} <span className="inline-block text-2xl opacity-80">→</span>
          </h1>
        </header>

        <section className="flex flex-col items-center mt-8">
          <img
            src={`http://openweathermap.org/img/wn/${weather.icon}@4x.png`}
            alt="weather icon"
            className="w-36 h-36"
          />

          <div className="text-6xl md:text-7xl font-light mt-2">{Math.round(weather.temp)}°</div>

          <div className="flex items-center space-x-6 text-sm text-gray-200 mt-2">
            <span className="text-gray-300">{Math.round(weather.temp_min ?? weather.temp - 3)}°</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-300">{Math.round(weather.temp_max ?? weather.temp + 5)}°</span>
          </div>

          <p className="mt-3 text-lg capitalize text-gray-100">{weather.description}</p>
        </section>

        <hr className="w-3/4 border-t border-gray-300/30 my-8" />

        <section className="w-full max-w-4xl px-6 mb-12">
          <div className="grid grid-cols-5 gap-6 text-center text-white/90">
            {forecast.map((f, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="text-sm text-gray-300 mb-2">{f.day}</div>
                <img
                  src={`http://openweathermap.org/img/wn/${f.icon}@2x.png`}
                  alt="icon"
                  className="w-12 h-12 mb-2"
                />
                <div className="text-sm">{f.temp}°</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
