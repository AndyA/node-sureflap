"use strict";

const moment = require("moment");
const SureFlapAPI = require("./api");
const SureFlapTimeline = require("./timeline");

const PRODUCT_NAME = {
  1: "Hub",
  2: "Repeater",
  3: "Pet Door Connect",
  4: "Ped Feeder Connect",
  5: "Programmer",
  6: "DualScan Cat Flap Connect"
};

class SureFlap {
  constructor(optOrAPI, data) {
    this.api = SureFlapAPI.bless(optOrAPI);
    this.data = data;
  }

  static get _with() {
    return [];
  }

  static _addWith(path) {
    const w = this._with;
    if (w.length) return path + "?" + w.map(opt => `with[]=${opt}`).join("&");
    return path;
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
    return this.api.factory(SureFlapDevice, `/api/device/${id}`);
  }

  async devices() {
    return this.api.factory(SureFlapDevice, `/api/device`);
  }

  async pet(id) {
    return this.api.factory(SureFlapPet, `/api/pet/${id}`);
  }

  async pets() {
    return this.api.factory(SureFlapPet, "/api/pet");
  }

  get timeline() {
    return new SureFlapTimeline(this.api, `/api/timeline`);
  }

  async species(id) {
    if (id === undefined) return this.api.callData(`/api/species`);
    return this.api.callData(`/api/species/${id}`);
  }

  async breed(id) {
    return this.api.callData(`/api/breed/${id}`);
  }

  async breeds() {
    return this.api.callData(`/api/breed`);
  }

  async me() {
    return this.api.factory(SureFlapMe, `/api/me`);
  }
}

class SureFlapHousehold extends SureFlap {
  static get _with() {
    return [
      "invites",
      "invites.creating",
      "invites.creating.profilePhoto",
      "invites.accepting",
      "invites.accepting.profilePhoto",
      "pets",
      "users",
      "users.user",
      "users.user.profilePhoto",
      "users.households",
      "timezone"
    ];
  }

  async devices() {
    return this.api.factory(SureFlapDevice, `/api/household/${this.id}/device`);
  }

  async pets() {
    return this.api.factory(SureFlapPet, `/api/household/${this.id}/pet`);
  }

  async report(args) {
    return this.api.report(`/api/report/household/${this.id}`, args);
  }

  get timeline() {
    return new SureFlapTimeline(this.api, `/api/timeline/household/${this.id}`);
  }
}

class SureFlapMe extends SureFlap {
  static get _with() {
    return ["profilePhoto", "country", "language"];
  }
}

class SureFlapDevice extends SureFlap {
  static get _with() {
    return ["children", "status", "tags", "control"];
  }

  get productName() {
    return PRODUCT_NAME[this.data.product_id] || "Unknown";
  }

  async control() {
    return this.api.callData(`/api/device/${this.id}/control`);
  }

  async setControl(opt) {
    return this.api.call("PUT", `/api/device/${this.id}/control`, opt);
  }

  async report(args) {
    return this.api.report(
      `/api/report/household/${this.data.household_id}/device/${this.id}`,
      args
    );
  }

  get timeline() {
    throw new Error("timeline not supported for a device");
  }
}

class SureFlapPet extends SureFlap {
  static get _with() {
    return [
      "breed",
      "conditions",
      "food_type",
      "photo",
      "position",
      "species",
      "status",
      "tag"
    ];
  }

  async position() {
    return this.api.callData(`/api/pet/${this.id}/position`);
  }

  async setPosition(where, since) {
    const m = since ? moment(since) : moment();
    return this.api.call("POST", `/api/pet/${this.id}/position`, {
      where,
      since: m.toISOString()
    });
  }

  async report(args) {
    return this.api.report(
      `/api/report/household/${this.data.household_id}/pet/${this.id}`,
      args
    );
  }

  get timeline() {
    return new SureFlapTimeline(this.api, `/api/timeline/pet/${this.id}`);
  }
}

module.exports = SureFlap;
