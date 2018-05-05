#!/usr/bin/env node

var amqp = require('amqplib/callback_api');

amqp.connect('amqp://localhost', function (err, conn) {
   conn.createChannel(function (err, ch) {
       var q = 'task_queue';

       ch.assertQueue(q, {durable: true});
       ch.prefetch(1); // 한번에 하나씩의 task만 받겠다.
       console.log("[*] Waiting for messages in %s. To exit press CTRL+C", q);
       ch.consume(q, function (msg) {
           var secs = msg.content.toString().split('.').length -1;

           console.log(" [x] Received %s", msg.content.toString());
           setTimeout(function () {
               console.log(" [x] Done, %s", secs);
               ch.ack(msg);
           }, secs * 1000);
       }, {noAck: false}); // 특정 메시지가 처리되었습을 queue에 알린다. (task가 중간에 중지될 경우 queue에 남아 메시지를 삭제시키지 않는다.)
   })
});