const socket = io();

let isAlreadyCalling = false;
let getCalled = false;

const { RTCPeerConnection, RTCSessionDescription } = window;

const peerConnection = new RTCPeerConnection();

async function callUser(socketId) {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

  socket.emit("call-user", {
    offer,
    to: socketId,
  });
}

function unselectUser() {
  const alreadySelectedUser = document.querySelectorAll(
    ".active-user.active-user--selected",
  );
  alreadySelectedUser.forEach((element) => {
    element.setAttribute("class", "active-user");
  });
}

function createUserItems(socketId) {
  const userContainer = document.createElement("div");
  const username = document.createElement("p");
  userContainer.setAttribute("class", "active-user");
  userContainer.setAttribute("id", socketId);
  username.setAttribute("class", "username");
  username.innerHTML = `User: ${socketId}`;
  userContainer.appendChild(username);

  userContainer.addEventListener("click", () => {
    unselectUser();
    userContainer.setAttribute("class", "active-user active-user--selected");
    const talkingWithInfo = document.getElementById("talking-with-info");
    talkingWithInfo.innerHTML = `Talking with User: ${socketId}`;
    callUser(socketId);
  });
  return userContainer;
}

function updateUserList(users) {
  const activeUsersContainer = document.getElementById(
    "active-users-container",
  );

  users.forEach((socketId) => {
    const userExist = document.getElementById(socketId);
    if (!userExist) {
    }
    const userContainer = createUserItems(socketId);
    activeUsersContainer.appendChild(userContainer);
  });
}

socket.on("update-user-list", ({ users }) => {
  updateUserList(users);
});

socket.on("remove-user", ({ socketId }) => {
  const user = document.getElementById(socketId);
  if (user) {
    user.remove();
  }
});

socket.on("call-made", async (data) => {
  if (getCalled) {
    const confirmed = confirm(
      `User: ${data.socket} wants to call you. Do you accept the call?`,
    );
    if (!confirmed) {
      socket.emit("reject-call", {
        from: data.socket,
      });
      return;
    }
  }

  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(data.offer),
  );
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

  socket.emit("make-answer", {
    answer,
    to: data.socket,
  });

  getCalled = true;
});

socket.on("answer-made", async (data) => {
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(data.answer),
  );
  if (!isAlreadyCalling) {
    callUser(data.socket);
    isAlreadyCalling = true;
  }
});

socket.on("call-rejected", (data) => {
  alert(`User: ${data.socket} rejected your call!`);
  unselectUser();
  const talkingWithInfo = document.getElementById("talking-with-info");
  talkingWithInfo.innerHTML = `Please select a active user to start calling`;
});

peerConnection.ontrack = function ({ streams: [stream] }) {
  const remoteVideo = document.getElementById("remote-video");

  if (remoteVideo) {
    remoteVideo.srcObject = stream;
  }
};

navigator.mediaDevices
  .getUserMedia({ video: true, audio: true })
  .then((stream) => {
    const localVideo = document.getElementById("local-video");
    if (localVideo) {
      localVideo.srcObject = stream;
    }
    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });
  })
  .catch((error) => {
    console.log(error.message);
  });
