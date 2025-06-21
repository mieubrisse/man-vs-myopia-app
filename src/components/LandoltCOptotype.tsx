import React from "react";

const cPath =
  "M 244.949 -50 A 250 250 0 1 0 244.949 50 L 141.4214 50 A 150 150 0 1 1 141.4214 -50 Z";

const orientationToRotation: Record<string, number> = {
  NORTH: 270,
  NORTHEAST: 315,
  EAST: 0,
  SOUTHEAST: 45,
  SOUTH: 90,
  SOUTHWEST: 135,
  WEST: 180,
  NORTHWEST: 225,
};

export interface LandoltCOptotypeProps extends React.SVGProps<SVGSVGElement> {
  orientation:
    | "NORTH"
    | "NORTHEAST"
    | "EAST"
    | "SOUTHEAST"
    | "SOUTH"
    | "SOUTHWEST"
    | "WEST"
    | "NORTHWEST";
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
