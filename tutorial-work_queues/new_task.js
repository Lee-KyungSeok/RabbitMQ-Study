#!/usr/bin/env node

var amqp = require('amqplib/callback_api');

amqp.connect('amqp://localhost', function (err, conn) {
    conn.createChannel(function (err, ch) {
        var q = 'task_queue';
        var msg = process.argv.slice(2).join(' ') || "Hello World!";

        ch.assertQueue(q, {durable: true}); // RabbitMQ 가 죽어도 queue를 잊지 않게 한다.
        ch.sendToQueue(q, new Buffer(msg), {persistent: true}); // 메시지가 영속적이 되도록 한다.
        console.log(" [x] Sent '%s", msg);
    });
    setTimeout(function () {
        conn.close();
        process.exit(0);
    }, 500);
});

// 만약 메시지 영속성에 대해 더 강한 보증이 필요하다면, publisher confirm을 사용한다.
