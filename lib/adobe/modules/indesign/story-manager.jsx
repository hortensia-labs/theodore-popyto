/*
 * InDesign Story Management Module
 * Handles story checkout/checkin for safe content modification
 * Compatible with ECMAScript 3 (ExtendScript)
 */

if (typeof StoryManager === "undefined") {

/**
 * StoryManager - Centralized story operations for safe content editing
 * 
 * @purpose Provides safe story checkout/checkin with automatic cleanup and logging
 * @context Used by any script that modifies text content (cross-reference, find/replace, etc.)
 * @dependencies None (uses native InDesign API)
 */
function StoryManager() {}

/**
 * Checks out stories for editing with comprehensive tracking and cleanup
 * 
 * @purpose Safely checks out stories for text modification with automatic error recovery
 * @param {Array} stories - Array of Story objects that need to be checked out
 * @param {string} purpose - Description of why stories are being checked out (for logging)
 * @param {Logger} log - Logger instance for detailed operation tracking
 * @returns {Object} {success: boolean, checkedOutStories: Array, errors: Array, metadata: Object}
 * @context Called before any text modification operations to ensure content is editable
 * @example
 *   var stories = [sourceText.parentStory, destText.parentStory];
 *   var checkoutResult = StoryManager.checkoutStories(stories, "cross-reference conversion", log);
 *   if (checkoutResult.success) {
 *     // Perform modifications
 *     StoryManager.checkinStories(checkoutResult.checkedOutStories, log);
 *   }
 * @errors Returns detailed error information for failed checkouts, continues with successful ones
 */
StoryManager.checkoutStories = function(stories, purpose, log) {
    var checkedOutStories = [];
    var errors = [];
    var skippedCount = 0;
    var alreadyUnlockedCount = 0;

    try {
        if (!stories || stories.length === 0) {
            if (log) log.debug("No stories provided for checkout");
            return {
                success: true,
                checkedOutStories: [],
                errors: [],
                metadata: {
                    totalStories: 0,
                    checkedOut: 0,
                    errors: 0,
                    skipped: 0
                }
            };
        }

        if (log) log.info("Checking out stories for " + (purpose || "content modification"), {
            totalStories: stories.length
        });

        // Remove duplicates by story ID
        var uniqueStories = StoryManager._removeDuplicateStories(stories);
        
        if (log && uniqueStories.length !== stories.length) {
            log.debug("Removed duplicate stories", {
                original: stories.length,
                unique: uniqueStories.length,
                duplicatesRemoved: stories.length - uniqueStories.length
            });
        }

        for (var i = 0; i < uniqueStories.length; i++) {
            var story = uniqueStories[i];
            
            try {
                if (!story || !story.isValid) {
                    errors.push({
                        storyId: story ? story.id : "unknown",
                        error: "Story object is not valid",
                        action: "skipped"
                    });
                    skippedCount++;
                    continue;
                }

                var storyId = story.id;
                var lockState = story.lockState;
                
                if (log) log.trace("Checking story lock state", {
                    storyId: storyId,
                    lockState: StoryManager._getLockStateName(lockState)
                });

                // Check if story is already checked out or unlocked
                if (lockState === LockStateValues.CHECKED_OUT_STORY || 
                    lockState === LockStateValues.NONE) {
                    
                    if (lockState === LockStateValues.NONE) {
                        alreadyUnlockedCount++;
                        if (log) log.trace("Story already unlocked", { storyId: storyId });
                    } else {
                        if (log) log.trace("Story already checked out", { storyId: storyId });
                    }
                    
                    // Story is already accessible, no checkout needed
                    continue;
                }

                // Attempt checkout
                if (lockState === LockStateValues.CHECKED_IN_STORY) {
                    story.checkOut();
                    checkedOutStories.push(story);
                    
                    if (log) log.debug("Story checked out successfully", {
                        storyId: storyId,
                        previousState: StoryManager._getLockStateName(lockState)
                    });
                } else {
                    errors.push({
                        storyId: storyId,
                        error: "Story is in unsupported lock state: " + StoryManager._getLockStateName(lockState),
                        lockState: lockState,
                        action: "skipped"
                    });
                    skippedCount++;
                }

            } catch (storyError) {
                var errorInfo = {
                    storyId: story ? story.id : "unknown",
                    error: storyError.message,
                    errorType: storyError.name || "Error",
                    action: "failed"
                };
                
                errors.push(errorInfo);
                
                if (log) log.warn("Story checkout failed", errorInfo);
            }
        }

        var metadata = {
            totalStories: stories.length,
            uniqueStories: uniqueStories.length,
            checkedOut: checkedOutStories.length,
            alreadyUnlocked: alreadyUnlockedCount,
            errors: errors.length,
            skipped: skippedCount,
            purpose: purpose || "unknown"
        };

        var success = errors.length === 0 || checkedOutStories.length > 0;

        if (log) {
            if (success) {
                log.info("Story checkout completed", metadata);
            } else {
                log.error("Story checkout had significant errors", metadata);
            }
        }

        return {
            success: success,
            checkedOutStories: checkedOutStories,
            errors: errors,
            metadata: metadata
        };

    } catch (error) {
        var errorMsg = "Critical error during story checkout: " + error.message;
        if (log) log.error(errorMsg, {
            errorType: error.name || "Error",
            line: error.line || null
        });

        return {
            success: false,
            checkedOutStories: checkedOutStories, // Return any that were successful
            errors: [{
                error: errorMsg,
                critical: true
            }],
            metadata: {
                totalStories: stories ? stories.length : 0,
                checkedOut: checkedOutStories.length,
                criticalError: true
            }
        };
    }
};

/**
 * Checks in stories with comprehensive error handling and validation
 * 
 * @purpose Safely checks in previously checked out stories with detailed logging
 * @param {Array} stories - Array of Story objects to check in
 * @param {Logger} log - Logger instance for operation tracking
 * @returns {Object} {success: boolean, checkedIn: number, errors: Array, metadata: Object}
 * @context Called after text modifications to release story locks
 * @example
 *   var checkinResult = StoryManager.checkinStories(checkedOutStories, log);
 *   if (!checkinResult.success) {
 *     log.warn("Some stories not checked in", {errors: checkinResult.errors});
 *   }
 * @errors Logs individual checkin failures, attempts to check in all stories
 */
StoryManager.checkinStories = function(stories, log) {
    var checkedInCount = 0;
    var errors = [];

    try {
        if (!stories || stories.length === 0) {
            if (log) log.debug("No stories provided for checkin");
            return {
                success: true,
                checkedIn: 0,
                errors: [],
                metadata: { totalStories: 0 }
            };
        }

        if (log) log.info("Checking in stories", { totalStories: stories.length });

        for (var i = 0; i < stories.length; i++) {
            var story = stories[i];
            
            try {
                if (!story || !story.isValid) {
                    errors.push({
                        storyId: story ? story.id : "unknown",
                        error: "Story object is not valid",
                        action: "skipped"
                    });
                    continue;
                }

                var storyId = story.id;
                var lockState = story.lockState;
                
                if (log) log.trace("Checking in story", {
                    storyId: storyId,
                    lockState: StoryManager._getLockStateName(lockState)
                });

                // Only check in if actually checked out
                if (lockState === LockStateValues.CHECKED_OUT_STORY) {
                    story.checkIn();
                    checkedInCount++;
                    
                    if (log) log.debug("Story checked in successfully", { storyId: storyId });
                } else {
                    if (log) log.trace("Story not checked out, skipping checkin", {
                        storyId: storyId,
                        lockState: StoryManager._getLockStateName(lockState)
                    });
                }

            } catch (storyError) {
                var errorInfo = {
                    storyId: story ? story.id : "unknown",
                    error: storyError.message,
                    errorType: storyError.name || "Error"
                };
                
                errors.push(errorInfo);
                
                if (log) log.warn("Story checkin failed", errorInfo);
            }
        }

        var metadata = {
            totalStories: stories.length,
            checkedIn: checkedInCount,
            errors: errors.length,
            successRate: stories.length > 0 ? (checkedInCount / stories.length * 100).toFixed(1) + "%" : "0%"
        };

        var success = errors.length === 0;

        if (log) {
            if (success) {
                log.info("Story checkin completed successfully", metadata);
            } else {
                log.warn("Story checkin completed with errors", metadata);
            }
        }

        return {
            success: success,
            checkedIn: checkedInCount,
            errors: errors,
            metadata: metadata
        };

    } catch (error) {
        var errorMsg = "Critical error during story checkin: " + error.message;
        if (log) log.error(errorMsg, {
            errorType: error.name || "Error",
            line: error.line || null
        });

        return {
            success: false,
            checkedIn: checkedInCount,
            errors: [{
                error: errorMsg,
                critical: true
            }],
            metadata: {
                totalStories: stories ? stories.length : 0,
                checkedIn: checkedInCount,
                criticalError: true
            }
        };
    }
};

/**
 * Removes duplicate stories from array based on story ID
 * 
 * @purpose Prevents duplicate checkout attempts on the same story
 * @param {Array} stories - Array of Story objects potentially containing duplicates
 * @returns {Array} Array of unique Story objects
 * @context Internal utility for checkout operations
 * @private
 */
StoryManager._removeDuplicateStories = function(stories) {
    var seen = {};
    var unique = [];

    for (var i = 0; i < stories.length; i++) {
        var story = stories[i];
        if (story && story.isValid) {
            var id = story.id;
            if (!seen[id]) {
                seen[id] = true;
                unique.push(story);
            }
        }
    }

    return unique;
};

/**
 * Gets human-readable name for InDesign lock state
 * 
 * @purpose Provides readable lock state names for logging and debugging
 * @param {number} lockState - InDesign LockStateValues enum value
 * @returns {string} Human-readable lock state name
 * @context Used in logging and error messages
 * @private
 */
StoryManager._getLockStateName = function(lockState) {
    switch (lockState) {
        case LockStateValues.NONE:
            return "NONE";
        case LockStateValues.CHECKED_IN_STORY:
            return "CHECKED_IN_STORY";
        case LockStateValues.CHECKED_OUT_STORY:
            return "CHECKED_OUT_STORY";
        default:
            return "UNKNOWN(" + lockState + ")";
    }
};

/**
 * Gets stories that require checkout for a list of text objects
 * 
 * @purpose Identifies unique stories that need checkout before text modification
 * @param {Array} textObjects - Array of text objects (Text, TextRange, etc.)
 * @param {Logger} log - Logger instance for operation tracking
 * @returns {Array} Array of unique Story objects that need checkout
 * @context Used to prepare story checkout lists before bulk text operations
 * @example
 *   var textObjects = [hyperlink.source.sourceText, destination.destinationText];
 *   var stories = StoryManager.getStoriesForTextObjects(textObjects, log);
 *   var checkoutResult = StoryManager.checkoutStories(stories, "bulk edit", log);
 * @errors Logs issues with individual text objects, continues processing others
 */
StoryManager.getStoriesForTextObjects = function(textObjects, log) {
    var stories = [];

    try {
        if (!textObjects || textObjects.length === 0) {
            if (log) log.debug("No text objects provided for story extraction");
            return [];
        }

        if (log) log.debug("Extracting stories from text objects", {
            textObjects: textObjects.length
        });

        for (var i = 0; i < textObjects.length; i++) {
            var textObj = textObjects[i];
            
            try {
                if (!textObj || !textObj.isValid) {
                    if (log) log.trace("Skipping invalid text object", { index: i });
                    continue;
                }

                var story = textObj.parentStory;
                if (story && story.isValid) {
                    stories.push(story);
                    if (log) log.trace("Extracted story from text object", {
                        index: i,
                        storyId: story.id
                    });
                } else {
                    if (log) log.trace("Text object has no valid parent story", { index: i });
                }

            } catch (extractError) {
                if (log) log.warn("Failed to extract story from text object", {
                    index: i,
                    error: extractError.message
                });
            }
        }

        // Remove duplicates
        var uniqueStories = StoryManager._removeDuplicateStories(stories);

        if (log) log.debug("Story extraction complete", {
            totalTextObjects: textObjects.length,
            storiesFound: stories.length,
            uniqueStories: uniqueStories.length
        });

        return uniqueStories;

    } catch (error) {
        if (log) log.error("Critical error extracting stories", {
            error: error.message,
            errorType: error.name || "Error"
        });
        return [];
    }
};

} // End include guard
