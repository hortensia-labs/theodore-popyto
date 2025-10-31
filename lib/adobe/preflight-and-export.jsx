/**
 * Preflight and Export Script
 * Preflights the currently opened book and exports to PDF if no errors found
 * 
 * @author Theodore Thesis Project
 * @version 1.2
 * 
 * CHANGELOG v1.2:
 * - Fixed processState property access error (removed non-existent processState property)
 * - Simplified preflight process checking using waitForProcess() method only
 * - Enhanced result processing with better error handling for individual results
 * - Added severity checking in addition to resultType checking
 * 
 * CHANGELOG v1.1:
 * - Fixed PreflightProfiles property access error (now uses app.preflightProfiles instead of doc.PreflightProfiles)
 * - Corrected preflight process creation syntax
 * - Improved error handling for preflight operations
 * - Added better debugging output for preflight process states
 * - Enhanced string-based checking for enum values to improve compatibility
 */

//> Configuration and Constants
var CONFIG = {
    PDF_PRESET_NAME: "[Press Quality]",
    EXPORT_FOLDER_NAME: "export",
    PDF_EXTENSION: ".pdf"
};

/**
 *~ Main execution function - orchestrates preflight and export process
 * @returns {string} Result message indicating success or failure
 */
function main() {
    //> Preliminary Actions
    
    //: Validate InDesign environment
    if (!app.books.length) {
        var errorMsg = "No InDesign book is currently open. Please open a book document first.";
        alert(errorMsg);
        return "ERROR: " + errorMsg;
    }

    var book = app.books[0];
    
    try {
        $.writeln("=== Preflight and Export Started ===");
        $.writeln("Book: " + book.name);
        $.writeln("Total documents in book: " + book.bookContents.length);
        
        //> Phase 1: Preflight Check
        $.writeln("\n=== PHASE 1: PREFLIGHT CHECK ===");
        var preflightResult = performBookPreflight(book);
        
        if (!preflightResult.success) {
            var errorMsg = "Preflight errors found. Please resolve them before exporting.";
            alert(errorMsg + "\n\nErrors:\n" + preflightResult.errorSummary);
            $.writeln("Export cancelled due to preflight errors.");
            return "PREFLIGHT_ERRORS: " + preflightResult.errorSummary;
        }
        
        $.writeln("Preflight passed: No errors found");
        
        //> Phase 2: PDF Export
        $.writeln("\n=== PHASE 2: PDF EXPORT ===");
        var exportResult = exportBookToPDF(book);
        
        if (exportResult.success) {
            $.writeln("=== Export Complete ===");
            $.writeln("PDF exported to: " + exportResult.outputPath);
            return "SUCCESS: PDF exported to " + exportResult.outputPath;
        } else {
            var errorMsg = "Export failed: " + exportResult.error;
            alert(errorMsg);
            return "ERROR: " + errorMsg;
        }
        
    } catch (error) {
        var errorMsg = "Fatal error during preflight and export: " + error.message;
        $.writeln("Fatal error: " + error.message);
        alert(errorMsg);
        return "ERROR: " + errorMsg;
    }
}

/**
 *~ Performs comprehensive preflight check on the book
 * @param {Book} book - The InDesign book to preflight
 * @returns {Object} Preflight result object with success status and error details
 */
function performBookPreflight(book) {
    var result = {
        success: false,
        errorCount: 0,
        errorSummary: "",
        errors: []
    };
    
    try {
        $.writeln("  Starting preflight check...");
        
        //: Open all documents in the book for preflight
        var openedDocs = [];
        for (var i = 0; i < book.bookContents.length; i++) {
            var bookContent = book.bookContents[i];
            
            try {
                //: Open document if needed
                var doc = getOrOpenDocument(bookContent);
                if (doc) {
                    openedDocs.push({
                        document: doc,
                        name: bookContent.name
                    });
                    $.writeln("    Opened for preflight: " + bookContent.name);
                } else {
                    result.errors.push("Could not open document: " + bookContent.name);
                    $.writeln("    Warning: Could not open " + bookContent.name);
                }
            } catch (openError) {
                result.errors.push("Error opening " + bookContent.name + ": " + openError.message);
                $.writeln("    Error opening " + bookContent.name + ": " + openError.message);
            }
        }
        
        $.writeln("  Documents opened: " + openedDocs.length + " of " + book.bookContents.length);
        
        //: Perform preflight on each document
        var totalErrors = 0;
        for (var d = 0; d < openedDocs.length; d++) {
            var docInfo = openedDocs[d];
            var doc = docInfo.document;
            
            $.writeln("    Preflighting: " + docInfo.name);
            
            try {
                //: Run preflight on document
                var docResult = preflightSingleDocument(doc, docInfo.name);
                totalErrors += docResult.errorCount;
                
                if (docResult.errorCount > 0) {
                    result.errors = result.errors.concat(docResult.errors);
                    $.writeln("      Errors found: " + docResult.errorCount);
                } else {
                    $.writeln("      No errors found");
                }
                
            } catch (preflightError) {
                var errorMsg = "Preflight failed for " + docInfo.name + ": " + preflightError.message;
                result.errors.push(errorMsg);
                $.writeln("      Error: " + errorMsg);
                totalErrors++;
            }
        }
        
        //: Compile results
        result.errorCount = totalErrors;
        result.success = (totalErrors === 0);
        
        if (result.errors.length > 0) {
            result.errorSummary = result.errors.join("\n");
        }
        
        $.writeln("\n  Preflight Results:");
        $.writeln("    Documents checked: " + openedDocs.length);
        $.writeln("    Total errors: " + totalErrors);
        $.writeln("    Status: " + (result.success ? "PASSED" : "FAILED"));
        
    } catch (error) {
        result.errors.push("Fatal preflight error: " + error.message);
        result.errorSummary = "Fatal preflight error: " + error.message;
        $.writeln("  Fatal preflight error: " + error.message);
    }
    
    return result;
}

/**
 *~ Performs preflight check on a single document
 * @param {Document} doc - The InDesign document to preflight
 * @param {string} documentName - Name of the document for error reporting
 * @returns {Object} Document preflight result
 */
function preflightSingleDocument(doc, documentName) {
    var result = {
        errorCount: 0,
        errors: []
    };
    
    try {
        //: Get a preflight profile from the application
        var preflightProfile = null;
        if (app.preflightProfiles.length > 0) {
            preflightProfile = app.preflightProfiles.firstItem();
            $.writeln("        Using preflight profile: " + preflightProfile.name);
        } else {
            $.writeln("        No preflight profiles available, using basic preflight");
        }
        
        //: Run preflight process
        var preflightProcess = app.preflightProcesses.add(doc, preflightProfile);
        // Note: The profile is already set when creating the process
        
        //: Wait for preflight to complete
        $.writeln("        Waiting for preflight process to complete...");
        try {
            preflightProcess.waitForProcess();
            $.writeln("        Preflight process completed");
        } catch (waitError) {
            $.writeln("        Error waiting for preflight process: " + waitError.message);
            result.errorCount++;
            result.errors.push(documentName + ": Failed to wait for preflight process - " + waitError.message);
            return result;
        }
        
        //: Check results
        var processResults = preflightProcess.aggregatedResults[2];

        if (processResults.length > 0) {
            result.errorCount++;
            result.errors.push(documentName + ": Has preflight issues, check the preflight report for details");
        } else {
            $.writeln("        No preflight issues found");
        };

        preflightProcess.remove();
        
    } catch (error) {
        result.errorCount++;
        result.errors.push(documentName + ": Preflight error - " + error.message);
        $.writeln("        Preflight error: " + error.message);
    }
    
    $.writeln("        Preflight result: " + result.errorCount + " errors: " + result.errors.join("\n"));
    return result;
}

/**
 *~ Exports the book to PDF using PressQuality preset
 * @param {Book} book - The InDesign book to export
 * @returns {Object} Export result object with success status and output path
 */
function exportBookToPDF(book) {
    var result = {
        success: false,
        outputPath: "",
        error: ""
    };
    
    try {
        //: Determine output path
        var bookFile = File(book.fullName);
        var bookFolder = bookFile.parent;
        var exportFolder = new Folder(bookFolder.fsName + "/" + CONFIG.EXPORT_FOLDER_NAME);
        
        //: Create export folder if it doesn't exist
        if (!exportFolder.exists) {
            exportFolder.create();
            $.writeln("  Created export folder: " + exportFolder.fsName);
        }
        
        //: Determine output filename
        var bookBaseName = book.name.replace(/\.indb$/, "");
        var outputFile = new File(exportFolder.fsName + "/" + bookBaseName + CONFIG.PDF_EXTENSION);
        
        $.writeln("  Export target: " + outputFile.fsName);
        
        //: Validate PDF preset exists
        var pdfPreset = validatePDFPreset();
        if (!pdfPreset) {
            result.error = "PDF preset '" + CONFIG.PDF_PRESET_NAME + "' not found";
            return result;
        }
        
        $.writeln("  Using PDF preset: " + pdfPreset.name);
        
        //: Configure export preferences
        configurePDFExportPreferences(pdfPreset);
        
        //: Export the book to PDF
        $.writeln("  Exporting book to PDF...");
        book.exportFile(ExportFormat.PDF_TYPE, outputFile);
        
        //: Verify export success
        if (outputFile.exists) {
            result.success = true;
            result.outputPath = outputFile.fsName;
            $.writeln("  Export successful: " + outputFile.fsName);
        } else {
            result.error = "Export completed but file not found at expected location";
        }
        
    } catch (error) {
        result.error = "Export failed: " + error.message;
        $.writeln("  Export error: " + error.message);
    }
    
    return result;
}

/**
 *~ Gets an already open document or opens it if needed
 * @param {BookContent} bookContent - The book content item
 * @returns {Document|null} The document object or null if failed
 */
function getOrOpenDocument(bookContent) {
    try {
        var documentName = bookContent.name.replace(/\.indd$/, "");
        
        //: Check if document is already open
        for (var d = 0; d < app.documents.length; d++) {
            if (app.documents[d].name.indexOf(documentName) >= 0) {
                return app.documents[d];
            }
        }
        
        //: Open the document
        return app.open(File(bookContent.fullName));
        
    } catch (error) {
        $.writeln("      Error opening document: " + error.message);
        return null;
    }
}

/**
 *~ Validates that the required PDF preset exists
 * @returns {PDFExportPreset|null} PDF preset object or null if not found
 */
function validatePDFPreset() {
    try {
        //: Try to find the preset by name
        var preset = app.pdfExportPresets.itemByName(CONFIG.PDF_PRESET_NAME);
        
        if (preset.isValid) {
            return preset;
        }
        
        //: If not found, list available presets for debugging
        $.writeln("  Available PDF presets:");
        for (var i = 0; i < app.pdfExportPresets.length; i++) {
            $.writeln("    " + (i + 1) + ". " + app.pdfExportPresets[i].name);
        }
        
        return null;
        
    } catch (error) {
        $.writeln("  Error validating PDF preset: " + error.message);
        return null;
    }
}

/**
 *~ Configures PDF export preferences for optimal quality
 * @param {PDFExportPreset} pdfPreset - The PDF preset to use
 */
function configurePDFExportPreferences(pdfPreset) {
    try {
        $.writeln("  Configuring PDF export preferences...");
        
        //: Apply the preset to current export preferences
        app.pdfExportPreferences.appliedPreset = pdfPreset;
        
        //: Additional quality settings
        app.pdfExportPreferences.exportRange = ExportRangeOrAllPages.EXPORT_ALL;
        app.pdfExportPreferences.acrobatCompatibility = AcrobatCompatibility.ACROBAT_8;
        app.pdfExportPreferences.exportLayers = false;
        app.pdfExportPreferences.includeBookmarks = true;
        app.pdfExportPreferences.includeHyperlinks = true;
        app.pdfExportPreferences.includeICCProfiles = ICCProfiles.INCLUDE_ALL;
        
        $.writeln("    Export range: All pages");
        $.writeln("    Acrobat compatibility: " + app.pdfExportPreferences.acrobatCompatibility);
        $.writeln("    Include bookmarks: " + app.pdfExportPreferences.includeBookmarks);
        $.writeln("    Include hyperlinks: " + app.pdfExportPreferences.includeHyperlinks);
        
    } catch (error) {
        $.writeln("  Warning: Could not configure all PDF preferences: " + error.message);
    }
}

//> Main Execution
var result = main();
$.writeln("\nScript result: " + result);
