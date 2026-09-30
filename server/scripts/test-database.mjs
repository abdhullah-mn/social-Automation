import 'dotenv/config'
import { spawnSync } from 'node:child_process'
if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI before running database tests')
// The suite overrides dbName with a unique test name and drops only that database.
// Social provider calls are mocked; no real accounts are connected or published to.
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', 'tests/social.test.ts'], {
  stdio: 'inherit', env: { ...process.env, SOCIAL_TEST_MONGO_URI: process.env.MONGO_URI },
})
process.exitCode = result.status ?? 1
