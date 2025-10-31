on run {scriptFileName}
	log "Running " & scriptFileName & "  script in InDesign"
	
	-- 1) Get folder where THIS script lives
	set scriptPOSIX to POSIX path of (path to me)
	set folderPOSIX to do shell script "dirname " & quoted form of scriptPOSIX
	
	-- 2) Build the full path to the JSX file
	set jsxPath to folderPOSIX & "/" & scriptFileName
	
	-- 3) Convert to an alias (required by do script)
	set jsxAlias to (POSIX file jsxPath) as alias
	
	-- 4) Run it in InDesign
	tell application id "com.adobe.InDesign"
		set response to do script jsxAlias language javascript Â
			undo mode entire script Â
			undo name "Undo Script Changes"
		log response
	end tell
	log "Script " & scriptFileName & " has finished running"
end run
