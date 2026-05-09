'use strict';

/**
 * Bundle must stay under api/ — requiring paths under backend/ pulls the whole backend folder
 * (including Nest TypeScript sources) into the Lambda; bytecode then re-compiles decorators and crashes.
 * Build: npm --prefix backend run build → emits api/nest-handler.cjs; runtime deps resolve from repo root node_modules.
 */
const mod = require('./nest-handler.cjs');
module.exports = mod.default;
