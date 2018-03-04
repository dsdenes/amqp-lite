#amqp-lite
Opinionated, clean interface for publishing/consuming RabbitMQ channels.

# Install
```bash
$ npm i amqp-lite
```
### amqp(\<config:hash\>): \<Client\>
```javascript
const amqp = require('amqp-lite');
const client = amqp({
  prefetch: 1, // default: null
  connectionUrl: 'amqp://localhost' // default: amqp://localhost
});
```

### Client.consume(\<queueName: string\>, \<onMessage: func\>): \<cancelConsume: func\> 
```javascript
const cancelConsume = client.consume('testQueue', message => {});
await cancelConsume();
```

### Client.publish(\<queueName: string\>, \<message: string\>): \<Promise\> 
```javascript
await client.publish('testQueue', 'message1');
```

# Basic usage
```javascript

const amqp = require('amqp-lite');
const client = amqp(); // connects localhost

client.consume('testQueue', message => {
  console.log(`Message received: ${message}`);
});

client.publish('testQueue', 'message1');
client.publish('testQueue', 'message2');
client.publish('testQueue', 'message3');
```

# Async example
```javascript
const amqp = require('amqp-lite');
const client = amqp({
  connectionUrl: 'amqp://localhost:5432',
  prefetch: 1,
});

const cancelConsume = client.consume('testQueue', onMessage);

let messageCount = 0;
function onMessage(message) {
  return new Promise(resolve => {
    console.log(`Message received: ${message}`);
    
    if (++messageCount >= 2) {
      cancelConsume();
    }
    
    setTimeout(() => {
      console.log(`Message processed.`);
      resolve();
    }, 2000);
  }); 
}

client.publish('testQueue', 'message1');
client.publish('testQueue', 'message2');
client.publish('testQueue', 'message3');
client.publish('testQueue', 'message4');
```
 