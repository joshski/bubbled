import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, test } from 'vitest'

const root = process.cwd()

async function loadConfig(path: string) {
  const module = await import(
    `${pathToFileURL(join(root, path)).href}?t=${Date.now()}`
  )

  return module.default
}

test('test command runs a targeted smoke fixture', () => {
  const configDir = mkdtempSync(join(tmpdir(), 'bubbled-test-command-'))

  try {
    const configPath = join(configDir, 'bunfig.toml')

    writeFileSync(configPath, ['[test]', 'coverage = false'].join('\n'))

    const command = spawnSync(
      'bun',
      [
        '--config',
        configPath,
        'run',
        'test',
        '--',
        '--test-name-pattern',
        '^test command fixture$',
      ],
      {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          CI: '1',
        },
      }
    )

    expect(command.status).toBe(0)
  } finally {
    rmSync(configDir, { force: true, recursive: true })
  }
})

test('single vitest configuration uses the expected reporter and exclusions', async () => {
  const vitestConfig = await loadConfig('vitest.config.ts')

  expect(vitestConfig.test.environment).toBe('jsdom')
  expect(vitestConfig.test.coverage.provider).toBe('istanbul')
  expect(vitestConfig.test.coverage.reporter).toEqual(['text', 'lcov'])
  expect(vitestConfig.test.coverage.exclude).toContain(
    '.tmp-browser-verification-*/**'
  )
  expect(vitestConfig.test.exclude).toContain(
    'bubble-browser/browser-verification.test.ts'
  )
  expect(vitestConfig.test.exclude).toContain('**/*.e2e.test.ts')
  expect(vitestConfig.test.coverage.thresholds.branches).toBe(100)
})

test('bun configuration leaves coverage reporting disabled', () => {
  const bunfig = readFileSync(join(root, 'bunfig.toml'), 'utf8')

  expect(bunfig).toContain('coverage = false')
  expect(bunfig).not.toContain('coverageReporter')
})

test('ci runs the bun pass and the coverage-gated vitest pass', () => {
  const workflow = readFileSync(
    join(root, '.github', 'workflows', 'ci.yml'),
    'utf8'
  )

  expect(workflow).toContain('bun install --frozen-lockfile')
  expect(workflow).toContain('bun run test')
  expect(workflow).toContain('bun run test:coverage')
})

test('coverage script uses the single vitest configuration', () => {
  const packageJson = JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8')
  )

  expect(packageJson.scripts['test:coverage']).toBe('vitest run --coverage')
})
