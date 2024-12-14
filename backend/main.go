package main

import (
    "github.com/gorilla/websocket"
    "log"
    "net/http"
    "os/exec"
    "runtime"
    "bytes"
)

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool {
        return true // Don't use in production without proper origin checks
    },
}

type Command struct {
    cmd    *exec.Cmd
    stdin  bytes.Buffer
    stdout bytes.Buffer
    stderr bytes.Buffer
}

func handleWs(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println("Upgrade error:", err)
        return
    }
    defer conn.Close()

    // Determine shell based on OS
    var shell, shellArg string
    if runtime.GOOS == "windows" {
        shell = "cmd"
        shellArg = "/c"
    } else {
        shell = "bash"
        shellArg = "-c"
    }

    log.Printf("New WebSocket connection established")

    for {
        // Read message from browser
        _, msg, err := conn.ReadMessage()
        if err != nil {
            log.Println("Read error:", err)
            break
        }

        // Create and execute command
        cmd := exec.Command(shell, shellArg, string(msg))
        var stdout, stderr bytes.Buffer
        cmd.Stdout = &stdout
        cmd.Stderr = &stderr

        err = cmd.Run()
        
        // Send command output back to client
        if stdout.Len() > 0 {
            if err := conn.WriteMessage(websocket.TextMessage, stdout.Bytes()); err != nil {
                log.Println("Write error:", err)
                break
            }
        }
        
        if stderr.Len() > 0 {
            if err := conn.WriteMessage(websocket.TextMessage, stderr.Bytes()); err != nil {
                log.Println("Write error:", err)
                break
            }
        }

        if err != nil {
            if err := conn.WriteMessage(websocket.TextMessage, []byte("Error: "+err.Error())); err != nil {
                log.Println("Write error:", err)
                break
            }
        }
    }
}

func main() {
    http.HandleFunc("/ws", handleWs)
    
    log.Println("Starting server on :8080")
    if err := http.ListenAndServe(":8080", nil); err != nil {
        log.Fatal(err)
    }
}