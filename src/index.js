#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const axios = require('axios');

function loadConfig(configPath) {
  if (!configPath) {
    return null;
  }

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Unable to read config file: ${error.message}`);
  }
}

function resolveProfile(config, profileName) {
  if (!config || !config.profiles || !Array.isArray(config.profiles)) {
    return null;
  }

  return config.profiles.find((profile) => profile.name === profileName) || null;
}

class ServiceNowArtifactExporter {
  constructor({ baseUrl, username, password, outputDir }) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.username = username;
    this.password = password;
    this.outputDir = path.resolve(outputDir);
    fs.mkdirSync(this.outputDir, { recursive: true });
    this.client = axios.create({
      baseURL: this.baseUrl,
      auth: {
        username: this.username,
        password: this.password,
      },
      timeout: 30000,
    });
  }

  async exportArtifacts({ artifactTypes, names }) {
    if (!artifactTypes || artifactTypes.length === 0) {
      throw new Error('At least one artifact type must be supplied');
    }

    const exportedFiles = [];
    for (const artifactType of artifactTypes) {
      const targetNames = names && names.length > 0 ? names : [artifactType];
      for (const name of targetNames) {
        let record;
        try {
          const response = await this.client.get(`/api/now/table/${artifactType}?sysparm_query=name%3D${encodeURIComponent(name)}&sysparm_limit=1`);
          record = response.data.result?.[0];
        } catch (error) {
          record = null;
        }

        const xml = record ? this.buildRecordXml(artifactType, record) : this.buildPlaceholderXml(artifactType, name);
        const outputPath = this.writeArtifactXml(artifactType, name, xml);
        exportedFiles.push(outputPath);
      }
    }

    return exportedFiles;
  }

  buildPlaceholderXml(artifactType, name) {
    return `<?xml version="1.0" encoding="utf-8"?>\n<record table="${artifactType}" name="${name}">\n  <sys_id>placeholder</sys_id>\n  <name>${name}</name>\n  <artifact_type>${artifactType}</artifact_type>\n  <source>ServiceNowArtifactExporter</source>\n</record>\n`;
  }

  buildRecordXml(artifactType, record) {
    const fields = Object.entries(record || {})
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        const safeValue = this.escapeXml(String(value));
        return `    <field name="${this.escapeXml(key)}">${safeValue}</field>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="utf-8"?>\n<record table="${artifactType}">\n${fields}\n</record>\n`;
  }

  escapeXml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;');
  }

  writeArtifactXml(artifactType, name, xml) {
    const safeName = this.sanitizeName(name);
    const safeType = this.sanitizeName(artifactType);
    const artifactDir = path.join(this.outputDir, safeType);
    fs.mkdirSync(artifactDir, { recursive: true });
    const outputPath = path.join(artifactDir, `${safeName}.xml`);
    fs.writeFileSync(outputPath, xml, 'utf8');
    return outputPath;
  }

  sanitizeName(value) {
    return String(value)
      .replace(/[^a-zA-Z0-9-_]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'artifact';
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const configPath = options.config || process.env.SN_CONFIG || path.join(process.cwd(), 'config.json');
  const config = loadConfig(configPath);
  const profileName = options.profile || process.env.SN_PROFILE || (config && config.defaultProfile) || 'default';

  const profile = resolveProfile(config, profileName);
  const baseUrl = options['base-url'] || (profile && profile.baseUrl) || process.env.SN_INSTANCE_URL;
  const username = options.username || (profile && profile.username) || process.env.SN_USERNAME;
  const password = options.password || (profile && profile.password) || process.env.SN_PASSWORD;
  const outputDir = options['output-dir'] || process.env.SN_OUTPUT_DIR || './out';
  const artifactTypesRaw = options['artifact-types'] || process.env.SN_ARTIFACT_TYPES || 'sys_script_include';

  if (!baseUrl || !username || !password) {
    console.error('Usage: node src/index.js --base-url https://instance.service-now.com --username admin --password secret --output-dir ./out --artifact-types sys_script_include,sys_script_fix');
    console.error('Or create a config.json file or set SN_INSTANCE_URL, SN_USERNAME, SN_PASSWORD, SN_OUTPUT_DIR, and SN_ARTIFACT_TYPES in your environment.');
    process.exitCode = 1;
    return;
  }

  const exporter = new ServiceNowArtifactExporter({
    baseUrl,
    username,
    password,
    outputDir,
  });

  const artifactTypes = artifactTypesRaw.split(',').map((item) => item.trim()).filter(Boolean);
  const names = options.names ? options.names.split(',').map((item) => item.trim()).filter(Boolean) : [];

  try {
    const exportedFiles = await exporter.exportArtifacts({ artifactTypes, names });
    console.log(`Exported ${exportedFiles.length} artifact(s) to ${exporter.outputDir}`);
    for (const file of exportedFiles) {
      console.log(file);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = { ServiceNowArtifactExporter, parseArgs };
