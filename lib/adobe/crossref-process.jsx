/*
 * Working Cross-Reference Processing Script
 * Full functionality with simplified, reliable logging
 * Compatible with ECMAScript 3 (ExtendScript)
 */

// Include essential modules only
#include "modules/json2.js"
#include "modules/indesign/book-manager.jsx"
#include "modules/indesign/story-manager.jsx"
#include "modules/indesign/destination-manager.jsx"
#include "modules/indesign/hyperlink-manager.jsx"

var reportsDir = "/Users/henry/Workbench/PopytoNoPhd/theodore-popyto/generated/reports/crossref";

var CONFIG = {
    REGISTRY_PATH: "/Users/henry/Workbench/PopytoNoPhd/theodore-popyto/generated/data/crossref-registry.json",
    VERSION: "2.0.0-working"
};

var sessionState = {
    currentBook: null,
    bookContents: [],
    globalDestinationRegistry: {},
    processedDocuments: [],
    stats: {
        startTime: new Date().getTime(),
        totalConversions: 0,
        documentsProcessed: 0,
        destinationConversions: 0,
        hyperlinkConversions: 0,
        errors: 0
    },
    // Capture warnings and errors for JSON report
    capturedLogs: {
        errors: [],
        warnings: []
    }
};

// Simple, reliable logging with capture for JSON report
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
    
    // Capture warnings and errors for JSON report
    if (level === "ERROR" || level === "WARN") {
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
        }
    }
    
    $.writeln(logLine);
}

function main() {
    try {
        $.writeln("=== ENHANCED CROSS-REFERENCE PROCESSING (WORKING VERSION) ===");
        log("INFO", "Processing started", { version: CONFIG.VERSION });
        
        // Phase 1: Registry Loading
        log("INFO", "Loading registry", { path: CONFIG.REGISTRY_PATH });
        var registry = loadRegistry();
        if (!registry) {
            log("FATAL", "Registry loading failed", {});
            return "FATAL_ERROR: Registry loading failed";
        }
        log("INFO", "Registry loaded", { anchors: getObjectKeys(registry.anchors).length });
        
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
        
        // Phase 4: Global Discovery
        log("INFO", "Starting global discovery", {});
        var discovery = performGlobalDiscovery(registry);
        if (!discovery.success) {
            log("FATAL", "Global discovery failed", { error: discovery.error });
            return "FATAL_ERROR: " + discovery.error;
        }
        log("INFO", "Global discovery completed", discovery.stats);
        
        // Phase 5: Two-Phase Document Processing
        log("INFO", "Starting two-phase document processing", {});
        
        // Phase 5A: Convert all destinations first
        log("INFO", "Converting destinations across all documents", {});
        var destinationProcessing = performDestinationConversions(registry);
        
        // Phase 5B: Convert all hyperlinks (now that destinations exist)
        log("INFO", "Converting hyperlinks across all documents", {});
        var hyperlinkProcessing = performHyperlinkConversions(registry);
        
        var processing = {
            stats: {
                totalConversions: destinationProcessing.stats.conversions + hyperlinkProcessing.stats.conversions,
                documentsProcessed: Math.max(destinationProcessing.stats.documentsProcessed, hyperlinkProcessing.stats.documentsProcessed),
                destinationConversions: destinationProcessing.stats.conversions,
                hyperlinkConversions: hyperlinkProcessing.stats.conversions,
                errors: destinationProcessing.stats.errors + hyperlinkProcessing.stats.errors,
                warnings: (destinationProcessing.stats.warnings || 0) + (hyperlinkProcessing.stats.warnings || 0)
            }
        };
        log("INFO", "Document processing completed", processing.stats);
        
        sessionState.stats.totalConversions = processing.stats.totalConversions;
        sessionState.stats.documentsProcessed = processing.stats.documentsProcessed;
        sessionState.stats.destinationConversions = processing.stats.destinationConversions;
        sessionState.stats.hyperlinkConversions = processing.stats.hyperlinkConversions;
        sessionState.stats.errors = processing.stats.errors;
        sessionState.stats.warnings = processing.stats.warnings;
        
        // Phase 6: Basic Verification
        log("INFO", "Starting basic verification", {});
        var verification = performBasicVerification();
        
        // Final Summary
        var duration = new Date().getTime() - sessionState.stats.startTime;
        var isPublicationReady = verification.markdownArtifacts === 0 && verification.invalidCrossRefs === 0;
        
        log("INFO", "Processing complete", {
            conversions: sessionState.stats.totalConversions,
            documents: sessionState.stats.documentsProcessed,
            destinations: sessionState.stats.destinationConversions,
            hyperlinks: sessionState.stats.hyperlinkConversions,
            duration: duration + "ms",
            publicationReady: isPublicationReady
        });
        
        $.writeln("=== PROCESSING COMPLETE ===");
        $.writeln("PUBLICATION READY: " + (isPublicationReady ? "YES" : "NO"));
        $.writeln("Total Conversions: " + sessionState.stats.totalConversions);
        $.writeln("Documents Processed: " + sessionState.stats.documentsProcessed);
        $.writeln("Processing Time: " + (duration / 1000).toFixed(1) + " seconds");
        
        // Show error/warning summary
        if (sessionState.stats.errors > 0 || sessionState.stats.warnings > 0) {
            $.writeln("PROCESSING ISSUES:");
            if (sessionState.stats.errors > 0) {
                $.writeln("  - Errors: " + sessionState.stats.errors + " (prevented conversions)");
            }
            if (sessionState.stats.warnings > 0) {
                $.writeln("  - Warnings: " + sessionState.stats.warnings + " (missing targets, resolution failures)");
            }
        }
        
        if (!isPublicationReady) {
            $.writeln("VERIFICATION ISSUES:");
            if (verification.markdownArtifacts > 0) {
                $.writeln("  - Markdown artifacts: " + verification.markdownArtifacts + " (unconverted references)");
            }
            if (verification.invalidCrossRefs > 0) {
                $.writeln("  - Invalid cross-references: " + verification.invalidCrossRefs);
            }
        }
        
        // Build comprehensive result message with error information
        var resultMessage = "";
        
        if (isPublicationReady) {
            if (sessionState.stats.warnings > 0) {
                resultMessage = "SUCCESS_WITH_WARNINGS";
            } else {
                resultMessage = "SUCCESS";
            }
        } else {
            resultMessage = "COMPLETED_WITH_ISSUES";
        }
        
        resultMessage += ": Cross-reference processing completed. ";
        resultMessage += "Conversions: " + sessionState.stats.totalConversions;
        resultMessage += ", Documents: " + sessionState.stats.documentsProcessed;
        
        // Add error/warning information
        if (sessionState.stats.errors > 0) {
            resultMessage += ", Errors: " + sessionState.stats.errors;
        }
        if (sessionState.stats.warnings > 0) {
            resultMessage += ", Warnings: " + sessionState.stats.warnings;
        }
        
        // Add quality assessment
        resultMessage += ", Quality: " + (isPublicationReady ? "PUBLICATION_READY" : "REQUIRES_ATTENTION");
        
        // Add details about issues if they exist
        if (!isPublicationReady) {
            var issueDetails = [];
            if (verification.markdownArtifacts > 0) {
                issueDetails.push(verification.markdownArtifacts + " artifacts");
            }
            if (verification.invalidCrossRefs > 0) {
                issueDetails.push(verification.invalidCrossRefs + " invalid cross-refs");
            }
            if (issueDetails.length > 0) {
                resultMessage += " (Issues: " + issueDetails.join(", ") + ")";
            }
        }
        
        // Generate JSON report
        generateJSONReport(isPublicationReady, verification, duration);
        
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

function loadRegistry() {
    try {
        var jsonFile = new File(CONFIG.REGISTRY_PATH);
        if (!jsonFile.exists) {
            log("ERROR", "Registry file not found", { path: CONFIG.REGISTRY_PATH });
            return null;
        }
        
        jsonFile.encoding = "UTF-8";
        if (!jsonFile.open("r")) {
            log("ERROR", "Cannot open registry file", {});
            return null;
        }
        
        var jsonString = jsonFile.read();
        jsonFile.close();
        
        if (!jsonString || jsonString.length === 0) {
            log("ERROR", "Registry file is empty", {});
            return null;
        }
        
        var jsonData = JSON.parse(jsonString);
        if (!jsonData || !jsonData.anchors) {
            log("ERROR", "Invalid registry structure", {});
            return null;
        }
        
        return jsonData;
        
    } catch (error) {
        log("ERROR", "Registry loading error", { error: error.message });
        return null;
    }
}

function performGlobalDiscovery(registry) {
    var stats = {
        documentsScanned: 0,
        totalDestinations: 0,
        totalHyperlinks: 0,
        registryEntries: 0
    };
    
    try {
        sessionState.globalDestinationRegistry = {};
        sessionState.processedDocuments = [];
        
        for (var i = 0; i < sessionState.bookContents.length; i++) {
            var bookContent = sessionState.bookContents[i];
            var documentName = bookContent.name.replace(/\.indd$/, "");
            
            try {
                var openResult = BookManager.openDocument(bookContent, null);
                if (!openResult.success) {
                    log("WARN", "Could not open document", { document: documentName });
                    continue;
                }
                
                var doc = openResult.document;
                
                // Discover destinations
                var destResult = DestinationManager.discoverMarkdownDestinations(doc, null);
                if (destResult.success) {
                    stats.totalDestinations += destResult.destinations.length;
                    
                    // Register destinations globally
                    for (var d = 0; d < destResult.destinations.length; d++) {
                        var dest = destResult.destinations[d];
                        var qualifiedName = documentName + ":" + dest.cleanAnchorId;
                        
                        sessionState.globalDestinationRegistry[qualifiedName] = {
                            destination: dest.destination,
                            document: documentName,
                            anchorId: dest.cleanAnchorId,
                            paragraph: dest.paragraph
                        };
                        stats.registryEntries++;
                    }
                }
                
                // Discover hyperlinks
                var linkResult = HyperlinkManager.discoverMarkdownHyperlinks(doc, null);
                if (linkResult.success) {
                    stats.totalHyperlinks += linkResult.hyperlinks.length;
                }
                
                sessionState.processedDocuments.push(documentName);
                stats.documentsScanned++;
                
                // Close document if we opened it
                if (!openResult.wasAlreadyOpen) {
                    BookManager.closeDocument(doc, false, null);
                }
                
            } catch (docError) {
                log("ERROR", "Error scanning document", { 
                    document: documentName,
                    error: docError.message 
                });
            }
        }
        
        return {
            success: true,
            stats: stats,
            error: null
        };
        
    } catch (error) {
        log("ERROR", "Global discovery error", { error: error.message });
        return {
            success: false,
            stats: stats,
            error: error.message
        };
    }
}

function performDestinationConversions(registry) {
    var stats = {
        conversions: 0,
        documentsProcessed: 0,
        errors: 0,
        warnings: 0
    };
    
    try {
        for (var i = 0; i < sessionState.bookContents.length; i++) {
            var bookContent = sessionState.bookContents[i];
            var documentName = bookContent.name.replace(/\.indd$/, "");
            
            try {
                var openResult = BookManager.openDocument(bookContent, null);
                if (!openResult.success) {
                    log("WARN", "Could not open document for destination conversion", { document: documentName });
                    stats.errors++;
                    continue;
                }
                
                var doc = openResult.document;
                var destResult = DestinationManager.discoverMarkdownDestinations(doc, null);
                
                if (destResult.success && destResult.destinations.length > 0) {
                    var docConversions = 0;
                    var checkedOutStories = [];
                    
                    // Checkout stories for destination conversion
                    var paragraphs = [];
                    for (var d = 0; d < destResult.destinations.length; d++) {
                        if (destResult.destinations[d].paragraph) {
                            paragraphs.push(destResult.destinations[d].paragraph);
                        }
                    }
                    
                    var stories = StoryManager.getStoriesForTextObjects(paragraphs, null);
                    if (stories.length > 0) {
                        var checkoutResult = StoryManager.checkoutStories(stories, "destination conversion", null);
                        if (checkoutResult.success) {
                            checkedOutStories = checkoutResult.checkedOutStories;
                        }
                    }
                    
                    // Convert destinations
                    for (var d = 0; d < destResult.destinations.length; d++) {
                        var destItem = destResult.destinations[d];
                        
                        try {
                            var conversionResult = DestinationManager.convertToParagraphDestination(
                                doc, destItem, documentName, null
                            );
                            
                            if (conversionResult.success) {
                                docConversions++;
                                stats.conversions++;
                            } else {
                                log("WARN", "Destination conversion failed", {
                                    document: documentName,
                                    anchor: destItem.cleanAnchorId,
                                    error: conversionResult.error
                                });
                                stats.errors++;
                            }
                        } catch (destError) {
                            log("WARN", "Destination conversion exception", {
                                document: documentName,
                                anchor: destItem.cleanAnchorId,
                                error: destError.message
                            });
                            stats.errors++;
                        }
                    }
                    
                    // Check in stories
                    if (checkedOutStories.length > 0) {
                        StoryManager.checkinStories(checkedOutStories, null);
                    }
                    
                    // Only log if there were issues
                    if (docConversions < destResult.destinations.length) {
                        log("WARN", "Some destination conversions failed", {
                            document: documentName,
                            found: destResult.destinations.length,
                            converted: docConversions,
                            failed: destResult.destinations.length - docConversions
                        });
                    }
                }
                
                stats.documentsProcessed++;
                
                // Close document if we opened it
                if (!openResult.wasAlreadyOpen) {
                    BookManager.closeDocument(doc, false, null);
                }
                
            } catch (docError) {
                log("ERROR", "Error processing document destinations", {
                    document: documentName,
                    error: docError.message
                });
                stats.errors++;
            }
        }
        
        return {
            success: stats.errors === 0,
            stats: stats,
            error: stats.errors > 0 ? "Some destination conversions failed" : null
        };
        
    } catch (error) {
        log("ERROR", "Destination processing error", { error: error.message });
        return {
            success: false,
            stats: stats,
            error: error.message
        };
    }
}

function performHyperlinkConversions(registry) {
    var stats = {
        conversions: 0,
        documentsProcessed: 0,
        errors: 0,
        warnings: 0
    };
    
    try {
        for (var i = 0; i < sessionState.bookContents.length; i++) {
            var bookContent = sessionState.bookContents[i];
            var documentName = bookContent.name.replace(/\.indd$/, "");
            
            try {
                var openResult = BookManager.openDocument(bookContent, null);
                if (!openResult.success) {
                    log("WARN", "Could not open document for hyperlink conversion", { document: documentName });
                    stats.errors++;
                    continue;
                }
                
                var doc = openResult.document;
                var linkResult = HyperlinkManager.discoverMarkdownHyperlinks(doc, null);
                
                if (linkResult.success && linkResult.hyperlinks.length > 0) {
                    var docConversions = 0;
                    var checkedOutStories = [];
                    
                    // Checkout stories for hyperlink conversion
                    var sourceTexts = [];
                    for (var h = 0; h < linkResult.hyperlinks.length; h++) {
                        if (linkResult.hyperlinks[h].sourceText) {
                            sourceTexts.push(linkResult.hyperlinks[h].sourceText);
                        }
                    }
                    
                    if (sourceTexts.length > 0) {
                        var stories = StoryManager.getStoriesForTextObjects(sourceTexts, null);
                        if (stories.length > 0) {
                            var checkoutResult = StoryManager.checkoutStories(stories, "hyperlink conversion", null);
                            if (checkoutResult.success) {
                                checkedOutStories = checkoutResult.checkedOutStories;
                            }
                        }
                    }
                    
                    // Convert hyperlinks
                    for (var h = 0; h < linkResult.hyperlinks.length; h++) {
                        var hyperlinkItem = linkResult.hyperlinks[h];
                        
                        try {
                            // Resolve target destination
                            var targetDestination = resolveTargetDestination(doc, hyperlinkItem, registry);
                            if (targetDestination) {
                                var conversion = HyperlinkManager.convertToCrossReference(
                                    doc, hyperlinkItem, targetDestination, null
                                );
                                
                                if (conversion.success) {
                                    docConversions++;
                                    stats.conversions++;
                                } else {
                                    log("WARN", "Hyperlink conversion failed", {
                                        document: documentName,
                                        anchor: hyperlinkItem.cleanAnchorId,
                                        error: conversion.error || "Unknown conversion error"
                                    });
                                    stats.warnings++;
                                }
                            } else {
                                log("WARN", "Could not resolve target destination", {
                                    document: documentName,
                                    anchor: hyperlinkItem.cleanAnchorId,
                                    targetDoc: registry.anchors[hyperlinkItem.cleanAnchorId] || "not_in_registry"
                                });
                                stats.warnings++;
                            }
                        } catch (linkError) {
                            log("WARN", "Hyperlink conversion exception", {
                                document: documentName,
                                anchor: hyperlinkItem.cleanAnchorId,
                                error: linkError.message
                            });
                            stats.warnings++;
                        }
                    }
                    
                    // Check in stories
                    if (checkedOutStories.length > 0) {
                        StoryManager.checkinStories(checkedOutStories, null);
                    }
                    
                    // Only log if there were issues
                    if (docConversions < linkResult.hyperlinks.length) {
                        log("WARN", "Some hyperlink conversions failed", {
                            document: documentName,
                            found: linkResult.hyperlinks.length,
                            converted: docConversions,
                            failed: linkResult.hyperlinks.length - docConversions
                        });
                    }
                }
                
                stats.documentsProcessed++;
                
                // Close document if we opened it
                if (!openResult.wasAlreadyOpen) {
                    BookManager.closeDocument(doc, false, null);
                }
                
            } catch (docError) {
                log("ERROR", "Error processing document hyperlinks", {
                    document: documentName,
                    error: docError.message
                });
                stats.errors++;
            }
        }
        
        return {
            success: stats.errors === 0,
            stats: stats,
            error: stats.errors > 0 ? "Some hyperlink conversions failed" : null
        };
        
    } catch (error) {
        log("ERROR", "Hyperlink processing error", { error: error.message });
        return {
            success: false,
            stats: stats,
            error: error.message
        };
    }
}

function resolveTargetDestination(doc, hyperlinkItem, registry) {
    try {
        var cleanAnchorId = hyperlinkItem.cleanAnchorId;
        var targetDocument = registry.anchors[cleanAnchorId];
        
        if (!targetDocument) {
            return null;
        }
        
        var qualifiedName = targetDocument + ":" + cleanAnchorId;
        var currentDocName = doc.name.replace(/\.indd$/, "");
        
        if (targetDocument === currentDocName) {
            // Internal reference
            var targetDestination = doc.paragraphDestinations.itemByName(qualifiedName);
            if (targetDestination && targetDestination.isValid) {
                return targetDestination;
            }
        } else {
            // Cross-document reference
            if (sessionState.globalDestinationRegistry.hasOwnProperty(qualifiedName)) {
                var globalEntry = sessionState.globalDestinationRegistry[qualifiedName];
                return globalEntry.destination;
            }
        }
        
        return null;
        
    } catch (error) {
        log("ERROR", "Error resolving target destination", {
            anchor: hyperlinkItem.cleanAnchorId,
            error: error.message
        });
        return null;
    }
}

function performBasicVerification() {
    var verification = {
        markdownArtifacts: 0,
        invalidCrossRefs: 0,
        totalCrossRefs: 0
    };
    
    try {
        log("INFO", "Starting basic verification", {});
        
        // Simple verification - just count objects in processed documents
        for (var i = 0; i < sessionState.bookContents.length; i++) {
            var bookContent = sessionState.bookContents[i];
            var documentName = bookContent.name.replace(/\.indd$/, "");
            
            try {
                var openResult = BookManager.openDocument(bookContent, null);
                if (openResult.success) {
                    var doc = openResult.document;
                    
                    // Check for remaining markdown hyperlinks
                    var hyperlinks = doc.hyperlinks;
                    for (var h = 0; h < hyperlinks.length; h++) {
                        if (hyperlinks[h].name.indexOf("#") === 0) {
                            verification.markdownArtifacts++;
                        }
                    }
                    
                    // Count cross-references
                    verification.totalCrossRefs += doc.crossReferenceSources.length;
                    
                    // Close if we opened it
                    if (!openResult.wasAlreadyOpen) {
                        BookManager.closeDocument(doc, false, null);
                    }
                }
                
            } catch (verifyError) {
                log("WARN", "Verification error for document", {
                    document: documentName,
                    error: verifyError.message
                });
            }
        }
        
        log("INFO", "Basic verification completed", {
            artifacts: verification.markdownArtifacts,
            crossRefs: verification.totalCrossRefs
        });
        
        return verification;
        
    } catch (error) {
        log("ERROR", "Verification error", { error: error.message });
        return verification;
    }
}

function loadRegistry() {
    try {
        var jsonFile = new File(CONFIG.REGISTRY_PATH);
        if (!jsonFile.exists) return null;
        
        jsonFile.encoding = "UTF-8";
        if (!jsonFile.open("r")) return null;
        
        var jsonString = jsonFile.read();
        jsonFile.close();
        
        if (!jsonString || jsonString.length === 0) return null;
        
        var jsonData = JSON.parse(jsonString);
        if (!jsonData || !jsonData.anchors) return null;
        
        return jsonData;
        
    } catch (error) {
        log("ERROR", "Registry loading error", { error: error.message });
        return null;
    }
}

function getObjectKeys(obj) {
    var keys = [];
    if (obj && typeof obj === "object") {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                keys.push(key);
            }
        }
    }
    return keys;
}

/**
 * Generates comprehensive JSON report of the processing session
 * @param {boolean} isPublicationReady - Whether output is publication ready
 * @param {Object} verification - Verification results
 * @param {number} duration - Processing duration in milliseconds
 */
function generateJSONReport(isPublicationReady, verification, duration) {
    try {
        
        // Build comprehensive report object
        var report = {
            // Session information
            sessionInfo: {
                version: CONFIG.VERSION,
                timestamp: new Date().toString(),
                duration: duration,
                processingTimeSeconds: (duration / 1000).toFixed(1)
            },
            
            // Processing results (structured version of return message)
            results: {
                status: isPublicationReady ? 
                       (sessionState.stats.warnings > 0 ? "SUCCESS_WITH_WARNINGS" : "SUCCESS") : 
                       "COMPLETED_WITH_ISSUES",
                publicationReady: isPublicationReady,
                quality: isPublicationReady ? "PUBLICATION_READY" : "REQUIRES_ATTENTION",
                totalConversions: sessionState.stats.totalConversions,
                documentsProcessed: sessionState.stats.documentsProcessed,
                destinationConversions: sessionState.stats.destinationConversions,
                hyperlinkConversions: sessionState.stats.hyperlinkConversions
            },
            
            // Error and warning counts
            issues: {
                errors: sessionState.stats.errors || 0,
                warnings: sessionState.stats.warnings || 0,
                markdownArtifacts: verification.markdownArtifacts || 0,
                invalidCrossRefs: verification.invalidCrossRefs || 0,
                totalCrossRefs: verification.totalCrossRefs || 0
            },
            
            // Detailed log entries for errors and warnings
            capturedLogs: {
                errors: sessionState.capturedLogs.errors,
                warnings: sessionState.capturedLogs.warnings,
                totalErrorEntries: sessionState.capturedLogs.errors.length,
                totalWarningEntries: sessionState.capturedLogs.warnings.length
            },
            
            // Processing statistics
            statistics: {
                documentsInBook: sessionState.bookContents.length,
                documentsProcessed: sessionState.stats.documentsProcessed,
                successRate: sessionState.bookContents.length > 0 ? 
                            ((sessionState.stats.documentsProcessed / sessionState.bookContents.length) * 100).toFixed(1) + "%" : "0%",
                conversionEfficiency: sessionState.stats.totalConversions > 0 ? 
                                    ((sessionState.stats.totalConversions - verification.markdownArtifacts) / sessionState.stats.totalConversions * 100).toFixed(1) + "%" : "0%"
            }
        };
        
        // Convert to JSON string
        var jsonString = JSON.stringify(report, null, 2);
        
        // Write to reports directory
        var timestamp = getTimestamp();
        var filename = "crossref-report.json";
        var filepath = reportsDir + "/" + filename;
        
        // Ensure directory exists
        createDirectoryIfNeeded(reportsDir);
        // Write JSON report
        var success = writeTextFile(filepath, jsonString);
        
        if (success) {
            $.writeln("JSON report generated: " + filepath);
            log("INFO", "JSON report generated", { 
                filepath: filepath,
                sizeBytes: jsonString.length,
                errorEntries: report.capturedLogs.totalErrorEntries,
                warningEntries: report.capturedLogs.totalWarningEntries
            });
        } else {
            $.writeln("Primary write failed, trying fallback location...");
            
            // Fallback: try writing to current directory
            var fallbackPath = filename; // Just the filename, no directory
            $.writeln("Fallback path: " + fallbackPath);
            
            var fallbackSuccess = writeTextFile(fallbackPath, jsonString);
            
            if (fallbackSuccess) {
                $.writeln("JSON report generated at fallback location: " + fallbackPath);
                log("WARN", "JSON report generated at fallback location", { 
                    originalPath: filepath,
                    fallbackPath: fallbackPath
                });
            } else {
                $.writeln("WARNING: Could not write JSON report to any location");
                log("WARN", "JSON report generation completely failed", { 
                    originalPath: filepath,
                    fallbackPath: fallbackPath
                });
            }
        }
        
    } catch (error) {
        $.writeln("ERROR: JSON report generation failed: " + error.message);
        log("ERROR", "JSON report generation error", { error: error.message });
    }
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
 * Creates directory if it doesn't exist with enhanced debugging
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
 * Writes text to file with enhanced debugging
 */
function writeTextFile(filepath, content) {
    try {
        var file = new File(filepath);
        file.encoding = "UTF-8";
        
        // Ensure parent directory exists
        if (file.parent && !file.parent.exists) {
            file.parent.create();
        }
        
        if (file.open("w")) {
            file.write(content);
            file.close();
            return true;
        } else {
            // Try alternative approach
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

// Run the working version
main();
