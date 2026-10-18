import test from 'node:test';
import assert from 'node:assert/strict';
import { databaseEntries, replaceConnections, compareSnapshots } from './migrate-neon-region.mjs';

test('connection replacement removes duplicate definitions and preserves unrelated secrets', () => {
    const original = '# config\r\nDATABASE_URL="postgresql://old/db"\r\nAUTH_SECRET=keep-me\r\nDATABASE_URL=postgresql://new/db\r\nDATABASE_URL_POOLED="postgresql://pool/db"\r\n';
    const changed = replaceConnections(original, 'postgresql://direct/db', 'postgresql://pooler/db');
    assert.deepEqual(databaseEntries(changed), [
        { key: 'DATABASE_URL', value: 'postgresql://direct/db' },
        { key: 'DATABASE_URL_POOLED', value: 'postgresql://pooler/db' },
    ]);
    assert.ok(changed.includes('AUTH_SECRET=keep-me\r\n'));
    assert.ok(changed.startsWith('# config\r\n'));
});

test('commented URLs are ignored and quoted URL parameters are retained', () => {
    assert.deepEqual(databaseEntries('# DATABASE_URL=postgresql://old/db\nDATABASE_URL="postgresql://new/db?sslmode=require&channel_binding=require" # current\n'), [
        { key: 'DATABASE_URL', value: 'postgresql://new/db?sslmode=require&channel_binding=require' },
    ]);
    assert.throws(() => databaseEntries('DATABASE_URL="postgresql://new/db'), /Unclosed/);
});

const baseline = () => ({
    metadata: { schemas: ['drizzle', 'public'], extensions: [{ name: 'vector', version: '0.8.0' }] },
    tables: [{ schema: 'public', name: 'user', rows: '2', sha256: 'original' }],
    sequences: [{ name: 'id_seq', last_value: '2', is_called: true }],
    columns: [], constraints: [], indexes: [], grants: [], schemaGrants: [],
});

test('verification catches changed data even when row counts match', () => {
    const source = baseline(); const target = baseline();
    target.tables[0].sha256 = 'changed';
    assert.deepEqual(compareSnapshots(source, target), ['tables']);
});

test('verification catches lost sequence state and invalid indexes', () => {
    const source = baseline(); const target = baseline();
    target.sequences[0].is_called = false;
    target.indexes.push({ name: 'embedding_idx', indisvalid: false });
    assert.deepEqual(compareSnapshots(source, target), ['sequences', 'indexes']);
});

test('extension version upgrade is allowed but an absent extension is rejected', () => {
    const source = baseline(); const target = baseline();
    target.metadata.extensions[0].version = '0.8.6';
    assert.deepEqual(compareSnapshots(source, target), []);
    target.metadata.extensions = [];
    assert.deepEqual(compareSnapshots(source, target), ['extensions']);
});

test('PG18 NOT NULL catalog entries are normalized while column nullability is checked', () => {
    const source = baseline(); const target = baseline();
    source.columns = [{ name: 'id', attnotnull: true }];
    target.columns = [{ name: 'id', attnotnull: true }];
    target.constraints = [{ name: 'id_not_null', convalidated: true, definition: 'NOT NULL id' }];
    assert.deepEqual(compareSnapshots(source, target), []);
    target.columns[0].attnotnull = false;
    assert.deepEqual(compareSnapshots(source, target), ['columns']);
});
