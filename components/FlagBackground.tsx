"use client";

import { useState, useEffect } from "react";

// All 197 ISO 3166-1 Alpha-2 country codes
const ALL_COUNTRY_CODES = [
  "ad", "ae", "af", "ag", "ai", "al", "am", "ao", "aq", "ar", "as", "at", "au", "aw", "ax", "az",
  "ba", "bb", "bd", "be", "bf", "bg", "bh", "bi", "bj", "bl", "bm", "bn", "bo", "bq", "br", "bs",
  "bt", "bv", "bw", "by", "bz", "ca", "cc", "cd", "cf", "cg", "ch", "ci", "ck", "cl", "cm", "cn",
  "co", "cr", "cu", "cv", "cw", "cx", "cy", "cz", "de", "dj", "dk", "dm", "do", "dz", "ec", "ee",
  "eg", "eh", "er", "es", "et", "fi", "fj", "fk", "fm", "fo", "fr", "ga", "gb", "gd", "ge", "gf",
  "gg", "gh", "gi", "gl", "gm", "gn", "gp", "gq", "gr", "gs", "gt", "gu", "gw", "gy", "hk", "hm",
  "hn", "hr", "ht", "hu", "id", "ie", "il", "im", "in", "io", "iq", "ir", "is", "it", "je", "jm",
  "jo", "jp", "ke", "kg", "kh", "ki", "km", "kn", "kp", "kr", "kw", "ky", "kz", "la", "lb", "lc",
  "li", "lk", "lr", "ls", "lt", "lu", "lv", "ly", "ma", "mc", "md", "me", "mf", "mg", "mh", "mk",
  "ml", "mm", "mn", "mo", "mp", "mq", "mr", "ms", "mt", "mu", "mv", "mw", "mx", "my", "mz", "na",
  "nc", "ne", "nf", "ng", "ni", "nl", "no", "np", "nr", "nu", "nz", "om", "pa", "pe", "pf", "pg",
  "ph", "pk", "pl", "pm", "pn", "pr", "ps", "pt", "pw", "py", "qa", "re", "ro", "rs", "ru", "rw",
  "sa", "sb", "sc", "sd", "se", "sg", "sh", "si", "sj", "sk", "sl", "sm", "sn", "so", "sr", "ss",
  "st", "sv", "sx", "sy", "sz", "tc", "td", "tf", "tg", "th", "tj", "tk", "tl", "tm", "tn", "to",
  "tr", "tt", "tv", "tw", "tz", "ua", "ug", "um", "us", "uy", "uz", "va", "vc", "ve", "vg", "vi",
  "vn", "vu", "wf", "ws", "xk", "ye", "yt", "za", "zm", "zw"
];

interface FlagBackgroundProps {
  activeCountryCodes?: string[]; // ISO codes in lowercase (e.g., ["ch", "si"]) - these will be excluded from background
}

export default function FlagBackground({ activeCountryCodes = ["ch", "si"] }: FlagBackgroundProps) {
  const [rows, setRows] = useState<string[][]>([]);

  // Shuffle flags only on client mount to avoid hydration mismatch
  useEffect(() => {
    const activeSet = new Set(activeCountryCodes.map(c => c.toLowerCase()));
    const backgroundCodes = ALL_COUNTRY_CODES.filter(code => !activeSet.has(code));
    const shuffled = [...backgroundCodes].sort(() => Math.random() - 0.5);
    const rowCount = 8;
    const perRow = Math.ceil(shuffled.length / rowCount);
    const result: string[][] = [];
    for (let i = 0; i < rowCount; i++) {
      result.push(shuffled.slice(i * perRow, (i + 1) * perRow));
    }
    setRows(result);
  }, [activeCountryCodes]);

  // Don't render until client-side shuffle is done
  if (rows.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.12]">
      <div className="flex flex-col justify-around h-full py-4">
        {rows.map((row, rowIndex) => (
          <FlagRow
            key={rowIndex}
            codes={row}
            direction={rowIndex % 2 === 0 ? "left" : "right"}
            speed={80 + rowIndex * 5}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scroll-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

interface FlagRowProps {
  codes: string[];
  direction: "left" | "right";
  speed: number;
}

function FlagRow({ codes, direction, speed }: FlagRowProps) {
  // Duplicate the row for seamless looping
  const duplicatedCodes = [...codes, ...codes];

  return (
    <div
      className="flex items-center whitespace-nowrap"
      style={{
        animation: `scroll-${direction} ${speed}s linear infinite`,
      }}
    >
      {duplicatedCodes.map((code, index) => (
        <img
          key={`${code}-${index}`}
          src={`https://flagcdn.com/w160/${code}.png`}
          alt=""
          className="mx-2 rounded shadow-sm"
          style={{
            width: 100,
            height: "auto",
          }}
          loading="lazy"
        />
      ))}
    </div>
  );
}
