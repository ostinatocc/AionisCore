import { render } from "preact";
import { App } from "./app";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Playground could not find #root element in index.html");
}
render(<App />, root);
