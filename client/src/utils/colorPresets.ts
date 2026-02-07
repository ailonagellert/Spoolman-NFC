/**
 * Color presets for the filament color picker
 */

// Snapmaker U1 Standard Colors (Official Firmware Hex Codes)
export const U1_COLORS = [
  // Row 1
  { label: "White", color: "#FFFFFF" },
  { label: "Black", color: "#000000" },
  { label: "Lava Orange", color: "#F78E0E" },
  { label: "Sunburst Yellow", color: "#F0BE02" },
  { label: "Moss Green", color: "#BEC9A5" },
  { label: "Pine Green", color: "#519F61" },
  { label: "Engine Red", color: "#DE1619" },
  // Row 2
  { label: "Ash Gray", color: "#9B9EAC" },
  { label: "Celestial Blue", color: "#8BD5EE" },
  { label: "Sakura Pink", color: "#F3D6E5" },
  { label: "Pearl White", color: "#E2DEDB" },
  { label: "Dark Gray", color: "#080A0D" },
  { label: "Slate Gray", color: "#8C9099" },
  { label: "Dark Blue", color: "#003776" },
  // Row 3
  { label: "Red", color: "#E72F1D" },
  { label: "Purple", color: "#6C5BB1" },
  { label: "Dark Orange", color: "#F97429" },
  { label: "Forest Green", color: "#2D9E59" },
  { label: "Gold", color: "#F4C032" },
  { label: "Brown", color: "#6F4C2F" },
  // Custom colors
  { label: "Hot Pink", color: "#FF69B4" },
];

export const COLOR_PRESETS = [
  {
    label: "U1 Colors",
    colors: U1_COLORS.map((c) => c.color),
  },
];
