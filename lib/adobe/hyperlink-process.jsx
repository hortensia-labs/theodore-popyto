/*
 * URL Hyperlink Correction Script
 * Fixes malformed URL hyperlinks where Pandoc sets HyperlinkURLDestination URLs to
 * placeholder values (e.g., "http://example.com") while storing the intended URL
 * in the hyperlink's name property.
 *
 * Compatible with ECMAScript 3 (ExtendScript)
 *
 * Configuration:
 * This script reads configuration from a temporary file written by runner.applescript.
 * The config chain is:
 *   /tmp/indesign-runner-config.json -> generated/{book}/data/indesign-config.json
 *
 * If no config is found, falls back to legacy hardcoded paths for compatibility.
 */

// Include essential modules
#include "modules/json2.js"
#include "modules/indesign/book-manager.jsx"

// ============================================================================
// DYNAMIC CONFIGURATION LOADING
// ============================================================================

/**
 * Loads book configuration from the runner config chain.
 * Returns null if config cannot be loaded (legacy mode).
 */
function loadBookConfig() {
    var RUNNER_CONFIG_PATH = "/tmp/indesign-runner-config.json";

    try {
        // Step 1: Read runner config
        var runnerFile = new File(RUNNER_CONFIG_PATH);
        if (!runnerFile.exists) {
            $.writeln("[CONFIG] No runner config found at " + RUNNER_CONFIG_PATH + " (legacy mode)");
            return null;
        }

        runnerFile.encoding = "UTF-8";
        if (!runnerFile.open("r")) {
            $.writeln("[CONFIG] Cannot open runner config file");
            return null;
        }

        var runnerContent = runnerFile.read();
        runnerFile.close();

        var runnerConfig = JSON.parse(runnerContent);
        if (!runnerConfig || !runnerConfig.configPath) {
            $.writeln("[CONFIG] Invalid runner config structure");
            return null;
        }

        $.writeln("[CONFIG] Book ID: " + runnerConfig.bookId);
        $.writeln("[CONFIG] Config path: " + runnerConfig.configPath);

        // Step 2: Read actual InDesign config
        var configFile = new File(runnerConfig.configPath);
        if (!configFile.exists) {
            $.writeln("[CONFIG] InDesign config not found: " + runnerConfig.configPath);
            return null;
        }

        configFile.encoding = "UTF-8";
        if (!configFile.open("r")) {
            $.writeln("[CONFIG] Cannot open InDesign config file");
            return null;
        }

        var configContent = configFile.read();
        configFile.close();

        var bookConfig = JSON.parse(configContent);
        if (!bookConfig || !bookConfig.paths) {
            $.writeln("[CONFIG] Invalid InDesign config structure");
            return null;
        }

        $.writeln("[CONFIG] Loaded config for: " + bookConfig.book.title);
        return bookConfig;

    } catch (error) {
        $.writeln("[CONFIG] Error loading config: " + error.message);
        return null;
    }
}

// Load dynamic configuration
var BOOK_CONFIG = loadBookConfig();

// Initialize paths from config or use legacy fallbacks
var reportsDir;
var CONFIG = {};

if (BOOK_CONFIG) {
    // New mode: use dynamic configuration
    reportsDir = BOOK_CONFIG.reports.hyperlinks;
    CONFIG.REGISTRY_PATH = BOOK_CONFIG.registries.hyperlink;
    CONFIG.VERSION = "1.2.0-multibook";
    CONFIG.BOOK_ID = BOOK_CONFIG.book.id;
    CONFIG.BOOK_PREFIX = BOOK_CONFIG.book.prefix;
    $.writeln("[CONFIG] Using dynamic config - Registry: " + CONFIG.REGISTRY_PATH);
    $.writeln("[CONFIG] Using dynamic config - Reports: " + reportsDir);
} else {
    // Legacy mode: use hardcoded paths for backward compatibility
    reportsDir = "/Users/henry/Workbench/PopytoNoPhd/theodore-popyto-no-phd/generated/reports/url-hyperlinks";
    CONFIG.REGISTRY_PATH = "/Users/henry/Workbench/PopytoNoPhd/theodore-popyto-no-phd/generated/data/url-registry.json";
    CONFIG.VERSION = "1.1.0";
    CONFIG.BOOK_ID = null;
    CONFIG.BOOK_PREFIX = null;
    $.writeln("[CONFIG] Using legacy hardcoded paths (no runner config found)");
}

// ============================================================================
// END CONFIGURATION
// ============================================================================

// Note: Placeholder detection removed in v1.1.0
// Pandoc may use placeholders OR the first URL for all destinations.
// The new approach trusts the hyperlink NAME as the source of truth,
// correcting any destination whose URL differs from its hyperlink name.

var sessionState = {
    currentBook: null,
    bookContents: [],
    urlRegistry: null,
    processedDocuments: [],
    stats: {
        startTime: new Date().getTime(),
        totalCorrections: 0,
        documentsProcessed: 0,
        reusedDestinations: 0,
        updatedDestinations: 0,
        createdDestinations: 0,
        orphansRemoved: 0,
        errors: 0,
        warnings: 0
    },
    capturedLogs: {
        errors: [],
        warnings: [],
        corrections: []
    }
};

// Simple logging with capture for JSON report
function log(level, message, context) {
    var time = new Date().toString().substring(16, 24);
    var logLine = "[" + time + "] [" + level + "] " + message;
    if (context) {
        logLine += " |";
        for (var key in context) {
            if (context.hasOwnProperty(key)) {
                logLine += " " + key + "=" + String(context[key]);
            }
        }
    }

    // Capture errors, warnings, and corrections for JSON report
    if (level === "ERROR" || level === "WARN" || level === "CORRECTION") {
        var logEntry = {
            timestamp: time,
            level: level,
            message: message,
            context: context || {},
            fullLogLine: logLine
        };

        if (level === "ERROR") {
            sessionState.capturedLogs.errors.push(logEntry);
        } else if (level === "WARN") {
            sessionState.capturedLogs.warnings.push(logEntry);
        } else if (level === "CORRECTION") {
            sessionState.capturedLogs.corrections.push(logEntry);
        }
    }

    $.writeln(logLine);
}

function main() {
    try {
        $.writeln("=== URL HYPERLINK CORRECTION PROCESSING ===");
        log("INFO", "Processing started", { version: CONFIG.VERSION });

        // Phase 1: Registry Loading (optional, graceful fallback)
        log("INFO", "Loading URL registry", { path: CONFIG.REGISTRY_PATH });
        sessionState.urlRegistry = loadURLRegistry();
        if (sessionState.urlRegistry) {
            log("INFO", "URL registry loaded", {
                totalURLs: sessionState.urlRegistry.metadata.totalURLs,
                uniqueURLs: sessionState.urlRegistry.metadata.totalUniqueURLs
            });
        } else {
            log("WARN", "URL registry not available, using name-based extraction only", {});
        }

        // Phase 2: Book Initialization
        log("INFO", "Initializing book", {});
        var bookResult = BookManager.getActiveBook();
        if (!bookResult.success) {
            log("FATAL", "Book access failed", { error: bookResult.error });
            return "FATAL_ERROR: " + bookResult.error;
        }

        sessionState.currentBook = bookResult.book;
        log("INFO", "Book initialized", {
            name: sessionState.currentBook.name,
            documents: bookResult.metadata.documentCount
        });

        // Phase 3: Document Access
        log("INFO", "Getting accessible documents", {});
        var documentsResult = BookManager.getAccessibleDocuments(sessionState.currentBook, null);
        if (!documentsResult.success || documentsResult.documents.length === 0) {
            log("FATAL", "No accessible documents", {});
            return "FATAL_ERROR: No accessible documents";
        }

        sessionState.bookContents = documentsResult.documents;
        log("INFO", "Documents found", {
            accessible: documentsResult.documents.length,
            inaccessible: documentsResult.inaccessible.length
        });

        // Phase 4: Process URL Hyperlinks in Each Document
        log("INFO", "Starting URL hyperlink processing", {});
        var processingResult = processAllDocuments();
        log("INFO", "URL hyperlink processing completed", processingResult.stats);

        // Phase 5: Cleanup Orphaned Destinations
        log("INFO", "Starting orphan cleanup", {});
        var cleanupResult = cleanupOrphanedDestinations();
        log("INFO", "Orphan cleanup completed", cleanupResult);

        // Phase 6: Generate Report
        var duration = new Date().getTime() - sessionState.stats.startTime;
        var isSuccess = sessionState.stats.errors === 0;

        log("INFO", "Processing complete", {
            corrections: sessionState.stats.totalCorrections,
            documents: sessionState.stats.documentsProcessed,
            reused: sessionState.stats.reusedDestinations,
            updated: sessionState.stats.updatedDestinations,
            created: sessionState.stats.createdDestinations,
            orphansRemoved: sessionState.stats.orphansRemoved,
            duration: duration + "ms"
        });

        $.writeln("=== PROCESSING COMPLETE ===");
        $.writeln("Total Corrections: " + sessionState.stats.totalCorrections);
        $.writeln("Documents Processed: " + sessionState.stats.documentsProcessed);
        $.writeln("Correction Methods:");
        $.writeln("  - Reused existing destinations: " + sessionState.stats.reusedDestinations);
        $.writeln("  - Updated orphan destinations: " + sessionState.stats.updatedDestinations);
        $.writeln("  - Created new destinations: " + sessionState.stats.createdDestinations);
        $.writeln("Orphans Removed: " + sessionState.stats.orphansRemoved);
        $.writeln("Processing Time: " + (duration / 1000).toFixed(1) + " seconds");

        if (sessionState.stats.errors > 0 || sessionState.stats.warnings > 0) {
            $.writeln("PROCESSING ISSUES:");
            if (sessionState.stats.errors > 0) {
                $.writeln("  - Errors: " + sessionState.stats.errors);
            }
            if (sessionState.stats.warnings > 0) {
                $.writeln("  - Warnings: " + sessionState.stats.warnings);
            }
        }

        // Generate JSON report
        generateJSONReport(isSuccess, duration);

        var resultMessage = isSuccess ? "SUCCESS" : "COMPLETED_WITH_ISSUES";
        resultMessage += ": URL hyperlink processing completed. ";
        resultMessage += "Corrections: " + sessionState.stats.totalCorrections;
        resultMessage += ", Documents: " + sessionState.stats.documentsProcessed;

        if (sessionState.stats.errors > 0) {
            resultMessage += ", Errors: " + sessionState.stats.errors;
        }
        if (sessionState.stats.warnings > 0) {
            resultMessage += ", Warnings: " + sessionState.stats.warnings;
        }

        return resultMessage;

    } catch (error) {
        $.writeln("FATAL ERROR: " + error.message);
        $.writeln("Error type: " + (error.name || "Error"));
        $.writeln("Error line: " + (error.line || "unknown"));
        log("FATAL", "Processing failed", {
            error: error.message,
            type: error.name || "Error"
        });
        return "FATAL_ERROR: " + error.message;
    }
}

/**
 * Loads the URL registry from JSON file
 * @returns {Object|null} Registry object or null if not available
 */
function loadURLRegistry() {
    try {
        var jsonFile = new File(CONFIG.REGISTRY_PATH);
        if (!jsonFile.exists) {
            log("WARN", "URL registry file not found", { path: CONFIG.REGISTRY_PATH });
            return null;
        }

        jsonFile.encoding = "UTF-8";
        if (!jsonFile.open("r")) {
            log("WARN", "Cannot open URL registry file", {});
            return null;
        }

        var jsonString = jsonFile.read();
        jsonFile.close();

        if (!jsonString || jsonString.length === 0) {
            log("WARN", "URL registry file is empty", {});
            return null;
        }

        var jsonData = JSON.parse(jsonString);
        if (!jsonData || !jsonData.urls) {
            log("WARN", "Invalid URL registry structure", {});
            return null;
        }

        return jsonData;

    } catch (error) {
        log("WARN", "URL registry loading error", { error: error.message });
        return null;
    }
}

/**
 * Process all documents in the book
 * @returns {Object} Processing result with stats
 */
function processAllDocuments() {
    var stats = {
        corrections: 0,
        documentsProcessed: 0,
        errors: 0
    };

    for (var i = 0; i < sessionState.bookContents.length; i++) {
        var bookContent = sessionState.bookContents[i];
        var documentName = bookContent.name.replace(/\.indd$/, "");

        try {
            var openResult = BookManager.openDocument(bookContent, null);
            if (!openResult.success) {
                log("WARN", "Could not open document", { document: documentName });
                stats.errors++;
                continue;
            }

            var doc = openResult.document;
            var docResult = processDocumentHyperlinks(doc, documentName);

            stats.corrections += docResult.corrections;
            stats.documentsProcessed++;

            sessionState.stats.totalCorrections += docResult.corrections;
            sessionState.stats.documentsProcessed++;

            // Save document if changes were made
            if (docResult.corrections > 0) {
                try {
                    doc.save();
                    log("INFO", "Document saved", { document: documentName, corrections: docResult.corrections });
                } catch (saveError) {
                    log("WARN", "Could not save document", { document: documentName, error: saveError.message });
                }
            }

            // Close document if we opened it
            if (!openResult.wasAlreadyOpen) {
                BookManager.closeDocument(doc, false, null);
            }

        } catch (docError) {
            log("ERROR", "Error processing document", {
                document: documentName,
                error: docError.message
            });
            stats.errors++;
            sessionState.stats.errors++;
        }
    }

    return { stats: stats };
}

/**
 * Process hyperlinks in a single document
 * @param {Document} doc - InDesign document
 * @param {string} documentName - Name of the document
 * @returns {Object} Result with correction count
 */
function processDocumentHyperlinks(doc, documentName) {
    var corrections = 0;

    var hyperlinks = doc.hyperlinks;
    var totalHyperlinks = hyperlinks.length;

    log("INFO", "Processing document hyperlinks", {
        document: documentName,
        hyperlinks: totalHyperlinks
    });

    for (var h = 0; h < totalHyperlinks; h++) {
        var hyperlink = hyperlinks[h];

        try {
            // Check if this hyperlink has a URL destination
            if (!hyperlink.destination) {
                continue;
            }

            // Check if destination is a URL destination
            var destType = hyperlink.destination.constructor.name;
            if (destType !== "HyperlinkURLDestination") {
                continue;
            }

            var destination = hyperlink.destination;
            var currentURL = destination.destinationURL;
            var hyperlinkName = hyperlink.name;

            // Debug: Log each URL hyperlink being examined
            log("DEBUG", "Examining URL hyperlink", {
                document: documentName,
                hyperlinkName: hyperlinkName,
                currentDestURL: currentURL,
                needsCorrection: (hyperlinkName !== currentURL) ? "YES" : "NO"
            });

            // Check if this needs correction
            var intendedURL = extractIntendedURL(hyperlinkName, currentURL);

            if (intendedURL && intendedURL !== currentURL) {
                // Apply correction using three-tier approach
                var correctionResult = applyCorrection(doc, hyperlink, destination, intendedURL, documentName);

                if (correctionResult.success) {
                    corrections++;
                    log("CORRECTION", "URL corrected", {
                        document: documentName,
                        oldURL: currentURL,
                        newURL: intendedURL,
                        method: correctionResult.method
                    });
                }
            }

        } catch (linkError) {
            log("WARN", "Error processing hyperlink", {
                document: documentName,
                hyperlink: hyperlink.name,
                error: linkError.message
            });
            sessionState.stats.warnings++;
        }
    }

    return { corrections: corrections };
}

/**
 * Extract the intended URL from hyperlink name or registry
 *
 * IMPORTANT: The hyperlink NAME is the source of truth for the intended URL.
 * Pandoc stores the correct URL in the hyperlink's name property, but may set
 * all destination URLs to the same value (either a placeholder like "http://example.com"
 * OR the first URL encountered in the document).
 *
 * @param {string} hyperlinkName - Name of the hyperlink (contains the intended URL)
 * @param {string} currentURL - Current destination URL
 * @returns {string|null} Intended URL if correction needed, or null if already correct
 */
function extractIntendedURL(hyperlinkName, currentURL) {
    // Strategy 1: Extract URL from hyperlink name (primary strategy)
    // The hyperlink name is the source of truth - Pandoc stores the intended URL here
    if (hyperlinkName && (hyperlinkName.indexOf("http://") === 0 || hyperlinkName.indexOf("https://") === 0 || hyperlinkName.indexOf("mailto:") === 0)) {
        // If the hyperlink name (intended URL) differs from current destination URL,
        // return it for correction. This handles both:
        // - Placeholder URLs (http://example.com)
        // - Wrong real URLs (when Pandoc uses first URL for all destinations)
        if (hyperlinkName !== currentURL) {
            return hyperlinkName;
        }
        // Already correct, no change needed
        return null;
    }

    // Strategy 2: Look up in registry by link text (if registry available)
    // This is a fallback for when the hyperlink name is the display text, not the URL
    if (sessionState.urlRegistry && sessionState.urlRegistry.urls) {
        for (var u = 0; u < sessionState.urlRegistry.urls.length; u++) {
            var registryEntry = sessionState.urlRegistry.urls[u];
            if (registryEntry.linkText === hyperlinkName) {
                // Found a match - return the URL if it differs from current
                if (registryEntry.url !== currentURL) {
                    return registryEntry.url;
                }
                return null;
            }
        }
    }

    return null;
}

/**
 * Apply URL correction using three-tier approach: REUSE → UPDATE → CREATE
 * @param {Document} doc - InDesign document
 * @param {Hyperlink} hyperlink - Hyperlink to correct
 * @param {HyperlinkURLDestination} destination - Current destination
 * @param {string} intendedURL - Correct URL to set
 * @param {string} documentName - Document name for logging
 * @returns {Object} Result with success status and method used
 */
function applyCorrection(doc, hyperlink, destination, intendedURL, documentName) {
    try {
        // Tier 1: REUSE - Find existing destination with correct URL
        var existingDest = findExistingURLDestination(doc, intendedURL);
        if (existingDest) {
            hyperlink.destination = existingDest;
            sessionState.stats.reusedDestinations++;
            return { success: true, method: "REUSE" };
        }

        // Tier 2: UPDATE - Update the current destination if it's orphaned or unique
        // Check if this destination is only used by this hyperlink
        var destUsageCount = countDestinationUsage(doc, destination);
        if (destUsageCount <= 1) {
            destination.destinationURL = intendedURL;
            destination.name = intendedURL;
            sessionState.stats.updatedDestinations++;
            return { success: true, method: "UPDATE" };
        }

        // Tier 3: CREATE - Create new destination
        var newDest = doc.hyperlinkURLDestinations.add({
            destinationURL: intendedURL,
            name: intendedURL
        });
        hyperlink.destination = newDest;
        sessionState.stats.createdDestinations++;
        return { success: true, method: "CREATE" };

    } catch (error) {
        log("ERROR", "Correction failed", {
            document: documentName,
            url: intendedURL,
            error: error.message
        });
        sessionState.stats.errors++;
        return { success: false, method: null, error: error.message };
    }
}

/**
 * Find an existing URL destination with the specified URL
 * @param {Document} doc - InDesign document
 * @param {string} url - URL to find
 * @returns {HyperlinkURLDestination|null} Existing destination or null
 */
function findExistingURLDestination(doc, url) {
    var destinations = doc.hyperlinkURLDestinations;

    for (var d = 0; d < destinations.length; d++) {
        var dest = destinations[d];
        if (dest.destinationURL === url) {
            return dest;
        }
    }

    return null;
}

/**
 * Count how many hyperlinks use a specific destination
 * @param {Document} doc - InDesign document
 * @param {HyperlinkURLDestination} destination - Destination to check
 * @returns {number} Usage count
 */
function countDestinationUsage(doc, destination) {
    var count = 0;
    var hyperlinks = doc.hyperlinks;

    for (var h = 0; h < hyperlinks.length; h++) {
        try {
            if (hyperlinks[h].destination && hyperlinks[h].destination.id === destination.id) {
                count++;
            }
        } catch (e) {
            // Skip if can't access
        }
    }

    return count;
}

/**
 * Cleanup orphaned URL destinations across all documents
 * @returns {Object} Cleanup result
 */
function cleanupOrphanedDestinations() {
    var totalRemoved = 0;

    for (var i = 0; i < sessionState.bookContents.length; i++) {
        var bookContent = sessionState.bookContents[i];
        var documentName = bookContent.name.replace(/\.indd$/, "");

        try {
            var openResult = BookManager.openDocument(bookContent, null);
            if (!openResult.success) {
                continue;
            }

            var doc = openResult.document;
            var removed = removeOrphanedDestinations(doc);

            if (removed > 0) {
                totalRemoved += removed;
                sessionState.stats.orphansRemoved += removed;

                try {
                    doc.save();
                } catch (saveError) {
                    log("WARN", "Could not save after orphan cleanup", { document: documentName });
                }
            }

            if (!openResult.wasAlreadyOpen) {
                BookManager.closeDocument(doc, false, null);
            }

        } catch (docError) {
            log("WARN", "Error during orphan cleanup", {
                document: documentName,
                error: docError.message
            });
        }
    }

    return { removed: totalRemoved };
}

/**
 * Remove orphaned URL destinations from a document
 * @param {Document} doc - InDesign document
 * @returns {number} Number of orphans removed
 */
function removeOrphanedDestinations(doc) {
    var removed = 0;
    var destinations = doc.hyperlinkURLDestinations;

    // Collect orphans first (can't modify collection while iterating)
    var orphans = [];

    for (var d = destinations.length - 1; d >= 0; d--) {
        var dest = destinations[d];
        var usage = countDestinationUsage(doc, dest);

        if (usage === 0) {
            orphans.push(dest);
        }
    }

    // Remove orphans
    for (var o = 0; o < orphans.length; o++) {
        try {
            orphans[o].remove();
            removed++;
        } catch (e) {
            // Skip if can't remove
        }
    }

    return removed;
}

/**
 * Gets timestamp for filename
 */
function getTimestamp() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1);
    var day = String(now.getDate());
    var hours = String(now.getHours());
    var minutes = String(now.getMinutes());
    var seconds = String(now.getSeconds());

    // Pad with zeros
    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;
    if (hours.length < 2) hours = "0" + hours;
    if (minutes.length < 2) minutes = "0" + minutes;
    if (seconds.length < 2) seconds = "0" + seconds;

    return year + month + day + "_" + hours + minutes + seconds;
}

/**
 * Generate comprehensive JSON report
 * @param {boolean} isSuccess - Whether processing was successful
 * @param {number} duration - Processing duration in milliseconds
 */
function generateJSONReport(isSuccess, duration) {
    try {
        var report = {
            sessionInfo: {
                version: CONFIG.VERSION,
                timestamp: new Date().toString(),
                duration: duration,
                processingTimeSeconds: (duration / 1000).toFixed(1),
                bookId: CONFIG.BOOK_ID || "legacy",
                bookPrefix: CONFIG.BOOK_PREFIX || null
            },
            results: {
                status: isSuccess ? "SUCCESS" : "COMPLETED_WITH_ISSUES",
                totalCorrections: sessionState.stats.totalCorrections,
                documentsProcessed: sessionState.stats.documentsProcessed,
                correctionMethods: {
                    reused: sessionState.stats.reusedDestinations,
                    updated: sessionState.stats.updatedDestinations,
                    created: sessionState.stats.createdDestinations
                },
                orphansRemoved: sessionState.stats.orphansRemoved
            },
            issues: {
                errors: sessionState.stats.errors,
                warnings: sessionState.stats.warnings
            },
            capturedLogs: {
                errors: sessionState.capturedLogs.errors,
                warnings: sessionState.capturedLogs.warnings,
                corrections: sessionState.capturedLogs.corrections,
                totalCorrectionEntries: sessionState.capturedLogs.corrections.length
            },
            statistics: {
                documentsInBook: sessionState.bookContents.length,
                documentsProcessed: sessionState.stats.documentsProcessed,
                registryAvailable: sessionState.urlRegistry !== null,
                registryURLCount: sessionState.urlRegistry ? sessionState.urlRegistry.metadata.totalURLs : 0
            }
        };

        var jsonString = JSON.stringify(report, null, 2);
        // Include book prefix in filename if available
        var timestamp = getTimestamp();
        var filenamePrefix = CONFIG.BOOK_PREFIX ? CONFIG.BOOK_PREFIX + "-" : "";
        var filename = filenamePrefix + "hyperlink-fix-report-" + timestamp + ".json";
        var filepath = reportsDir + "/" + filename;

        createDirectoryIfNeeded(reportsDir);
        var success = writeTextFile(filepath, jsonString);

        if (success) {
            $.writeln("JSON report generated: " + filepath);
            log("INFO", "JSON report generated", { filepath: filepath });
        } else {
            $.writeln("WARNING: Could not write JSON report");
            log("WARN", "JSON report generation failed", { filepath: filepath });
        }

    } catch (error) {
        $.writeln("ERROR: JSON report generation failed: " + error.message);
        log("ERROR", "JSON report generation error", { error: error.message });
    }
}

/**
 * Creates directory if it doesn't exist
 */
function createDirectoryIfNeeded(dirPath) {
    try {
        var pathParts = dirPath.split("/");
        var currentPath = "";

        for (var p = 0; p < pathParts.length; p++) {
            if (pathParts[p]) {
                currentPath += (currentPath ? "/" : "") + pathParts[p];
                var folder = new Folder(currentPath);

                if (!folder.exists) {
                    var created = folder.create();
                    if (!created) {
                        return false;
                    }
                }
            }
        }

        return true;

    } catch (error) {
        return false;
    }
}

/**
 * Writes text to file
 */
function writeTextFile(filepath, content) {
    try {
        var file = new File(filepath);
        file.encoding = "UTF-8";

        if (file.parent && !file.parent.exists) {
            file.parent.create();
        }

        if (file.open("w")) {
            file.write(content);
            file.close();
            return true;
        } else {
            try {
                if (file.exists) {
                    file.remove();
                }

                if (file.open("w", "TEXT", "????")) {
                    file.write(content);
                    file.close();
                    return true;
                }
            } catch (altError) {
                // Silent fallback failure
            }

            return false;
        }

    } catch (error) {
        log("ERROR", "Failed to write file", {
            error: error.message,
            filepath: filepath
        });
        return false;
    }
}

// Helper function for string repeat (not available in ECMAScript 3)
String.prototype.repeat = String.prototype.repeat || function(count) {
    var result = "";
    for (var i = 0; i < count; i++) {
        result += this;
    }
    return result;
};

// Run the script
main();
