"use strict";

const _ = require("lodash");
const URI = require("urijs");
const SureFlapAPI = require("./api");

class SureFlapWatcher {
  constructor(timeline, opt) {
    Object.assign(this, { recent: 1, since: null }, opt || {}, { timeline });
  }

  async poll() {
    const res = await this.timeline.get(
      this.since === null
        ? { page_size: this.recent }
        : { since_id: this.since }
    );
    if (!res.data) return [];
    this.since = res.data[0].id;
    return _.reverse(res.data);
  }
}

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

  watcher(opt) {
    return new SureFlapWatcher(this, opt);
  }
}

module.exports = SureFlapTimeline;
