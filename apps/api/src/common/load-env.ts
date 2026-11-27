// The command-line scripts (seeds, create-admin) are run with ts-node, which does not read apps/api/.env the way
// Prisma's own commands (migrate, studio) and the API do. Import this FIRST in a script so DATABASE_URL and the rest
// come from that file. Variables already set in the shell win over the file, so pointing a script at another database
// from the command line still works.
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { parseEnv } from 'util';

export function loadLocalEnv(file = resolve(__dirname, '../../.env')): boolean {
  if (!existsSync(file)) return false;
  for (const [key, value] of Object.entries(parseEnv(readFileSync(file, 'utf8')))) {
    if (process.env[key] === undefined) process.env[key] = value; // the shell wins over the file
  }
  return true;
}

loadLocalEnv();
