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

class SureFlapObject {
  constructor(sureflap, data) {
    Object.assign(this, { sureflap, data });
  }

  get id() {
    return this.data.id;
  }

  async _apiCall(method, path, payload) {
    return this.sureflap._apiCall(method, path, payload);
  }

  async _apiFactory(clz, method, path, payload) {
    return this.sureflap._apiFactory(clz, method, path, payload);
  }
}

class SureFlapDevice extends SureFlapObject {
  get productName() {
    return PRODUCT_NAME[this.data.product_id] || "Unknown";
  }

  async control() {
    return this._apiCall("GET", `/api/device/${this.id}/control`);
  }

  async setControl(opt) {
    return this._apiCall("PUT", `/api/device/${this.id}/control`, opt);
  }
}

class SureFlapPet extends SureFlapObject {
  async position() {
    return this._apiCall("GET", `/api/pet/${this.id}/position`);
  }

  async setPosition(where, since) {
    const m = since ? moment(since) : moment();
    return this._apiCall("POST", `/api/pet/${this.id}/position`, {
      where,
      since: m.toISOString()
    });
  }
}

class SureFlapHousehold extends SureFlapObject {
  async devices() {
    return this._apiFactory(
      SureFlapDevice,
      "GET",
      `/api/household/${this.id}/device?with[]=control`
    );
  }

  async pets() {
    return this._apiFactory(
      SureFlapPet,
      "GET",
      `/api/household/${this.id}/pet`
    );
  }
}

class SureFlap {
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

  _api(path) {
    return this.opt.endpoint + path;
  }

  async _apiCall(method, path, payload) {
    const login = await this.login();
    const opt = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${login.token}`
      }
    };
    if (payload) opt.body = JSON.stringify(payload);
    if (payload) console.log(JSON.stringify({ path, payload }, null, 2));
    const res = await fetch(this._api(path), opt);
    const msg = await res.json();
    if (msg.error)
      throw new Error(`Failed ${path}: ${JSON.stringify(msg.error)}`);
    return msg.data;
  }

  async _apiFactory(clz, method, path, payload) {
    const msg = await this._apiCall(method, path, payload);
    if (_.isArray(msg)) return msg.map(obj => new clz(this, obj));
    return new clz(this, msg);
  }

  async _login() {
    const res = await fetch(this._api("/api/auth/login"), {
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

    await this._apiCall("POST", "/api/auth/logout");
    delete this._data;
  }

  async household(id) {
    return this._apiCall("GET", `/api/household/${id}`);
  }

  async households() {
    return this._apiFactory(SureFlapHousehold, "GET", "/api/household");
  }
}

module.exports = { SureFlap, SureFlapHousehold, SureFlapPet, SureFlapDevice };
