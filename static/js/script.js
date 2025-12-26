let localStream;
let remoteStream;
let peerConnection;
const ws = new WebSocket('ws://localhost:8080/ws');

const servers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

/* GETTING SELF CAMERA */
async function start_camera() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  document.getElementById('local_video').srcObject = localStream;

  /* MAKE WebRTC CONNECTION */
  peerConnection = new RTCPeerConnection(servers);

  /* ADD OWN STREAM */
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  /* GOTTED STREAM */
  peerConnection.ontrack = (event) => {
    remoteStream = event.streams[0];
    document.getElementById('remote_video').srcObject = remoteStream;
  };

  /* EXCHANGING ICE CANDIDATES */
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({
        type: 'ice-candidate',
        candidate: event.candidate
      }));
    }
  };
}

/* TURN OFF CAMERA */
function stop_camera() {
    // Остановить локальный поток
    /* STOP LOCAL STREAM */
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        document.getElementById('local_video').srcObject = null;
        localStream = null;
    }
    
    /* CLOSE RTC CONNECTION */
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    /* STOP STREAM */
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        document.getElementById('remote_video').srcObject = null;
        remoteStream = null;
    }
    
    console.log('Video call is over');
}


/* START CALLING */
async function call() {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  ws.send(JSON.stringify({
    type: 'offer',
    offer: offer
  }));
}

/* ANALY SIGNALS FROM OTHER USER */
ws.onmessage = async (message) => {
  const data = JSON.parse(message.data);

  if (data.type === 'offer') {
    await peerConnection.setRemoteDescription(data.offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    ws.send(JSON.stringify({
      type: 'answer',
      answer: answer
    }));
  } else if (data.type === 'answer') {
    await peerConnection.setRemoteDescription(data.answer);
  } else if (data.type === 'ice-candidate') {
    await peerConnection.addIceCandidate(data.candidate);
  }
};

window.start_camera = start_camera;
window.stop_camera  = stop_camera;
window.call = call;
