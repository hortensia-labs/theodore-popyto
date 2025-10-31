/*
 * InDesign Document Utilities
 * Provides document analysis and utility functions
 * Compatible with ECMAScript 3 (ExtendScript)
 */

if (typeof DocumentUtils === "undefined") {

/**
 * DocumentUtils - Utility functions for InDesign document analysis and management
 * 
 * @purpose Provides reusable document analysis functions for various scripts
 * @context Used across different scripts for consistent document handling
 * @dependencies None (uses native InDesign API)
 */
function DocumentUtils() {}

/**
 * Gets comprehensive document statistics for analysis
 * 
 * @purpose Provides detailed statistics about document content and objects
 * @param {Document} doc - InDesign document to analyze
 * @param {Logger} log - Logger instance for analysis tracking
 * @returns {Object} {success: boolean, stats: Object, errors: Array}
 * @context Used for document analysis and integrity verification
 * @example
 *   var stats = DocumentUtils.getDocumentStatistics(doc, log);
 *   log.info("Document stats", stats.stats);
 * @errors Returns detailed statistics with any access errors logged
 */
DocumentUtils.getDocumentStatistics = function(doc, log) {
    var stats = {
        name: "unknown",
        path: "unknown",
        pages: 0,
        stories: 0,
        hyperlinks: 0,
        hyperlinkTextDestinations: 0,
        paragraphDestinations: 0,
        crossReferenceSources: 0,
        crossReferenceFormats: 0,
        characters: 0,
        words: 0,
        isValid: false,
        modified: false
    };
    var errors = [];

    try {
        if (!doc) {
            var error = "Document is null";
            if (log) log.error(error);
            return {
                success: false,
                stats: stats,
                errors: [{ error: error }]
            };
        }

        stats.isValid = doc.isValid;
        if (!stats.isValid) {
            var validityError = "Document is not valid";
            if (log) log.error(validityError);
            return {
                success: false,
                stats: stats,
                errors: [{ error: validityError }]
            };
        }

        // Basic document properties
        try {
            stats.name = doc.name || "unknown";
            stats.path = doc.fullName || "unknown";
            stats.modified = doc.modified || false;
        } catch (propError) {
            errors.push({ 
                category: "properties",
                error: propError.message 
            });
        }

        // Page count
        try {
            stats.pages = doc.pages.length;
        } catch (pageError) {
            errors.push({ 
                category: "pages",
                error: pageError.message 
            });
        }

        // Story count and text statistics
        try {
            stats.stories = doc.stories.length;
            
            // Calculate character and word counts (sample first few stories for performance)
            var sampleStories = Math.min(doc.stories.length, 5);
            for (var s = 0; s < sampleStories; s++) {
                try {
                    var story = doc.stories[s];
                    if (story.isValid) {
                        stats.characters += story.length || 0;
                        stats.words += story.words.length || 0;
                    }
                } catch (storyError) {
                    // Continue with other stories
                }
            }
            
            // Extrapolate for all stories if we sampled
            if (sampleStories < doc.stories.length && sampleStories > 0) {
                var multiplier = doc.stories.length / sampleStories;
                stats.characters = Math.floor(stats.characters * multiplier);
                stats.words = Math.floor(stats.words * multiplier);
            }
            
        } catch (storyError) {
            errors.push({ 
                category: "stories",
                error: storyError.message 
            });
        }

        // Hyperlink statistics
        try {
            stats.hyperlinks = doc.hyperlinks.length;
        } catch (hyperlinkError) {
            errors.push({ 
                category: "hyperlinks",
                error: hyperlinkError.message 
            });
        }

        // Destination statistics
        try {
            stats.hyperlinkTextDestinations = doc.hyperlinkTextDestinations.length;
        } catch (textDestError) {
            errors.push({ 
                category: "hyperlinkTextDestinations",
                error: textDestError.message 
            });
        }

        try {
            stats.paragraphDestinations = doc.paragraphDestinations.length;
        } catch (paraDestError) {
            errors.push({ 
                category: "paragraphDestinations",
                error: paraDestError.message 
            });
        }

        // Cross-reference statistics
        try {
            stats.crossReferenceSources = doc.crossReferenceSources.length;
        } catch (crossRefError) {
            errors.push({ 
                category: "crossReferenceSources",
                error: crossRefError.message 
            });
        }

        try {
            stats.crossReferenceFormats = doc.crossReferenceFormats.length;
        } catch (formatError) {
            errors.push({ 
                category: "crossReferenceFormats",
                error: formatError.message 
            });
        }

        if (log) {
            if (errors.length === 0) {
                log.debug("Document statistics collected successfully", stats);
            } else {
                log.warn("Document statistics collected with some errors", {
                    stats: stats,
                    errorCount: errors.length
                });
            }
        }

        return {
            success: errors.length === 0,
            stats: stats,
            errors: errors
        };

    } catch (error) {
        if (log) {
            log.error("Critical error collecting document statistics", {
                document: stats.name,
                error: error.message
            });
        }

        return {
            success: false,
            stats: stats,
            errors: [{
                error: "Critical error: " + error.message,
                critical: true
            }]
        };
    }
};

/**
 * Compares document statistics before and after processing
 * 
 * @purpose Provides differential analysis to verify conversion completeness
 * @param {Object} beforeStats - Document statistics before processing
 * @param {Object} afterStats - Document statistics after processing
 * @param {Object} expectedChanges - Expected changes for validation
 * @param {Logger} log - Logger instance for comparison tracking
 * @returns {Object} {success: boolean, comparison: Object, issues: Array, recommendations: Array}
 * @context Used to verify that processing had the expected impact on document
 * @example
 *   var comparison = DocumentUtils.compareStatistics(beforeStats, afterStats, {
 *     crossReferencesExpected: 10,
 *     hyperlinksExpectedRemoval: 5
 *   }, log);
 * @errors Returns detailed comparison with any discrepancies identified
 */
DocumentUtils.compareStatistics = function(beforeStats, afterStats, expectedChanges, log) {
    var comparison = {
        document: afterStats.name || beforeStats.name || "unknown",
        changes: {},
        expectations: {},
        matches: {},
        discrepancies: []
    };
    var issues = [];
    var recommendations = [];

    try {
        if (log) {
            log.debug("Comparing document statistics", {
                document: comparison.document,
                hasBeforeStats: !!beforeStats,
                hasAfterStats: !!afterStats,
                hasExpectedChanges: !!expectedChanges
            });
        }

        // Calculate actual changes
        var statsToCompare = [
            "hyperlinks", 
            "hyperlinkTextDestinations", 
            "paragraphDestinations", 
            "crossReferenceSources"
        ];

        for (var s = 0; s < statsToCompare.length; s++) {
            var statName = statsToCompare[s];
            var before = beforeStats[statName] || 0;
            var after = afterStats[statName] || 0;
            var change = after - before;
            
            comparison.changes[statName] = {
                before: before,
                after: after,
                change: change,
                changeType: change > 0 ? "increase" : (change < 0 ? "decrease" : "no_change")
            };
        }

        // Compare with expectations
        expectedChanges = expectedChanges || {};
        
        if (expectedChanges.crossReferencesExpected) {
            var expectedCrossRefs = expectedChanges.crossReferencesExpected;
            var actualCrossRefs = comparison.changes.crossReferenceSources.change;
            
            comparison.expectations.crossReferences = {
                expected: expectedCrossRefs,
                actual: actualCrossRefs,
                matches: expectedCrossRefs === actualCrossRefs,
                difference: actualCrossRefs - expectedCrossRefs
            };
            
            if (!comparison.expectations.crossReferences.matches) {
                comparison.discrepancies.push({
                    type: "cross_references",
                    expected: expectedCrossRefs,
                    actual: actualCrossRefs,
                    difference: comparison.expectations.crossReferences.difference
                });
                
                if (actualCrossRefs < expectedCrossRefs) {
                    issues.push("Fewer cross-references created than expected");
                    recommendations.push("Check conversion logs for failed operations");
                } else {
                    issues.push("More cross-references created than expected");
                    recommendations.push("Check for duplicate conversions or unexpected sources");
                }
            }
        }

        if (expectedChanges.hyperlinksExpectedRemoval) {
            var expectedRemoval = expectedChanges.hyperlinksExpectedRemoval;
            var actualRemoval = -comparison.changes.hyperlinks.change; // Negative change = removal
            
            comparison.expectations.hyperlinkRemoval = {
                expected: expectedRemoval,
                actual: actualRemoval,
                matches: expectedRemoval === actualRemoval,
                difference: actualRemoval - expectedRemoval
            };
            
            if (!comparison.expectations.hyperlinkRemoval.matches) {
                comparison.discrepancies.push({
                    type: "hyperlink_removal",
                    expected: expectedRemoval,
                    actual: actualRemoval,
                    difference: comparison.expectations.hyperlinkRemoval.difference
                });
                
                if (actualRemoval < expectedRemoval) {
                    issues.push("Fewer hyperlinks removed than expected");
                    recommendations.push("Some markdown hyperlinks may not have been converted");
                } else {
                    issues.push("More hyperlinks removed than expected");
                    recommendations.push("Check if non-markdown hyperlinks were affected");
                }
            }
        }

        // Overall assessment
        var hasDiscrepancies = comparison.discrepancies.length > 0;
        var hasIssues = issues.length > 0;
        var overallSuccess = !hasDiscrepancies && !hasIssues;

        if (log) {
            if (overallSuccess) {
                log.info("Document statistics comparison successful", {
                    document: comparison.document,
                    changes: comparison.changes
                });
            } else {
                log.warn("Document statistics comparison found discrepancies", {
                    document: comparison.document,
                    discrepancies: comparison.discrepancies.length,
                    issues: issues.length
                });
            }
        }

        return {
            success: overallSuccess,
            comparison: comparison,
            issues: issues,
            recommendations: recommendations
        };

    } catch (error) {
        if (log) {
            log.error("Error comparing document statistics", {
                document: comparison.document,
                error: error.message
            });
        }

        return {
            success: false,
            comparison: comparison,
            issues: ["Critical error during statistics comparison"],
            recommendations: ["Manual verification required due to comparison error"]
        };
    }
};

/**
 * Scans document text for specific patterns
 * 
 * @purpose Advanced text scanning for pattern detection across document content
 * @param {Document} doc - Document to scan
 * @param {RegExp} pattern - Regular expression pattern to search for
 * @param {Object} options - Scanning options {maxStories: number, maxMatches: number}
 * @param {Logger} log - Logger instance for scanning tracking
 * @returns {Object} {matches: Array, totalMatches: number, storiesScanned: number, errors: Array}
 * @context Used for advanced pattern detection in document verification
 * @example
 *   var linkPattern = /\[[^\]]*\]\(#[^)]*\)/g;
 *   var scan = DocumentUtils.scanDocumentForPatterns(doc, linkPattern, {maxStories: 20}, log);
 * @errors Returns scan results with any access errors logged
 */
DocumentUtils.scanDocumentForPatterns = function(doc, pattern, options, log) {
    var result = {
        matches: [],
        totalMatches: 0,
        storiesScanned: 0,
        errors: []
    };

    try {
        if (!doc || !doc.isValid) {
            var error = "Invalid document provided for pattern scanning";
            if (log) log.error(error);
            result.errors.push({ error: error });
            return result;
        }

        if (!pattern || typeof pattern.test !== "function") {
            var patternError = "Invalid pattern provided for scanning";
            if (log) log.error(patternError);
            result.errors.push({ error: patternError });
            return result;
        }

        options = options || {};
        var maxStories = options.maxStories || 50;
        var maxMatches = options.maxMatches || 100;

        var stories = doc.stories;
        var storiesToScan = Math.min(stories.length, maxStories);

        if (log) {
            log.trace("Scanning document for patterns", {
                document: doc.name,
                totalStories: stories.length,
                storiesToScan: storiesToScan,
                pattern: pattern.toString(),
                maxMatches: maxMatches
            });
        }

        for (var s = 0; s < storiesToScan && result.totalMatches < maxMatches; s++) {
            var story = stories[s];
            
            try {
                if (!story || !story.isValid || story.length === 0) {
                    continue;
                }

                var storyText = story.contents;
                if (!storyText || storyText.length === 0) {
                    continue;
                }

                result.storiesScanned++;

                // Find all matches in this story
                var matches = [];
                var match;
                
                // Reset pattern to beginning
                pattern.lastIndex = 0;
                
                while ((match = pattern.exec(storyText)) !== null && result.totalMatches < maxMatches) {
                    matches.push({
                        match: match[0],
                        index: match.index,
                        storyIndex: s,
                        storyId: story.id || "unknown"
                    });
                    result.totalMatches++;
                    
                    // Prevent infinite loop on global patterns
                    if (!pattern.global) {
                        break;
                    }
                }

                if (matches.length > 0) {
                    result.matches = result.matches.concat(matches);
                    
                    if (log) {
                        log.trace("Found pattern matches in story", {
                            storyIndex: s,
                            storyId: story.id || "unknown",
                            matchCount: matches.length
                        });
                    }
                }

            } catch (storyError) {
                result.errors.push({
                    storyIndex: s,
                    storyId: story ? (story.id || "unknown") : "null",
                    error: storyError.message
                });
                
                if (log) {
                    log.trace("Error scanning story for patterns", {
                        storyIndex: s,
                        error: storyError.message
                    });
                }
            }
        }

        if (log) {
            log.debug("Pattern scanning completed", {
                document: doc.name,
                storiesScanned: result.storiesScanned,
                totalMatches: result.totalMatches,
                errorCount: result.errors.length
            });
        }

        return {
            success: result.errors.length === 0,
            result: result,
            errors: result.errors
        };

    } catch (error) {
        if (log) {
            log.error("Critical error during pattern scanning", {
                document: doc ? doc.name : "unknown",
                error: error.message
            });
        }

        result.errors.push({
            error: "Critical scanning error: " + error.message,
            critical: true
        });

        return {
            success: false,
            result: result,
            errors: result.errors
        };
    }
};

/**
 * Gets object count snapshot for before/after comparison
 * 
 * @purpose Creates snapshot of document object counts for differential analysis
 * @param {Document} doc - Document to snapshot
 * @param {Logger} log - Logger instance for snapshot tracking
 * @returns {Object} {success: boolean, snapshot: Object, timestamp: string}
 * @context Used before and after processing to track changes
 * @example
 *   var beforeSnapshot = DocumentUtils.getObjectCountSnapshot(doc, log);
 *   // ... perform processing ...
 *   var afterSnapshot = DocumentUtils.getObjectCountSnapshot(doc, log);
 *   var diff = DocumentUtils.compareSnapshots(beforeSnapshot, afterSnapshot, log);
 * @errors Returns snapshot with any access errors logged
 */
DocumentUtils.getObjectCountSnapshot = function(doc, log) {
    var snapshot = {
        document: "unknown",
        hyperlinks: 0,
        hyperlinkTextDestinations: 0,
        paragraphDestinations: 0,
        crossReferenceSources: 0,
        stories: 0,
        characters: 0
    };

    try {
        if (!doc || !doc.isValid) {
            var error = "Invalid document provided for snapshot";
            if (log) log.error(error);
            return {
                success: false,
                snapshot: snapshot,
                timestamp: new Date().toISOString(),
                error: error
            };
        }

        snapshot.document = doc.name;

        // Count objects safely
        var objectTypes = [
            "hyperlinks",
            "hyperlinkTextDestinations", 
            "paragraphDestinations",
            "crossReferenceSources",
            "stories"
        ];

        for (var t = 0; t < objectTypes.length; t++) {
            var type = objectTypes[t];
            try {
                snapshot[type] = doc[type].length;
            } catch (typeError) {
                if (log) {
                    log.trace("Could not count " + type, {
                        document: doc.name,
                        error: typeError.message
                    });
                }
                // Keep default value of 0
            }
        }

        // Get character count from stories (sample for performance)
        try {
            var sampleStories = Math.min(doc.stories.length, 3);
            for (var s = 0; s < sampleStories; s++) {
                var story = doc.stories[s];
                if (story && story.isValid) {
                    snapshot.characters += story.length || 0;
                }
            }
            
            // Extrapolate if we sampled
            if (sampleStories < doc.stories.length && sampleStories > 0) {
                var multiplier = doc.stories.length / sampleStories;
                snapshot.characters = Math.floor(snapshot.characters * multiplier);
            }
        } catch (charError) {
            // Character count is optional
        }

        if (log) {
            log.trace("Object count snapshot created", snapshot);
        }

        return {
            success: true,
            snapshot: snapshot,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        if (log) {
            log.error("Error creating object count snapshot", {
                document: doc ? doc.name : "unknown",
                error: error.message
            });
        }

        return {
            success: false,
            snapshot: snapshot,
            timestamp: new Date().toISOString(),
            error: error.message
        };
    }
};

/**
 * Compares two object count snapshots
 * 
 * @purpose Analyzes differences between before/after snapshots
 * @param {Object} beforeSnapshot - Snapshot before processing
 * @param {Object} afterSnapshot - Snapshot after processing
 * @param {Logger} log - Logger instance for comparison tracking
 * @returns {Object} {differences: Object, analysis: Object, recommendations: Array}
 * @context Used to analyze the impact of processing operations
 * @example
 *   var diff = DocumentUtils.compareSnapshots(before, after, log);
 *   log.info("Processing impact", diff.analysis);
 * @errors Returns comparison results with any analysis issues
 */
DocumentUtils.compareSnapshots = function(beforeSnapshot, afterSnapshot, log) {
    var differences = {};
    var analysis = {
        totalChanges: 0,
        significantChanges: 0,
        document: afterSnapshot.snapshot ? afterSnapshot.snapshot.document : "unknown"
    };
    var recommendations = [];

    try {
        if (!beforeSnapshot || !beforeSnapshot.snapshot || !afterSnapshot || !afterSnapshot.snapshot) {
            var error = "Invalid snapshots provided for comparison";
            if (log) log.error(error);
            return {
                differences: differences,
                analysis: { error: error },
                recommendations: ["Cannot compare - invalid snapshot data"]
            };
        }

        var before = beforeSnapshot.snapshot;
        var after = afterSnapshot.snapshot;

        if (log) {
            log.trace("Comparing object count snapshots", {
                document: analysis.document,
                beforeTimestamp: beforeSnapshot.timestamp,
                afterTimestamp: afterSnapshot.timestamp
            });
        }

        // Calculate differences for each object type
        var objectTypes = ["hyperlinks", "hyperlinkTextDestinations", "paragraphDestinations", "crossReferenceSources"];
        
        for (var t = 0; t < objectTypes.length; t++) {
            var type = objectTypes[t];
            var beforeCount = before[type] || 0;
            var afterCount = after[type] || 0;
            var change = afterCount - beforeCount;
            
            differences[type] = {
                before: beforeCount,
                after: afterCount,
                change: change,
                percentChange: beforeCount > 0 ? ((change / beforeCount) * 100).toFixed(1) + "%" : (afterCount > 0 ? "∞" : "0%")
            };
            
            if (change !== 0) {
                analysis.totalChanges++;
                
                if (Math.abs(change) >= 5) { // Significant if 5+ objects changed
                    analysis.significantChanges++;
                }
            }
        }

        // Generate analysis insights
        var crossRefIncrease = differences.crossReferenceSources.change;
        var hyperlinkDecrease = -differences.hyperlinks.change;
        var destIncrease = differences.paragraphDestinations.change;

        if (crossRefIncrease > 0 && hyperlinkDecrease > 0) {
            analysis.conversionDetected = true;
            analysis.conversionRatio = crossRefIncrease > 0 ? (hyperlinkDecrease / crossRefIncrease).toFixed(2) : "0";
            
            if (crossRefIncrease === hyperlinkDecrease) {
                recommendations.push("Perfect 1:1 conversion ratio detected");
            } else if (crossRefIncrease > hyperlinkDecrease) {
                recommendations.push("More cross-references created than hyperlinks removed - check for duplicates");
            } else {
                recommendations.push("Fewer cross-references created than hyperlinks removed - check for conversion failures");
            }
        } else if (crossRefIncrease === 0 && hyperlinkDecrease === 0) {
            analysis.conversionDetected = false;
            recommendations.push("No conversion activity detected - verify processing ran correctly");
        }

        if (destIncrease > 0) {
            analysis.destinationConversionDetected = true;
            recommendations.push("Destination conversion detected (" + destIncrease + " new paragraph destinations)");
        }

        if (log) {
            log.debug("Snapshot comparison completed", {
                document: analysis.document,
                analysis: analysis,
                differences: differences
            });
        }

        return {
            differences: differences,
            analysis: analysis,
            recommendations: recommendations
        };

    } catch (error) {
        if (log) {
            log.error("Error comparing snapshots", {
                document: analysis.document,
                error: error.message
            });
        }

        return {
            differences: differences,
            analysis: {
                error: "Comparison failed: " + error.message,
                document: analysis.document
            },
            recommendations: ["Manual verification required due to comparison error"]
        };
    }
};

} // End include guard
