from typing import List, Dict
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        # user_id -> List[WebSocket]
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        print(f"User {user_id} connected. Active users: {list(self.active_connections.keys())}")

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        print(f"User {user_id} disconnected.")

    async def send_personal_message(self, message: dict, user_id: int):
        """Send a message to a specific user"""
        if user_id in self.active_connections:
            message_str = json.dumps(message)
            # Iterate over a copy to avoid modification issues if disconnect happens during iteration
            for connection in self.active_connections[user_id][:]:
                try:
                    await connection.send_text(message_str)
                except Exception as e:
                    print(f"Error sending message to user {user_id}: {e}")
                    # Optionally remove dead connection
                    # self.disconnect(connection, user_id)

manager = ConnectionManager()
