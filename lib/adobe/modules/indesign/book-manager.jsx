/*
 * InDesign Book Management Module
 * Provides consistent interface for book operations across all scripts
 * Compatible with ECMAScript 3 (ExtendScript)
 */

if (typeof BookManager === "undefined") {

/**
 * BookManager - Centralized book operations for all ExtendScript modules
 * 
 * @purpose Provides standardized, logged book operations with error handling
 * @context Used by cross-reference, preflight, export, and other book-level scripts
 * @dependencies None (uses native InDesign API)
 */
function BookManager() {}

/**
 * Gets the currently active book with comprehensive validation
 * 
 * @purpose Safely retrieves active book with detailed error reporting
 * @returns {Object} {success: boolean, book: Book|null, error: string|null, metadata: Object}
 * @context Called at script startup to establish book context
 * @example
 *   var result = BookManager.getActiveBook();
 *   if (result.success) {
 *     log.info("Book loaded", {name: result.book.name, documents: result.metadata.documentCount});
 *   }
 * @errors Returns success:false with detailed error message for debugging
 */
BookManager.getActiveBook = function() {
    try {
        if (!app.books || app.books.length === 0) {
            return {
                success: false,
                book: null,
                error: "No InDesign book is currently open. Please open a book document first.",
                metadata: {
                    booksOpen: 0,
                    applicationVersion: app.version
                }
            };
        }

        var book = app.books[0];
        
        // Validate book is accessible
        if (!book.isValid) {
            return {
                success: false,
                book: null,
                error: "The open book is not valid or accessible",
                metadata: {
                    booksOpen: app.books.length,
                    bookName: "unknown"
                }
            };
        }

        return {
            success: true,
            book: book,
            error: null,
            metadata: {
                bookName: book.name,
                bookPath: book.fullName,
                documentCount: book.bookContents.length,
                modified: book.modified,
                applicationVersion: app.version
            }
        };

    } catch (error) {
        return {
            success: false,
            book: null,
            error: "Failed to access book: " + error.message,
            metadata: {
                errorType: error.name || "Error",
                line: error.line || null
            }
        };
    }
};

/**
 * Gets all accessible documents in the book with status validation
 * 
 * @purpose Retrieves documents that can be safely opened and processed
 * @param {Book} book - InDesign book object to analyze
 * @param {Logger} log - Logger instance for detailed operation tracking
 * @returns {Object} {success: boolean, documents: Array, inaccessible: Array, metadata: Object}
 * @context Used before bulk document operations to avoid processing failures
 * @example
 *   var docResult = BookManager.getAccessibleDocuments(book, log);
 *   log.info("Document analysis", {accessible: docResult.documents.length, blocked: docResult.inaccessible.length});
 * @errors Logs individual document access failures, continues processing others
 */
BookManager.getAccessibleDocuments = function(book, log) {
    var accessibleDocs = [];
    var inaccessibleDocs = [];
    var totalDocs = 0;

    try {
        if (!book || !book.bookContents) {
            if (log) log.error("Invalid book object provided to getAccessibleDocuments");
            return {
                success: false,
                documents: [],
                inaccessible: [],
                metadata: { error: "Invalid book object" }
            };
        }

        totalDocs = book.bookContents.length;
        if (log) log.debug("Analyzing book documents", { totalDocuments: totalDocs });

        for (var i = 0; i < book.bookContents.length; i++) {
            var bookContent = book.bookContents[i];
            
            try {
                // Basic accessibility checks
                if (!bookContent.isValid) {
                    inaccessibleDocs.push({
                        name: bookContent.name || "unknown",
                        reason: "BookContent object is not valid",
                        index: i
                    });
                    continue;
                }

                if (!bookContent.fullName || bookContent.fullName === "") {
                    inaccessibleDocs.push({
                        name: bookContent.name || "unknown",
                        reason: "No file path available",
                        index: i
                    });
                    continue;
                }

                // Check if file exists (basic test)
                var file = new File(bookContent.fullName);
                if (!file.exists) {
                    inaccessibleDocs.push({
                        name: bookContent.name,
                        reason: "File does not exist at path: " + bookContent.fullName,
                        index: i
                    });
                    continue;
                }

                // Document appears accessible
                accessibleDocs.push(bookContent);
                
                if (log) log.trace("Document accessible", {
                    name: bookContent.name,
                    path: bookContent.fullName,
                    index: i
                });

            } catch (docError) {
                inaccessibleDocs.push({
                    name: bookContent.name || "unknown",
                    reason: "Error checking accessibility: " + docError.message,
                    index: i,
                    error: docError.name || "Error"
                });
                
                if (log) log.warn("Document accessibility check failed", {
                    name: bookContent.name || "unknown",
                    index: i,
                    error: docError.message
                });
            }
        }

        var result = {
            success: true,
            documents: accessibleDocs,
            inaccessible: inaccessibleDocs,
            metadata: {
                totalDocuments: totalDocs,
                accessibleCount: accessibleDocs.length,
                inaccessibleCount: inaccessibleDocs.length,
                accessibilityRate: totalDocs > 0 ? (accessibleDocs.length / totalDocs * 100).toFixed(1) + "%" : "0%"
            }
        };

        if (log) {
            log.info("Document accessibility analysis complete", result.metadata);
            
            if (inaccessibleDocs.length > 0) {
                log.warn("Some documents are inaccessible", {
                    inaccessibleCount: inaccessibleDocs.length,
                    details: inaccessibleDocs
                });
            }
        }

        return result;

    } catch (error) {
        if (log) log.error("Failed to analyze document accessibility", {
            error: error.message,
            errorType: error.name || "Error"
        });

        return {
            success: false,
            documents: accessibleDocs, // Return what we found
            inaccessible: inaccessibleDocs,
            metadata: {
                error: error.message,
                partialResults: true,
                accessibleCount: accessibleDocs.length,
                inaccessibleCount: inaccessibleDocs.length
            }
        };
    }
};

/**
 * Opens a document safely with comprehensive error handling and logging
 * 
 * @purpose Safely opens book documents with detailed status tracking
 * @param {BookContent} bookContent - Book content item to open
 * @param {Logger} log - Logger instance for operation tracking
 * @returns {Object} {success: boolean, document: Document|null, wasAlreadyOpen: boolean, error: string|null}
 * @context Used when documents need to be opened for processing operations
 * @example
 *   var openResult = BookManager.openDocument(bookContent, log);
 *   if (openResult.success) {
 *     processDocument(openResult.document);
 *   }
 * @errors Logs opening failures with detailed context, returns null document on failure
 */
BookManager.openDocument = function(bookContent, log) {
    try {
        if (!bookContent || !bookContent.isValid) {
            var error = "Invalid BookContent object provided";
            if (log) log.error(error, { bookContent: bookContent });
            return {
                success: false,
                document: null,
                wasAlreadyOpen: false,
                error: error
            };
        }

        var documentName = bookContent.name.replace(/\.indd$/, "");
        
        if (log) log.debug("Attempting to open document", {
            name: documentName,
            path: bookContent.fullName
        });

        // Check if document is already open
        for (var d = 0; d < app.documents.length; d++) {
            var openDoc = app.documents[d];
            if (openDoc.name.indexOf(documentName) >= 0) {
                if (log) log.debug("Document already open", {
                    name: openDoc.name,
                    requestedName: documentName
                });
                return {
                    success: true,
                    document: openDoc,
                    wasAlreadyOpen: true,
                    error: null
                };
            }
        }

        // Open the document
        if (log) log.debug("Opening document", { path: bookContent.fullName });
        var document = app.open(File(bookContent.fullName));

        if (!document || !document.isValid) {
            var error = "Document opened but is not valid";
            if (log) log.error(error, { name: documentName });
            return {
                success: false,
                document: null,
                wasAlreadyOpen: false,
                error: error
            };
        }

        if (log) log.info("Document opened successfully", {
            name: document.name,
            path: document.fullName,
            stories: document.stories.length,
            pages: document.pages.length
        });

        return {
            success: true,
            document: document,
            wasAlreadyOpen: false,
            error: null
        };

    } catch (error) {
        var errorMsg = "Failed to open document: " + error.message;
        if (log) log.error(errorMsg, {
            name: bookContent ? bookContent.name : "unknown",
            path: bookContent ? bookContent.fullName : "unknown",
            errorType: error.name || "Error",
            line: error.line || null
        });

        return {
            success: false,
            document: null,
            wasAlreadyOpen: false,
            error: errorMsg
        };
    }
};

/**
 * Closes a document safely with validation
 * 
 * @purpose Safely closes documents with error handling
 * @param {Document} document - InDesign document to close
 * @param {boolean} saveChanges - Whether to save changes before closing
 * @param {Logger} log - Logger instance for operation tracking
 * @returns {Object} {success: boolean, error: string|null}
 * @context Used after document processing to clean up resources
 * @example
 *   var closeResult = BookManager.closeDocument(doc, false, log);
 *   if (!closeResult.success) log.warn("Document close failed", {error: closeResult.error});
 * @errors Logs closing failures but continues execution
 */
BookManager.closeDocument = function(document, saveChanges, log) {
    try {
        if (!document || !document.isValid) {
            if (log) log.warn("Attempted to close invalid document");
            return { success: true, error: null }; // Not really an error
        }

        var docName = document.name;
        
        if (log) log.debug("Closing document", {
            name: docName,
            saveChanges: saveChanges || false
        });

        if (saveChanges) {
            document.save();
            if (log) log.debug("Document saved before closing", { name: docName });
        }

        document.close();
        
        if (log) log.info("Document closed successfully", { name: docName });
        
        return {
            success: true,
            error: null
        };

    } catch (error) {
        var errorMsg = "Failed to close document: " + error.message;
        if (log) log.error(errorMsg, {
            name: document ? document.name : "unknown",
            errorType: error.name || "Error"
        });

        return {
            success: false,
            error: errorMsg
        };
    }
};

} // End include guard
