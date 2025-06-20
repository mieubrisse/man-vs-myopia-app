import React from "react";

const cPath =
  "M 244.949 -50 A 250 250 0 1 0 244.949 50 L 141.4214 50 A 150 150 0 1 1 141.4214 -50 Z";

const orientationToRotation: Record<string, number> = {
  EAST: 0,
  SOUTH: 90,
  WEST: 180,
  NORTH: 270,
};

export interface LandoltCOptotypeProps extends React.SVGProps<SVGSVGElement> {
  orientation: "EAST" | "SOUTH" | "WEST" | "NORTH";
}

export const LandoltCOptotype: React.FC<LandoltCOptotypeProps> = ({
  orientation,
  ...svgProps
}) => {
  const rotation = orientationToRotation[orientation];
  return (
    <svg viewBox="-250 -250 500 500" {...svgProps}>
      <path
        d={cPath}
        fill="currentColor"
        transform={`rotate(${rotation} 0 0)`}
      />
    </svg>
  );
};
