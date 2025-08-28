const fs = require("fs");
const path = require("path");

// SafePath-specific patterns for different types of hardcoded values
const PARAMETER_PATTERNS = {
  // Numeric parameters
  MATHEMATICAL_OPS: /[*\/+-]\s*\d*\.\d+/g,
  COMPARISONS: /[<>]=?\s*[2-9]\d*\.?\d*/g,
  ASSIGNMENTS: /=\s*\d+\.?\d*/g,
  OBJECT_VALUES: /:\s*\d+\.?\d*/g,

  // Time and duration values
  TIMEOUTS: /timeout[:\s=]*\d+/gi,
  DELAYS: /delay[:\s=]*\d+/gi,
  INTERVALS: /interval[:\s=]*\d+/gi,
  DURATIONS: /duration[:\s=]*\d+/gi,
  SETTIMEOUT: /setTimeout\([^,]*,\s*\d+/gi,
  SETINTERVAL: /setInterval\([^,]*,\s*\d+/gi,

  // UI and styling parameters
  PIXEL_VALUES: /\d+px/g,
  PERCENTAGES: /\d+%/g,
  MARGINS: /margin[:\s=]*\d+/gi,
  PADDING: /padding[:\s=]*\d+/gi,
  WIDTHS: /width[:\s=]*\d+/gi,
  HEIGHTS: /height[:\s=]*\d+/gi,

  // SafePath-specific thresholds
  SAFETY_SCORES: /[<>]=?\s*[0-5]\.\d+/g,
  CONFIDENCE_VALUES: /confidence[:\s=]*0\.\d+/gi,
  THRESHOLDS: /threshold[:\s=]*\d+\.?\d*/gi,
  LIMITS: /limit[:\s=]*\d+/gi,
  MAXIMUMS: /max[:\s=]*\d+/gi,
  MINIMUMS: /min[:\s=]*\d+/gi,
  RADII: /radius[:\s=]*\d+\.?\d*/gi,

  // Configuration values
  SIZES: /size[:\s=]*\d+/gi,
  COUNTS: /count[:\s=]*\d+/gi,
  WEIGHTS: /weight[:\s=]*\d+\.?\d*/gi,
  FETCH_LIMITS: /limit[:\s=]*\d+/gi,
  PAGE_SIZES: /page[_\s]?size[:\s=]*\d+/gi,
};

// SafePath directories to scan with their purposes
const SCAN_DIRECTORIES = {
  "supabase/functions": "Edge Functions (ML/Safety Algorithms)",
  "src/components": "React Native Components",
  "src/store": "Redux Store/State Management",
  "src/services": "API Services & External Integrations",
  "src/utils": "Utility Functions & Helpers",
  "src/screens": "Screen Components",
  "src/navigation": "Navigation Configuration",
  app: "Expo Router Screens",
  ".": "Root Configuration Files",
};

// File extensions to scan
const SCAN_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".json"];

// Values to ignore (common non-parameters) - SafePath specific
const IGNORE_VALUES = [
  // HTTP status codes
  "200",
  "201",
  "400",
  "401",
  "403",
  "404",
  "500",
  // Array indices and common constants
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "100",
  "1000",
  "0.0",
  "1.0",
  "2.0",
  // Port numbers
  "3000",
  "8080",
  "5432",
  "54321",
  // Version numbers
  "0.1",
  "1.0",
  "2.0",
  // React Native common values
  "16",
  "24",
  "32",
  "48",
  "64", // Common icon sizes
  "12",
  "14",
  "18",
  "20", // Common font sizes
  // SafePath's existing config values (to avoid duplicates)
  "5000",
  "50",
  "2.0",
  "2.5",
  "3.0",
  "4.0",
  "1.5",
  "3.5",
  "0.5",
  "20",
  "0.8",
  "800",
];

function scanDirectory(dirPath, relativePath = "") {
  const results = [];

  if (!fs.existsSync(dirPath)) return results;

  const items = fs.readdirSync(dirPath);

  items.forEach((item) => {
    const fullPath = path.join(dirPath, item);
    const relativeItemPath = path.join(relativePath, item);

    if (fs.statSync(fullPath).isDirectory()) {
      // Skip irrelevant directories
      if (
        [
          "node_modules",
          ".git",
          ".expo",
          "dist",
          "build",
          "__tests__",
          ".vscode",
        ].includes(item)
      ) {
        return;
      }
      results.push(...scanDirectory(fullPath, relativeItemPath));
    } else {
      // Check if file extension should be scanned
      const ext = path.extname(item);
      if (SCAN_EXTENSIONS.includes(ext)) {
        const findings = scanFile(fullPath, relativeItemPath);
        if (findings.length > 0) {
          results.push({
            file: relativeItemPath,
            findings: findings,
          });
        }
      }
    }
  });

  return results;
}

function scanFile(filePath, relativePath) {
  const findings = [];

  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Skip comments, imports, and obvious non-parameters
      if (
        line.trim().startsWith("//") ||
        line.trim().startsWith("/*") ||
        line.trim().startsWith("*") ||
        line.trim().startsWith("import") ||
        line.trim().startsWith("export") ||
        line.includes("console.log") ||
        line.includes("console.error") ||
        line.includes("APP_CONFIG") || // Skip existing config usage
        line.trim() === ""
      ) {
        return;
      }

      // Check each pattern type
      Object.entries(PARAMETER_PATTERNS).forEach(([patternName, regex]) => {
        const matches = line.match(regex);
        if (matches) {
          matches.forEach((match) => {
            // Extract the numeric value
            const numberMatch = match.match(/\d+\.?\d*/);
            if (numberMatch && !IGNORE_VALUES.includes(numberMatch[0])) {
              // Skip if this looks like a timestamp or ID
              if (numberMatch[0].length > 10) return;

              // Categorize the finding based on context
              const category = categorizeParameter(
                line,
                match,
                patternName,
                relativePath
              );
              const confidence = calculateConfidence(line, match, relativePath);

              // Only include medium+ confidence findings
              if (confidence >= 0.3) {
                findings.push({
                  line: lineNum,
                  code: line.trim(),
                  match: match,
                  value: numberMatch[0],
                  pattern: patternName,
                  category: category,
                  confidence: confidence,
                });
              }
            }
          });
        }
      });
    });
  } catch (error) {
    console.warn(
      `Warning: Could not read file ${relativePath}: ${error.message}`
    );
  }

  return findings;
}

function categorizeParameter(line, match, patternName, filePath) {
  // SafePath-specific categorization based on file path and context
  if (filePath.includes("functions/")) {
    if (filePath.includes("similarity-calculator")) return "ML_SIMILARITY";
    if (filePath.includes("safety-predictor")) return "ML_SAFETY_PREDICTION";
    if (filePath.includes("pattern-detector")) return "ML_PATTERN_DETECTION";
    if (filePath.includes("location-recommender")) return "ML_RECOMMENDATIONS";
    if (filePath.includes("danger-zones")) return "ML_DANGER_ZONES";
    return "EDGE_FUNCTION_GENERAL";
  }

  if (filePath.includes("components/")) return "UI_COMPONENTS";
  if (filePath.includes("store/")) return "STATE_MANAGEMENT";
  if (filePath.includes("services/")) return "API_SERVICES";
  if (filePath.includes("utils/")) return "UTILITY_FUNCTIONS";
  if (filePath.includes("screens/") || filePath.includes("app/"))
    return "SCREEN_COMPONENTS";

  // Context-based categorization
  const lowerLine = line.toLowerCase();
  if (lowerLine.includes("timeout") || lowerLine.includes("delay"))
    return "TIMING_PARAMETERS";
  if (lowerLine.includes("color") || lowerLine.includes("style"))
    return "UI_STYLING";
  if (lowerLine.includes("threshold") || lowerLine.includes("limit"))
    return "BUSINESS_LOGIC";
  if (
    lowerLine.includes("weight") ||
    lowerLine.includes("score") ||
    lowerLine.includes("confidence")
  )
    return "ALGORITHM_PARAMETERS";
  if (lowerLine.includes("safety") || lowerLine.includes("danger"))
    return "SAFETY_PARAMETERS";
  if (lowerLine.includes("radius") || lowerLine.includes("distance"))
    return "GEOGRAPHIC_PARAMETERS";

  return "NEEDS_CLASSIFICATION";
}

function calculateConfidence(line, match, filePath) {
  let confidence = 0.4; // Start with medium-low confidence

  // Higher confidence indicators
  if (match.includes(".")) confidence += 0.3; // Decimal values likely parameters
  if (line.includes("const ") || line.includes("let ")) confidence += 0.2; // Variable assignments
  if (
    line.includes("threshold") ||
    line.includes("limit") ||
    line.includes("confidence")
  )
    confidence += 0.3; // Business logic words
  if (filePath.includes("functions/")) confidence += 0.2; // Edge functions likely have tunable params
  if (line.includes("setTimeout") || line.includes("setInterval"))
    confidence += 0.2; // Timing functions

  // Lower confidence indicators
  if (line.includes("status") || line.includes("code")) confidence -= 0.3; // Status codes
  if (line.includes("version") || line.includes("id")) confidence -= 0.2; // Version numbers, IDs
  if (filePath.includes(".json")) confidence -= 0.1; // JSON config files might be ok as-is
  if (line.includes("px") || line.includes("%")) confidence -= 0.1; // Styling might stay hardcoded

  return Math.max(0.1, Math.min(1.0, confidence));
}

// Execute comprehensive scan
console.log("🔍 Starting SafePath Configuration Audit...\n");
console.log(
  "This will scan your entire codebase for hardcoded parameters that could be centralized.\n"
);

const allFindings = {};
let totalFiles = 0;

Object.entries(SCAN_DIRECTORIES).forEach(([dir, description]) => {
  console.log(`Scanning ${dir} (${description})...`);
  const findings = scanDirectory(dir);
  if (findings.length > 0) {
    allFindings[dir] = {
      description: description,
      files: findings,
    };
    totalFiles += findings.length;
  }
});

// Generate comprehensive report
console.log("\n" + "=".repeat(100));
console.log("🎯 SAFEPATH CONFIGURATION AUDIT RESULTS");
console.log("=".repeat(100));

let totalFindings = 0;
let highConfidenceFindings = 0;
let mediumConfidenceFindings = 0;

Object.entries(allFindings).forEach(([directory, data]) => {
  console.log(`\n📂 ${directory.toUpperCase()} (${data.description})`);
  console.log("-".repeat(80));

  data.files.forEach((fileData) => {
    console.log(`\n   📄 ${fileData.file}`);

    // Sort findings by confidence (highest first)
    const sortedFindings = fileData.findings.sort(
      (a, b) => b.confidence - a.confidence
    );

    sortedFindings.forEach((finding) => {
      const confidenceIndicator =
        finding.confidence > 0.7
          ? "🔴"
          : finding.confidence > 0.5
          ? "🟡"
          : "🟢";
      console.log(
        `      ${confidenceIndicator} Line ${finding.line}: ${finding.code}`
      );
      console.log(
        `         → Value: ${finding.value} | Category: ${
          finding.category
        } | Confidence: ${(finding.confidence * 100).toFixed(0)}%`
      );

      totalFindings++;
      if (finding.confidence > 0.7) highConfidenceFindings++;
      else if (finding.confidence > 0.5) mediumConfidenceFindings++;
    });
  });
});

// Summary statistics
console.log("\n" + "=".repeat(100));
console.log("📊 AUDIT SUMMARY");
console.log("=".repeat(100));
console.log(`Files scanned: ${totalFiles}`);
console.log(`Total parameters found: ${totalFindings}`);
console.log(
  `High priority (🔴): ${highConfidenceFindings} - Review these first!`
);
console.log(
  `Medium priority (🟡): ${mediumConfidenceFindings} - Good candidates for centralization`
);
console.log(
  `Low priority (🟢): ${
    totalFindings - highConfidenceFindings - mediumConfidenceFindings
  } - Consider case by case`
);
console.log(`Directories with findings: ${Object.keys(allFindings).length}`);

// Category breakdown
const categoryBreakdown = {};
Object.values(allFindings).forEach((data) => {
  data.files.forEach((fileData) => {
    fileData.findings.forEach((finding) => {
      categoryBreakdown[finding.category] =
        (categoryBreakdown[finding.category] || 0) + 1;
    });
  });
});

console.log("\n📋 CATEGORY BREAKDOWN (by priority):");
Object.entries(categoryBreakdown)
  .sort(([, a], [, b]) => b - a)
  .forEach(([category, count]) => {
    const priority = getCategoryPriority(category);
    console.log(`   ${priority} ${category}: ${count} parameters`);
  });

function getCategoryPriority(category) {
  const highPriority = [
    "ML_SIMILARITY",
    "ML_SAFETY_PREDICTION",
    "ML_PATTERN_DETECTION",
    "SAFETY_PARAMETERS",
    "ALGORITHM_PARAMETERS",
  ];
  const mediumPriority = [
    "API_SERVICES",
    "TIMING_PARAMETERS",
    "BUSINESS_LOGIC",
    "GEOGRAPHIC_PARAMETERS",
  ];

  if (highPriority.includes(category)) return "🔥";
  if (mediumPriority.includes(category)) return "⚡";
  return "📝";
}

console.log("\n🎯 RECOMMENDED NEXT STEPS:");
console.log(
  "1. 🔴 Review high confidence findings first - these are likely tunable parameters"
);
console.log(
  "2. 🔥 Focus on ML and Safety categories - highest business impact"
);
console.log(
  "3. ⚡ API Services and Timing parameters - user experience impact"
);
console.log("4. 📝 Consider UI styling parameters case by case");

if (highConfidenceFindings > 0) {
  console.log("\n💡 IMMEDIATE ACTION ITEMS:");
  console.log(
    `- You have ${highConfidenceFindings} high-confidence parameters to centralize`
  );
  console.log(
    "- Start with Edge Functions - these likely contain your most important ML parameters"
  );
  console.log(
    "- Create expanded appConfig.ts sections based on categories found"
  );
  console.log(
    "- Test each change thoroughly, especially ML algorithm parameters"
  );
}

console.log("\n🏁 Once centralized, you'll be able to:");
console.log("- Instantly tune ML algorithm performance");
console.log("- A/B test safety thresholds and UI timing");
console.log("- Adjust API timeouts and retry logic without code changes");
console.log("- Fine-tune user experience parameters for different user groups");

console.log(
  "\n📁 Next: Review the high priority findings and start with your Edge Functions!"
);
