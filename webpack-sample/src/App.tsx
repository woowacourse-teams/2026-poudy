import { useState } from "react";
import "./App.css";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main>
      <h1>Poudy</h1>
      <p>Count: {count}</p>
      <button type="button" onClick={() => setCount((current) => current + 1)}>
        Increment
      </button>
    </main>
  );
}
