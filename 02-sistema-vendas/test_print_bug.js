const { JSDOM } = require("jsdom");
const fs = require("fs");

const dom = new JSDOM(fs.readFileSync("index.html", "utf8"), { runScripts: "outside-only", url: "http://localhost/" });
const w = dom.window;
w.Chart = function () { return { destroy: function () {} }; };
w.HTMLCanvasElement.prototype.getContext = function () { return {}; };
w.alert = function (m) { console.log("ALERT:", m); };

var lastFake = null;
function fakeWin() {
  var fake = {
    closed: false,
    document: { _html: "", write: function (s) { fake.document._html += s; }, close: function () {}, addEventListener: function () {} },
    close: function () { fake.closed = true; },
    print: function () { console.log("window.print() FOI CHAMADO"); }
  };
  lastFake = fake;
  return fake;
}
w.open = function () { return fakeWin(); };

w.eval(fs.readFileSync("script.js", "utf8"));
w.document.dispatchEvent(new w.Event("DOMContentLoaded"));

try {
  w.imprimirFicha(1724670000000);
  console.log("imprimirFicha: executou sem throw");
  console.log("--- HTML ESCRITO NA JANELA (imprimirFicha) ---");
  console.log(lastFake.document._html.length + " caracteres escritos");
  console.log(lastFake.document._html.slice(-500));
} catch (e) {
  console.log("ERRO imprimirFicha:", e.message);
}

try {
  w.imprimirViaCliente(1724670000000);
  console.log("imprimirViaCliente: executou sem throw");
} catch (e) {
  console.log("ERRO imprimirViaCliente:", e.message);
}

process.exit(0);
