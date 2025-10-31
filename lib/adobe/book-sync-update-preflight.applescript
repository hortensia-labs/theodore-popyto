tell application id "com.adobe.InDesign"
	if (count of books) is 0 then
		log "There is no book open in InDesign, please open a book to let the script update the links in its documents"
		return
	end if
	tell front book
		synchronize
		update all numbers
		update all cross references
		preflight
	end tell
end tell
