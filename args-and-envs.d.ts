'use strict';

import Parser from "./src/parser";

declare module 'args-and-envs' {
  type ArgType = number|boolean|string|Array<string>;

  export Parser;
  export {
    ArgType,
    Parser
  }
}

