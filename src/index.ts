import { ClassA } from "./ClassA";

function main() {
  const element = document.createElement("div");

  const a = new ClassA();
  element.innerHTML = a.getString();
  document.body.appendChild(element);

  import(/* webpackChunkName: "chunk1" */ "./chunk1/Class1C").then(({ Class1C }) => { 
      var c = new Class1C();
      c.addText();
  });
}
main();
