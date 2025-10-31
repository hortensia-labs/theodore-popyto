on run {tocFileName, tocStyle}
    if tocFileName is missing value then
        log "TOC file name is missing"
        return
    end if
    if tocStyle is missing value then
        log "TOC style is missing"
        return
    end if
	log "Updating TOC: " & tocFileName & " with style: " & tocStyle
	tell application id "com.adobe.InDesign"
		set frontDoc to active document
		if (count of books) is 0 then
			log "There is no book open in InDesign, please open a book to let the script update the toc"
			return
		end if
		set theBook to front book
		set allDocs to every book content of front book
		if (count of allDocs) is 0 then
			log "The book has no documents... there is nothing to process"
			return
		end if
		set tocDoc to missing value
		set tocFileName to tocFileName & ".indd"
		repeat with doc in allDocs
			if name of doc is tocFileName then
				set tocDoc to doc
				exit repeat
			end if
		end repeat
		
		if tocDoc is missing value then
			log "Could not find TOC document named: " & tocFileName
			return
		end if
		set tocDoc to open (full name of tocDoc)
		repeat with tocDocStyle in TOC styles of tocDoc
			if name of tocDocStyle is tocStyle then
				set tocDocStyle to tocDocStyle
				exit repeat
			end if
		end repeat
		if tocDocStyle is missing value then
			log "Could not find TOC style named: " & tocStyle
			return
		end if
		tell tocDoc
			set theStory to create TOC using tocDocStyle from book theBook with replacing and include overset
			if theStory is not missing value then
				log "TOC updated successfully"
			else
				log "Could not update TOC"
				return
			end if
		end tell
	end tell
end run