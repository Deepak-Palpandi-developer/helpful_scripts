const fs = require("fs");
const path = require("path");

const moduleCache = new Map();
const allDiscoveredRoutes = new Set();

function parseRoutingModule(filePath) {
  if (moduleCache.has(filePath)) {
    return moduleCache.get(filePath);
  }

  const content = fs.readFileSync(filePath, "utf8");
  const routes = [];

  // Extract all path definitions with their loadChildren
  const pathRegex =
    /{\s*path:\s*['"]([^'"]+)['"]\s*,?\s*(?:.*?loadChildren:\s*.*?import\(['"]([^'"]+)['"]\))?.*?}/gs;
  let match;

  while ((match = pathRegex.exec(content)) !== null) {
    const routePath = match[1];
    const loadChildrenPath = match[2];

    // Skip empty paths, wildcards, and routes with parameters
    if (!routePath || routePath === "**" || routePath.includes(":")) {
      continue;
    }

    routes.push({
      path: routePath,
      loadChildren: loadChildrenPath,
      fullPath: filePath,
    });
  }

  moduleCache.set(filePath, routes);
  return routes;
}

function findRoutingModule(modulePath, fromFile) {
  // Convert module import path to file system path
  let searchPath = modulePath;

  // Handle relative imports
  if (searchPath.startsWith(".")) {
    const dir = path.dirname(fromFile);
    searchPath = path.resolve(dir, searchPath);
  } else if (searchPath.startsWith("src/")) {
    searchPath = path.resolve(".", searchPath);
  } else {
    // Handle absolute imports from project root
    searchPath = path.resolve(
      "./src/app",
      searchPath.replace(/^.*?\/app\//, "")
    );
  }

  // Try common routing file patterns
  const patterns = [
    searchPath + "-routing.module.ts",
    searchPath + ".routing.module.ts",
    path.join(searchPath, "routing.module.ts"),
    searchPath.replace(".module", "-routing.module") + ".ts",
    searchPath.replace(/\.ts$/, "-routing.module.ts"),
  ];

  for (const pattern of patterns) {
    if (fs.existsSync(pattern)) {
      return pattern;
    }
  }

  return null;
}

function buildRouteTree(routingFile, parentPath = "", depth = 0) {
  const routes = parseRoutingModule(routingFile);
  const allRoutes = [];
  const indent = "  ".repeat(depth);

  console.log(`${indent}📂 Scanning: ${path.relative(".", routingFile)}`);

  for (const route of routes) {
    const fullPath = parentPath ? `${parentPath}/${route.path}` : route.path;

    // Add this route
    allRoutes.push(fullPath);
    console.log(`${indent}  ├─ ${route.path} → ${fullPath}`);

    // If it has children, recursively extract them
    if (route.loadChildren) {
      const childRoutingFile = findRoutingModule(
        route.loadChildren,
        route.fullPath
      );
      if (childRoutingFile) {
        console.log(`${indent}  │  └─ Loading children...`);
        const childRoutes = buildRouteTree(
          childRoutingFile,
          fullPath,
          depth + 1
        );
        allRoutes.push(...childRoutes);
      }
    }
  }

  return allRoutes;
}

/**
 * Scan HTML files for routerLink directives
 */
function scanHtmlFiles(dir = "./src/app") {
  const htmlRoutes = new Set();

  function scanDirectory(directory) {
    if (!fs.existsSync(directory)) return;

    const files = fs.readdirSync(directory);

    for (const file of files) {
      const fullPath = path.join(directory, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules and dist
        if (!file.includes("node_modules") && !file.includes("dist")) {
          scanDirectory(fullPath);
        }
      } else if (file.endsWith(".html")) {
        const content = fs.readFileSync(fullPath, "utf8");

        // Find routerLink directives
        // Patterns: [routerLink]="'/path'" or routerLink="/path"
        const patterns = [
          /routerLink\s*=\s*["']([^"']+)["']/g,
          /\[routerLink\]\s*=\s*["']([^"']+)["']/g,
          /\[routerLink\]\s*=\s*"\[([^\]]+)\]"/g,
        ];

        patterns.forEach((pattern) => {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            let route = match[1];
            // Clean up the route
            route = route.replace(/^['"\s]+|['"\s]+$/g, "");
            route = route.replace(/^\/+/, ""); // Remove leading slashes
            route = route.replace(/#\/?/, ""); // Remove hash

            if (
              route &&
              !route.includes("{{") &&
              !route.includes("(") &&
              route.length > 0
            ) {
              htmlRoutes.add(route);
            }
          }
        });
      }
    }
  }

  console.log("\n📄 Scanning HTML files for routerLink...");
  scanDirectory(dir);
  console.log(`   Found ${htmlRoutes.size} routes in HTML files`);

  return Array.from(htmlRoutes);
}

/**
 * Scan TypeScript files for router.navigate() calls
 */
function scanTypeScriptFiles(dir = "./src/app") {
  const tsRoutes = new Set();

  function scanDirectory(directory) {
    if (!fs.existsSync(directory)) return;

    const files = fs.readdirSync(directory);

    for (const file of files) {
      const fullPath = path.join(directory, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules and dist
        if (!file.includes("node_modules") && !file.includes("dist")) {
          scanDirectory(fullPath);
        }
      } else if (file.endsWith(".ts") && !file.endsWith(".spec.ts")) {
        const content = fs.readFileSync(fullPath, "utf8");

        // Find router.navigate() calls
        // Patterns: router.navigate(['/path']), this.router.navigate(['path'])
        const patterns = [
          /\.navigate\(\s*\[\s*["']([^"']+)["']/g,
          /\.navigateByUrl\(\s*["']([^"']+)["']/g,
        ];

        patterns.forEach((pattern) => {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            let route = match[1];
            // Clean up the route
            route = route.replace(/^['"\s]+|['"\s]+$/g, "");
            route = route.replace(/^\/+/, ""); // Remove leading slashes
            route = route.replace(/#\/?/, ""); // Remove hash

            if (
              route &&
              !route.includes("${") &&
              !route.includes("`") &&
              route.length > 0
            ) {
              tsRoutes.add(route);
            }
          }
        });
      }
    }
  }

  console.log("\n📝 Scanning TypeScript files for router.navigate()...");
  scanDirectory(dir);
  console.log(`   Found ${tsRoutes.size} routes in TypeScript files`);

  return Array.from(tsRoutes);
}

/**
 * Find all routing module files in the project
 */
function findAllRoutingModules(dir = "./src/app") {
  const routingFiles = [];

  function scanDirectory(directory) {
    if (!fs.existsSync(directory)) return;

    const files = fs.readdirSync(directory);

    for (const file of files) {
      const fullPath = path.join(directory, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!file.includes("node_modules") && !file.includes("dist")) {
          scanDirectory(fullPath);
        }
      } else if (
        file.endsWith("-routing.module.ts") ||
        file.endsWith(".routing.module.ts")
      ) {
        routingFiles.push(fullPath);
      }
    }
  }

  scanDirectory(dir);
  return routingFiles;
}

function extractAllRoutes() {
  console.log("🔍 COMPREHENSIVE ROUTE EXTRACTION\n");
  console.log("═══════════════════════════════════════════════════════\n");

  const appRoutingFile = "./src/app/app-routing.module.ts";

  if (!fs.existsSync(appRoutingFile)) {
    console.error("❌ Error: app-routing.module.ts not found");
    process.exit(1);
  }

  // Check if using hash routing
  const appRoutingContent = fs.readFileSync(appRoutingFile, "utf8");
  const usesHashRouting = appRoutingContent.includes("useHash: true");
  const hashPrefix = usesHashRouting ? "#/" : "/";

  console.log(
    `📌 Routing Mode: ${usesHashRouting ? "Hash Routing (#/)" : "HTML5 Mode"}\n`
  );

  // 1. Build the complete route tree from routing modules (parent-child)
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 1: Extracting routes from routing modules (hierarchy)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  const routingModuleRoutes = buildRouteTree(appRoutingFile);

  // 2. Find all routing modules in the project
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 2: Finding all routing module files");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  const allRoutingFiles = findAllRoutingModules();
  console.log(`   Found ${allRoutingFiles.length} routing module files:`);
  allRoutingFiles.slice(0, 10).forEach((file) => {
    console.log(`     - ${path.relative(".", file)}`);
  });
  if (allRoutingFiles.length > 10) {
    console.log(`     ... and ${allRoutingFiles.length - 10} more`);
  }

  // 3. Scan HTML files for routerLink
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 3: Scanning HTML templates");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const htmlRoutes = scanHtmlFiles();

  // 4. Scan TypeScript files for router.navigate
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 4: Scanning TypeScript files");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const tsRoutes = scanTypeScriptFiles();

  // 5. Combine all routes
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 5: Combining and deduplicating routes");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const allRoutes = [...routingModuleRoutes, ...htmlRoutes, ...tsRoutes];

  // Remove duplicates and sort
  const uniqueRoutes = [...new Set(allRoutes)].sort();

  // Filter out redirect routes, empty paths, and auth routes
  const validRoutes = uniqueRoutes.filter(
    (route) =>
      route &&
      route.trim().length > 0 &&
      !route.includes("**") &&
      !route.includes(":") &&
      !route.includes("undefined") &&
      !route.includes("null") &&
      route !== "Login" &&
      route !== "Renewpassword" &&
      route !== "Forgotpassword"
  );

  console.log(`   From routing modules: ${routingModuleRoutes.length}`);
  console.log(`   From HTML files: ${htmlRoutes.length}`);
  console.log(`   From TypeScript files: ${tsRoutes.length}`);
  console.log(`   Total unique routes: ${uniqueRoutes.length}`);
  console.log(`   Valid routes (filtered): ${validRoutes.length}`);

  return {
    routes: validRoutes,
    hashPrefix,
    stats: {
      routingModules: routingModuleRoutes.length,
      htmlFiles: htmlRoutes.length,
      tsFiles: tsRoutes.length,
      total: validRoutes.length,
    },
  };
}

// Main execution
try {
  const { routes, hashPrefix, stats } = extractAllRoutes();

  // Save routes (without hash prefix for internal use)
  fs.writeFileSync("routes.json", JSON.stringify(routes, null, 2));

  // Save routes with full URL format for reference
  const fullUrls = routes.map((r) => `${hashPrefix}${r}`);
  fs.writeFileSync("routes-full-urls.json", JSON.stringify(fullUrls, null, 2));

  // Create a categorized routes file
  const categorized = {
    metadata: {
      totalRoutes: routes.length,
      routingMode: hashPrefix === "#/" ? "Hash" : "HTML5",
      generatedAt: new Date().toISOString(),
      stats: stats,
    },
    routes: routes,
    fullUrls: fullUrls,
  };
  fs.writeFileSync(
    "routes-complete.json",
    JSON.stringify(categorized, null, 2)
  );

  console.log("\n\n═══════════════════════════════════════════════════════");
  console.log("✓ EXTRACTION COMPLETE");
  console.log("═══════════════════════════════════════════════════════\n");

  console.log(`📊 Total Routes Found: ${routes.length}\n`);

  console.log(`📄 Sample Routes (with ${hashPrefix} prefix):\n`);

  routes.slice(0, 20).forEach((route, index) => {
    console.log(
      `  ${(index + 1).toString().padStart(2)}. ${hashPrefix}${route}`
    );
  });

  if (routes.length > 20) {
    console.log(`      ... and ${routes.length - 20} more routes`);
  }

  console.log("\n📁 Output Files Created:");
  console.log("  ✓ routes.json - Clean route paths");
  console.log("  ✓ routes-full-urls.json - URLs with hash prefix");
  console.log("  ✓ routes-complete.json - Complete metadata and stats\n");

  // Show some specific examples
  const exampleRoutes = ["AKIMaintenance", "Tests", "Analyser", "Profile"];

  console.log("🔍 Example Routes Found:");
  exampleRoutes.forEach((example) => {
    const found = routes.filter((r) => r.includes(example));
    if (found.length > 0) {
      console.log(`\n  ${example}:`);
      found.slice(0, 3).forEach((route) => {
        console.log(`    → ${hashPrefix}${route}`);
      });
      if (found.length > 3) {
        console.log(`    ... and ${found.length - 3} more`);
      }
    }
  });

  console.log("\n═══════════════════════════════════════════════════════");
  console.log('Next Step: Run "node generate-backstop-config.js"');
  console.log("═══════════════════════════════════════════════════════\n");
} catch (error) {
  console.error("\n❌ ERROR:", error.message);
  console.error(error.stack);
  process.exit(1);
}
