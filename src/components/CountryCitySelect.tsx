"use client";

import { useState, useRef, useEffect } from "react";
import { Country, City } from "country-state-city";

function flagEmoji(isoCode: string): string {
  if (!isoCode || isoCode.length !== 2) return "🌐";
  return [...isoCode.toUpperCase()]
    .map(c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0)))
    .join("");
}

interface Props {
  country: string;
  city: string;
  onCountryChange: (country: string, countryCode: string) => void;
  onCityChange: (city: string) => void;
  fr?: boolean;
}

export default function CountryCitySelect({ country, city, onCountryChange, onCityChange, fr = true }: Props) {
  const ALL_COUNTRIES = Country.getAllCountries();

  const [countryQuery, setCountryQuery] = useState(country);
  const [cityQuery, setCityQuery] = useState(city);
  const [countryOpen, setCountryOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");

  const countryRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

  // Sync if parent resets
  useEffect(() => { setCountryQuery(country); }, [country]);
  useEffect(() => { setCityQuery(city); }, [city]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setCountryOpen(false);
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredCountries = countryQuery.trim().length === 0
    ? ALL_COUNTRIES.slice(0, 8)
    : ALL_COUNTRIES.filter(c =>
        c.name.toLowerCase().startsWith(countryQuery.toLowerCase()) ||
        c.name.toLowerCase().includes(countryQuery.toLowerCase())
      ).slice(0, 10);

  const cities = selectedCode ? City.getCitiesOfCountry(selectedCode) ?? [] : [];
  const filteredCities = cityQuery.trim().length === 0
    ? cities.slice(0, 8)
    : cities.filter(c =>
        c.name.toLowerCase().startsWith(cityQuery.toLowerCase()) ||
        c.name.toLowerCase().includes(cityQuery.toLowerCase())
      ).slice(0, 10);

  function selectCountry(name: string, isoCode: string) {
    setCountryQuery(name);
    setSelectedCode(isoCode);
    onCountryChange(name, isoCode);
    setCityQuery("");
    onCityChange("");
    setCountryOpen(false);
  }

  function selectCity(name: string) {
    setCityQuery(name);
    onCityChange(name);
    setCityOpen(false);
  }

  const inputCls = "w-full border border-[#6B5E44]/30 rounded-xl px-3 py-2.5 text-sm text-[#5C3D00] bg-white focus:outline-none focus:border-[#F5C400] focus:ring-2 focus:ring-[#F5C400]/30 transition";

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Country */}
      <div ref={countryRef} className="relative">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
          {fr ? "Pays de résidence" : "Country"} <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={countryQuery}
            onChange={e => {
              setCountryQuery(e.target.value);
              setCountryOpen(true);
              if (!e.target.value) {
                setSelectedCode("");
                onCountryChange("", "");
                setCityQuery("");
                onCityChange("");
              }
            }}
            onFocus={() => setCountryOpen(true)}
            placeholder={fr ? "ex. Tunisie, France…" : "e.g. Tunisia, France…"}
            className={inputCls + " pr-8"}
            autoComplete="off"
          />
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#9B8A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
          </svg>
        </div>

        {countryOpen && filteredCountries.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-white border border-[#E8DFC8] rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
            {filteredCountries.map(c => (
              <button
                key={c.isoCode}
                type="button"
                onMouseDown={() => selectCountry(c.name, c.isoCode)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[#FFFBEA] transition text-sm"
              >
                <span className="text-lg leading-none">{flagEmoji(c.isoCode)}</span>
                <span className="text-[#2D1A00] font-medium truncate">{c.name}</span>
                <span className="ml-auto text-[10px] text-[#9B8A6B] font-mono flex-shrink-0">{c.isoCode}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* City */}
      <div ref={cityRef} className="relative">
        <label className="block text-sm font-semibold text-[#5C3D00] mb-1">
          {fr ? "Ville" : "City"}
        </label>
        <div className="relative">
          <input
            type="text"
            value={cityQuery}
            onChange={e => {
              setCityQuery(e.target.value);
              setCityOpen(true);
              onCityChange(e.target.value);
            }}
            onFocus={() => { if (selectedCode) setCityOpen(true); }}
            placeholder={selectedCode
              ? (fr ? "Rechercher une ville…" : "Search a city…")
              : (fr ? "Choisissez d'abord un pays" : "Select a country first")}
            disabled={!selectedCode}
            className={inputCls + " pr-8 disabled:opacity-50 disabled:cursor-not-allowed"}
            autoComplete="off"
          />
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#9B8A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
          </svg>
        </div>

        {cityOpen && filteredCities.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-white border border-[#E8DFC8] rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
            {filteredCities.map((c, i) => (
              <button
                key={`${c.name}-${i}`}
                type="button"
                onMouseDown={() => selectCity(c.name)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[#FFFBEA] transition text-sm"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-[#9B8A6B] flex-shrink-0">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
                <span className="text-[#2D1A00] font-medium truncate">{c.name}</span>
              </button>
            ))}
            {filteredCities.length === 0 && cityQuery && (
              <div className="px-3 py-3 text-xs text-[#9B8A6B]">
                {fr ? "Aucune ville trouvée" : "No city found"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
