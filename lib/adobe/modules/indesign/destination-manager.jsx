/*
 * InDesign Destination Management Module
 * Handles HyperlinkTextDestination and ParagraphDestination operations
 * Compatible with ECMAScript 3 (ExtendScript)
 */

if (typeof DestinationManager === "undefined") {

/**
 * DestinationManager - Centralized destination operations for cross-reference processing
 * 
 * @purpose Provides standardized destination discovery, creation, and conversion operations
 * @context Used by cross-reference processing and any script working with InDesign destinations
 * @dependencies None (uses native InDesign API)
 */
function DestinationManager() {}

/**
 * Discovers all markdown destinations in a document (names starting with #)
 * 
 * @purpose Finds all HyperlinkTextDestination objects that represent markdown anchors
 * @param {Document} doc - InDesign document to scan for destinations
 * @param {Logger} log - Logger instance for detailed operation tracking
 * @returns {Object} {success: boolean, destinations: Array, metadata: Object, errors: Array}
 * @context Called during discovery phase to identify conversion targets
 * @example
 *   var result = DestinationManager.discoverMarkdownDestinations(doc, log);
 *   log.info("Found destinations", {count: result.destinations.length});
 * @errors Logs individual destination access failures, continues processing others
 */
DestinationManager.discoverMarkdownDestinations = function(doc, log) {
    var markdownDestinations = [];
    var errors = [];
    var totalDestinations = 0;

    try {
        if (!doc || !doc.isValid) {
            var error = "Invalid document provided to discoverMarkdownDestinations";
            if (log) log.error(error);
            return {
                success: false,
                destinations: [],
                metadata: { error: error },
                errors: [{ error: error, critical: true }]
            };
        }

        var destinations = doc.hyperlinkTextDestinations;
        totalDestinations = destinations.length;

        if (log) log.debug("Scanning destinations for markdown anchors", {
            document: doc.name,
            totalDestinations: totalDestinations
        });

        for (var d = 0; d < destinations.length; d++) {
            var dest = destinations[d];
            
            try {
                if (!dest || !dest.isValid) {
                    errors.push({
                        index: d,
                        error: "Destination object is not valid",
                        action: "skipped"
                    });
                    continue;
                }

                var destName = dest.name;
                
                // Check if this is a markdown destination (starts with #)
                if (destName.indexOf("#") === 0) {
                    var anchorId = destName.substring(1);
                    
                    // Get paragraph information for context
                    var paragraphInfo = DestinationManager._getDestinationParagraphInfo(dest, log);
                    
                    var destInfo = {
                        destination: dest,
                        rawAnchorId: anchorId,
                        cleanAnchorId: DestinationManager._cleanAnchorName(anchorId),
                        destName: destName,
                        index: d,
                        paragraph: paragraphInfo.paragraph,
                        paragraphText: paragraphInfo.text,
                        paragraphStyle: paragraphInfo.styleName,
                        isValid: paragraphInfo.isValid
                    };
                    
                    markdownDestinations.push(destInfo);
                    
                    if (log) log.trace("Found markdown destination", {
                        name: destName,
                        cleanAnchorId: destInfo.cleanAnchorId,
                        paragraphPreview: paragraphInfo.text.substring(0, 50) + "...",
                        style: paragraphInfo.styleName
                    });
                } else {
                    if (log) log.trace("Skipping non-markdown destination", {
                        name: destName,
                        index: d
                    });
                }

            } catch (destError) {
                var errorInfo = {
                    index: d,
                    destName: dest ? dest.name : "unknown",
                    error: destError.message,
                    errorType: destError.name || "Error"
                };
                
                errors.push(errorInfo);
                
                if (log) log.warn("Error processing destination", errorInfo);
            }
        }

        var metadata = {
            document: doc.name,
            totalDestinations: totalDestinations,
            markdownDestinations: markdownDestinations.length,
            errors: errors.length,
            discoveryRate: totalDestinations > 0 ? (markdownDestinations.length / totalDestinations * 100).toFixed(1) + "%" : "0%"
        };

        if (log) {
            log.info("Markdown destination discovery complete", metadata);
            
            if (errors.length > 0) {
                log.warn("Some destinations had errors during discovery", {
                    errorCount: errors.length
                });
            }
        }

        return {
            success: true,
            destinations: markdownDestinations,
            metadata: metadata,
            errors: errors
        };

    } catch (error) {
        var errorMsg = "Critical error during destination discovery: " + error.message;
        if (log) log.error(errorMsg, {
            document: doc ? doc.name : "unknown",
            errorType: error.name || "Error",
            line: error.line || null
        });

        return {
            success: false,
            destinations: markdownDestinations, // Return partial results
            metadata: {
                error: errorMsg,
                partialResults: true,
                markdownDestinations: markdownDestinations.length
            },
            errors: [{
                error: errorMsg,
                critical: true
            }]
        };
    }
};

/**
 * Converts HyperlinkTextDestination to ParagraphDestination with qualified naming
 * 
 * @purpose Creates professional cross-reference destinations from markdown anchors
 * @param {Document} doc - InDesign document containing the destination
 * @param {Object} destItem - Destination item with destination, paragraph, and anchor info
 * @param {string} documentName - Current document name for qualified naming (document:anchor)
 * @param {Logger} log - Logger instance for detailed operation tracking
 * @returns {Object} {success: boolean, paragraphDestination: ParagraphDestination, qualifiedName: string, error: string}
 * @context Called during destination conversion phase with proper story management
 * @example
 *   var result = DestinationManager.convertToParagraphDestination(doc, destItem, "2-seccion-1", log);
 *   if (result.success) {
 *     log.info("Destination converted", {name: result.qualifiedName});
 *   }
 * @errors Returns detailed error information for troubleshooting conversion failures
 */
DestinationManager.convertToParagraphDestination = function(doc, destItem, documentName, log) {
    try {
        if (!doc || !doc.isValid) {
            var error = "Invalid document provided for destination conversion";
            if (log) log.error(error);
            return { success: false, error: error };
        }

        if (!destItem || !destItem.destination || !destItem.paragraph) {
            var error = "Invalid destination item provided for conversion";
            if (log) log.error(error, { destItem: destItem });
            return { success: false, error: error };
        }

        var cleanAnchorId = destItem.cleanAnchorId || DestinationManager._cleanAnchorName(destItem.rawAnchorId);
        var qualifiedName = documentName + ":" + cleanAnchorId;
        
        if (log) log.debug("Converting destination to ParagraphDestination", {
            rawAnchorId: destItem.rawAnchorId,
            cleanAnchorId: cleanAnchorId,
            qualifiedName: qualifiedName,
            targetParagraph: destItem.paragraphText.substring(0, 50) + "..."
        });

        // Generate unique key for the destination
        var uniqueKey = new Date().getTime() + Math.floor(Math.random() * 1000);
        
        // Create new ParagraphDestination
        var newParagraphDest = doc.paragraphDestinations.add({
            name: qualifiedName,
            destinationText: destItem.paragraph,
            destinationUniqueKey: uniqueKey,
            hidden: false
        });

        if (!newParagraphDest || !newParagraphDest.isValid) {
            var error = "Created ParagraphDestination is not valid";
            if (log) log.error(error, { qualifiedName: qualifiedName });
            return { success: false, error: error };
        }

        if (log) log.info("ParagraphDestination created successfully", {
            qualifiedName: qualifiedName,
            uniqueKey: uniqueKey,
            targetText: destItem.paragraphText.substring(0, 40) + "...",
            targetStyle: destItem.paragraphStyle
        });

        return {
            success: true,
            paragraphDestination: newParagraphDest,
            qualifiedName: qualifiedName,
            uniqueKey: uniqueKey,
            error: null
        };

    } catch (error) {
        var errorMsg = "Failed to convert destination: " + error.message;
        if (log) log.error(errorMsg, {
            rawAnchorId: destItem ? destItem.rawAnchorId : "unknown",
            cleanAnchorId: destItem ? destItem.cleanAnchorId : "unknown",
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
 * Validates paragraph destination accessibility and content
 * 
 * @purpose Ensures paragraph destinations are properly created and accessible
 * @param {ParagraphDestination} paragraphDest - ParagraphDestination to validate
 * @param {Logger} log - Logger instance for validation tracking
 * @returns {Object} {success: boolean, validation: Object, errors: Array}
 * @context Called after destination creation to ensure quality
 * @example
 *   var validation = DestinationManager.validateParagraphDestination(newDest, log);
 *   if (!validation.success) log.warn("Destination validation failed");
 * @errors Logs validation failures with detailed diagnostic information
 */
DestinationManager.validateParagraphDestination = function(paragraphDest, log) {
    var validation = {
        isValid: false,
        hasDestinationText: false,
        hasName: false,
        hasUniqueKey: false,
        isHidden: null,
        destinationTextLength: 0
    };
    var errors = [];

    try {
        if (!paragraphDest) {
            errors.push({ error: "ParagraphDestination is null" });
            if (log) log.error("Validation failed: null destination");
            return { success: false, validation: validation, errors: errors };
        }

        // Basic validity check
        validation.isValid = paragraphDest.isValid;
        if (!validation.isValid) {
            errors.push({ error: "ParagraphDestination.isValid is false" });
        }

        // Check destination text
        try {
            var destText = paragraphDest.destinationText;
            validation.hasDestinationText = destText && destText.isValid;
            if (validation.hasDestinationText) {
                validation.destinationTextLength = destText.length;
            } else {
                errors.push({ error: "destinationText is missing or invalid" });
            }
        } catch (textError) {
            errors.push({ error: "Error accessing destinationText: " + textError.message });
        }

        // Check name
        try {
            var name = paragraphDest.name;
            validation.hasName = name && name.length > 0;
            if (!validation.hasName) {
                errors.push({ error: "Destination name is missing or empty" });
            }
        } catch (nameError) {
            errors.push({ error: "Error accessing name: " + nameError.message });
        }

        // Check unique key
        try {
            var uniqueKey = paragraphDest.destinationUniqueKey;
            validation.hasUniqueKey = uniqueKey !== null && uniqueKey !== undefined;
            if (!validation.hasUniqueKey) {
                errors.push({ error: "destinationUniqueKey is missing" });
            }
        } catch (keyError) {
            errors.push({ error: "Error accessing destinationUniqueKey: " + keyError.message });
        }

        // Check hidden property
        try {
            validation.isHidden = paragraphDest.hidden;
        } catch (hiddenError) {
            errors.push({ error: "Error accessing hidden property: " + hiddenError.message });
        }

        var success = errors.length === 0 && validation.isValid && validation.hasDestinationText && validation.hasName;

        if (log) {
            if (success) {
                log.debug("ParagraphDestination validation passed", validation);
            } else {
                log.warn("ParagraphDestination validation failed", {
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
        var errorMsg = "Critical error during destination validation: " + error.message;
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
 * Gets paragraph information from a HyperlinkTextDestination
 * 
 * @purpose Extracts paragraph content and metadata from destination
 * @param {HyperlinkTextDestination} dest - Destination to analyze
 * @param {Logger} log - Logger instance for operation tracking
 * @returns {Object} {paragraph: Paragraph, text: string, styleName: string, isValid: boolean}
 * @context Internal utility for destination analysis
 * @private
 */
DestinationManager._getDestinationParagraphInfo = function(dest, log) {
    var result = {
        paragraph: null,
        text: "",
        styleName: "unknown",
        isValid: false
    };

    try {
        if (!dest || !dest.isValid) {
            return result;
        }

        var destText = dest.destinationText;
        if (!destText || !destText.isValid) {
            return result;
        }

        var paragraph = destText.paragraphs[0];
        if (!paragraph || !paragraph.isValid) {
            return result;
        }

        result.paragraph = paragraph;
        result.text = paragraph.contents || "";
        result.isValid = true;

        // Get paragraph style name safely
        try {
            var appliedStyle = paragraph.appliedParagraphStyle;
            if (appliedStyle && appliedStyle.isValid) {
                result.styleName = appliedStyle.name || "unknown";
            }
        } catch (styleError) {
            if (log) log.trace("Could not get paragraph style", {
                error: styleError.message
            });
        }

        return result;

    } catch (error) {
        if (log) log.trace("Error getting destination paragraph info", {
            error: error.message
        });
        return result;
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
 *   var clean = DestinationManager._cleanAnchorName("paradigms 1"); // Returns "paradigms"
 */
DestinationManager._cleanAnchorName = function(anchorName) {
    if (typeof anchorName !== "string") {
        return String(anchorName || "");
    }
    
    // Remove InDesign's auto-generated numeric suffixes
    return anchorName.replace(/\s+\d+$/, "");
};

/**
 * Gets all paragraph destinations in a document with filtering options
 * 
 * @purpose Retrieves existing paragraph destinations for analysis or cleanup
 * @param {Document} doc - InDesign document to scan
 * @param {Object} filter - Optional filter criteria {namePrefix: string, includeHidden: boolean}
 * @param {Logger} log - Logger instance for operation tracking
 * @returns {Object} {success: boolean, destinations: Array, metadata: Object}
 * @context Used for integrity checking and destination management
 * @example
 *   var result = DestinationManager.getParagraphDestinations(doc, {namePrefix: "2-seccion-1:"}, log);
 *   log.info("Found destinations", {count: result.destinations.length});
 * @errors Logs access failures for individual destinations, continues processing
 */
DestinationManager.getParagraphDestinations = function(doc, filter, log) {
    var destinations = [];
    var errors = [];
    var totalDestinations = 0;

    try {
        if (!doc || !doc.isValid) {
            var error = "Invalid document provided to getParagraphDestinations";
            if (log) log.error(error);
            return {
                success: false,
                destinations: [],
                metadata: { error: error }
            };
        }

        var paragraphDests = doc.paragraphDestinations;
        totalDestinations = paragraphDests.length;
        filter = filter || {};

        if (log) log.debug("Getting paragraph destinations", {
            document: doc.name,
            totalDestinations: totalDestinations,
            filter: filter
        });

        for (var d = 0; d < paragraphDests.length; d++) {
            var dest = paragraphDests[d];
            
            try {
                if (!dest || !dest.isValid) {
                    errors.push({
                        index: d,
                        error: "Destination is not valid"
                    });
                    continue;
                }

                var destName = dest.name;
                var isHidden = dest.hidden;

                // Apply filters
                if (filter.namePrefix && destName.indexOf(filter.namePrefix) !== 0) {
                    continue;
                }

                if (!filter.includeHidden && isHidden) {
                    continue;
                }

                var destInfo = {
                    destination: dest,
                    name: destName,
                    hidden: isHidden,
                    uniqueKey: dest.destinationUniqueKey,
                    index: d
                };

                // Add destination text info if available
                try {
                    var destText = dest.destinationText;
                    if (destText && destText.isValid) {
                        destInfo.hasDestinationText = true;
                        destInfo.destinationTextLength = destText.length;
                        
                        var paragraph = destText.paragraphs[0];
                        if (paragraph && paragraph.isValid) {
                            destInfo.paragraphText = paragraph.contents.substring(0, 100) + "...";
                        }
                    } else {
                        destInfo.hasDestinationText = false;
                    }
                } catch (textError) {
                    destInfo.hasDestinationText = false;
                    destInfo.textError = textError.message;
                }

                destinations.push(destInfo);

            } catch (destError) {
                errors.push({
                    index: d,
                    error: destError.message,
                    errorType: destError.name || "Error"
                });
            }
        }

        var metadata = {
            document: doc.name,
            totalDestinations: totalDestinations,
            filteredDestinations: destinations.length,
            errors: errors.length,
            filter: filter
        };

        if (log) log.debug("Paragraph destination retrieval complete", metadata);

        return {
            success: true,
            destinations: destinations,
            metadata: metadata
        };

    } catch (error) {
        var errorMsg = "Critical error getting paragraph destinations: " + error.message;
        if (log) log.error(errorMsg, {
            document: doc ? doc.name : "unknown",
            errorType: error.name || "Error"
        });

        return {
            success: false,
            destinations: destinations,
            metadata: {
                error: errorMsg,
                partialResults: true
            }
        };
    }
};

} // End include guard
