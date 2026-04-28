import { createHash } from 'node:crypto'
import {
  copyFileSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
} from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
export const repoRoot = resolve(scriptDirectory, '..')

export const recoveryEnvironments = {
  development: {
    aliases: new Set(['development', 'dev']),
    environment: 'development',
    envFile: 'envs/.env.development',
    provenance: 'development',
    patFileName: 'iam-login-client.development.pat',
    patHostPath: 'envs/.local/development/iam-login-client.development.pat',
    backupFileName: 'zitadel.development.dump',
  },
  'isolated-test': {
    aliases: new Set(['isolated-test', 'test', 'isolated']),
    environment: 'isolated-test',
    envFile: 'envs/.env.test',
    provenance: 'isolated-test',
    patFileName: 'iam-login-client.isolated-test.pat',
    patHostPath: 'envs/.local/isolated-test/iam-login-client.isolated-test.pat',
    backupFileName: 'zitadel.isolated-test.dump',
  },
}

export const parseEnvFile = (rawContent) => {
  const values = {}

  for (const rawLine of rawContent.split(/\r?\n/u)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    values[key] = value
  }

  return values
}

export const parseCliArgs = (args) => {
  const positional = []
  const flags = {}

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }

    const flagName = arg.slice(2)
    const nextValue = args[index + 1]

    if (!nextValue || nextValue.startsWith('--')) {
      flags[flagName] = true
      continue
    }

    flags[flagName] = nextValue
    index += 1
  }

  return { positional, flags }
}

export const toWorkspacePath = (filePath) =>
  relative(repoRoot, filePath).replace(/\\/gu, '/')

export const resolveEnvironmentConfig = (environmentName) => {
  for (const config of Object.values(recoveryEnvironments)) {
    if (config.aliases.has(environmentName)) {
      const envFilePath = resolve(repoRoot, config.envFile)
      const env = parseEnvFile(readFileSync(envFilePath, 'utf8'))

      if (env.CAUPPO_ENV_PROVENANCE !== config.provenance) {
        throw new Error(
          `${config.envFile} has CAUPPO_ENV_PROVENANCE=${env.CAUPPO_ENV_PROVENANCE ?? '<missing>'}; expected ${config.provenance}`,
        )
      }

      return {
        ...config,
        env,
        envFilePath,
        patHostPathAbsolute: resolve(repoRoot, config.patHostPath),
      }
    }
  }

  throw new Error(
    `Unknown environment '${environmentName}'. Use one of: development, isolated-test.`,
  )
}

export const sha256Text = (value) =>
  createHash('sha256').update(value, 'utf8').digest('hex')

export const sha256File = async (filePath) =>
  new Promise((resolveHash, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)

    stream.on('error', reject)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolveHash(hash.digest('hex')))
  })

export const assertFileExists = (filePath, label) => {
  if (!existsSync(filePath)) {
    throw new Error(`${label} not found: ${toWorkspacePath(filePath)}`)
  }

  if (!statSync(filePath).isFile()) {
    throw new Error(`${label} is not a file: ${toWorkspacePath(filePath)}`)
  }
}

export const ensureDirectory = (dirPath) => {
  mkdirSync(dirPath, { recursive: true })
}

export const copyFileEnsuringDirectory = (sourcePath, targetPath) => {
  ensureDirectory(dirname(targetPath))
  copyFileSync(sourcePath, targetPath)
}

const dockerArgs = (config, composeArgs) => [
  'compose',
  '--env-file',
  config.envFile,
  '-f',
  'docker-compose.yml',
  ...composeArgs,
]

const runProcess = async (args, options = {}) =>
  new Promise((resolveRun, reject) => {
    const stdio =
      options.stdio ?? [options.stdinFile ? 'pipe' : 'ignore', 'pipe', 'pipe']

    const child = spawn('docker', args, {
      cwd: repoRoot,
      env: process.env,
      stdio,
    })

    let stdout = ''
    let stderr = ''

    if (options.stdoutFile) {
      const outputStream = createWriteStream(options.stdoutFile)
      child.stdout.pipe(outputStream)
      outputStream.on('error', reject)
    } else if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString('utf8')
      })
    }

    if (options.stdinFile && child.stdin) {
      const inputStream = createReadStream(options.stdinFile)
      inputStream.pipe(child.stdin)
      inputStream.on('error', reject)
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString('utf8')
      })
    }

    child.on('error', reject)
    child.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolveRun({ stdout, stderr })
        return
      }

      reject(
        new Error(
          `docker ${args.join(' ')} failed with exit code ${exitCode}\n${stderr.trim()}`,
        ),
      )
    })
  })

export const composeCapture = (config, composeArgs) =>
  runProcess(dockerArgs(config, composeArgs))

export const composeInherit = (config, composeArgs) =>
  runProcess(dockerArgs(config, composeArgs), {
    stdio: ['ignore', 'inherit', 'inherit'],
  })

export const composeStdoutToFile = (config, composeArgs, outputFile) =>
  runProcess(dockerArgs(config, composeArgs), { stdoutFile: outputFile })

export const composeFileToStdin = (config, composeArgs, inputFile) =>
  runProcess(dockerArgs(config, composeArgs), { stdinFile: inputFile })

export const postgresExecArgs = (config, commandArgs) => [
  'exec',
  '-T',
  '-e',
  `PGPASSWORD=${config.env.POSTGRES_PASSWORD ?? 'postgres'}`,
  'postgres',
  ...commandArgs,
]

export const getRunningServices = async (config) => {
  const { stdout } = await composeCapture(config, [
    'ps',
    '--status',
    'running',
    '--services',
  ])

  return stdout
    .split(/\r?\n/u)
    .map((service) => service.trim())
    .filter(Boolean)
}

export const waitForPostgres = async (config) => {
  let lastError = null

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await psql(config, 'postgres', 'select 1')
      return
    } catch (error) {
      lastError = error
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000))
    }
  }

  throw new Error(
    `Postgres did not become ready for ${config.environment}. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  )
}

export const ensurePostgresRunning = async (config) => {
  const runningServices = await getRunningServices(config)

  if (!runningServices.includes('postgres')) {
    await composeInherit(config, ['up', '-d', 'postgres'])
  }

  await waitForPostgres(config)
}

export const psql = async (config, databaseName, sql) => {
  const { stdout } = await composeCapture(
    config,
    postgresExecArgs(config, [
      'psql',
      '-U',
      config.env.POSTGRES_USER ?? 'postgres',
      '-d',
      databaseName,
      '-Atc',
      sql,
    ]),
  )

  return stdout.trim()
}

export const psqlCommand = (config, databaseName, sql) =>
  composeInherit(
    config,
    postgresExecArgs(config, [
      'psql',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      config.env.POSTGRES_USER ?? 'postgres',
      '-d',
      databaseName,
      '-c',
      sql,
    ]),
  )

export const assertSafePgIdentifier = (value, label) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/u.test(value)) {
    throw new Error(`${label} is not a safe PostgreSQL identifier: ${value}`)
  }
}

export const quotePgIdentifier = (value) => `"${value.replace(/"/gu, '""')}"`

export const quotePgLiteral = (value) => `'${value.replace(/'/gu, "''")}'`

export const formatTimestampForPath = (date) =>
  date.toISOString().replace(/[:.]/gu, '-').replace(/Z$/u, 'Z')
