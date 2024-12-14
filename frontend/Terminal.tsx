import React, { useEffect, useRef, useState } from "react";

interface TerminalProps {
  wsUrl?: string;
}

const Terminal: React.FC<TerminalProps> = ({
  wsUrl = "ws://localhost:8080/ws",
}) => {
  const [output, setOutput] = useState<string[]>([]);
  const [input, setInput] = useState<string>("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = new WebSocket(wsUrl);

    const handleOpen = () => {
      setConnected(true);
      setOutput((prev) => [...prev, "> Connected to terminal server"]);
    };

    const handleClose = () => {
      setConnected(false);
      setOutput((prev) => [...prev, "> Disconnected from terminal server"]);
    };

    const handleMessage = (event: MessageEvent) => {
      setOutput((prev) => [...prev, event.data]);
    };

    const handleError = (error: Event) => {
      setOutput((prev) => [...prev, `> Connection error: ${error}`]);
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("close", handleClose);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("error", handleError);

    setWs(socket);

    return () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("close", handleClose);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("error", handleError);
      socket.close();
    };
  }, [wsUrl]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(input);
      setOutput((prev) => [...prev, `$ ${input}`]);
      setInput("");
    }
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <div
        ref={terminalRef}
        className="bg-black text-green-500 p-4 rounded-t-lg h-96 overflow-y-auto font-mono"
      >
        {output.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap">
            {line}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex">
        <input
          type="text"
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setInput(e.target.value)
          }
          className="flex-1 bg-gray-900 text-green-500 p-2 font-mono focus:outline-none rounded-bl-lg"
          placeholder={connected ? "Enter command..." : "Connecting..."}
          disabled={!connected}
        />
        <button
          type="submit"
          className="bg-gray-900 text-green-500 px-4 py-2 font-mono rounded-br-lg hover:bg-gray-800"
          disabled={!connected}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Terminal;
