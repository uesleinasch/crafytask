import { createHash, generateKeyPairSync, sign, type KeyObject } from 'crypto'
import { describe, expect, it } from 'vitest'
import { minisignPrehash, parseMinisignPublicKey, verifyMinisign } from './minisign'

const KEY_ID = Buffer.from('0102030405060708', 'hex')

function keyPair(): { publicText: string; privateKey: KeyObject } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const raw = Buffer.from(publicKey.export({ format: 'jwk' }).x as string, 'base64url')
  const line = Buffer.concat([Buffer.from('Ed'), KEY_ID, raw]).toString('base64')
  return { publicText: `untrusted comment: minisign public key\n${line}\n`, privateKey }
}

function signFile(privateKey: KeyObject, data: Buffer, trusted: string, keyId = KEY_ID): string {
  const signature = sign(null, minisignPrehash().update(data).digest(), privateKey)
  const global = sign(null, Buffer.concat([signature, Buffer.from(trusted)]), privateKey)
  const text = [
    'untrusted comment: signature from tauri secret key',
    Buffer.concat([Buffer.from('ED'), keyId, signature]).toString('base64'),
    `trusted comment: ${trusted}`,
    global.toString('base64'),
    ''
  ].join('\n')
  return Buffer.from(text).toString('base64')
}

const prehash = (data: Buffer): Buffer => minisignPrehash().update(data).digest()

describe('minisignPrehash', () => {
  it('é BLAKE2b-512 em JS puro, igual ao do OpenSSL', () => {
    const data = Buffer.alloc(300_000, 7)
    const chunked = minisignPrehash()
      .update(data.subarray(0, 1000))
      .update(data.subarray(1000))
      .digest()
    expect(chunked).toEqual(createHash('blake2b512').update(data).digest())
  })
})

describe('verifyMinisign', () => {
  const data = Buffer.from('conteúdo do AppImage')
  const trusted = 'timestamp:1795492684\tfile:Handy_0.10.2_amd64.AppImage'

  it('aceita a assinatura em base64 do Tauri e devolve o comentário confiável', () => {
    const { publicText, privateKey } = keyPair()
    const key = parseMinisignPublicKey(Buffer.from(publicText).toString('base64'))
    expect(verifyMinisign(key, signFile(privateKey, data, trusted), prehash(data))).toBe(trusted)
  })

  it('recusa arquivo alterado', () => {
    const { publicText, privateKey } = keyPair()
    const key = parseMinisignPublicKey(publicText)
    const signature = signFile(privateKey, data, trusted)
    expect(() => verifyMinisign(key, signature, prehash(Buffer.from('outro')))).toThrow(
      /não confere/
    )
  })

  it('recusa assinatura de outra chave', () => {
    const { publicText } = keyPair()
    const other = keyPair()
    const key = parseMinisignPublicKey(publicText)
    expect(() =>
      verifyMinisign(key, signFile(other.privateKey, data, trusted), prehash(data))
    ).toThrow()
    const wrongId = signFile(other.privateKey, data, trusted, Buffer.alloc(8))
    expect(() => verifyMinisign(key, wrongId, prehash(data))).toThrow(/outra chave/)
  })

  it('recusa comentário confiável trocado', () => {
    const { publicText, privateKey } = keyPair()
    const key = parseMinisignPublicKey(publicText)
    const text = Buffer.from(signFile(privateKey, data, trusted), 'base64')
      .toString()
      .replace('0.10.2', '0.9.0')
    expect(() => verifyMinisign(key, text, prehash(data))).toThrow(/adulterado/)
  })
})
