# RabbitMQ Tutorial 2 - Work Queues
  - 다중 작업자!!
  - Round-robin dispatching
  - Message acknowledgment
  - Message durability
  - Fair dispatch

---

## Work Queues
  ### 1. Work Queues
  - 다중 작업자들 사이에서 분산되고 시간이 걸리는 작업에 사용되는 work queue를 생성
  - 자원 집약적인 task를 즉시 동작하게 하고 그 task가 완료될 때까지 기다리게 하는 것을 피하기 위해 사용
  - 대신 그 작업을 나중에 동작하도록 예약
  - task를 메시지로 요약하여 queue에 전송
  - 백그라운드에서 동작하는 Work process는 그 업무를 끄집어 내고 최종적으로 작업을 실행
  - 많은 worker 들을 실행시키면 그 task 들은 worker들 사이에 공유될 것이다.
  -  짧은 HTTP 요청 윈도우동안 복잡한 작업을 다루는 것이 불가능한 웹 애플리케이션에서 매우 유용

  ![](https://github.com/Lee-KyungSeok/RabbitMQ-Study/blob/master/tutorial-work_queues/picture/tut1.png)

  ### 2. 준비
  - 시간이 걸리는 작업을 `setTimeout` 을 통하여 억지로 만들어 보았다.
  - 즉, `Hello...` 와 같이 보내면 `.` 의 개수만큼 3초정도 걸리도록 만든다.

  > new_task.js

  ```javascript
  // msg 를 commandline에서 받을 수 있게 한다.
  var msg = process.argv.slice(2).join(' ') || "Hello World!";
  ```

  > worker.js

  ```javascript
  ch.consume(q, function (msg) {
      // dot에 따라 작업량을 1초씩 늘이기 위해 변수를 선언
      var secs = msg.content.toString().split('.').length -1;

      console.log(" [x] Received %s", msg.content.toString());
      // 점의 갯수만큼 늘이도록 fake를 쓴다.
      setTimeout(function () {
          console.log(" [x] Done, %s", secs);
      }, secs * 1000);
  }, {noAck: true});
  ```

  ### 3. Round-robin dispatching
  - Task qeue를 사용하는 이점 중 하나는 쉽게 병렬 작업을 할  수 있기 때문
  - 동시에 두 개의 Worker 클래스를 실행하게 되면 작업은 순서대로 하나씩 실행시키게 된다.
  - 즉, RabbitMQ는 기본적으로 순차적으로  consumer에게 메세지를 각각 전달

  ![](https://github.com/Lee-KyungSeok/RabbitMQ-Study/blob/master/tutorial-work_queues/picture/tut2.png)

  ### 4. Message acknowledgment (메시지 승인)
  - 작업을 수행하던 도중에 worker가 죽게 되었을 경우 문제가 발생할 가능성이 있으므로, 완료되지 않은 메시지를 잃어버리지 않아야 한다.
  - 이를 위한 것이 바로 "Message acknowledgment"
  - Consumer 가 메시지를 처리했으면 RabbitMQ 에게 __ack__ (acknowledgment) 를 되돌려주어 메시지를 처리했음을 알려주고, RabbitMQ 는 그 메시지를 지운다.
  - 만약 __ack__ 를 받지 못한다면, 그 메시지를 다시 큐잉한다.
  - `noAck` 속성을 fakse로 설정하게 되면 메시지승인을 사용한다는 뜻이다.

  ```javascript
  ch.consume(q, function (msg) {
      // 로직 수행
      ch.ack(msg);
  }, {noAck: true}); // Message acknowledgment 사용
  ```

  ### 5. Message durability
  - RabbitMQ 가 죽게되었을 때 `Queue` 와 `Message` 를 모두 잃어버면 안된다.
  - `Queue` 를 durabile 로 선언
    - 그러나 이 때 이미 존재하는 queue 를 파라미터로 재정의 하는 것은 허용하지 않는 것에 주의 하자. (즉, 같은 이름의 queue 를 재정의하는 것은 허용하지 않는다.)
  - `Message` 를 persistent 하도록 선언
  - 참고 (메시지의 영속성)
    - 메시지를 영속적으로 설정하더라도 메시지는 잃어버릴 수 있다
    - 비록 RabbitMQ에게 메시지를 디스크에 저장하라고 하더라도, RabbitMQ가 메시지를 받고 아직 저장하지 않은 짧은 시간이 존재
    - 더 강한 보증이 필요하다면, [publisher confirm](https://www.rabbitmq.com/confirms.html) 을 사용

  ```javascript
  ch.assertQueue('task_queue', {durable: true});
  ch.sendToQueue(q, new Buffer(msg), {persistent: true});
  ```

  ### 6. Fair dispatch
  - 만약 Round robin 만을 이용할 경우 분배가 원하는 대로 동작하지 않을 수 있다.
    - ex> 홀수번째는 무겁고 짝수번째는 가벼운 경우 한 consumer 는 바쁘고, 나머지 consumer 는 쉬는 경우가 많게 된다.
  - 여기서 `prefetch` 의 개수를 지정해 주어 한번에 몇개의 메시지를 주도록 하는지 설정할 수 있다. (보통 1개를 초과한 메시지를 주지 않는다.)
  -

  ```javascript
  ch.prefetch(1);
  ```

---

## Code & Result
  ### 1. new_task.js
  - task의 전체 코드

  ```javascript
  var amqp = require('amqplib/callback_api');

  amqp.connect('amqp://localhost', function (err, conn) {
      conn.createChannel(function (err, ch) {
          var q = 'task_queue';
          var msg = process.argv.slice(2).join(' ') || "Hello World!";

          ch.assertQueue(q, {durable: true}); // durable 한 queue를 정의
          ch.sendToQueue(q, new Buffer(msg), {persistent: true}); // 메시지를 영속적이 되도록 선언
          console.log(" [x] Sent '%s", msg);
      });
      setTimeout(function () {
          conn.close();
          process.exit(0);
      }, 500);
  });
  ```

  ### 2. worker.js
  - worker 의 전체 코드

  ```javascript
  var amqp = require('amqplib/callback_api');

  amqp.connect('amqp://localhost', function (err, conn) {
     conn.createChannel(function (err, ch) {
         var q = 'task_queue';

         ch.assertQueue(q, {durable: true}); // durable한 queue 를 선언
         ch.prefetch(1); // Fair dispatch
         console.log("[*] Waiting for messages in %s. To exit press CTRL+C", q);
         ch.consume(q, function (msg) {
             var secs = msg.content.toString().split('.').length -1;

             console.log(" [x] Received %s", msg.content.toString());
             setTimeout(function () {
                 console.log(" [x] Done, %s", secs);
                 ch.ack(msg); // ack를 RabbitMQ에 전달
             }, secs * 1000);
         }, {noAck: false}); // Message Acknowledgment 를 이용
     })
  });
  ```

---
