# RabbitMQ - 튜토리얼 1
  - Producer, Queue, Consumer 정의
  - Message Send & Receive

---

## Producer, Queue, Consumer
  ### 0. broker
  - RabbitMQ는 메시지 브로커
  - 메시지들을 받고 전달한다.

  ### 1. Producer
  - 메시지를 보내는 일 수행

  ### 2. Queue
  - 메시지는 오직 queue안에서만 저장될 수 있다.
  - 즉, 하나의 큰 메시지 공간
  - 많은 producer들은 메시지들을 하나의 queue로 보내고, 많은 consumer들은 하나의 queue로부터 데이터를 받으려고 할 수 있다.

  ### 3. Consumer
  - 대부분 메시지들을 받기 위해 대기하고 있는 프로그램

  ![](https://github.com/Lee-KyungSeok/RabbitMQ-Study/blob/master/tutorial-helloworld/picture/tut1.png)

---

## Message Send & Receive
  ### 0. 설치 및 서버 연결
  - node로 실행할 것!
  - 설치 : `npm install amqplib --save`
  - 서버 연결
    - 모듈 추출
    - 서버 연결
    - 채널 생성 (대부분의 API들의 수행이 이 안에서 이루어짐)

  ```javascript
  #!/usr/bin/env node

  // 모듈 추출
  var amqp = require('amqplib/callback_api');

  // RabbitMQ 서버 연결
  amqp.connect('amqp://localhost', function(err, conn) {
      // Channel 생성
      conn.createChannel(function(err, ch) {
          // Logic //
      });
  });
  ```

  ### 1. Sending
  - publisher는 RabbitMQ에 연결하고, 싱글 메시지들을 보내고 난 뒤 나간다.
  - Queue를 선언하는 것을 idempotent (멱등성) 이다.
    - idempotent : 연산을 여러 번 적용하도라도 결과가 달라지 않은 성질 (읽기 전용 메서드와 같이 일반적으로 서버 측의 어떤 상태도 변경하지 못하는 메서드)
    - 큐가 존재하지 않을 경우, 유일하게 만들어 져야 한다.
  - 메시지 내용은 바이트 배열로 인코딩 가능
  - 마지막에 `connection` 을 닫고 종료한다.

  ```javascript
  var amqp = require('amqplib/callback_api');

  amqp.connect('amqp://localhost', function (err, conn) {
      conn.createChannel(function (err, ch) {
          // 보낼 queue와 Message 선언
          var q = "hello";
          var msg = 'Hello World!';
          // 사용하기 위한 queue 선언
          ch.assertQueue(q, {durable: false});

          // queue에 메시지를 publish
          // Note: on Node 6 Buffer.from(msg) should be used
          ch.sendToQueue(q, new Buffer(msg));
          console.log(" [x] Sent %s", msg);
      });

      setTimeout(function () {
          // connection 을 닫고 종료
          conn.close();
          process.exit(0)
      }, 500);
  });
  ```

  ### 2. Receiving
  - consumer는 RabbitMQ로부터 메세지를 푸쉬받는다.
  - 메시지들을 대기하기 위한 동작을 유지학 메시지들을 출력
  - 메시지를 consume 할 때 메시지들을 버퍼할 객체의 형태안에서 콜백을 제공

  ```javascript
  var amqp = require('amqplib/callback_api');

  amqp.connect('amqp://localhost', function (err, conn) {
      conn.createChannel(function (err, ch) {
          var q = 'hello';

          // 사용하기 위한 queue를 선언
          ch.assertQueue(q, {durable: false});

          console.log("[*] Waiting for messages in %s. To exit press CTRL+C", q);
          // RabbitMQ 에 message가 push 되면 callback으로 이를 받아옴
          ch.consume(q, function (msg) {
              console.log("[x] Received %s", msg.content.toString());
          }, {noAck: true});
      })
  });
  ```

  ### 3. 결과
  - `receive` 를 실행시키면 이는 running 상태로 대기하다가 `send` 를 실행 시키는 순간 이를 받아서 처리하게 된다.

  ![](https://github.com/Lee-KyungSeok/RabbitMQ-Study/blob/master/tutorial-helloworld/picture/tut2.png)
