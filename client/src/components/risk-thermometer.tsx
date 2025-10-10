import { motion } from "framer-motion";

interface RiskThermometerProps {
  riskScore: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function RiskThermometer({ riskScore, size = "md", showLabel = true }: RiskThermometerProps) {
  const getColor = (score: number) => {
    if (score < 30) return "#22c55e"; // green
    if (score < 70) return "#eab308"; // yellow
    return "#ef4444"; // red
  };

  const getRiskLevel = (score: number) => {
    if (score < 30) return "Low Risk";
    if (score < 70) return "Medium Risk";
    return "High Risk";
  };

  const dimensions = {
    sm: { width: 60, height: 120, bulbRadius: 18, tubeWidth: 24 },
    md: { width: 80, height: 160, bulbRadius: 24, tubeWidth: 32 },
    lg: { width: 100, height: 200, bulbRadius: 30, tubeWidth: 40 }
  };

  const { width, height, bulbRadius, tubeWidth } = dimensions[size];
  const tubeHeight = height - bulbRadius - 10;
  const fillHeight = (riskScore / 100) * tubeHeight;
  const color = getColor(riskScore);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="drop-shadow-md"
      >
        {/* Thermometer outline - tube */}
        <rect
          x={(width - tubeWidth) / 2}
          y={10}
          width={tubeWidth}
          height={tubeHeight}
          rx={tubeWidth / 2}
          fill="white"
          stroke="#d1d5db"
          strokeWidth="2"
        />

        {/* Thermometer outline - bulb */}
        <circle
          cx={width / 2}
          cy={height - bulbRadius}
          r={bulbRadius}
          fill="white"
          stroke="#d1d5db"
          strokeWidth="2"
        />

        {/* Temperature markers */}
        {[0, 25, 50, 75, 100].map((mark) => {
          const y = 10 + tubeHeight - (mark / 100) * tubeHeight;
          return (
            <g key={mark}>
              <line
                x1={width / 2 + tubeWidth / 2 + 2}
                y1={y}
                x2={width / 2 + tubeWidth / 2 + 8}
                y2={y}
                stroke="#9ca3af"
                strokeWidth="1.5"
              />
              <text
                x={width / 2 + tubeWidth / 2 + 12}
                y={y + 4}
                fontSize="10"
                fill="#6b7280"
                fontFamily="sans-serif"
              >
                {mark}
              </text>
            </g>
          );
        })}

        {/* Animated fill - bulb */}
        <motion.circle
          cx={width / 2}
          cy={height - bulbRadius}
          r={bulbRadius - 3}
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />

        {/* Animated fill - tube */}
        <motion.rect
          x={(width - tubeWidth) / 2 + 3}
          y={10 + tubeHeight - fillHeight}
          width={tubeWidth - 6}
          height={fillHeight}
          rx={(tubeWidth - 6) / 2}
          fill={color}
          initial={{ height: 0, y: 10 + tubeHeight }}
          animate={{ height: fillHeight, y: 10 + tubeHeight - fillHeight }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        />

        {/* Connecting fill between tube and bulb */}
        <motion.rect
          x={(width - tubeWidth) / 2 + 3}
          y={10 + tubeHeight - 5}
          width={tubeWidth - 6}
          height={bulbRadius - 3}
          fill={color}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        />
      </svg>

      {showLabel && (
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color }}>
            {riskScore}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {getRiskLevel(riskScore)}
          </div>
        </div>
      )}
    </div>
  );
}
