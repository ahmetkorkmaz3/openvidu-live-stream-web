var OV;
var session;
var user;

/* İzleyici sayısı */
Object.size = function(obj) {
  var size = 0, key;
  for (key in obj) {
      if (obj.hasOwnProperty(key)) size++;
  }
  return size;
};
/* İzleyici sayısı bitiş */

/* Publisher */
function joinSession() {

	var mySessionId = document.getElementById("sessionId").value;

	OV = new OpenVidu();
	session = OV.initSession();

	session.on("streamCreated", function (event) {
		session.subscribe(event.stream, "subscriber");
	});

	getToken(mySessionId).then(token => {

		session.connect(token)
			.then(() => {
        document.getElementById("join").style.display = "none";
        document.getElementById("session").style.display = "block";        
        document.getElementById("subscriber").style.display = "none";
        document.getElementById("publisher").style.display = "block";
        document.getElementById("chat").style.display = "block";
        user = {
          name: document.getElementById("username").value,
          avatar: "resim.jpg"
        };
				var publisher = OV.initPublisher("publisher");
        session.publish(publisher);


			})
			.catch(error => {
				console.log("There was an error connecting to the session:", error.code, error.message);
			});
  });
  
  /* Chat için sinyal takibini yapıyor. */
  session.on('signal:my-chat', (event) => {
    $('#chat').append("<div class='bubbleWrapper'> <div class='inlineContainer'><img class='inlineIcon' src='./assets/img/" + JSON.parse(event.data).userAvatar + "'><div class='otherBubble other'> " + JSON.parse(event.data).message + "</div></div></div>");
    var elem = document.getElementById('chat');
    elem.scrollTop = elem.scrollHeight;
  });

  /* İzleyici sayısı için sinyal takibi yapıyor. */
  session.on('signal:subs', (event) => {
    $('#subscribers').html('<i class="fa fa-users"></i> ' + event.data);
  });
}
/* Publisher bitiş */

/* İzleyici */
function joinSessionSubscriber() {
  var mySessionId = document.getElementById("sessionId").value;
  
	OV = new OpenVidu();
	session = OV.initSession();

  session.on("streamCreated", function (event) {
		session.subscribe(event.stream, "subscriber");
	});

  getToken(mySessionId).then(token => {
    session.connect(token)
    .then(() => {
      document.getElementById("join").style.display = "none";
      document.getElementById("session").style.display = "block";
      document.getElementById("publisher").style.display = "none";
      document.getElementById("chat").style.display = "block";
      document.getElementById("chat-send").style.display = "block";
      user = {
        name: document.getElementById("username").value,
        avatar: "resim2.jpg"
      };
      /* İzleyici katıldı bilgisi sinyali */
      var messageData = {
        message: user.name + " kullanıcısı yayına katıldı.",
        userAvatar: user.avatar
      };
      session.signal({
        data: JSON.stringify(messageData),
        to: [],
        type: 'my-chat'
      })
      .then(() => {
        console.log('yayına katıldınız.');
      })
      .catch(error => {
        console.log(error);
      });
      /* Bitiş */
      
      /* İzleyici sayısı için sinyal */
      session.signal({
        data: Object.size(session.connection.session.remoteConnections),
        to: [],
        type: 'subs'
      })
      .then(() => {
        console.log('yeni izleyici');
      })
      .catch(error => {
        console.log(error);
      });
      /* Bitiş */
    })
    .catch(error => {
      console.log("error");
    });
  });
  session.on('signal:my-chat', (event) => {
    $('#chat').append("<div class='bubbleWrapper'> <div class='inlineContainer'><img class='inlineIcon' src='./assets/img/" + JSON.parse(event.data).userAvatar + "'><div class='otherBubble other'> " + JSON.parse(event.data).message + "</div></div></div>");
    var elem = document.getElementById('chat');
    elem.scrollTop = elem.scrollHeight;
  });
  
  session.on('signal:subs', (event) => {
    $('#subscribers').html('<i class="fa fa-users"></i> ' + event.data);
  });

  /* Publisher Çıkış yapınca sinyal  */
  session.on('signal:exit', (event) => {
      Swal.fire({
        type: 'error',
        title: 'Yayın bitti',
        text: event.data + ' yayını bitirdi!',
        button: 'Tamam'
      })
      .then(function() {
        window.location.replace("https://guvercinsepetim.com");
      });
  });
  /* Bitiş */
}
/* İzleyici Bitiş */

function sendMessage() {
  var messageData = {
    message: $('#message').val(),
    username: user.name,
    userAvatar: user.avatar
  };
  $('#message').val("");
  session.signal({
    data: JSON.stringify(messageData),  // Any string (optional)
    to: [],                     // Array of Connection objects (optional. Broadcast to everyone if empty)
    type: 'my-chat'             // The type of message (optional)
  })
  .then(() => {
    console.log('Message successfully sent');
  })
  .catch(error => {
    console.error(error);
  });
}

function leaveSession() {
	session.disconnect();
	document.getElementById("join").style.display = "block";
	document.getElementById("session").style.display = "none";
}

window.onbeforeunload = function () {
	if (session) session.disconnect()
};


/**
 * --------------------------
 * SERVER-SIDE RESPONSIBILITY
 * --------------------------
 * These methods retrieve the mandatory user token from OpenVidu Server.
 * This behavior MUST BE IN YOUR SERVER-SIDE IN PRODUCTION (by using
 * the API REST, openvidu-java-client or openvidu-node-client):
 *   1) Initialize a session in OpenVidu Server	(POST /api/sessions)
 *   2) Generate a token in OpenVidu Server		(POST /api/tokens)
 *   3) The token must be consumed in Session.connect() method
 */

var OPENVIDU_SERVER_URL = "https://167.71.240.125:4443";
var OPENVIDU_SERVER_SECRET = "maxithings";

function getToken(mySessionId) {
	return createSession(mySessionId).then(sessionId => createToken(sessionId));
}

function createSession(sessionId) { // See https://openvidu.io/docs/reference-docs/REST-API/#post-apisessions
	return new Promise((resolve, reject) => {
		$.ajax({
			type: "POST",
			url: OPENVIDU_SERVER_URL + "/api/sessions",
			data: JSON.stringify({ customSessionId: sessionId }),
			headers: {
				"Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
				"Content-Type": "application/json"
			},
			success: response => resolve(response.id),
			error: (error) => {
				if (error.status === 409) {
					resolve(sessionId);
				} else {
					console.warn('No connection to OpenVidu Server. This may be a certificate error at ' + OPENVIDU_SERVER_URL);
					if (window.confirm('No connection to OpenVidu Server. This may be a certificate error at \"' + OPENVIDU_SERVER_URL + '\"\n\nClick OK to navigate and accept it. ' +
						'If no certificate warning is shown, then check that your OpenVidu Server is up and running at "' + OPENVIDU_SERVER_URL + '"')) {
						location.assign(OPENVIDU_SERVER_URL + '/accept-certificate');
					}
				}
			}
		});
	});
}

function createToken(sessionId) { // See https://openvidu.io/docs/reference-docs/REST-API/#post-apitokens
	return new Promise((resolve, reject) => {
		$.ajax({
			type: "POST",
			url: OPENVIDU_SERVER_URL + "/api/tokens",
			data: JSON.stringify({ session: sessionId }),
			headers: {
				"Authorization": "Basic " + btoa("OPENVIDUAPP:" + OPENVIDU_SERVER_SECRET),
				"Content-Type": "application/json"
			},
			success: response => resolve(response.token),
			error: error => reject(error)
		});
	});
}