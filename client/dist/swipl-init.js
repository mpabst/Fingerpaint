let bindings = null;
let engine = null;
let stdin = "";
let stdinPosition = 0;
// We use this to provide data into
// the SWI stdin.
const setStdin = (string) => {
  stdin = string;
  stdinPosition = 0;
};
const readStdin = () => {
  if (stdinPosition >= stdin.length) {
    return null;
  } else {
    const code = stdin.charCodeAt(stdinPosition);
    stdinPosition++;
    return code;
  }
};
// const output = document.getElementById("output");
// const input = document.getElementById("input");
// const editor = document.getElementById("editor");

// Helper function to call a query.
const query = (bindings, input) => {
  // Show the query in the console output.
  const node = document.createTextNode(input + "\n");
  output.appendChild(node);
  setStdin(input);
  // This will execute one iteration of toplevel.
  call(bindings, "break"); // see call.js
};

// input.addEventListener(
//   "submit",
//   (e) => {
//     e.preventDefault();
//     query(bindings, e.target.elements.query.value);
//     e.target.elements.query.value = "";
//   },
//   false
// );

// editor.addEventListener(
//   "submit",
//   (e) => {
//     e.preventDefault();
//     FS.writeFile("/file.pl", e.target.elements.file.value);
//     query(bindings, "consult('/file.pl').");
//   },
//   false
// );

// Helper to print stdout from SWI.
const print = (line) => {
  // output.appendChild(document.createTextNode(line + "\n"));
  console.log(line);
};

// Helper to print stderr from SWI.
const printErr = (line) => {
  // const node = document.createElement("span");
  // node.className = "output-error";
  // node.textContent = line + "\n";
  // output.appendChild(node);
  console.error(line);
};

// Creates bindings to the SWI foreign API.
const createBindings = (module) => {
  return {
    PL_initialise: module.cwrap("PL_initialise", "number", [
      "number",
      "number",
    ]),
    PL_new_term_ref: module.cwrap("PL_new_term_ref", "number", []),
    PL_chars_to_term: module.cwrap("PL_chars_to_term", "number", [
      "string",
      "number",
    ]),
    PL_call: module.cwrap("PL_call", "number", ["number", "number"]),
  };
};

// Helper function to parse a JavaScript
// string into a Prolog term and call is as a query.
const call = (bindings, query) => {
  const ref = bindings.PL_new_term_ref();
  if (!bindings.PL_chars_to_term(query, ref)) {
    throw new Error("Query has a syntax error: " + query);
  }
  return !!bindings.PL_call(ref, 0);
};

// This will set up the arguments necessary for the PL_initialise
// function and will call it.
// See http://www.swi-prolog.org/pldoc/doc_for?object=c(%27PL_initialise%27)
const initialise = (bindings, module) => {
  const argvArray = [
    module.allocate(
      module.intArrayFromString("swipl"),
      "i8",
      module.ALLOC_NORMAL
    ),
    module.allocate(module.intArrayFromString("-x"), "i8", module.ALLOC_NORMAL),
    module.allocate(
      module.intArrayFromString("wasm-preload/swipl.prc"),
      "i8",
      module.ALLOC_NORMAL
    ),
    module.allocate(
      module.intArrayFromString("--nosignals"),
      "i8",
      module.ALLOC_NORMAL
    ),
  ];
  const argvPtr = module._malloc(argvArray.length * 4);
  for (let i = 0; i < argvArray.length; i++) {
    module.setValue(argvPtr + i * 4, argvArray[i], "*");
  }
  if (!bindings.PL_initialise(4, argvPtr)) {
    throw new Error("SWI-Prolog initialisation failed.");
  }
  // Set the path of the preloaded (from swipl-web.dat) standard library.
  // This makes it possible to call use_module(library(lists)) and so on.
  call(
    bindings,
    "assert(user:file_search_path(library, 'wasm-preload/library'))."
  );
};

// Stub Module object. Used by swipl-web.js to
// populate the actual Module object.
window.Module = {
  noInitialRun: true,
  locateFile: (url) => `../dist/${url}`,
  print: print,
  printErr: printErr,
  preRun: [() => FS.init(readStdin)], // sets up stdin
  onRuntimeInitialized: async () => {
    // document.getElementById("top").className = undefined;
    // Bind foreign functions to JavaScript.
    bindings = createBindings(Module);
    // Initialise SWI-Prolog.
    initialise(bindings, Module);
    engine = new Engine()
    await engine.init()
  },
};
