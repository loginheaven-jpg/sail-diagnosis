/** Preserve the existing diagnosis/design and keep privileged keys server-only. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const base = 'e878bf3087652239ebb5103fd886c405337dfffe';
const git = (...args) => execFileSync('git', args);
const files = git('ls-tree', '-rz', '--name-only', base).toString().split('\0').filter(Boolean);
const preserved = files.filter(path => /^(?:src\/lib\/scoring\/|src\/data\/|src\/styles\/|supabase\/migrations\/)|^(?:src\/app\/globals\.css|package(?:-lock)?\.json)$/.test(path));
const hash = value => createHash('sha256').update(value).digest('hex');
for (const path of preserved) assert.equal(hash(readFileSync(path)), hash(git('show', `${base}:${path}`)), `Preserved source changed: ${path}`);
const sourceFiles = git('ls-files', '--cached', '--others', '--exclude-standard', '-z').toString().split('\0').filter(path => /^src\/.*\.[jt]sx?$/.test(path));
for (const path of sourceFiles) {
  const source = readFileSync(path, 'utf8');
  assert.doesNotMatch(source, /\.from\(['"](?:results|sail_result_(?:sessions|access|shares|submissions))['"]\)/, `Raw result table access: ${path}`);
  assert.doesNotMatch(source, /NEXT_PUBLIC_[A-Z_]*(?:SECRET|SERVICE_ROLE|RATE_LIMIT_PEPPER)/, path);
  if (/^['"]use client['"];?/m.test(source)) {
    assert.doesNotMatch(source, /createServiceRoleClient|SUPABASE_(?:SECRET_KEY|SERVICE_ROLE_KEY)|SAIL_RATE_LIMIT_PEPPER/, path);
  }
}
assert.match(readFileSync('src/lib/results-security.ts', 'utf8'), /import ['"]server-only['"]/);
console.log(JSON.stringify({status:'PASS', base, preservedFiles:preserved.length, checkedSourceFiles:sourceFiles.length, historicalMigrationsUnchanged:true, diagnosisAndDesignPreserved:true, rawResultQueries:0, clientPrivilegedSecretReferences:0}));
