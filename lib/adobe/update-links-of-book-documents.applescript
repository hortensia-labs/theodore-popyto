tell application id "com.adobe.InDesign"
	set frontDoc to active document
	if (count of books) is 0 then
		log "There is no book open in InDesign, please open a book to let the script update the links in its documents"
		return
	end if
	set allDocs to every book content of front book
	if (count of allDocs) is 0 then
		log "The book has no documents... there is nothing to process"
		return
	end if
	repeat with doc in allDocs
		set aName to the name of doc
		log "Working in " & aName & " --------------"
		set currentDoc to open (full name of doc)
		set outdatedLinks to (links of currentDoc whose status is link out of date)
		if (count of outdatedLinks) > 0 then
			log aName & " has " & (count of outdatedLinks) & " outdated links"
			update outdatedLinks
			log "links were successfully updated!"
		end if
	end repeat
	if frontDoc is not missing value then open (full name of frontDoc)
end tell
