const Amqp = require('./index')
const amqp = Amqp()
let i = 0
describe('amqp-lib', () => {
  afterAll(() => {
    amqp.close()
  })
  it.each([
    [1, 1],
    ['1', '1'],
    [null, null],
    [true, true],
    [false, false]
  ])('%s should be %s', async (val, expected) => {
    i++
    expect.assertions(1)
    await new Promise(async resolve => {
      const cancelConsume = await amqp.consume(`test${i}`, message => {
        expect(message).toBe(expected)
        cancelConsume()
        resolve()
      })
      amqp.publish(`test${i}`, val)
    })
  })
})