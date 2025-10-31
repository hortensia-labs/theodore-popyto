import argparse
import json
import os
import subprocess
import sys

# === Configuration ===
# Set the name of the agent you created in Claude Code.
AGENT_NAME = "apa-data-extractor"

def call_apa_data_extractor(entry_text: str):
    """
    Calls the Claude Code agent to process a single bibliography entry.

    This function uses Python's subprocess module to run the Claude Code CLI.
    You may need to adjust the `command` list if your command to run
    Claude Code is different (e.g., if it's not in your system's PATH).

    Args:
        entry_text: A string containing a single APA-formatted reference.

    Returns:
        A dictionary with the extracted data, or None if an error occurs.
    """
    if not entry_text:
        return None

    print(f"  -> Processing entry: '{entry_text[:50]}...'")

    try:
        # This is the command that will be executed in your terminal.
        # It assumes 'claude' is the command to run Claude Code.
        # Format: claude @agent-name "The prompt text"
        command = ["claude", "-p", f"tell apa-data-extractor agent to extract the data in JSON format from the following bibliographic entry: '{entry_text}'"]

        # Execute the command
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=True,  # This will raise an error if the command fails (returns a non-zero exit code)
            encoding='utf-8'
        )

        # The agent's raw output is in result.stdout
        # We need to find the JSON block in case the agent adds extra text.
        json_start = result.stdout.find('{')
        json_end = result.stdout.rfind('}') + 1

        if json_start == -1 or json_end == 0:
            print(f"     [!] Warning: No JSON object found in agent output for: '{entry_text}'")
            return None

        json_string = result.stdout[json_start:json_end]

        # Convert the JSON string into a Python dictionary
        parsed_data = json.loads(json_string)
        return parsed_data

    except FileNotFoundError:
        print(f"\n[!] ERROR: The 'claude' command was not found.")
        print("      Please ensure the Claude Code CLI is installed and in your system's PATH.")
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print(f"\n[!] ERROR: The agent call failed for entry: '{entry_text}'")
        print(f"      Error details: {e.stderr}")
        return None
    except json.JSONDecodeError:
        print(f"\n[!] ERROR: Failed to decode JSON from the agent's response for entry: '{entry_text}'")
        print(f"      Raw agent output: {result.stdout}")
        return None
    except Exception as e:
        print(f"\n[!] An unexpected error occurred: {e}")
        return None

def process_bibliography_file(input_filepath: str):
    """
    Reads a markdown bibliography file and uses an agent to extract data for each entry.

    Args:
        input_filepath: The full path to the source .md file.
    """
    # 1. Validate the input file path
    if not os.path.exists(input_filepath):
        print(f"[!] ERROR: Input file not found at '{input_filepath}'")
        return

    # 2. Determine the output file path
    base_name = os.path.splitext(input_filepath)[0]
    output_filepath = f"{base_name}.json"

    print(f"[*] Starting processing for: {os.path.basename(input_filepath)}")
    print(f"[*] Output will be saved to: {os.path.basename(output_filepath)}")

    all_references = []
    processed_count = 0

    # 3. Read the file and process each line
    with open(input_filepath, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            entry_text = line.strip()
            # Skip blank lines
            if not entry_text:
                continue

            # 4. Call the agent for the current line
            extracted_data = call_apa_data_extractor(entry_text)

            # 5. Collect valid results
            if extracted_data:
                all_references.append(extracted_data)
                processed_count += 1
            else:
                print(f"     [!] Skipping line {i+1} due to processing error.")

    # 6. Write the final aggregated data to the JSON file
    try:
        with open(output_filepath, 'w', encoding='utf-8') as f:
            json.dump(all_references, f, indent=4, ensure_ascii=False)
        print(f"\n[+] Success! Processed {processed_count} entries.")
        print(f"[+] Results saved to '{output_filepath}'")
    except Exception as e:
        print(f"\n[!] ERROR: Could not write to output file '{output_filepath}'. Reason: {e}")


if __name__ == "__main__":
    # Set up the command-line argument parser
    parser = argparse.ArgumentParser(
        description="Process a markdown bibliography file using the apa-data-extractor agent."
    )
    parser.add_argument(
        "filepath",
        type=str,
        help="The path to the markdown file containing bibliography entries."
    )

    args = parser.parse_args()

    # Run the main processing function
    process_bibliography_file(args.filepath)
