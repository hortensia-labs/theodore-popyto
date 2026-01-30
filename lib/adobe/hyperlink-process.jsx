/*
 * Hyperlink URL Destination Logging Script
 * Logs all hyperlink URL destinations in the currently open InDesign document
 * Compatible with ECMAScript 3 (ExtendScript)
 */

function main() {
    try {
        $.writeln("=== HYPERLINK URL DESTINATION LOGGING ===");
        $.writeln("");

        // Get the active document
        if (app.documents.length === 0) {
            $.writeln("ERROR: No document is currently open");
            return "ERROR: No document open";
        }

        var doc = app.activeDocument;
        $.writeln("Document: " + doc.name);
        $.writeln("");

        // Get all hyperlink URL destinations
        var urlDestinations = doc.hyperlinkURLDestinations;
        var totalDestinations = urlDestinations.length;

        $.writeln("Total Hyperlink URL Destinations: " + totalDestinations);
        $.writeln("=".repeat(80));
        $.writeln("");

        if (totalDestinations === 0) {
            $.writeln("No hyperlink URL destinations found in this document.");
            return "SUCCESS: No URL destinations found";
        }

        // Iterate through all URL destinations
        for (var i = 0; i < totalDestinations; i++) {
            var destination = urlDestinations[i];

            $.writeln("Destination #" + (i + 1) + ":");
            $.writeln("  Name: " + destination.name);
            $.writeln("  URL: " + destination.destinationURL);

            // Try to get the unique key if available
            try {
                if (destination.destinationUniqueKey !== undefined) {
                    $.writeln("  Unique Key: " + destination.destinationUniqueKey);
                }
            } catch (e) {
                // Property might not be available in all versions
            }

            // Check if this destination is referenced by any hyperlinks
            var hyperlinks = doc.hyperlinks;
            var referencingLinks = [];

            for (var h = 0; h < hyperlinks.length; h++) {
                var link = hyperlinks[h];
                try {
                    // Check if this hyperlink's destination matches our URL destination
                    if (link.destination && link.destination.id === destination.id) {
                        referencingLinks.push(link.name);
                    }
                } catch (e) {
                    // Skip if we can't access the link's destination
                }
            }

            if (referencingLinks.length > 0) {
                $.writeln("  Referenced by " + referencingLinks.length + " hyperlink(s):");
                for (var r = 0; r < referencingLinks.length; r++) {
                    $.writeln("    - " + referencingLinks[r]);
                }
            } else {
                $.writeln("  Referenced by: (none - orphaned destination)");
            }

            $.writeln("");
        }

        $.writeln("=".repeat(80));
        $.writeln("");

        // Log all hyperlink objects
        $.writeln("=== HYPERLINK OBJECTS ===");
        $.writeln("");

        var hyperlinks = doc.hyperlinks;
        var totalHyperlinks = hyperlinks.length;

        $.writeln("Total Hyperlinks: " + totalHyperlinks);
        $.writeln("=".repeat(80));
        $.writeln("");

        if (totalHyperlinks === 0) {
            $.writeln("No hyperlinks found in this document.");
        } else {
            for (var h = 0; h < totalHyperlinks; h++) {
                var link = hyperlinks[h];

                $.writeln("Hyperlink #" + (h + 1) + ":");
                $.writeln("  Name: " + link.name);

                // Get hyperlink source information
                try {
                    if (link.source) {
                        $.writeln("  Source Type: " + link.source.constructor.name);

                        // Try to get source text if it's a text source
                        try {
                            if (link.source.sourceText) {
                                var sourceText = link.source.sourceText.contents;
                                // Truncate long text
                                if (sourceText.length > 50) {
                                    sourceText = sourceText.substring(0, 47) + "...";
                                }
                                $.writeln("  Source Text: \"" + sourceText + "\"");
                            }
                        } catch (e) {
                            // Source might not have text
                        }
                    }
                } catch (e) {
                    $.writeln("  Source: (unable to access)");
                }

                // Get hyperlink destination information
                try {
                    if (link.destination) {
                        $.writeln("  Destination Type: " + link.destination.constructor.name);

                        // Check what type of destination and log appropriate info
                        if (link.destination.destinationURL !== undefined) {
                            $.writeln("  Destination URL: " + link.destination.destinationURL);
                        } else if (link.destination.destinationPage !== undefined) {
                            $.writeln("  Destination Page: " + link.destination.destinationPage.name);
                        } else {
                            $.writeln("  Destination Name: " + link.destination.name);
                        }
                    } else {
                        $.writeln("  Destination: (none)");
                    }
                } catch (e) {
                    $.writeln("  Destination: (unable to access)");
                }

                // Get visibility and other properties
                try {
                    $.writeln("  Visible: " + link.visible);
                    $.writeln("  Hidden: " + link.hidden);
                } catch (e) {
                    // Properties might not be available
                }

                $.writeln("");
            }
        }

        $.writeln("=".repeat(80));
        $.writeln("=== LOGGING COMPLETE ===");
        $.writeln("Total URL Destinations Logged: " + totalDestinations);
        $.writeln("Total Hyperlinks Logged: " + totalHyperlinks);

        return "SUCCESS: Logged " + totalDestinations + " URL destination(s) and " + totalHyperlinks + " hyperlink(s)";

    } catch (error) {
        $.writeln("FATAL ERROR: " + error.message);
        $.writeln("Error type: " + (error.name || "Error"));
        $.writeln("Error line: " + (error.line || "unknown"));
        return "FATAL_ERROR: " + error.message;
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

main();