const amqp = require('amqplib');
let connection = null;
let channel = null;
const debug = require('debug')(`amqp-lite:debug`);
const info = require('debug')(`amqp-lite:info`);
const error = require('debug')(`amqp-lite:error`);

module.exports = function(_config = {}) {
  const config = Object.assign({
    connectionUrl: null,
    prefetch: null,
  }, _config);

  return Object.freeze({
    publish,
    consume,
  });

  async function connect() {
    info(`Connecting to: ${config.connectionUrl}`);
    const _connection = await (config.connectionUrl === null ? amqp.connect() : amqp.connect(config.connectionUrl));
    info(`Connected to: ${config.connectionUrl}`);
    process.once('SIGINT', _connection.close.bind(_connection));
    _connection.on('close', err => {
      error(`Connection closed.`);
      connection = null;
    });

    return _connection;
  }

  function getConnection() {
    if (connection === null) {
      connection = connect();
    }
    return connection;
  }

  async function assertChannel(queueName) {
    const _connection = await getConnection();
    const _channel = await _connection.createChannel();
    await _channel.assertQueue(queueName, {
      durable: true,
    });
    if (config.prefetch !== null) {
      await _channel.prefetch(config.prefetch);
    }
    return _channel;
  }

  function getChannel() {
    if (channel === null) {
      channel = assertChannel();
    }
    return channel;
  }

  async function publish(queueName, payload) {
    const channel = await getChannel(queueName);
    debug(`PUBLISH [${queueName}]: ${new Buffer(payload).toString()}`);
    return channel.sendToQueue(queueName, new Buffer(payload));
  }

  async function consume(queueName, consumer) {
    const channel = await getChannel(queueName);
    const consumingResult = await channel.consume(queueName, async msg => {
      if (msg !== null) {
        debug(`CONSUME [${queueName}:${msg.fields.deliveryTag}]: ${msg.content.toString()}`);
        try {
          await consumer(msg.content.toString());
          debug(`ACK ${msg.fields.deliveryTag}`);
          await channel.ack(msg);
        } catch (err) {
          await channel.nack(msg);
          throw err;
        }
      }
    });
    info(`Consuming on: ${queueName}`);
    return getCancelConsume(channel, consumingResult.consumerTag);
  }

  function getCancelConsume(channel, consumerTag) {
    return () => {
      return channel.cancel(consumerTag);
    }
  }
};

