package main

import (
    "log"
    "net/http"
    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool { return true },
}
var clients = make(map[*websocket.Conn]bool)

func handle_web_socket(w http.ResponseWriter, r *http.Request) {
    conn, _ := upgrader.Upgrade(w, r, nil)
    clients[conn] = true
    
    defer func() {
        delete(clients, conn)
        conn.Close()
    }()
    
    for {
        _, msg, err := conn.ReadMessage()
        if err != nil {
            break
        }
        
				/* SEND OTHERS */
        for client := range clients {
            if client != conn {
                client.WriteMessage(websocket.TextMessage, msg)
            }
        }
    }
}

func main() {
    http.HandleFunc("/ws", handle_web_socket)
    http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "static/index.html")
    })
    
    log.Fatal(http.ListenAndServe(":8080", nil))
}
