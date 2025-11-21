import socketio

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
app = socketio.ASGIApp(sio)

rooms = {}
users = set()


@sio.event
async def connect(sid, environ):
    pass


@sio.event
async def join_channel(sid, channel, user):
    sio.enter_room(sid, channel)
    users.add(user)
    await sio.emit("presence", list(users))


@sio.event
async def leave_channel(sid, channel, user):
    sio.leave_room(sid, channel)


@sio.event
async def chat_message(sid, message):
    await sio.emit("chat_message", message, room=message["channel"])


@sio.event
async def disconnect(sid):
    pass
