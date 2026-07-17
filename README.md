# ServiceNow Artifact Exporter

A command-line utility for exporting ServiceNow personal developer artifacts to the local file system as native XML.

## Features

- Export supported ServiceNow artifacts as XML files
- Preserve metadata such as sys_id, sys_updated_on, and table names
- Bulk export from a list of artifact names or tables
- Export to a local directory with a predictable folder structure
- Compatible with code review, gap analysis, and offline study workflows

## Installation

```bash
npm install
```

## Usage

```bash
node src/index.js --base-url https://your-instance.service-now.com --username admin --password secret --output-dir ./out --artifact-types sys_script_include,sys_script_fix --names example_script_include
```

## Connecting to your ServiceNow personal developer instance

1. Create or use your personal developer instance.
2. Ensure your user has access to the tables you want to export.
3. Run the exporter with your instance URL, username, and password.
4. The CLI will attempt to call the ServiceNow Table API and write each matching record as XML into the output directory.

### Supported artifact families

The exporter is designed for artifacts such as:

- Script Includes
- Business Rules
- Client Scripts
- UI Actions
- UI Policies
- Catalog Client Scripts
- Contract SLA records
- Other table-based records that can be queried by name

### Notes

- Some tables may require different query parameters or specific field access.
- For a first pass, export by name or artifact type and review the generated XML locally.
- If the instance cannot be reached or the record is missing, the exporter falls back to a placeholder XML file so you still get a local artifact for review.

### Environment variable example

```powershell
$env:SN_INSTANCE_URL = "https://your-instance.service-now.com"
$env:SN_USERNAME = "your_username"
$env:SN_PASSWORD = "your_password"
$env:SN_OUTPUT_DIR = "./out"
$env:SN_ARTIFACT_TYPES = "sys_script_include,sys_script_fix"
node src/index.js
```

### Config file example

Copy [config.example.json](config.example.json) to a local file named `config.json` and replace the placeholder values with your own instance details.

```json
{
  "defaultProfile": "dev",
  "profiles": [
    {
      "name": "dev",
      "baseUrl": "https://your-instance.service-now.com",
      "username": "your_username",
      "password": "your_password"
    }
  ]
}
```

Then run:

```bash
node src/index.js --config ./config.json --profile dev --artifact-types sys_script_include --names my_script_include
```

### HTML analysis reports

Generated HTML analysis documents should be stored in the [documents](documents) folder so reports remain organized and easy to review.

## Development

```bash
npm test
```
