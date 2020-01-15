"use strict";

const SureFlapAPI = require("./api");
const URI = require("urijs");

class SureFlapTimeline {
  constructor(optOrAPI, path) {
    this.api = SureFlapAPI.bless(optOrAPI);
    this.path = path;
  }

  _uri(args) {
    const u = new URI(this.path);
    u.search(args);
    return u.toString();
  }

  get(args) {
    return this.api.call("GET", this._uri(args || {}));
  }
}

module.exports = SureFlapTimeline;
