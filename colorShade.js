function generateColorShades(color, levels = [-0.3, -0.15, 0.15, 0.3]) {
  // Parse HEX or RGB string → {r,g,b}
  function parseColor(input) {
    if (typeof input !== "string") throw new Error("Color must be a string");

    input = input.trim();

    // HEX (#3498db or #fff)
    if (input.startsWith("#")) {
      input = input.replace(/^#/, "");
      if (input.length === 3) {
        input = input.split("").map(c => c + c).join("");
      }
      const num = parseInt(input, 16);
      return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    }

    // RGB (rgb(52,152,219))
    const rgbMatch = input.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1], 10),
        g: parseInt(rgbMatch[2], 10),
        b: parseInt(rgbMatch[3], 10),
      };
    }

    throw new Error("Unsupported color format. Use HEX (#RRGGBB) or rgb(r,g,b).");
  }

  // RGB → HEX
  function rgbToHex(r, g, b) {
    return (
      "#" +
      [r, g, b]
        .map(x => {
          const h = x.toString(16);
          return h.length === 1 ? "0" + h : h;
        })
        .join("")
    );
  }

  // Adjust brightness (-1 to +1)
  function adjust(rgb, factor) {
    return {
      r: Math.min(255, Math.max(0, Math.round(rgb.r + (factor < 0 ? rgb.r * factor : (255 - rgb.r) * factor)))),
      g: Math.min(255, Math.max(0, Math.round(rgb.g + (factor < 0 ? rgb.g * factor : (255 - rgb.g) * factor)))),
      b: Math.min(255, Math.max(0, Math.round(rgb.b + (factor < 0 ? rgb.b * factor : (255 - rgb.b) * factor)))),
    };
  }

  const base = parseColor(color);
  const shades = { original: rgbToHex(base.r, base.g, base.b) };

  levels.forEach((lvl) => {
    const rgb = adjust(base, lvl);
    const key = (lvl < 0 ? "darker" : "lighter") + "_" + Math.abs(lvl * 100);
    shades[key] = rgbToHex(rgb.r, rgb.g, rgb.b);
  });

  return shades;
}

// Example 1 (HEX)
console.log(generateColorShades("#3498db", [-0.5, -0.25, 0.25, 0.5]));

// Example 2 (RGB)
console.log(generateColorShades("rgb(52,152,219)", [-0.5, -0.25, 0.25, 0.5]));
