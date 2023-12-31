import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./UserContext";
import { useContext, useEffect, useState } from "react";
export default function Chat() {
  const { setUsername, setId } = useContext(UserContext);
  const [ws, setWs] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [message, setMessage] = useState([]);
  const { username, id } = useContext(UserContext);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4040");
    setWs(ws);
    ws.addEventListener("message", handleMessage);
  }, []);

  function showOnlineUsers(usersArr) {
    const users = {};
    usersArr.forEach(({ userId, username }) => {
      users[userId] = username;
    });
    setOnlineUsers(users);
  }

  function handleMessage(e) {
    
    const messageData = JSON.parse(e.data);
    console.log({e, messageData})
    if ("onlineUserData" in messageData) {
      showOnlineUsers(messageData.onlineUserData);
    } else if ('text' in messageData) {
      setMessage(prev => ([...prev, {isOur:false, text: messageData.text}]))
    }
  }

  function sendMessage(e) {
    e.preventDefault();
    ws.send(
      JSON.stringify({        
          recipient: selectedUserId,
          text: newMessage,        
      })
    );
    setNewMessage('');
    setMessage(prev => ([...prev, {text: newMessage, isOur : true}]))
  }

  const onlineUsersExclOurUser = { ...onlineUsers };
  delete onlineUsersExclOurUser[id];

  const messagesWithoutDupes = messages;

  return (
    <>
      <button
        onClick={() => {
          setUsername(null);
          setId(null);
        }}
      >
        Clear user context state
      </button>

      <div className="flex h-screen">
        <div className="bg-white w-1/3">
          <Logo />
          {Object.keys(onlineUsersExclOurUser).map((userId) => (
            <div
              key={userId}
              onClick={() => setSelectedUserId(userId)}
              className={
                "border-b border-gray-100 flex items-center gap-2 cursor-pointer " +
                (userId === selectedUserId ? "bg-blue-50" : "")
              }
            >
              {userId === selectedUserId && (
                <div className="w-1 bg-blue-500 h-12 rounded-r-md"></div>
              )}
              <div className="flex gap-2 py-2 pl-4 items-center">
                <Avatar username={onlineUsers[userId]} userId={userId} />
                <span className="text-gray-800">{onlineUsers[userId]}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col bg-blue-50 w-2/3 p-2">
          <div className="flex-grow">
            {!selectedUserId && (
              <div className="flex h-full items-center justify-center">
                <div className="text-gray-300">
                  &larr; Select a friend to chat!
                </div>
              </div>
            )}
            {!!selectedUserId && (
              <div>
                {messages.map(message => (
                  <div>{message.text}</div>
                ))}
              </div>
            )}
          </div>
          {!!selectedUserId && (
            <form className="flex gap-2" onSubmit={sendMessage}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message here"
              className="bg-white flex-grow border rounded-sm p-2"
            />
            <button type="submit" className="bg-blue-500 p-2 text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
          )}
          
        </div>
      </div>
    </>
  );
}
