(*
	InDesign Script Runner with Book Configuration Support

	This AppleScript runs JSX scripts in Adobe InDesign with optional book
	context. When a book_id is provided, it writes a temporary configuration
	file that JSX scripts can read to obtain book-specific paths.

	Usage:
		# Without book context (legacy mode)
		osascript runner.applescript "crossref-process.jsx"

		# With book context (new mode)
		osascript runner.applescript "crossref-process.jsx" "libro1"

	The temporary config file is written to:
		/tmp/indesign-runner-config.json

	Structure:
		{
			"bookId": "libro1",
			"configPath": "/path/to/generated/libro1/data/indesign-config.json"
		}
*)

on run argv
	-- Parse arguments
	set scriptFileName to item 1 of argv

	-- Optional second argument: book_id
	set bookId to missing value
	if (count of argv) > 1 then
		set bookId to item 2 of argv
	end if

	log "Running " & scriptFileName & " in InDesign"

	-- 1) Get folder where THIS script lives
	set scriptPOSIX to POSIX path of (path to me)
	set folderPOSIX to do shell script "dirname " & quoted form of scriptPOSIX

	-- 2) Determine project root (two levels up from lib/adobe/)
	set projectRoot to do shell script "dirname " & quoted form of folderPOSIX
	set projectRoot to do shell script "dirname " & quoted form of projectRoot

	-- 3) Write temporary config file if book_id provided
	if bookId is not missing value then
		log "Book context: " & bookId

		-- Build path to indesign-config.json
		set configPath to projectRoot & "/generated/" & bookId & "/data/indesign-config.json"

		-- Verify config file exists
		try
			do shell script "test -f " & quoted form of configPath
		on error
			error "InDesign config file not found: " & configPath & ". Run 'just indesign-config " & bookId & "' first."
		end try

		-- Write temporary runner config
		set tempConfigPath to "/tmp/indesign-runner-config.json"
		set jsonContent to "{" & return & ¬
			"  \"bookId\": \"" & bookId & "\"," & return & ¬
			"  \"configPath\": \"" & configPath & "\"" & return & ¬
			"}"

		do shell script "echo " & quoted form of jsonContent & " > " & quoted form of tempConfigPath
		log "Wrote runner config to: " & tempConfigPath
	else
		log "No book context provided (legacy mode)"
	end if

	-- 4) Build the full path to the JSX file
	set jsxPath to folderPOSIX & "/" & scriptFileName

	-- 5) Verify JSX file exists
	try
		do shell script "test -f " & quoted form of jsxPath
	on error
		error "JSX script not found: " & jsxPath
	end try

	-- 6) Convert to an alias (required by do script)
	set jsxAlias to (POSIX file jsxPath) as alias

	-- 7) Run it in InDesign
	tell application id "com.adobe.InDesign"
		set response to do script jsxAlias language javascript ¬
			undo mode entire script ¬
			undo name "Undo Script Changes"
		log response
	end tell

	log "Script " & scriptFileName & " has finished running"

	-- 8) Cleanup temporary config if it was created
	-- (Commented out for debugging purposes - the file will be overwritten next run)
	-- if bookId is not missing value then
	--     do shell script "rm -f /tmp/indesign-runner-config.json"
	-- end if
end run
