# Dashboard Refactor

I need you tu sue your vast expertise in software development to help me refactor the dashboard NextJS app section on URL processing to enhance user experiene as well as developer experience. Below you will find many issues I would like this refactor to tackle, please review them carefully.

## User Experience

- When navigating to the `urls/` route, we loose the previous set filters and start from an unfiltered table, I would like to keep the latest filters so that the user can go forth and back without loosing them.

- There are many statuses conflict and some that are not tracked 

## Developer Experience




## Considerations

**About the manual intervention**: if the item reaches this stage, we must provide the user with the chance to manually create a Zotero item from our UI, and this should be done similarly as the LLM extraction UI, where we present the user with the content of the url, although in this case we should present the real content behind the url not what we parsed from either the pdf or the web page etc., as happens in the LLM extraction UI. Moreover I also think we should provide a way to the user to add the item manually in any stage, like for example if it just unlinks an url from a Zotero item (linked via processing), and wants to create its custom Zotero item, or even when the user directly wants an url to be have its own custom made Zotero item and bypass all processing.

**About the first processing stage**: When an item is first processed by Zotero (the first stage) and it fails, we should automatically attempt the second stage, which implies attempting to parse the contents of the url, search for identifiers, and provide the user with a list of identifiers to choose for processing. The point is not to bother the user with this possibility when it is not so much effort for the system to perform it automatically when something fails with Zotero in the stage 1 of processing.

**Edition of the linked Zotero item**: if a Zotero item linked via processing has incomplete bibliographic metdata (as we mark in the appropriate status), we should provide the user with the chance to edit the missing items (at least the critical fields title, authors, and date).

**About developer experience**: We should make the code as modular as possible, the current 'URLTable' holds a lot or responsibility that could be properly delegated to other components. There are also many functional code that could be reused and is currently duplicated.

**On the Local Environment**: This dashboard is meant to run locally on the user's machine, so I think staying away of API routes would be preferred as they pose many issues in debugging and running code as well as in type safety.

## Questions for Robustness

1. Processing Strategy
    - The methods on identifiers and web translation are different, and they come set from the url analysis made via Zotero. What we can automate is our second and third stage: Zotero processing fails (identifier or web translation), we directly jump into content processing and provide a list of identifiers found or a failure when none found. The user then has the choice to further process with any of the new identifiers found, or its own custom identifiers if set. In this stage the other thing the user can do is go for the LLM Extraction or manually creating a custom Zotero Item.
    - Exhausted would be set when the Zotero processing has failed once, content processing didn't found any identifiers, LLM extraction had no results either. IMPORTANT: we should have a mechanism to let the user reset these status just in case the system went wrong in something and the user wants to start over with a single item.
    - Please decide which fits best our needs between exponential backoff and rate limiting.

2. User Intent Management
    - The 'ignore' status must be permanent until the user decides to 'unignore' it manually whenever it wants to.
    - Yes, bulk operations must repsect user intent.
    - Yes please plan the creation of an archive.

3. Processing History
    - All attempts is just fine, this project is intended to run locally and neither storage nor processing power is restricted by a server but by the user's machine.
    - All proessing histoy should be exported for analysis.
    - A "processing timeline' is not very important but would be somethign nice to have.

4. Error Handling
    - Yes, critical errors that shows nothing behind the url should go directly to 'exhausted' and the user then has the chance to create the item manually from scratch via our UI.
    - I'm not sure if error categories would be usefull…
    - Don't program automatic re-checks.

5. Workflow Integrations
    - When a URL is unlinked (which automatically deletes the linked Zotero item) the URL should go back to the initial state ('not_started')
    - Don't worry for now on a confidence score for each processing method to guide strategy.
    - It would be nice for the system to suggest which url needs manual review base on citation completeness.

6. Performance & Scalability
    - This project is meant to run locally and current computers have enough power to handle heavy duty unlike a server which is constrained and not so resourceful. So I don't think handling thousands of url would pose a problem in modern computers, if so please let me know.
    - Yes, batch processing is crucial, but I'm not sure what you mean by configurable concurrency, however we should't bother the user too much, and go for the most appropriate way to handle things.
    - Pausing and resuming a bulk process seems ok.

7. Citation Validation Integration
    - Yes, incomplete citations from initial processin (as well as failure) must automatically trigger metadata extraction.
    - Yes, there should be a button for the user to visit the page (or modal) where he can either edit or add citation data (e.g. add another creator) that came from any processing stage.
    - The citation quality threshold lies in the critical metadata required to build an appropriate citation in APA style.

8. Migration Strategy
    - We should use the less destructive method to migrate existing urls to the new status system.
    - Yes, existing failed status should be reset in the new system.
    - No, don't worry about backwards compatibility.

Please provide your analysis on these considerations and answers, evaluate them and tell me your take on this matter, along with any suggestions or proposals for enhancement.




About the point 2 "Content display for manual creation", you must take into account that many urls may be pointing to pdf files and we need to handle bot the parsed content and the original file. Your suggestion here is excellent.

In the smart suggestion system, remeber to place a suggestion for items that failed the Zotero processing and the automated content processing found valid identifiers, so that the user an review these identifiers and select the most appropriate to process.

python lib/utils/fetch-semanticscholar-article.py "10.1038/nature12373"
# or
python lib/utils/fetch-semanticscholar-article.py "Attention Is All You Need"