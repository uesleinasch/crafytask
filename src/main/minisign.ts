import { blake2b } from '@noble/hashes/blake2b'
import { createPublicKey, verify, type KeyObject } from 'crypto'

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')
const TRUSTED_PREFIX = 'trusted comment: '

export interface MinisignPublicKey {
  keyId: Buffer
  key: KeyObject
}

function minisignText(value: string): string {
  const text = value.trim()
  return text.includes('untrusted comment:') ? text : Buffer.from(text, 'base64').toString('utf8')
}

function lastLine(text: string): string {
  const lines = text.split('\n').map((line) => line.trim())
  return lines.filter(Boolean).pop() ?? ''
}

export function parseMinisignPublicKey(value: string): MinisignPublicKey {
  const raw = Buffer.from(lastLine(minisignText(value)), 'base64')
  if (raw.length !== 42 || raw.subarray(0, 2).toString('latin1') !== 'Ed') {
    throw new Error('Chave pública minisign inválida')
  }
  const key = createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, raw.subarray(10)]),
    format: 'der',
    type: 'spki'
  })
  return { keyId: raw.subarray(2, 10), key }
}

export interface Prehash {
  update: (chunk: Uint8Array) => Prehash
  digest: () => Buffer
}

export function minisignPrehash(): Prehash {
  const hash = blake2b.create({ dkLen: 64 })
  const prehash: Prehash = {
    update: (chunk) => {
      hash.update(chunk)
      return prehash
    },
    digest: () => Buffer.from(hash.digest())
  }
  return prehash
}

export function verifyMinisign(
  publicKey: MinisignPublicKey,
  signatureFile: string,
  prehash: Buffer
): string {
  const lines = minisignText(signatureFile)
    .split('\n')
    .map((line) => line.trim())
  const raw = Buffer.from(lines[1] ?? '', 'base64')
  const trustedLine = lines[2] ?? ''
  const globalSignature = Buffer.from(lines[3] ?? '', 'base64')
  if (
    raw.length !== 74 ||
    !trustedLine.startsWith(TRUSTED_PREFIX) ||
    globalSignature.length !== 64
  ) {
    throw new Error('Assinatura em formato desconhecido')
  }
  if (raw.subarray(0, 2).toString('latin1') !== 'ED') {
    throw new Error('Assinatura sem pré-hash BLAKE2b')
  }
  if (!raw.subarray(2, 10).equals(publicKey.keyId)) {
    throw new Error('Assinatura feita por outra chave')
  }
  const signature = raw.subarray(10)
  if (!verify(null, prehash, publicKey.key, signature)) {
    throw new Error('Assinatura não confere com o arquivo baixado')
  }
  const trusted = trustedLine.slice(TRUSTED_PREFIX.length)
  const signedComment = Buffer.concat([signature, Buffer.from(trusted, 'utf8')])
  if (!verify(null, signedComment, publicKey.key, globalSignature)) {
    throw new Error('Comentário da assinatura adulterado')
  }
  return trusted
}
