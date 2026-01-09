const fs = require("fs");
const path = require("path");
const glob = require("glob");

function findUnusedCSS() {
  // Get all CSS classes with their file paths (excluding materialize folder)
  const cssFiles = glob.sync("src/**/*.{css,scss}", {
    ignore: ["src/assets/materialize/**"],
  });
  const classesMap = new Map(); // Map of className -> array of file paths

  cssFiles.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    const matches = content.match(/\.([\w-]+)/g);
    if (matches) {
      matches.forEach((cls) => {
        const className = cls.substring(1);
        if (!classesMap.has(className)) {
          classesMap.set(className, []);
        }
        if (!classesMap.get(className).includes(file)) {
          classesMap.get(className).push(file);
        }
      });
    }
  });

  // Check usage in HTML and TS files
  const sourceFiles = glob.sync("src/**/*.{html,ts}");
  const usedClasses = new Set();

  sourceFiles.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    classesMap.forEach((paths, cls) => {
      if (content.includes(cls)) {
        usedClasses.add(cls);
      }
    });
  });

  // Find unused and create JSON structure
  const unusedClasses = [];

  classesMap.forEach((paths, cls) => {
    if (!usedClasses.has(cls)) {
      paths.forEach((filePath) => {
        unusedClasses.push({
          path: filePath,
          className: cls,
        });
      });
    }
  });

  // Create output object
  const output = {
    timestamp: new Date().toISOString(),
    totalUnusedClasses: unusedClasses.length,
    unusedClasses: unusedClasses,
  };

  // Write to JSON file
  const outputPath = "unused-css-classes.json";
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");

  // Console output
  console.log("Potentially unused CSS classes:");
  unusedClasses.forEach((item) => {
    console.log(`  .${item.className} (${item.path})`);
  });
  console.log(`\nTotal: ${unusedClasses.length} unused classes found`);
  console.log(`\nResults saved to: ${outputPath}`);

  return output;
}

findUnusedCSS();
