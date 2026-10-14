import test from 'node:test'
import assert from 'node:assert/strict'
import { createRateLimiter } from '../lib/rate-limit.js'

function setup(opts = {}) {
    const clock = { t: 1_000_000 }
    const rl = createRateLimiter({ max: 3, windowMs: 1000, now: () => clock.t, ...opts })
    return { clock, rl }
}

test('erlaubt bis max Fehlversuche, dann gesperrt', () => {
    const { rl } = setup()
    for (let i = 0; i < 3; i++) {
        assert.equal(rl.check('a').allowed, true)
        rl.fail('a')
    }
    const r = rl.check('a')
    assert.equal(r.allowed, false)
    assert.equal(r.retryAfterMs, 1000)
})

test('Schluessel sind unabhaengig', () => {
    const { rl } = setup()
    for (let i = 0; i < 3; i++) rl.fail('a')
    assert.equal(rl.check('b').allowed, true)
})

test('Sperre endet nach Ablauf des Fensters', () => {
    const { rl, clock } = setup()
    for (let i = 0; i < 3; i++) rl.fail('a')
    clock.t += 400
    assert.equal(rl.check('a').retryAfterMs, 600)
    clock.t += 600
    assert.equal(rl.check('a').allowed, true)
    rl.fail('a')
    assert.equal(rl.size(), 1)
})

test('reset loescht den Zaehler', () => {
    const { rl } = setup()
    for (let i = 0; i < 3; i++) rl.fail('a')
    rl.reset('a')
    assert.equal(rl.check('a').allowed, true)
})

test('Map waechst nicht ueber maxKeys hinaus', () => {
    const { rl, clock } = setup({ maxKeys: 5 })
    for (let i = 0; i < 20; i++) rl.fail('k' + i)
    assert.ok(rl.size() <= 5)
    clock.t += 2000
    rl.fail('neu')
    assert.equal(rl.size(), 1) // abgelaufene Eintraege wurden bereinigt
})

test('reserve zaehlt vorab: paralleler Burst wird nach max Versuchen blockiert', () => {
    const { rl } = setup()
    const results = Array.from({ length: 10 }, () => rl.reserve('a'))
    assert.equal(results.filter(r => r.allowed).length, 3)
    assert.equal(results[3].allowed, false)
})

test('release nimmt eine Reservierung zurueck, reset bei Erfolg', () => {
    const { rl } = setup()
    rl.reserve('a'); rl.reserve('a'); rl.release('a')
    assert.equal(rl.reserve('a').allowed, true)
    assert.equal(rl.reserve('a').allowed, true)
    assert.equal(rl.reserve('a').allowed, false)
    rl.reset('a')
    assert.equal(rl.reserve('a').allowed, true)
})

test('Eviction verdraengt nie einen gesperrten Schluessel', () => {
    const { rl } = setup({ maxKeys: 3 })
    for (let i = 0; i < 3; i++) rl.fail('x'); rl.fail('y'); rl.fail('z')
    // x gesperrt (aeltester), y/z nicht -> neuer Schluessel verdraengt y, x bleibt
    assert.equal(rl.reserve('n').allowed, true)
    assert.equal(rl.check('x').allowed, false)
    assert.equal(rl.size(), 3)
})

test('voll mit gesperrten Schluesseln: neuer Schluessel gilt als gesperrt', () => {
    const { rl } = setup({ maxKeys: 2 })
    for (const k of ['a', 'b']) for (let i = 0; i < 3; i++) rl.fail(k)
    const r = rl.reserve('neu')
    assert.equal(r.allowed, false)
    assert.ok(r.retryAfterMs > 0)
    assert.equal(rl.check('a').allowed, false)
    assert.equal(rl.size(), 2)
})
