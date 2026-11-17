// Adds a prebuilt native package to a Lambda bundle's node_modules without installing it for the build machine.
// Usage: node add-native-binary.mjs <bundle-dir> <package-name>
// The version is the one the bundle's own node_modules already has for the main package (same name minus the
// platform suffix), so the binary always matches the JavaScript that loads it.
// The tarball is unpacked here in plain Node: `tar` differs between Windows, Git Bash and Linux and mangles paths.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { gunzipSync } from 'node:zlib'

const [bundleDir, packageName] = process.argv.slice(2)
if (!bundleDir || !packageName) throw new Error('usage: add-native-binary.mjs <bundle-dir> <package-name>')

const mainPackage = packageName.replace(/-linux-arm64-gnu$/, '')
const installed = JSON.parse(readFileSync(join(bundleDir, 'node_modules', ...mainPackage.split('/'), 'package.json'), 'utf8'))
const spec = `${packageName}@${installed.version}`

/** Writes the files of a (gzipped) tar into `target`, dropping the leading "package/" folder. */
const unpack = (tarball, target) => {
  const data = gunzipSync(readFileSync(tarball))
  let offset = 0
  while (offset + 512 <= data.length) {
    const header = data.subarray(offset, offset + 512)
    if (header.every((byte) => byte === 0)) break
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '')
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/, '')
    const size = parseInt(header.subarray(124, 136).toString('utf8').replace(/\0.*$/, '').trim() || '0', 8)
    const type = String.fromCharCode(header[156] || 48)
    offset += 512
    if (type === '0') {
      const relative = (prefix ? `${prefix}/${name}` : name).split('/').slice(1).join('/')
      if (relative === '' || relative.includes('..')) throw new Error(`unexpected path in ${spec}`)
      const file = join(target, relative)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, data.subarray(offset, offset + size))
    }
    offset += Math.ceil(size / 512) * 512
  }
}

const work = mkdtempSync(join(tmpdir(), 'native-binary-'))
try {
  execFileSync('npm', ['pack', spec, '--pack-destination', work, '--silent'], { stdio: 'inherit', shell: process.platform === 'win32' })
  const tarball = readdirSync(work).find((name) => name.endsWith('.tgz'))
  if (!tarball) throw new Error(`npm pack produced no tarball for ${spec}`)
  unpack(join(work, tarball), join(bundleDir, 'node_modules', ...packageName.split('/')))
} finally {
  rmSync(work, { recursive: true, force: true })
}
