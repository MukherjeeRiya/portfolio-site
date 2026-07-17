const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ServiceNowArtifactExporter } = require('../src/index.js');

test('exports placeholder XML files for requested artifacts', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sn-export-'));
  const exporter = new ServiceNowArtifactExporter({
    baseUrl: 'https://example.service-now.com',
    username: 'admin',
    password: 'secret',
    outputDir: path.join(tempDir, 'out'),
  });

  const exportedFiles = await exporter.exportArtifacts({
    artifactTypes: ['sys_script_include'],
    names: ['example_script_include'],
  });

  assert.equal(exportedFiles.length, 1);
  const xmlText = fs.readFileSync(exportedFiles[0], 'utf8');
  assert.match(xmlText, /example_script_include/);
  assert.match(xmlText, /sys_script_include/);
});

test('builds XML from a ServiceNow record payload', () => {
  const exporter = new ServiceNowArtifactExporter({
    baseUrl: 'https://example.service-now.com',
    username: 'admin',
    password: 'secret',
    outputDir: '/tmp/out',
  });

  const record = {
    sys_id: 'abc123',
    name: 'demo_script_include',
    script: 'gs.info("demo");',
    active: true,
  };

  const xml = exporter.buildRecordXml('sys_script_include', record);

  assert.match(xml, /<record table="sys_script_include"/);
  assert.match(xml, /<field name="name">demo_script_include<\/field>/);
  assert.match(xml, /<field name="script">gs.info\(&quot;demo&quot;\);<\/field>/);
});
