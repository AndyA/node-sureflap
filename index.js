"use strict";

const _ = require("lodash");
const fetch = require("cross-fetch");
const moment = require("moment");

const PRODUCT_NAME = {
  1: "Hub",
  2: "Repeater",
  3: "Pet Door Connect",
  4: "Ped Feeder Connect",
  5: "Programmer",
  6: "DualScan Cat Flap Connect"
};

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
    const tryCall = async x => {
      const login = await this.login();
      const opt = {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${login.token + (x || "")}`
        }
      };
      if (payload) opt.body = JSON.stringify(payload);
      const res = await fetch(this.endpoint(path), opt);
      const msg = await res.json();
      //      console.log(JSON.stringify({ path, opt, payload, msg }, null, 2));
      return msg;
    };

    const t1 = await tryCall();
    if (!t1.error) return t1.data;

    if (!/not be verified/.test(t1.error.message || ""))
      throw new Error(`Failed ${path}: ${JSON.stringify(t1.error)}`);

    // retry
    delete this._data;
    const t2 = await tryCall();
    if (t2.error)
      throw new Error(`Failed ${path}: ${JSON.stringify(t2.error)}`);

    return t2.data;
  }

  async factory(clazz, path, payload) {
    const msg = await this.call("GET", path, payload);
    if (_.isArray(msg)) return msg.map(obj => new clazz(this, obj));
    return new clazz(this, msg);
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

class SureFlap {
  constructor(optOrAPI, data) {
    this.api = SureFlapAPI.bless(optOrAPI);
    this.data = data;
  }

  get id() {
    return this.data && this.data.id;
  }

  async login() {
    return this.api.login();
  }

  async logout() {
    return this.api.logout();
  }

  async household(id) {
    return this.api.factory(SureFlapHousehold, `/api/household/${id}`);
  }

  async households() {
    return this.api.factory(SureFlapHousehold, "/api/household");
  }

  async device(id) {
    return this.api.factory(SureFlapDevice, `/api/device/${id}?with[]=control`);
  }

  async devices() {
    return this.api.factory(SureFlapDevice, `/api/device?with[]=control`);
  }

  async pet(id) {
    return this.api.factory(SureFlapPet, `/api/pet/${id}?with[]=position`);
  }

  async pets() {
    return this.api.factory(SureFlapPet, "/api/pet?with[]=position");
  }
}

class SureFlapDevice extends SureFlap {
  get productName() {
    return PRODUCT_NAME[this.data.product_id] || "Unknown";
  }

  async control() {
    return this.api.call("GET", `/api/device/${this.id}/control`);
  }

  async setControl(opt) {
    return this.api.call("PUT", `/api/device/${this.id}/control`, opt);
  }
}

class SureFlapPet extends SureFlap {
  async position() {
    return this.api.call("GET", `/api/pet/${this.id}/position`);
  }

  async setPosition(where, since) {
    const m = since ? moment(since) : moment();
    return this.api.call("POST", `/api/pet/${this.id}/position`, {
      where,
      since: m.toISOString()
    });
  }
}

class SureFlapHousehold extends SureFlap {
  async devices() {
    return this.api.factory(
      SureFlapDevice,
      `/api/household/${this.id}/device?with[]=control`
    );
  }

  async pets() {
    return this.api.factory(
      SureFlapPet,
      `/api/household/${this.id}/pet?with[]=position`
    );
  }
}

module.exports = { SureFlap, SureFlapHousehold, SureFlapPet, SureFlapDevice };
