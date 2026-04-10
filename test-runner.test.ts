import { expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const root = process.cwd()

test('test command runs a targeted smoke fixture', () => {
  const configDir = mkdtempSync(join(tmpdir(), 'bubbled-test-command-'))

  try {
    const configPath = join(configDir, 'bunfig.toml')

    writeFileSync(configPath, ['[test]', 'coverage = false'].join('\n'))

    const command = Bun.spawnSync({
      cmd: [
        'bun',
        '--config',
        configPath,
        'run',
        'test',
        '--',
        '--test-name-pattern',
        '^test command fixture$',
      ],
      cwd: root,
      stderr: 'pipe',
      stdout: 'pipe',
      env: {
        ...process.env,
        CI: '1',
      },
    })
    expect(command.exitCode).toBe(0)
  } finally {
    rmSync(configDir, { force: true, recursive: true })
  }
})

test('coverage gate fails when a repository drops below 100%', () => {
  const fixtureDir = mkdtempSync(join(tmpdir(), 'bubbled-coverage-gate-'))

  try {
    writeFileSync(
      join(fixtureDir, 'bunfig.toml'),
      [
        '[test]',
        'coverage = true',
        'coverageThreshold = 1.0',
        'coverageSkipTestFiles = true',
      ].join('\n')
    )
    writeFileSync(
      join(fixtureDir, 'source.ts'),
      [
        'export function covered() {',
        '  return 1;',
        '}',
        '',
        'export function uncovered() {',
        '  return 2;',
        '}',
      ].join('\n')
    )
    writeFileSync(
      join(fixtureDir, 'source.test.ts'),
      [
        'import { expect, test } from "bun:test";',
        'import { covered } from "./source";',
        '',
        'test("covered", () => {',
        '  expect(covered()).toBe(1);',
        '});',
      ].join('\n')
    )

    const command = Bun.spawnSync({
      cmd: ['bun', 'test'],
      cwd: fixtureDir,
      stderr: 'pipe',
      stdout: 'pipe',
      env: {
        ...process.env,
        CI: '1',
      },
    })
    const output = `${command.stdout.toString()}${command.stderr.toString()}`

    expect(command.exitCode).toBe(1)
    expect(output).toContain('source.ts')
    expect(output).toContain('50.00')
  } finally {
    rmSync(fixtureDir, { force: true, recursive: true })
  }
})

test('coverage thresholds are enforced in bun configuration', () => {
  const bunfig = readFileSync(join(root, 'bunfig.toml'), 'utf8')

  expect(bunfig).toContain('coverage = true')
  expect(bunfig).toContain('coverageThreshold = 1.0')
  expect(bunfig).toContain('coverageSkipTestFiles = true')
  expect(bunfig).toContain('coverageReporter = ["text", "lcov"]')
})

test('ci runs the coverage-gated test command', () => {
  const workflow = readFileSync(
    join(root, '.github', 'workflows', 'ci.yml'),
    'utf8'
  )

  expect(workflow).toContain('bun install --frozen-lockfile')
  expect(workflow).toContain('bun run test:ci')
})
