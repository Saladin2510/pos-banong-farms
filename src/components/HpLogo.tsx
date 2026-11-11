import React from "react";

interface HpLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  darkText?: boolean;
  className?: string;
}

export const HpLogo: React.FC<HpLogoProps> = ({
  size = "md",
  showText = true,
  darkText = true,
  className = "",
}) => {
  const dimensions = {
    sm: 40,
    md: 50,
    lg: 68,
  }[size];

  return (
    <div
      className={`inline-flex items-center gap-3 select-none ${className}`}
      style={{
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <div
        style={{ width: dimensions, height: dimensions }}
        className="rounded-full overflow-hidden shrink-0 ring-2 ring-emerald-600/30 bg-emerald-700 shadow-md flex items-center justify-center"
      >
        <img
          src="/logo-banong-farm.png"
          alt="Logo CV Banong Farms"
          width={dimensions}
          height={dimensions}
          className="w-full h-full object-cover"
        />
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-2">
            <span
              className={`font-extrabold tracking-tight text-base sm:text-lg ${
                darkText ? "text-slate-900" : "text-white"
              }`}
            >
              CV Banong <span className="text-emerald-700">Farms</span>
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              GROSIR &amp; ECERAN
            </span>
          </div>
          <span
            className={`text-xs font-semibold ${
              darkText ? "text-slate-500" : "text-emerald-200"
            }`}
          >
            Toko Pakan Ternak, Unggas, Ikan &amp; Hewan Peliharaan
          </span>
        </div>
      )}
    </div>
  );
};
