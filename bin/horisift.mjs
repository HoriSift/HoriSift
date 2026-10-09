#!/usr/bin/env node
/** Portable Node entry point until a bundled JavaScript build ships. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const script=fileURLToPath(new URL('../src/cli/entry.ts',import.meta.url));
const run=spawnSync(process.execPath,['--experimental-strip-types',script,...process.argv.slice(2)],{
  stdio:'inherit',shell:false,windowsHide:true,
});
if(run.error){process.stderr.write('Unable to launch HoriSift CLI.\n');process.exitCode=3;}
else if(run.signal){process.stderr.write('HoriSift CLI interrupted.\n');process.exitCode=3;}
else process.exitCode=run.status??3;
