import { spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'

const root = process.cwd()

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

test('coverage gate fails when a repository drops below 100%', () => {
  const fixtureDir = mkdtempSync(join(tmpdir(), 'bubbled-coverage-gate-'))

  try {
    symlinkSync(join(root, 'node_modules'), join(fixtureDir, 'node_modules'))
    writeFileSync(
      join(fixtureDir, 'vitest.config.ts'),
      [
        'export default {',
        '  test: {',
        '    coverage: {',
        "      provider: 'istanbul',",
        "      reporter: ['text'],",
        "      include: ['source.ts'],",
        "      exclude: ['source.test.ts'],",
        '      thresholds: {',
        '        lines: 100,',
        '        functions: 100,',
        '        branches: 100,',
        '        statements: 100,',
        '      },',
        '    },',
        '  },',
        '}',
      ].join('\n')
    )
    writeFileSync(join(fixtureDir, 'package.json'), '{"type":"module"}')
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
        'import { expect, test } from "vitest";',
        'import { covered } from "./source";',
        '',
        'test("covered", () => {',
        '  expect(covered()).toBe(1);',
        '});',
      ].join('\n')
    )

    const command = spawnSync(
      'bun',
      [join(root, 'node_modules', 'vitest', 'vitest.mjs'), 'run', '--coverage'],
      {
        cwd: fixtureDir,
        encoding: 'utf8',
        env: {
          ...process.env,
          CI: '1',
        },
      }
    )
    const output = `${command.stdout}${command.stderr}`

    expect(command.status).toBe(1)
    expect(output).toContain('source.ts')
    expect(output).toContain('50')
  } finally {
    rmSync(fixtureDir, { force: true, recursive: true })
  }
})

test('coverage thresholds are enforced in vitest configuration', () => {
  const vitestConfig = readFileSync(join(root, 'vitest.config.ts'), 'utf8')

  expect(vitestConfig).toContain("environment: 'jsdom'")
  expect(vitestConfig).toContain("provider: 'istanbul'")
  expect(vitestConfig).toContain("reporter: ['text', 'lcov']")
  expect(vitestConfig).toContain('lines: 100')
  expect(vitestConfig).toContain('functions: 100')
  expect(vitestConfig).toContain('branches: 97')
  expect(vitestConfig).toContain('statements: 100')
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
