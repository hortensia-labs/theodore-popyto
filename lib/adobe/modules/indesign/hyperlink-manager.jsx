/*
 * InDesign Hyperlink Management Module
 * Handles Hyperlink and HyperlinkTextSource operations
 * Compatible with ECMAScript 3 (ExtendScript)
 */

if (typeof HyperlinkManager === "undefined") {

/**
 * HyperlinkManager - Centralized hyperlink operations for cross-reference processing
 * 
 * @purpose Provides standardized hyperlink discovery, validation, and conversion operations
 * @context Used by cross-reference processing and any script working with InDesign hyperlinks
 * @dependencies None (uses native InDesign API)
 */
function HyperlinkManager() {}

/**
 * Discovers all markdown hyperlinks in a document (names starting with #)
 * 
 * @purpose Finds all Hyperlink objects that represent markdown cross-references
 * @param {Document} doc - InDesign document to scan for hyperlinks
 * @param {Logger} log - Logger instance for detailed operation tracking
 * @returns {Object} {success: boolean, hyperlinks: Array, metadata: Object, errors: Array}
 * @context Called during discovery phase to identify conversion sources
 * @example
 *   var result = HyperlinkManager.discoverMarkdownHyperlinks(doc, log);
 *   log.info("Found hyperlinks", {count: result.hyperlinks.length});
 * @errors Logs individual hyperlink access failures, continues processing others
 */
HyperlinkManager.discoverMarkdownHyperlinks = function(doc, log) {
    var markdownHyperlinks = [];
    var errors = [];
    var totalHyperlinks = 0;

    try {
        if (!doc || !doc.isValid) {
            var error = "Invalid document provided to discoverMarkdownHyperlinks";
            if (log) log.error(error);
            return {
                success: false,
                hyperlinks: [],
                metadata: { error: error },
                errors: [{ error: error, critical: true }]
            };
        }

        var hyperlinks = doc.hyperlinks;
        totalHyperlinks = hyperlinks.length;

        if (log) log.debug("Scanning hyperlinks for markdown references", {
            document: doc.name,
            totalHyperlinks: totalHyperlinks
        });

        for (var h = 0; h < hyperlinks.length; h++) {
            var hyperlink = hyperlinks[h];
            
            try {
                if (!hyperlink || !hyperlink.isValid) {
                    errors.push({
                        index: h,
                        error: "Hyperlink object is not valid",
                        action: "skipped"
                    });
                    continue;
                }

                var hyperlinkName = hyperlink.name;
                
                // Check if this is a markdown hyperlink (starts with #)
                if (hyperlinkName.indexOf("#") === 0) {
                    var anchorId = hyperlinkName.substring(1);
                    
                    // Get source information for context
                    var sourceInfo = HyperlinkManager._getHyperlinkSourceInfo(hyperlink, log);
                    
                    var hyperlinkInfo = {
                        hyperlink: hyperlink,
                        source: sourceInfo.source,
                        destination: hyperlink.destination,
                        rawAnchorId: anchorId,
                        cleanAnchorId: HyperlinkManager._cleanAnchorName(anchorId),
                        hyperlinkName: hyperlinkName,
                        index: h,
                        formatText: sourceInfo.formatText,
                        sourceText: sourceInfo.sourceText,
                        sourceValid: sourceInfo.isValid,
                        sourceLength: sourceInfo.length,
                        storyId: sourceInfo.storyId
                    };
                    
                    markdownHyperlinks.push(hyperlinkInfo);
                    
                    if (log) log.trace("Found markdown hyperlink", {
                        name: hyperlinkName,
                        cleanAnchorId: hyperlinkInfo.cleanAnchorId,
                        formatText: sourceInfo.formatText,
                        sourceLength: sourceInfo.length
                    });
                } else {
                    if (log) log.trace("Skipping non-markdown hyperlink", {
                        name: hyperlinkName,
                        index: h
                    });
                }

            } catch (hyperlinkError) {
                var errorInfo = {
                    index: h,
                    hyperlinkName: hyperlink ? hyperlink.name : "unknown",
                    error: hyperlinkError.message,
                    errorType: hyperlinkError.name || "Error"
                };
                
                errors.push(errorInfo);
                
                if (log) log.warn("Error processing hyperlink", errorInfo);
            }
        }

        var metadata = {
            document: doc.name,
            totalHyperlinks: totalHyperlinks,
            markdownHyperlinks: markdownHyperlinks.length,
            errors: errors.length,
            discoveryRate: totalHyperlinks > 0 ? (markdownHyperlinks.length / totalHyperlinks * 100).toFixed(1) + "%" : "0%"
        };

        if (log) {
            log.info("Markdown hyperlink discovery complete", metadata);
            
            if (errors.length > 0) {
                log.warn("Some hyperlinks had errors during discovery", {
                    errorCount: errors.length
                });
            }
        }

        return {
            success: true,
            hyperlinks: markdownHyperlinks,
            metadata: metadata,
            errors: errors
        };

    } catch (error) {
        var errorMsg = "Critical error during hyperlink discovery: " + error.message;
        if (log) log.error(errorMsg, {
            document: doc ? doc.name : "unknown",
            errorType: error.name || "Error",
            line: error.line || null
        });

        return {
            success: false,
            hyperlinks: markdownHyperlinks, // Return partial results
            metadata: {
                error: errorMsg,
                partialResults: true,
                markdownHyperlinks: markdownHyperlinks.length
            },
            errors: [{
                error: errorMsg,
                critical: true
            }]
        };
    }
};

/**
 * Converts hyperlink to cross-reference source with format application
 * 
 * @purpose Safely converts HyperlinkTextSource to CrossReferenceSource with proper formatting
 * @param {Document} doc - InDesign document containing the hyperlink
 * @param {Object} hyperlinkItem - Hyperlink item with source, destination, and format info
 * @param {Object} targetDestination - Target ParagraphDestination for the cross-reference
 * @param {Logger} log - Logger instance for detailed operation tracking
 * @returns {Object} {success: boolean, crossRefSource: CrossReferenceSource, crossRefHyperlink: Hyperlink, error: string}
 * @context Called during hyperlink conversion phase with proper story management
 * @example
 *   var result = HyperlinkManager.convertToCrossReference(doc, hyperlinkItem, targetDest, log);
 *   if (result.success) {
 *     log.info("Hyperlink converted", {format: hyperlinkItem.formatText});
 *   }
 * @errors Returns detailed error information for troubleshooting conversion failures
 */
HyperlinkManager.convertToCrossReference = function(doc, hyperlinkItem, targetDestination, log) {
    try {
        if (!doc || !doc.isValid) {
            var error = "Invalid document provided for hyperlink conversion";
            if (log) log.error(error);
            return { success: false, error: error };
        }

        if (!hyperlinkItem || !hyperlinkItem.hyperlink || !hyperlinkItem.source) {
            var error = "Invalid hyperlink item provided for conversion";
            if (log) log.error(error, { hyperlinkItem: hyperlinkItem });
            return { success: false, error: error };
        }

        if (!targetDestination || !targetDestination.isValid) {
            var error = "Invalid target destination provided for conversion";
            if (log) log.error(error);
            return { success: false, error: error };
        }

        var cleanAnchorId = hyperlinkItem.cleanAnchorId || HyperlinkManager._cleanAnchorName(hyperlinkItem.rawAnchorId);
        var formatText = hyperlinkItem.formatText || "Page Number";

        if (log) log.debug("Converting hyperlink to cross-reference", {
            rawAnchorId: hyperlinkItem.rawAnchorId,
            cleanAnchorId: cleanAnchorId,
            formatText: formatText,
            targetDestination: targetDestination.name
        });

        // Validate and get cross-reference format
        var formatResult = HyperlinkManager._validateAndGetFormat(doc, formatText, log);
        if (!formatResult.success) {
            return {
                success: false,
                error: "No valid cross-reference format found: " + formatResult.error
            };
        }

        // Get insertion point from the story (not from the hyperlink)
        var sourceText = hyperlinkItem.source.sourceText;
        var story = sourceText.parentStory;
        var hyperlinkStart = sourceText.index;
        var hyperlinkLength = sourceText.length;

        if (log) log.debug("Preparing hyperlink replacement", {
            hyperlinkStart: hyperlinkStart,
            hyperlinkLength: hyperlinkLength,
            storyId: story.id
        });

        // Get insertion point before removing hyperlink
        var insertionPoint = story.insertionPoints[hyperlinkStart];

        // Remove the old hyperlink components first
        if (log) log.debug("Removing old hyperlink components");
        hyperlinkItem.hyperlink.remove();
        sourceText.remove();

        // Create CrossReferenceSource at the freed insertion point
        var noneCharacterStyle = doc.characterStyles.itemByName("[None]");
        
        var crossRefSource = doc.crossReferenceSources.add({
            appliedFormat: formatResult.format,
            sourceText: insertionPoint,
            appliedCharacterStyle: noneCharacterStyle
        });

        if (!crossRefSource || !crossRefSource.isValid) {
            var error = "Created CrossReferenceSource is not valid";
            if (log) log.error(error);
            return { success: false, error: error };
        }

        // Create connecting Hyperlink with unique name to avoid conflicts
        var uniqueId = new Date().getTime() + Math.floor(Math.random() * 1000);
        var uniqueName = "CrossRef-" + cleanAnchorId + "-" + uniqueId;
        
        var crossRefHyperlink = doc.hyperlinks.add({
            source: crossRefSource,
            destination: targetDestination,
            name: uniqueName,
            visible: false
        });

        if (!crossRefHyperlink || !crossRefHyperlink.isValid) {
            var error = "Created cross-reference Hyperlink is not valid";
            if (log) log.error(error);
            return { success: false, error: error };
        }

        if (log) log.info("Cross-reference conversion successful", {
            cleanAnchorId: cleanAnchorId,
            formatUsed: formatResult.formatName,
            crossRefSourceId: crossRefSource.id,
            crossRefHyperlinkId: crossRefHyperlink.id
        });

        return {
            success: true,
            crossRefSource: crossRefSource,
            crossRefHyperlink: crossRefHyperlink,
            formatUsed: formatResult.formatName,
            error: null
        };

    } catch (error) {
        var errorMsg = "Failed to convert hyperlink to cross-reference: " + error.message;
        if (log) log.error(errorMsg, {
            rawAnchorId: hyperlinkItem ? hyperlinkItem.rawAnchorId : "unknown",
            cleanAnchorId: hyperlinkItem ? hyperlinkItem.cleanAnchorId : "unknown",
            errorType: error.name || "Error",
            line: error.line || null
        });

        return {
            success: false,
            error: errorMsg
        };
    }
};

/**
 * Validates cross-reference source accessibility and content
 * 
 * @purpose Ensures cross-reference sources are properly created and functional
 * @param {CrossReferenceSource} crossRefSource - CrossReferenceSource to validate
 * @param {Logger} log - Logger instance for validation tracking
 * @returns {Object} {success: boolean, validation: Object, errors: Array}
 * @context Called after cross-reference creation to ensure quality
 * @example
 *   var validation = HyperlinkManager.validateCrossReferenceSource(newCrossRef, log);
 *   if (!validation.success) log.warn("Cross-reference validation failed");
 * @errors Logs validation failures with detailed diagnostic information
 */
HyperlinkManager.validateCrossReferenceSource = function(crossRefSource, log) {
    var validation = {
        isValid: false,
        hasSourceText: false,
        hasAppliedFormat: false,
        hasCharacterStyle: false,
        sourceTextLength: 0,
        formatName: "unknown"
    };
    var errors = [];

    try {
        if (!crossRefSource) {
            errors.push({ error: "CrossReferenceSource is null" });
            if (log) log.error("Validation failed: null cross-reference source");
            return { success: false, validation: validation, errors: errors };
        }

        // Basic validity check
        validation.isValid = crossRefSource.isValid;
        if (!validation.isValid) {
            errors.push({ error: "CrossReferenceSource.isValid is false" });
        }

        // Check source text
        try {
            var sourceText = crossRefSource.sourceText;
            validation.hasSourceText = sourceText && sourceText.isValid;
            if (validation.hasSourceText) {
                validation.sourceTextLength = sourceText.length;
            } else {
                errors.push({ error: "sourceText is missing or invalid" });
            }
        } catch (textError) {
            errors.push({ error: "Error accessing sourceText: " + textError.message });
        }

        // Check applied format
        try {
            var appliedFormat = crossRefSource.appliedFormat;
            validation.hasAppliedFormat = appliedFormat && appliedFormat.isValid;
            if (validation.hasAppliedFormat) {
                validation.formatName = appliedFormat.name || "unknown";
            } else {
                errors.push({ error: "appliedFormat is missing or invalid" });
            }
        } catch (formatError) {
            errors.push({ error: "Error accessing appliedFormat: " + formatError.message });
        }

        // Check character style
        try {
            var charStyle = crossRefSource.appliedCharacterStyle;
            validation.hasCharacterStyle = charStyle && charStyle.isValid;
        } catch (styleError) {
            errors.push({ error: "Error accessing appliedCharacterStyle: " + styleError.message });
        }

        var success = errors.length === 0 && validation.isValid && validation.hasSourceText && validation.hasAppliedFormat;

        if (log) {
            if (success) {
                log.debug("CrossReferenceSource validation passed", validation);
            } else {
                log.warn("CrossReferenceSource validation failed", {
                    validation: validation,
                    errorCount: errors.length
                });
            }
        }

        return {
            success: success,
            validation: validation,
            errors: errors
        };

    } catch (error) {
        var errorMsg = "Critical error during cross-reference validation: " + error.message;
        errors.push({ error: errorMsg, critical: true });
        
        if (log) log.error(errorMsg, {
            errorType: error.name || "Error"
        });

        return {
            success: false,
            validation: validation,
            errors: errors
        };
    }
};

/**
 * Gets source information from a hyperlink for analysis
 * 
 * @purpose Extracts source content and metadata from hyperlink
 * @param {Hyperlink} hyperlink - Hyperlink to analyze
 * @param {Logger} log - Logger instance for operation tracking
 * @returns {Object} {source: HyperlinkTextSource, formatText: string, sourceText: Text, isValid: boolean, length: number, storyId: string}
 * @context Internal utility for hyperlink analysis
 * @private
 */
HyperlinkManager._getHyperlinkSourceInfo = function(hyperlink, log) {
    var result = {
        source: null,
        formatText: "",
        sourceText: null,
        isValid: false,
        length: 0,
        storyId: "unknown"
    };

    try {
        if (!hyperlink || !hyperlink.isValid) {
            return result;
        }

        var source = hyperlink.source;
        if (!source || !source.isValid) {
            return result;
        }

        result.source = source;

        var sourceText = source.sourceText;
        if (!sourceText || !sourceText.isValid) {
            return result;
        }

        result.sourceText = sourceText;
        result.formatText = sourceText.contents || "";
        result.length = sourceText.length || 0;
        result.isValid = true;

        // Get story ID safely
        try {
            var story = sourceText.parentStory;
            if (story && story.isValid) {
                result.storyId = story.id;
            }
        } catch (storyError) {
            if (log) log.trace("Could not get story ID", {
                error: storyError.message
            });
        }

        return result;

    } catch (error) {
        if (log) log.trace("Error getting hyperlink source info", {
            error: error.message
        });
        return result;
    }
};

/**
 * Validates and retrieves a cross-reference format with fallback options
 * 
 * @purpose Gets valid cross-reference format with automatic fallback to available formats
 * @param {Document} doc - InDesign document containing formats
 * @param {string} formatName - Requested format name from markdown link text
 * @param {Logger} log - Logger instance for format resolution tracking
 * @returns {Object} {success: boolean, format: CrossReferenceFormat, formatName: string, error: string}
 * @context Internal utility for format validation and fallback
 * @private
 */
HyperlinkManager._validateAndGetFormat = function(doc, formatName, log) {
    var fallbackFormats = [
        "Paragraph Number & Page Number",
        "Full Paragraph & Page Number",
        "Page Number",
        "Paragraph Text & Page Number"
    ];

    try {
        // Try requested format first
        var format = doc.crossReferenceFormats.itemByName(formatName);
        if (format && format.isValid) {
            if (log) log.debug("Using requested cross-reference format", {
                formatName: formatName
            });
            return {
                success: true,
                format: format,
                formatName: formatName,
                error: null
            };
        }

        // Try fallback formats
        if (log) log.warn("Requested format not found, trying fallbacks", {
            requestedFormat: formatName
        });

        for (var f = 0; f < fallbackFormats.length; f++) {
            var fallbackName = fallbackFormats[f];
            format = doc.crossReferenceFormats.itemByName(fallbackName);
            
            if (format && format.isValid) {
                if (log) log.info("Using fallback cross-reference format", {
                    requestedFormat: formatName,
                    fallbackFormat: fallbackName
                });
                return {
                    success: true,
                    format: format,
                    formatName: fallbackName,
                    error: null
                };
            }
        }

        // No valid format found
        var error = "No valid cross-reference format found. Requested: " + formatName + 
                   ", Tried fallbacks: " + fallbackFormats.join(", ");
        
        if (log) log.error(error);
        
        return {
            success: false,
            format: null,
            formatName: null,
            error: error
        };

    } catch (error) {
        var errorMsg = "Error validating cross-reference format: " + error.message;
        if (log) log.error(errorMsg, {
            requestedFormat: formatName,
            errorType: error.name || "Error"
        });

        return {
            success: false,
            format: null,
            formatName: null,
            error: errorMsg
        };
    }
};

/**
 * Cleans anchor names by removing InDesign's auto-generated suffixes
 * 
 * @purpose Removes suffixes like " 1", " 2" that InDesign adds to duplicate names
 * @param {string} anchorName - Raw anchor name from InDesign object
 * @returns {string} Cleaned anchor name without suffixes
 * @context Used to normalize anchor names for registry lookup
 * @private
 * @example
 *   var clean = HyperlinkManager._cleanAnchorName("paradigms 1"); // Returns "paradigms"
 */
HyperlinkManager._cleanAnchorName = function(anchorName) {
    if (typeof anchorName !== "string") {
        return String(anchorName || "");
    }
    
    // Remove InDesign's auto-generated numeric suffixes
    return anchorName.replace(/\s+\d+$/, "");
};

/**
 * Gets all cross-reference sources in a document with filtering options
 * 
 * @purpose Retrieves existing cross-reference sources for analysis or verification
 * @param {Document} doc - InDesign document to scan
 * @param {Object} filter - Optional filter criteria {formatName: string, includeInvalid: boolean}
 * @param {Logger} log - Logger instance for operation tracking
 * @returns {Object} {success: boolean, crossReferences: Array, metadata: Object}
 * @context Used for integrity checking and cross-reference management
 * @example
 *   var result = HyperlinkManager.getCrossReferenceSources(doc, {formatName: "Page Number"}, log);
 *   log.info("Found cross-references", {count: result.crossReferences.length});
 * @errors Logs access failures for individual cross-references, continues processing
 */
HyperlinkManager.getCrossReferenceSources = function(doc, filter, log) {
    var crossReferences = [];
    var errors = [];
    var totalCrossRefs = 0;

    try {
        if (!doc || !doc.isValid) {
            var error = "Invalid document provided to getCrossReferenceSources";
            if (log) log.error(error);
            return {
                success: false,
                crossReferences: [],
                metadata: { error: error }
            };
        }

        var crossRefSources = doc.crossReferenceSources;
        totalCrossRefs = crossRefSources.length;
        filter = filter || {};

        if (log) log.debug("Getting cross-reference sources", {
            document: doc.name,
            totalCrossRefs: totalCrossRefs,
            filter: filter
        });

        for (var c = 0; c < crossRefSources.length; c++) {
            var crossRef = crossRefSources[c];
            
            try {
                if (!crossRef || (!filter.includeInvalid && !crossRef.isValid)) {
                    if (!crossRef) {
                        errors.push({
                            index: c,
                            error: "CrossReferenceSource is null"
                        });
                    } else {
                        errors.push({
                            index: c,
                            error: "CrossReferenceSource is not valid"
                        });
                    }
                    continue;
                }

                var crossRefInfo = {
                    crossReference: crossRef,
                    isValid: crossRef.isValid,
                    index: c
                };

                // Get format information
                try {
                    var appliedFormat = crossRef.appliedFormat;
                    if (appliedFormat && appliedFormat.isValid) {
                        crossRefInfo.formatName = appliedFormat.name;
                        crossRefInfo.hasFormat = true;
                    } else {
                        crossRefInfo.formatName = "unknown";
                        crossRefInfo.hasFormat = false;
                    }
                } catch (formatError) {
                    crossRefInfo.formatName = "error";
                    crossRefInfo.hasFormat = false;
                    crossRefInfo.formatError = formatError.message;
                }

                // Apply format filter
                if (filter.formatName && crossRefInfo.formatName !== filter.formatName) {
                    continue;
                }

                // Get source text information
                try {
                    var sourceText = crossRef.sourceText;
                    if (sourceText && sourceText.isValid) {
                        crossRefInfo.hasSourceText = true;
                        crossRefInfo.sourceTextLength = sourceText.length;
                        crossRefInfo.sourceTextContent = sourceText.contents.substring(0, 50) + "...";
                    } else {
                        crossRefInfo.hasSourceText = false;
                    }
                } catch (textError) {
                    crossRefInfo.hasSourceText = false;
                    crossRefInfo.textError = textError.message;
                }

                crossReferences.push(crossRefInfo);

            } catch (crossRefError) {
                errors.push({
                    index: c,
                    error: crossRefError.message,
                    errorType: crossRefError.name || "Error"
                });
            }
        }

        var metadata = {
            document: doc.name,
            totalCrossRefs: totalCrossRefs,
            filteredCrossRefs: crossReferences.length,
            errors: errors.length,
            filter: filter
        };

        if (log) log.debug("Cross-reference source retrieval complete", metadata);

        return {
            success: true,
            crossReferences: crossReferences,
            metadata: metadata
        };

    } catch (error) {
        var errorMsg = "Critical error getting cross-reference sources: " + error.message;
        if (log) log.error(errorMsg, {
            document: doc ? doc.name : "unknown",
            errorType: error.name || "Error"
        });

        return {
            success: false,
            crossReferences: crossReferences,
            metadata: {
                error: errorMsg,
                partialResults: true
            }
        };
    }
};

} // End include guard
