import React from "react";
import { LandoltCOptotype } from "./LandoltCOptotype";

const orientations = ["EAST", "SOUTH", "WEST", "NORTH"] as const;

const LandoltCTestScreen: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      <h1>Landolt C Optotype Test Screen</h1>
      <div
        style={{ display: "flex", flexDirection: "row", alignItems: "center" }}
      >
        {orientations.flatMap((orientation, index) => {
          const visibleOptotype = (
            <div key={orientation} style={{ textAlign: "center" }}>
              <LandoltCOptotype
                orientation={orientation}
                width={80}
                height={80}
                style={{ color: "#000" }}
              />
              <p>{orientation}</p>
            </div>
          );

          if (index < orientations.length - 1) {
            return [
              visibleOptotype,
              <LandoltCOptotype
                key={`${orientation}-spacer`}
                orientation="EAST"
                width={80}
                height={80}
                style={{ visibility: "hidden" }}
              />,
            ];
          }
          return [visibleOptotype];
        })}
      </div>
      <p>
        This is the Landolt C optotype rendered at 80x80px in each orientation.
      </p>
    </div>
  );
};

export default LandoltCTestScreen;
