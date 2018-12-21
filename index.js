const amqp = require('amqplib')
const memoize = require('lodash.memoize')
const debug = require('debug')(`amqp-lite:debug`)
const info = require('debug')(`amqp-lite:info`)
const error = require('debug')(`amqp-lite:error`)

module.exports = function (config = {}) {
  config = Object.assign({
    connectionUrl: null,
    prefetch: null
  }, config)

  async function connect () {
    info(`Connecting to: ${config.connectionUrl}`)
    const connection = await (config.connectionUrl === null ? amqp.connect() : amqp.connect(config.connectionUrl))
    info(`Connected to: ${config.connectionUrl}`)
    process.once('SIGINT', connection.close.bind(connection))
    connection.on('close', () => {
      error(`Connection closed.`)
      connection = null
    })

    return connection
  }
  const getConnection = memoize(connect)

  async function assertChannel (queueName) {
    const connection = await getConnection()
    const channel = await connection.createChannel()
    await channel.assertQueue(queueName, {
      durable: true
    })
    if (config.prefetch !== null) {
      await channel.prefetch(config.prefetch)
    }
    return channel
  }

  const getChannel = memoize(assertChannel)

  async function publish (queueName, payload) {
    const encodedPayload = JSON.stringify(payload)
    const channel = await getChannel(queueName)
    debug(`PUBLISH [${queueName}]: ${Buffer.from(encodedPayload).toString()}`)
    return channel.sendToQueue(queueName, Buffer.from(encodedPayload))
  }

  async function consume (queueName, consumer) {
    const channel = await getChannel(queueName)
    const consumingResult = await channel.consume(queueName, async msg => {
      if (msg !== null) {
        debug(`CONSUME [${queueName}:${msg.fields.deliveryTag}]: ${msg.content.toString()}`)
        try {
          const content = JSON.parse(msg.content.toString())
          await consumer(content)
          debug(`ACK ${msg.fields.deliveryTag}`)
          await channel.ack(msg)
        } catch (err) {
          await channel.nack(msg)
          throw err
        }
      }
    })
    info(`Consuming at: ${queueName}`)

    return () => {
      channel.cancel(consumingResult.consumerTag)
    }
  }

  async function close () {
    const connection = await getConnection()
    connection.close()
  }

  return Object.freeze({
    publish,
    consume,
    close
  })
}
