"use strict";

const fetch = require("cross-fetch");
const _ = require("lodash");
const URI = require("urijs");

class SureFlapAPI {
  constructor(opt) {
    this.opt = Object.assign(
      {
        email_address: "",
        password: "",
        endpoint: "https://app.api.surehub.io",
        device_id: Math.floor(Math.random() * 0x7fffffff).toString()
      },
      opt || {}
    );
  }

  static bless(optOrAPI) {
    if (optOrAPI instanceof SureFlapAPI) return optOrAPI;
    return new this(optOrAPI);
  }

  endpoint(path) {
    return this.opt.endpoint + path;
  }

  async call(method, path, payload) {
    const tryCall = async () => {
      const login = await this.login();
      const opt = {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${login.token}`
        }
      };
      if (payload) opt.body = JSON.stringify(payload);
      const res = await fetch(this.endpoint(path), opt);
      const msg = await res.json();
      //      console.log(JSON.stringify({ path, opt, payload, msg }, null, 2));
      return msg;
    };

    //    console.log(`${method} ${this.endpoint(path)}`);

    const t1 = await tryCall();
    if (!t1.error) return t1;

    if (!/not be verified/.test(t1.error.message || ""))
      throw new Error(`Failed ${path}: ${JSON.stringify(t1.error)}`);

    // retry
    delete this._data;
    const t2 = await tryCall();
    if (t2.error)
      throw new Error(`Failed ${path}: ${JSON.stringify(t2.error)}`);

    return t2;
  }

  async callData(path, payload) {
    const msg = await this.call("GET", path, payload);
    return msg.data;
  }

  async factory(clazz, path, payload) {
    const msg = await this.callData(clazz._addWith(path), payload);
    if (_.isArray(msg)) return msg.map(obj => new clazz(this, obj));
    return new clazz(this, msg);
  }

  async report(path, args) {
    const u = new URI(path);
    if (args) {
      u.path(u.path() + "/aggregate");
      u.search(args);
    }
    return this.callData(u);
  }

  async _login() {
    const res = await fetch(this.endpoint("/api/auth/login"), {
      method: "POST",
      body: JSON.stringify(this.opt),
      headers: { "Content-Type": "application/json" }
    });
    const msg = await res.json();
    if (msg.error)
      throw new Error("Login failed: " + JSON.stringify(msg.error));
    return msg.data;
  }

  async login() {
    return (this._data = this._data || this._login());
  }

  async logout() {
    if (!this._data) return;

    await this.call("POST", "/api/auth/logout");
    delete this._data;
  }
}

module.exports = SureFlapAPI;
